const jwt = require('jsonwebtoken');
const { JWT_SECRET, IS_PROD } = require('../config');

const COOKIE = { httpOnly: true, sameSite: 'lax', secure: IS_PROD };

// Sesión normal (ya con cuenta completa)
function iniciarSesion(res, id) {
  const token = jwt.sign({ id, typ: 'sesion' }, JWT_SECRET, { expiresIn: '2h' });
  res.cookie('token', token, { ...COOKIE, maxAge: 2 * 60 * 60 * 1000 });
}

// Sesión temporal del asistente de registro (pasos 1-3, aún sin contraseña)
function iniciarRegistro(res, id) {
  const token = jwt.sign({ id, typ: 'registro' }, JWT_SECRET, { expiresIn: '1d' });
  res.cookie('registro', token, { ...COOKIE, maxAge: 24 * 60 * 60 * 1000 });
}

// Devuelve el id si el token es válido y del tipo esperado; si no, null
function leer(token, typ) {
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return p.typ === typ ? p.id : null;
  } catch (e) {
    return null;
  }
}

module.exports = { COOKIE, iniciarSesion, iniciarRegistro, leer };
