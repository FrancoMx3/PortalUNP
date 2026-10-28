const bcrypt = require('bcryptjs');
const { MONTO_INSCRIPCION, UPLOADS_DIR } = require('./config');
const pool = require('./db/pool');
const crearPostulanteDAO = require('./dao/postulanteDAO');
const crearPagoDAO = require('./dao/pagoDAO');
const crearEtapaDAO = require('./dao/etapaDAO');
const crearServicioAutenticacion = require('./services/authService');
const crearServicioRegistro = require('./services/registroService').crearServicioRegistro;
const crearServicioPerfil = require('./services/perfilService');
const crearAlmacenamientoArchivos = require('./infrastructure/almacenamientoArchivos');

function crearServicios() {
  const postulanteDAO = crearPostulanteDAO(pool);
  const pagoDAO = crearPagoDAO(pool);
  const etapaDAO = crearEtapaDAO(pool);
  const perfilService = crearServicioPerfil({ postulanteDAO, etapaDAO, pagoDAO });
  const hasher = bcrypt;
  const registroService = crearServicioRegistro({
    postulanteDAO,
    pagoDAO,
    perfilService,
    almacenamiento: crearAlmacenamientoArchivos(UPLOADS_DIR),
    hasher,
    montoInscripcion: MONTO_INSCRIPCION
  });
  const authService = crearServicioAutenticacion({
    postulanteDAO,
    perfilService,
    hasher,
    hashFalso: bcrypt.hashSync('contrasena-falsa', 10)
  });
  return { authService, registroService, perfilService };
}

module.exports = { crearServicios, pool };
