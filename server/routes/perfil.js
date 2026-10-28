const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');

function crearRutasPerfil(controlador) {
  const router = express.Router();
  router.get('/me', requireAuth, asyncHandler(controlador.obtenerPerfil));
  router.get('/me/foto', requireAuth, asyncHandler(controlador.obtenerFoto));
  return router;
}

module.exports = crearRutasPerfil;
