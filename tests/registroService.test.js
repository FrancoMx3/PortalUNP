const test = require('node:test');
const assert = require('node:assert/strict');
const { crearServicioRegistro } = require('../server/services/registroService');

function crearServicio(overrides = {}) {
  const llamadas = { completar: 0, actualizarBorrador: 0 };
  const dependencias = {
    postulanteDAO: {
      buscarDatosRegistro: async () => ({ id: 7, nombres: 'Ana', apellidos: 'Pérez', registro_completo: 0 }),
      buscarPorCorreoPersonal: async () => null,
      actualizarBorrador: async () => { llamadas.actualizarBorrador += 1; },
      completarRegistro: async () => { llamadas.completar += 1; return true; },
      buscarPorDNI: async () => null,
      existeCorreoInstitucional: async () => false
    },
    pagoDAO: {
      buscarPagoValidado: async () => null,
      registrarPagoValidado: async () => {},
      buscarPorPostulante: async () => null
    },
    perfilService: { obtenerPerfil: async () => null },
    almacenamiento: { guardar: async () => 'archivo', eliminar: async () => {} },
    hasher: { hash: async () => 'hash' },
    montoInscripcion: 400,
    ...overrides
  };
  return { servicio: crearServicioRegistro(dependencias), llamadas, dependencias };
}

test('no completa ni persiste el registro si el pago no está validado', async () => {
  const { servicio, llamadas } = crearServicio();

  await assert.rejects(
    servicio.completarRegistro({ id: 7, body: {}, files: {} }),
    (error) => error.status === 403 && error.message === 'Primero debes completar el pago de inscripción.'
  );
  assert.equal(llamadas.completar, 0);
});

test('no permite retomar un borrador pagado desde otra cookie de registro', async () => {
  const base = crearServicio();
  const { servicio, llamadas } = crearServicio({
    postulanteDAO: {
      ...base.dependencias.postulanteDAO,
      buscarPorCorreoPersonal: async () => ({ id: 7, registro_completo: 0 })
    },
    pagoDAO: {
      ...base.dependencias.pagoDAO,
      buscarPagoValidado: async () => ({ referencia: 'TXN-1' })
    }
  });

  await assert.rejects(
    servicio.registrarBasico({ nombres: 'Ana', apellidos: 'Pérez', emailPersonal: 'ana@example.com' }, null),
    (error) => error.status === 409 && error.message.includes('pago registrado')
  );
  assert.equal(llamadas.actualizarBorrador, 0);
});

test('el dueño de un borrador pagado puede retomarlo y continúa al paso de verificación', async () => {
  const base = crearServicio();
  let actualizado = false;
  const servicio = crearServicioRegistro({
    ...base.dependencias,
    postulanteDAO: {
      ...base.dependencias.postulanteDAO,
      buscarPorCorreoPersonal: async () => ({ id: 7, registro_completo: 0 }),
      actualizarBorrador: async () => { actualizado = true; }
    },
    pagoDAO: {
      ...base.dependencias.pagoDAO,
      buscarPagoValidado: async () => ({ referencia: 'TXN-1' })
    }
  });

  const resultado = await servicio.registrarBasico(
    { nombres: 'Ana', apellidos: 'Pérez', emailPersonal: 'ana@example.com' },
    7
  );

  assert.equal(actualizado, true);
  assert.deepEqual(resultado, { id: 7, status: 200, pagado: true });
});

test('el pago se registra una sola vez y conserva el monto fijado por el servidor', async () => {
  const base = crearServicio();
  let pago = null;
  let datosPago;
  const servicio = crearServicioRegistro({
    ...base.dependencias,
    randomInt: () => 1234,
    fechaActual: () => new Date(2026, 9, 28),
    pagoDAO: {
      ...base.dependencias.pagoDAO,
      buscarPagoValidado: async () => pago,
      registrarPagoValidado: async (...datos) => {
        datosPago = datos;
        pago = { referencia: datos[1], monto: datos[2], estado: 'Validado' };
      }
    }
  });

  const resultado = await servicio.registrarPago(7);

  assert.equal(datosPago[0], 7);
  assert.equal(datosPago[1], 'TXN-2026-1028-1234');
  assert.equal(datosPago[2], 400);
  assert.equal(resultado.estado, 'Validado');
});

test('completa la cuenta con el correo institucional, archivos y perfil', async () => {
  const base = crearServicio();
  let datosCompletados;
  let numeroArchivo = 0;
  const buffer = Buffer.alloc(12);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  const archivo = { buffer, size: buffer.length };
  const servicio = crearServicioRegistro({
    ...base.dependencias,
    perfilService: { obtenerPerfil: async (id) => ({ postulante: { id } }) },
    postulanteDAO: {
      ...base.dependencias.postulanteDAO,
      completarRegistro: async (id, datos) => { datosCompletados = { id, ...datos }; return true; }
    },
    pagoDAO: {
      ...base.dependencias.pagoDAO,
      buscarPagoValidado: async () => ({ estado: 'Validado' })
    },
    almacenamiento: {
      guardar: async (_contenido, tipo) => `archivo-${++numeroArchivo}.${tipo}`,
      eliminar: async () => {}
    },
    hasher: { hash: async (password) => `hash-${password}` }
  });

  const resultado = await servicio.completarRegistro({
    id: 7,
    body: { dni: '12345678', telefono: '912345678', password: 'clave-segura' },
    files: { foto: [archivo], dni_frente: [archivo], dni_reverso: [archivo] }
  });

  assert.deepEqual(resultado, { id: 7, perfil: { postulante: { id: 7 } } });
  assert.equal(datosCompletados.email, 'aperez5678@alumnos.unp.edu.pe');
  assert.equal(datosCompletados.passwordHash, 'hash-clave-segura');
  assert.equal(datosCompletados.foto, 'archivo-1.jpg');
  assert.equal(datosCompletados.dniFrente, 'archivo-2.jpg');
  assert.equal(datosCompletados.dniReverso, 'archivo-3.jpg');
});
