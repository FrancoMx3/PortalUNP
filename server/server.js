const fs = require('fs');
const { PORT, UPLOADS_DIR, JWT_SECRET } = require('./config');
const crearApp = require('./app');
const { pool } = require('./container');

function iniciarServidor() {
  if (JWT_SECRET.length < 32) {
    console.error('Falta JWT_SECRET en .env (mínimo 32 caracteres). Revisa .env.example.');
    process.exitCode = 1;
    return null;
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const app = crearApp();
  const server = app.listen(PORT, async () => {
    console.log(`Portal UNP en http://localhost:${PORT}`);
    try {
      await pool.query('SELECT 1');
      console.log('Conexión a MySQL correcta.');
    } catch (error) {
      console.error('No se pudo conectar a MySQL:', error.message);
      console.error('Revisa los datos DB_* de tu .env y ejecuta "npm run db:init".');
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PORT} ya está en uso. Cierra el otro servidor o cambia PORT en .env.`);
    } else {
      console.error('No se pudo iniciar el servidor:', error.message);
    }
    process.exitCode = 1;
  });
  return server;
}

if (require.main === module) iniciarServidor();

module.exports = { iniciarServidor };
