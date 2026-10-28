const path = require('path');
const { MIME } = require('../models/documento');
const { UPLOADS_DIR } = require('../config');

function crearControladorPerfil(perfilService) {
  return {
    obtenerPerfil: async (req, res) => {
      const perfil = await perfilService.obtenerPerfil(req.userId);
      if (!perfil) return res.status(401).json({ error: 'Cuenta no encontrada.' });
      res.json(perfil);
    },

    obtenerFoto: async (req, res) => {
      const archivo = await perfilService.obtenerFoto(req.userId);
      if (!archivo) return res.status(404).end();
      const extension = path.extname(archivo).slice(1);
      res.type(MIME[extension] || 'application/octet-stream');
      res.set('Cache-Control', 'private, no-cache');
      res.sendFile(archivo, { root: UPLOADS_DIR, cacheControl: false }, (error) => {
        if (error && !res.headersSent) res.status(404).end();
      });
    }
  };
}

module.exports = crearControladorPerfil;
