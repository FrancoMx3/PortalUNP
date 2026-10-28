const multer = require('multer');
const ApplicationError = require('../models/applicationError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const mensaje = error.code === 'LIMIT_FILE_SIZE'
      ? 'Un archivo supera el tamaño máximo (5 MB).'
      : 'Error al subir los archivos.';
    return res.status(400).json({ error: mensaje });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Solicitud inválida.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud supera el tamaño máximo permitido.' });
  }
  if (error instanceof ApplicationError) {
    return res.status(error.status).json({ error: error.message, ...error.details });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = errorHandler;
