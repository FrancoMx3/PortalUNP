const rateLimit = require('express-rate-limit');

const base = { standardHeaders: true, legacyHeaders: false };

exports.login = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

exports.registro = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: { error: 'Demasiadas solicitudes desde esta red. Inténtalo más tarde.' }
});
