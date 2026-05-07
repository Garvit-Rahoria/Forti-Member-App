// run_migration_v28.js — Create portal_certificates table
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const fs   = require('fs');
const path = require('path');
const mysql = require('./backend/node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'forti',
    password: process.env.DB_PASS     || 'forti@2026',
    database: process.env.DB_NAME     || 'forti_membership',
    multipleStatements: true,
  });
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'migration_v28.sql'), 'utf8');
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        await conn.query(stmt);
        console.log('OK:', stmt.slice(0, 80));
      } catch (e) {
        if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.message.includes('already exists')) {
          console.log('SKIP (already exists):', stmt.slice(0, 80));
        } else {
          console.error('ERR:', e.message, '\nStmt:', stmt.slice(0, 120));
        }
      }
    }
    console.log('Migration v28 complete.');
  } finally {
    await conn.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
