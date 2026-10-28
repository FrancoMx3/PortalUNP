function crearEtapaDAO(pool) {
  return {
    async listarPorPostulante(id) {
      const [filas] = await pool.execute(
        `SELECT e.codigo, e.nombre, e.descripcion, pe.estado,
                DATE_FORMAT(pe.fecha, '%Y-%m-%d') AS fecha
           FROM postulante_etapas pe
           JOIN etapas e ON e.codigo = pe.etapa_codigo
          WHERE pe.postulante_id = ?
          ORDER BY e.orden`,
        [id]
      );
      return filas;
    }
  };
}

module.exports = crearEtapaDAO;
