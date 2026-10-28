const { iniciarRegistro, iniciarSesion, COOKIE, leer } = require('../security/session');

function crearControladorRegistro(registroService) {
  return {
    registrarBasico: async (req, res) => {
      const idRegistro = leer(req.cookies && req.cookies.registro, 'registro');
      const resultado = await registroService.registrarBasico(req.body, idRegistro);
      iniciarRegistro(res, resultado.id);
      res.status(resultado.status).json({ pagado: resultado.pagado });
    },

    registrarPago: async (req, res) => {
      const pago = await registroService.registrarPago(req.registroId);
      res.json(pago);
    },

    completarRegistro: async (req, res) => {
      const resultado = await registroService.completarRegistro({
        id: req.registroId,
        body: req.body,
        files: req.files
      });
      res.clearCookie('registro', COOKIE);
      iniciarSesion(res, resultado.id);
      res.status(201).json(resultado.perfil);
    }
  };
}

module.exports = crearControladorRegistro;
