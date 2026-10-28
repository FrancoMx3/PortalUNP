function crearServicioPerfil({ postulanteDAO, etapaDAO, pagoDAO }) {
  return {
    async obtenerPerfil(id) {
      const postulante = await postulanteDAO.buscarPerfil(id);
      if (!postulante) return null;
      const [etapas, pago] = await Promise.all([
        etapaDAO.listarPorPostulante(id),
        pagoDAO.buscarPorPostulante(id)
      ]);
      return { postulante, etapas, pago };
    },

    async obtenerFoto(id) {
      return postulanteDAO.buscarFoto(id);
    }
  };
}

module.exports = crearServicioPerfil;
