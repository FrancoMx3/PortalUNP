const ApplicationError = require('../models/applicationError');
const {
  capitalizar,
  generarCorreoInstitucional,
  generarReferenciaPago,
  normalizarDatosBasicos,
  validarDatosBasicos,
  normalizarDatosCompletos
} = require('../models/postulante');

function primerCampo(campos) {
  return Object.values(campos)[0];
}

function crearServicioRegistro({
  postulanteDAO,
  pagoDAO,
  perfilService,
  almacenamiento,
  hasher,
  montoInscripcion,
  fechaActual = () => new Date(),
  randomInt
}) {
  async function registrarBasico(body, idRegistro) {
    const datos = normalizarDatosBasicos(body);
    const campos = validarDatosBasicos(datos);
    if (primerCampo(campos)) {
      throw new ApplicationError(400, primerCampo(campos), { campos });
    }

    const nombres = capitalizar(datos.nombres);
    const apellidos = capitalizar(datos.apellidos);
    let previo;
    let id;

    try {
      previo = await postulanteDAO.buscarPorCorreoPersonal(datos.emailPersonal);
      if (!previo) {
        id = await postulanteDAO.crearBorrador(nombres, apellidos, datos.emailPersonal);
      } else if (previo.registro_completo) {
        throw new ApplicationError(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
      } else {
        const esPropietario = Number(idRegistro) === Number(previo.id);
        const pagoExistente = !esPropietario && await pagoDAO.buscarPagoValidado(previo.id);
        if (pagoExistente) {
          throw new ApplicationError(409, 'Ese correo ya tiene un pago registrado. Contacta a Admisión para continuar tu registro.');
        }
        id = previo.id;
        await postulanteDAO.actualizarBorrador(id, nombres, apellidos);
      }
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ApplicationError(409, 'Ese correo ya está registrado.');
      }
      throw error;
    }

    const pago = await pagoDAO.buscarPagoValidado(id);
    return { id, status: previo ? 200 : 201, pagado: Boolean(pago) };
  }

  async function registrarPago(id) {
    const postulante = await postulanteDAO.buscarDatosRegistro(id);
    if (!postulante) {
      throw new ApplicationError(401, 'Tu registro expiró. Vuelve a empezar desde el paso 1.');
    }
    if (postulante.registro_completo) {
      throw new ApplicationError(409, 'Tu registro ya está completo.');
    }

    let pago = await pagoDAO.buscarPagoValidado(id);
    for (let intento = 0; !pago && intento < 5; intento += 1) {
      try {
        const referencia = generarReferenciaPago(fechaActual(), randomInt);
        await pagoDAO.registrarPagoValidado(id, referencia, montoInscripcion);
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
      }
      pago = await pagoDAO.buscarPagoValidado(id);
    }
    if (!pago) throw new Error('No se pudo registrar el pago.');
    return pago;
  }

  async function completarRegistro({ id, body, files }) {
    const borrador = await postulanteDAO.buscarDatosRegistro(id);
    if (!borrador) {
      throw new ApplicationError(401, 'Tu registro expiró. Vuelve a empezar desde el paso 1.');
    }
    if (borrador.registro_completo) {
      throw new ApplicationError(409, 'Tu registro ya está completo. Inicia sesión.');
    }
    if (!(await pagoDAO.buscarPagoValidado(id))) {
      throw new ApplicationError(403, 'Primero debes completar el pago de inscripción.');
    }

    const { datos, campos, imagenes } = normalizarDatosCompletos(body, files);
    if (primerCampo(campos)) {
      throw new ApplicationError(400, primerCampo(campos), { campos });
    }

    if (await postulanteDAO.buscarPorDNI(datos.dni)) {
      throw new ApplicationError(409, 'Ya existe una cuenta registrada con ese DNI. Inicia sesión.');
    }

    let email = generarCorreoInstitucional(borrador.nombres, borrador.apellidos, datos.dni);
    const base = email.split('@')[0];
    for (let numero = 2; await postulanteDAO.existeCorreoInstitucional(email); numero += 1) {
      email = `${base}${numero}@alumnos.unp.edu.pe`;
    }

    const archivosGuardados = [];
    const nombresArchivos = {};
    try {
      for (const [campo, imagen] of Object.entries(imagenes)) {
        const nombre = await almacenamiento.guardar(imagen.buffer, imagen.tipo);
        archivosGuardados.push(nombre);
        nombresArchivos[campo] = nombre;
      }

      const passwordHash = await hasher.hash(datos.password, 10);
      const completado = await postulanteDAO.completarRegistro(id, {
        dni: datos.dni,
        telefono: datos.telefono,
        email,
        passwordHash,
        foto: nombresArchivos.foto,
        dniFrente: nombresArchivos.dni_frente,
        dniReverso: nombresArchivos.dni_reverso
      });
      if (!completado) {
        throw new ApplicationError(409, 'Ya existe una cuenta con esos datos. Inicia sesión.');
      }
    } catch (error) {
      await Promise.all(archivosGuardados.map((nombre) => almacenamiento.eliminar(nombre).catch(() => {})));
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ApplicationError(409, 'Ya existe una cuenta con esos datos. Inicia sesión.');
      }
      throw error;
    }

    return { id, perfil: await perfilService.obtenerPerfil(id) };
  }

  return { registrarBasico, registrarPago, completarRegistro };
}

module.exports = { crearServicioRegistro };
