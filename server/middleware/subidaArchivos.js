const multer = require('multer');
const { MAX_BYTES } = require('../models/documento');

const subirDocumentosRegistro = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 3 }
}).fields([
  { name: 'foto', maxCount: 1 },
  { name: 'dni_frente', maxCount: 1 },
  { name: 'dni_reverso', maxCount: 1 }
]);

module.exports = { subirDocumentosRegistro };
