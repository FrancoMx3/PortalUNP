const pool = require('../db/pool');

// Datos del postulante + estado de sus etapas + pago
async function cargarPerfil(id) {
  const [rows] = await pool.execute(
    `SELECT id, dni, nombres, apellidos, telefono, email,
            email_personal AS emailPersonal, convocatoria, area, turno
       FROM postulantes WHERE id = ?`,
    [id]
  );
  const postulante = rows[0];
  if (!postulante) return null;

  const [etapas] = await pool.execute(
    `SELECT e.codigo, e.nombre, e.descripcion, pe.estado,
            DATE_FORMAT(pe.fecha, '%Y-%m-%d') AS fecha
       FROM postulante_etapas pe
       JOIN etapas e ON e.codigo = pe.etapa_codigo
      WHERE pe.postulante_id = ?
      ORDER BY e.orden`,
    [id]
  );

  const [pagos] = await pool.execute(
    `SELECT referencia, monto, estado, DATE_FORMAT(pagado_en, '%Y-%m-%d') AS fecha
       FROM pagos WHERE postulante_id = ?`,
    [id]
  );

  return { postulante, etapas, pago: pagos[0] || null };
}

module.exports = { cargarPerfil };
