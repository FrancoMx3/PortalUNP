const { iniciarSesion, COOKIE } = require('../security/session');

function crearControladorAutenticacion(authService) {
  return {
    iniciarSesion: async (req, res) => {
      const resultado = await authService.iniciarSesion(
        req.body && req.body.email,
        req.body && req.body.password
      );
      iniciarSesion(res, resultado.id);
      res.json(resultado.perfil);
    },

    cerrarSesion: (req, res) => {
      res.clearCookie('token', COOKIE);
      res.clearCookie('registro', COOKIE);
      res.json({ ok: true });
    }
  };
}

module.exports = crearControladorAutenticacion;
