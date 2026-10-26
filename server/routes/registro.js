const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const pool = require('../db/pool');
const limiters = require('../lib/limiters');
const { requireRegistro } = require('../middleware/auth');
const { cargarPerfil } = require('../lib/perfil');
const { iniciarSesion, iniciarRegistro, leer, COOKIE } = require('../lib/session');
const { RL, cap, generarEmail, detectarTipo } = require('../lib/utils');
const { UPLOADS_DIR, MONTO_INSCRIPCION } = require('../config');

const router = express.Router();
const MB = 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Los archivos llegan en memoria, se validan y recién entonces se escriben a disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * MB, files: 3 }
}).fields([
  { name: 'foto', maxCount: 1 },
  { name: 'dni_frente', maxCount: 1 },
  { name: 'dni_reverso', maxCount: 1 }
]);

async function pagoDe(id) {
  const [rows] = await pool.execute(
    `SELECT referencia, monto, estado, DATE_FORMAT(pagado_en, '%Y-%m-%d') AS fecha
       FROM pagos WHERE postulante_id = ? AND estado = 'Validado'`,
    [id]
  );
  return rows[0] || null;
}

/* =========================================================
   PASO 1 · Datos básicos  (crea o retoma el borrador)
   ========================================================= */
router.post('/registro/basico', limiters.registro, async (req, res, next) => {
  try {
    const b = req.body || {};
    const nombresRaw = String(b.nombres || '').trim();
    const apellidosRaw = String(b.apellidos || '').trim();
    const emailPersonal = String(b.emailPersonal || '').trim().toLowerCase();

    const errores = {};
    if (!RL.test(nombresRaw) || nombresRaw.length < 2 || nombresRaw.length > 80)
      errores.nombres = 'El nombre solo debe contener letras (mín. 2).';
    if (!RL.test(apellidosRaw) || apellidosRaw.length < 2 || apellidosRaw.length > 80)
      errores.apellidos = 'El apellido solo debe contener letras (mín. 2).';
    if (!EMAIL_RE.test(emailPersonal) || emailPersonal.length > 120)
      errores.emailPersonal = 'Ingresa un correo electrónico válido.';
    const primero = Object.values(errores)[0];
    if (primero) return res.status(400).json({ error: primero, campos: errores });

    const nombres = cap(nombresRaw);
    const apellidos = cap(apellidosRaw);

    const [rows] = await pool.execute(
      'SELECT id, registro_completo FROM postulantes WHERE email_personal = ?',
      [emailPersonal]
    );
    const previo = rows[0];
    let id;

    if (!previo) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [r] = await conn.execute(
          'INSERT INTO postulantes (nombres, apellidos, email_personal) VALUES (?, ?, ?)',
          [nombres, apellidos, emailPersonal]
        );
        id = r.insertId;
        // P01 queda confirmada; el resto pendiente
        await conn.query(
          `INSERT INTO postulante_etapas (postulante_id, etapa_codigo, estado, fecha)
           SELECT ?, codigo, IF(codigo = 'P01', 'Confirmado', 'Pendiente'), IF(codigo = 'P01', CURDATE(), NULL)
             FROM etapas`,
          [id]
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    } else if (previo.registro_completo) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
    } else {
      // Borrador existente: solo se retoma si es del mismo navegador (cookie) o si aún no tiene pago
      const dueño = leer(req.cookies && req.cookies.registro, 'registro') === previo.id;
      if (!dueño && (await pagoDe(previo.id))) {
        return res.status(409).json({
          error: 'Ese correo ya tiene un pago registrado. Contacta a Admisión para continuar tu registro.'
        });
      }
      id = previo.id;
      await pool.execute('UPDATE postulantes SET nombres = ?, apellidos = ? WHERE id = ?', [nombres, apellidos, id]);
    }

    iniciarRegistro(res, id);
    res.status(previo ? 200 : 201).json({ pagado: !!(await pagoDe(id)) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese correo ya está registrado.' });
    next(e);
  }
});

/* =========================================================
   PASO 2 · Pago (SIMULADO)
   No recibe datos de tarjeta. El monto lo fija el servidor.
   Con una pasarela real (Culqi, Niubiz, Izipay...) el pago se
   confirmaría por el webhook de la pasarela, no por esta llamada.
   ========================================================= */
function generarReferencia() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `TXN-${d.getFullYear()}-${p(d.getMonth() + 1)}${p(d.getDate())}-${crypto.randomInt(1000, 10000)}`;
}

router.post('/registro/pago', limiters.registro, requireRegistro, async (req, res, next) => {
  try {
    const id = req.registroId;
    const [p] = await pool.execute('SELECT registro_completo FROM postulantes WHERE id = ?', [id]);
    if (!p[0]) return res.status(401).json({ error: 'Tu registro expiró. Vuelve a empezar desde el paso 1.' });
    if (p[0].registro_completo) return res.status(409).json({ error: 'Tu registro ya está completo.' });

    let pago = await pagoDe(id); // idempotente: si ya pagó, devuelve el mismo pago
    for (let intento = 0; !pago && intento < 5; intento++) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          `INSERT INTO pagos (postulante_id, referencia, monto, estado, metodo)
           VALUES (?, ?, ?, 'Validado', 'simulado')`,
          [id, generarReferencia(), MONTO_INSCRIPCION]
        );
        await conn.execute(
          `UPDATE postulante_etapas SET estado = 'Validado', fecha = CURDATE()
            WHERE postulante_id = ? AND etapa_codigo = 'P02'`,
          [id]
        );
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        // referencia repetida: reintenta; doble clic (ya existe el pago): sigue
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      } finally {
        conn.release();
      }
      pago = await pagoDe(id);
    }
    if (!pago) throw new Error('No se pudo registrar el pago.');
    res.json(pago);
  } catch (e) {
    next(e);
  }
});

/* =========================================================
   PASO 3 · Registro completo (DNI, fotos, contraseña)
   ========================================================= */
router.post('/registro/completar', limiters.registro, requireRegistro, upload, async (req, res, next) => {
  const guardados = [];
  try {
    const id = req.registroId;
    const b = req.body || {};
    const dni = String(b.dni || '').trim();
    const telefono = String(b.telefono || '').trim();
    const password = String(b.password || '');
    const f = req.files || {};

    const [rows] = await pool.execute(
      'SELECT nombres, apellidos, registro_completo FROM postulantes WHERE id = ?',
      [id]
    );
    const borrador = rows[0];
    if (!borrador) return res.status(401).json({ error: 'Tu registro expiró. Vuelve a empezar desde el paso 1.' });
    if (borrador.registro_completo) return res.status(409).json({ error: 'Tu registro ya está completo. Inicia sesión.' });
    if (!(await pagoDe(id))) return res.status(403).json({ error: 'Primero debes completar el pago de inscripción.' });

    const errores = {};
    if (!/^\d{8}$/.test(dni)) errores.dni = 'El DNI debe tener exactamente 8 dígitos.';
    if (telefono !== '' && !/^9\d{8}$/.test(telefono))
      errores.telefono = 'El teléfono debe tener 9 dígitos y empezar con 9.';
    if (password.length < 8 || password.length > 72)
      errores.password = 'La contraseña debe tener entre 8 y 72 caracteres.';

    const imagenes = {};
    [
      ['foto', 'La foto'],
      ['dni_frente', 'La foto frontal del DNI'],
      ['dni_reverso', 'La foto del reverso del DNI']
    ].forEach(([campo, etiqueta]) => {
      const a = f[campo] && f[campo][0];
      if (!a) return (errores[campo] = `${etiqueta} es obligatoria.`);
      const tipo = detectarTipo(a.buffer);
      if (!['jpg', 'png', 'webp'].includes(tipo)) return (errores[campo] = `${etiqueta} debe ser JPG, PNG o WEBP.`);
      if (a.size > 5 * MB) return (errores[campo] = `${etiqueta} no debe superar 5 MB.`);
      imagenes[campo] = { buffer: a.buffer, tipo };
    });

    const primero = Object.values(errores)[0];
    if (primero) return res.status(400).json({ error: primero, campos: errores });

    const [dup] = await pool.execute('SELECT id FROM postulantes WHERE dni = ?', [dni]);
    if (dup.length) return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese DNI. Inicia sesión.' });

    // Correo institucional (si ya existe por coincidencia, se agrega un número)
    let email = generarEmail(borrador.nombres, borrador.apellidos, dni);
    const base = email.split('@')[0];
    for (let n = 2; ; n++) {
      const [e] = await pool.execute('SELECT 1 FROM postulantes WHERE email = ?', [email]);
      if (!e.length) break;
      email = `${base}${n}@alumnos.unp.edu.pe`;
    }

    // Guardar archivos con nombres aleatorios, fuera de la carpeta pública
    const nombres = {};
    for (const campo of Object.keys(imagenes)) {
      const archivo = `${crypto.randomBytes(16).toString('hex')}.${imagenes[campo].tipo}`;
      await fs.writeFile(path.join(UPLOADS_DIR, archivo), imagenes[campo].buffer);
      guardados.push(archivo);
      nombres[campo] = archivo;
    }

    const hash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.execute(
        `UPDATE postulantes
            SET dni = ?, telefono = ?, email = ?, password_hash = ?,
                foto_archivo = ?, dni_frente_archivo = ?, dni_reverso_archivo = ?,
                registro_completo = 1, completado_en = NOW()
          WHERE id = ? AND registro_completo = 0`,
        [dni, telefono || null, email, hash, nombres.foto, nombres.dni_frente, nombres.dni_reverso, id]
      );
      if (r.affectedRows !== 1) throw Object.assign(new Error('yaCompleto'), { code: 'YA_COMPLETO' });
      // P03 queda "Confirmado"; pasa a "Validado" cuando el administrador verifica el DNI
      await conn.execute(
        `UPDATE postulante_etapas SET estado = 'Confirmado', fecha = CURDATE()
          WHERE postulante_id = ? AND etapa_codigo = 'P03'`,
        [id]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.clearCookie('registro', COOKIE);
    iniciarSesion(res, id);
    res.status(201).json(await cargarPerfil(id));
  } catch (e) {
    await Promise.all(guardados.map((a) => fs.unlink(path.join(UPLOADS_DIR, a)).catch(() => {})));
    if (e.code === 'ER_DUP_ENTRY' || e.code === 'YA_COMPLETO') {
      return res.status(409).json({ error: 'Ya existe una cuenta con esos datos. Inicia sesión.' });
    }
    next(e);
  }
});

module.exports = router;
