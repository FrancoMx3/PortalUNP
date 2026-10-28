const express = require('express');
const cookieParser = require('cookie-parser');
const { VIEWS_DIR } = require('./config');
const crearControladorAutenticacion = require('./controllers/authController');
const crearControladorRegistro = require('./controllers/registroController');
const crearControladorPerfil = require('./controllers/perfilController');
const crearRutasAutenticacion = require('./routes/auth');
const crearRutasRegistro = require('./routes/registro');
const crearRutasPerfil = require('./routes/perfil');
const errorHandler = require('./middleware/errorHandler');

function crearApp(servicios) {
  const dependencias = servicios || require('./container').crearServicios();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', crearRutasAutenticacion(crearControladorAutenticacion(dependencias.authService)));
  app.use('/api', crearRutasRegistro(crearControladorRegistro(dependencias.registroService)));
  app.use('/api', crearRutasPerfil(crearControladorPerfil(dependencias.perfilService)));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.use(express.static(VIEWS_DIR));
  app.use(errorHandler);
  return app;
}

module.exports = crearApp;
