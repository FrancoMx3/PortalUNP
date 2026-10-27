const path = require('path');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

module.exports = {
  ROOT,
  PORT: Number(process.env.PORT) || 3000,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
  MONTO_INSCRIPCION: 400.0,
  JWT_SECRET: process.env.JWT_SECRET || '',
  IS_PROD: process.env.NODE_ENV === 'production',
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portal_unp'
  }
};
