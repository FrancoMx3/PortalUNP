const ejecutarTransaccion = require('../db/transaccion');

function crearPagoDAO(pool) {
  return {
    async buscarPagoValidado(id) {
      const [filas] = await pool.execute(
        `SELECT referencia, monto, estado, DATE_FORMAT(pagado_en, '%Y-%m-%d') AS fecha
           FROM pagos WHERE postulante_id = ? AND estado = 'Validado'`,
        [id]
      );
      return filas[0] || null;
    },

    async buscarPorPostulante(id) {
      const [filas] = await pool.execute(
        `SELECT referencia, monto, estado, DATE_FORMAT(pagado_en, '%Y-%m-%d') AS fecha
           FROM pagos WHERE postulante_id = ?`,
        [id]
      );
      return filas[0] || null;
    },

    async registrarPagoValidado(id, referencia, monto) {
      return ejecutarTransaccion(pool, async (conexion) => {
        await conexion.execute(
          `INSERT INTO pagos (postulante_id, referencia, monto, estado, metodo)
           VALUES (?, ?, ?, 'Validado', 'simulado')`,
          [id, referencia, monto]
        );
        await conexion.execute(
          `UPDATE postulante_etapas SET estado = 'Validado', fecha = CURDATE()
            WHERE postulante_id = ? AND etapa_codigo = 'P02'`,
          [id]
        );
      });
    }
  };
}

module.exports = crearPagoDAO;
