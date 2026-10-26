const mysql = require('mysql2/promise');
const { DB } = require('../config');

module.exports = mysql.createPool({
  ...DB,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10
});
