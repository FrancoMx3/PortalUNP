const express = require('express');
const bcrypt = require('bcryptjs');

const pool = require('../db/pool');
const limiters = require('../lib/limiters');
const { cargarPerfil } = require('../lib/perfil');
const { iniciarSesion, COOKIE } = require('../lib/session');

const router = express.Router();
const DUMMY_HASH = bcrypt.hashSync('contrasena-falsa', 10);

router.post('/login', limiters.login, async (req, res, next) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');

    const [rows] = await pool.execute(
      'SELECT id, password_hash FROM postulantes WHERE email = ? AND registro_completo = 1',
      [email]
    );
    const u = rows[0];
    const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
    if (!u || !ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

    iniciarSesion(res, u.id);
    res.json(await cargarPerfil(u.id));
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE);
  res.clearCookie('registro', COOKIE);
  res.json({ ok: true });
});

module.exports = router;
