const ApplicationError = require('../models/applicationError');

function crearServicioAutenticacion({ postulanteDAO, perfilService, hasher, hashFalso }) {
  return {
    async iniciarSesion(emailRecibido, passwordRecibida) {
      const email = String(emailRecibido || '').trim().toLowerCase();
      const password = String(passwordRecibida || '');
      const postulante = await postulanteDAO.buscarCredenciales(email);
      const hash = postulante ? postulante.password_hash : hashFalso;
      const valido = await hasher.compare(password, hash);
      if (!postulante || !valido) {
        throw new ApplicationError(401, 'Correo o contraseña incorrectos.');
      }
      return { id: postulante.id, perfil: await perfilService.obtenerPerfil(postulante.id) };
    }
  };
}

module.exports = crearServicioAutenticacion;
