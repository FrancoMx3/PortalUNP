const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { DB } = require('../config');

(async () => {
  if (!/^\w+$/.test(DB.database)) {
    console.error('DB_NAME solo puede tener letras, números y guion bajo.');
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: DB.host,
      port: DB.port,
      user: DB.user,
      password: DB.password,
      multipleStatements: true
    });
    if (process.argv.includes('--reset')) {
      await conn.query(`DROP DATABASE IF EXISTS \`${DB.database}\``);
      console.log(`Base de datos "${DB.database}" eliminada (--reset).`);
    }
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${DB.database}\``);
    await conn.query(sql);
    console.log(`Base de datos "${DB.database}" lista.`);
  } catch (e) {
    console.error('No se pudo inicializar la base de datos:', e.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
