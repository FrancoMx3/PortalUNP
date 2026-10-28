const ejecutarTransaccion = require('../db/transaccion');

function crearPostulanteDAO(pool) {
  return {
    async buscarPorCorreoPersonal(emailPersonal) {
      const [filas] = await pool.execute(
        'SELECT id, registro_completo FROM postulantes WHERE email_personal = ?',
        [emailPersonal]
      );
      return filas[0] || null;
    },

    async crearBorrador(nombres, apellidos, emailPersonal) {
      return ejecutarTransaccion(pool, async (conexion) => {
        const [resultado] = await conexion.execute(
          'INSERT INTO postulantes (nombres, apellidos, email_personal) VALUES (?, ?, ?)',
          [nombres, apellidos, emailPersonal]
        );
        await conexion.execute(
          `INSERT INTO postulante_etapas (postulante_id, etapa_codigo, estado, fecha)
           SELECT ?, codigo, IF(codigo = 'P01', 'Confirmado', 'Pendiente'), IF(codigo = 'P01', CURDATE(), NULL)
             FROM etapas`,
          [resultado.insertId]
        );
        return resultado.insertId;
      });
    },

    async actualizarBorrador(id, nombres, apellidos) {
      await pool.execute(
        'UPDATE postulantes SET nombres = ?, apellidos = ? WHERE id = ?',
        [nombres, apellidos, id]
      );
    },

    async buscarDatosRegistro(id) {
      const [filas] = await pool.execute(
        'SELECT id, nombres, apellidos, registro_completo FROM postulantes WHERE id = ?',
        [id]
      );
      return filas[0] || null;
    },

    async buscarPorDNI(dni) {
      const [filas] = await pool.execute('SELECT id FROM postulantes WHERE dni = ?', [dni]);
      return filas[0] || null;
    },

    async existeCorreoInstitucional(email) {
      const [filas] = await pool.execute('SELECT 1 FROM postulantes WHERE email = ?', [email]);
      return filas.length > 0;
    },

    async completarRegistro(id, datos) {
      return ejecutarTransaccion(pool, async (conexion) => {
        const [resultado] = await conexion.execute(
          `UPDATE postulantes
              SET dni = ?, telefono = ?, email = ?, password_hash = ?,
                  foto_archivo = ?, dni_frente_archivo = ?, dni_reverso_archivo = ?,
                  registro_completo = 1, completado_en = NOW()
            WHERE id = ? AND registro_completo = 0`,
          [
            datos.dni,
            datos.telefono || null,
            datos.email,
            datos.passwordHash,
            datos.foto,
            datos.dniFrente,
            datos.dniReverso,
            id
          ]
        );
        if (resultado.affectedRows !== 1) return false;
        await conexion.execute(
          `UPDATE postulante_etapas SET estado = 'Confirmado', fecha = CURDATE()
            WHERE postulante_id = ? AND etapa_codigo = 'P03'`,
          [id]
        );
        return true;
      });
    },

    async buscarCredenciales(email) {
      const [filas] = await pool.execute(
        'SELECT id, password_hash FROM postulantes WHERE email = ? AND registro_completo = 1',
        [email]
      );
      return filas[0] || null;
    },

    async buscarPerfil(id) {
      const [filas] = await pool.execute(
        `SELECT id, dni, nombres, apellidos, telefono, email,
                email_personal AS emailPersonal, convocatoria, area, turno
           FROM postulantes WHERE id = ?`,
        [id]
      );
      return filas[0] || null;
    },

    async buscarFoto(id) {
      const [filas] = await pool.execute(
        'SELECT foto_archivo FROM postulantes WHERE id = ?',
        [id]
      );
      return filas[0] ? filas[0].foto_archivo : null;
    }
  };
}

module.exports = crearPostulanteDAO;
