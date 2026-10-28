const { leer } = require('../security/session');

function requireAuth(req, res, next) {
  const id = leer(req.cookies && req.cookies.token, 'sesion');
  if (!id) return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.' });
  req.userId = id;
  next();
}

function requireRegistro(req, res, next) {
  const id = leer(req.cookies && req.cookies.registro, 'registro');
  if (!id) return res.status(401).json({ error: 'Tu registro expiró. Vuelve a empezar desde el paso 1.' });
  req.registroId = id;
  next();
}

module.exports = { requireAuth, requireRegistro };
