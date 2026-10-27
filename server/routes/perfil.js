const express = require('express');
const path = require('path');

const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { cargarPerfil } = require('../lib/perfil');
const { MIME } = require('../lib/utils');
const { UPLOADS_DIR } = require('../config');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const perfil = await cargarPerfil(req.userId);
    if (!perfil) return res.status(401).json({ error: 'Cuenta no encontrada.' });
    res.json(perfil);
  } catch (e) {
    next(e);
  }
});

router.get('/me/foto', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT foto_archivo FROM postulantes WHERE id = ?', [req.userId]);
    if (!rows[0] || !rows[0].foto_archivo) return res.status(404).end();

    const archivo = rows[0].foto_archivo;
    const ext = path.extname(archivo).slice(1);
    res.type(MIME[ext] || 'application/octet-stream');
    res.set('Cache-Control', 'private, no-cache');
    res.sendFile(archivo, { root: UPLOADS_DIR, cacheControl: false }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  } catch (e) {
    next(e);
  }
});
module.exports = router;
