const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

const { PORT, PUBLIC_DIR, UPLOADS_DIR, JWT_SECRET } = require('./config');
const pool = require('./db/pool');

if (JWT_SECRET.length < 32) {
  console.error('Falta JWT_SECRET en .env (mínimo 32 caracteres). Revisa .env.example.');
  process.exit(1);
}
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/registro'));
app.use('/api', require('./routes/perfil'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use(express.static(PUBLIC_DIR));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Un archivo supera el tamaño máximo (5 MB).' : 'Error al subir los archivos.';
    return res.status(400).json({ error: msg });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Solicitud inválida.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const server = app.listen(PORT, async () => {
  console.log(`Portal UNP en http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Conexión a MySQL correcta.');
  } catch (e) {
    console.error('No se pudo conectar a MySQL:', e.message);
    console.error('Revisa los datos DB_* de tu .env y ejecuta "npm run db:init".');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Cierra el otro servidor o cambia PORT en .env.`);
  } else {
    console.error('No se pudo iniciar el servidor:', err.message);
  }
  process.exit(1);
});
