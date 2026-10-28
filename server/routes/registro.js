const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const limiters = require('../middleware/limiters');
const { requireRegistro } = require('../middleware/auth');
const { subirDocumentosRegistro } = require('../middleware/subidaArchivos');

function crearRutasRegistro(controlador) {
  const router = express.Router();
  router.post('/registro/basico', limiters.registro, asyncHandler(controlador.registrarBasico));
  router.post('/registro/pago', limiters.registro, requireRegistro, asyncHandler(controlador.registrarPago));
  router.post(
    '/registro/completar',
    limiters.registro,
    requireRegistro,
    subirDocumentosRegistro,
    asyncHandler(controlador.completarRegistro)
  );
  return router;
}

module.exports = crearRutasRegistro;
