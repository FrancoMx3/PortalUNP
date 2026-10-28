const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const limiters = require('../middleware/limiters');

function crearRutasAutenticacion(controlador) {
  const router = express.Router();
  router.post('/login', limiters.login, asyncHandler(controlador.iniciarSesion));
  router.post('/logout', controlador.cerrarSesion);
  return router;
}

module.exports = crearRutasAutenticacion;
