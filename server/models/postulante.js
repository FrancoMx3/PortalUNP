const crypto = require('crypto');
const { MAX_BYTES, TIPOS_PERMITIDOS, detectarTipo } = require('./documento');

const NOMBRE_PATTERN = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function capitalizar(texto) {
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(' ');
}

function sinTildes(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function generarCorreoInstitucional(nombres, apellidos, dni) {
  const nombre = sinTildes(nombres.toLowerCase().trim());
  const apellido = sinTildes(apellidos.toLowerCase().trim().split(/\s+/)[0]);
  return (nombre[0] + apellido + dni.slice(-4) + '@alumnos.unp.edu.pe').replace(/\s/g, '');
}

function normalizarDatosBasicos(body = {}) {
  return {
    nombres: String(body.nombres || '').trim(),
    apellidos: String(body.apellidos || '').trim(),
    emailPersonal: String(body.emailPersonal || '').trim().toLowerCase()
  };
}

function validarDatosBasicos(datos) {
  const campos = {};
  if (!NOMBRE_PATTERN.test(datos.nombres) || datos.nombres.length < 2 || datos.nombres.length > 80) {
    campos.nombres = 'El nombre solo debe contener letras (mín. 2).';
  }
  if (!NOMBRE_PATTERN.test(datos.apellidos) || datos.apellidos.length < 2 || datos.apellidos.length > 80) {
    campos.apellidos = 'El apellido solo debe contener letras (mín. 2).';
  }
  if (!EMAIL_PATTERN.test(datos.emailPersonal) || datos.emailPersonal.length > 120) {
    campos.emailPersonal = 'Ingresa un correo electrónico válido.';
  }
  return campos;
}

function normalizarDatosCompletos(body = {}, files = {}) {
  const datos = {
    dni: String(body.dni || '').trim(),
    telefono: String(body.telefono || '').trim(),
    password: String(body.password || '')
  };
  const campos = {};
  if (!/^\d{8}$/.test(datos.dni)) campos.dni = 'El DNI debe tener exactamente 8 dígitos.';
  if (datos.telefono !== '' && !/^9\d{8}$/.test(datos.telefono)) {
    campos.telefono = 'El teléfono debe tener 9 dígitos y empezar con 9.';
  }
  if (datos.password.length < 8 || Buffer.byteLength(datos.password, 'utf8') > 72) {
    campos.password = 'La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.';
  }

  const imagenes = {};
  const requeridas = [
    ['foto', 'La foto'],
    ['dni_frente', 'La foto frontal del DNI'],
    ['dni_reverso', 'La foto del reverso del DNI']
  ];

  for (const [campo, etiqueta] of requeridas) {
    const archivo = files[campo] && files[campo][0];
    if (!archivo) {
      campos[campo] = `${etiqueta} es obligatoria.`;
      continue;
    }
    const tipo = detectarTipo(archivo.buffer);
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      campos[campo] = `${etiqueta} debe ser JPG, PNG o WEBP.`;
      continue;
    }
    if (archivo.size > MAX_BYTES) {
      campos[campo] = `${etiqueta} no debe superar 5 MB.`;
      continue;
    }
    imagenes[campo] = { buffer: archivo.buffer, tipo };
  }

  return { datos, campos, imagenes };
}

function generarReferenciaPago(fecha = new Date(), randomInt = crypto.randomInt) {
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  const dia = `${dosDigitos(fecha.getMonth() + 1)}${dosDigitos(fecha.getDate())}`;
  return `TXN-${fecha.getFullYear()}-${dia}-${randomInt(1000, 10000)}`;
}

module.exports = {
  capitalizar,
  generarCorreoInstitucional,
  generarReferenciaPago,
  normalizarDatosBasicos,
  validarDatosBasicos,
  normalizarDatosCompletos
};
