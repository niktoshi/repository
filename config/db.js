const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// Простой загрузчик .env без внешних зависимостей
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (m) {
      let value = (m[2] || '').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stroymarket',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool.promise();
