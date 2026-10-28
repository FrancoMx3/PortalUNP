async function ejecutarTransaccion(pool, operaciones) {
  const conexion = await pool.getConnection();
  let iniciada = false;
  try {
    await conexion.beginTransaction();
    iniciada = true;
    const resultado = await operaciones(conexion);
    await conexion.commit();
    iniciada = false;
    return resultado;
  } catch (error) {
    if (iniciada) {
      try {
        await conexion.rollback();
      } catch {}
    }
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = ejecutarTransaccion;
