/**
 * Apply PostgreSQL schema to a running database.
 * Usage: node database/setup.js
 * Requires: Docker Postgres on DB_PORT (default 5432) or set env vars.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'forti_membership',
  user:     process.env.DB_USER || 'forti',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'forti@2026',
});

async function runFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  console.log(`Ran: ${path.basename(filePath)}`);
}

async function setup() {
  const initDir = path.join(__dirname, 'init');
  const files = fs.readdirSync(initDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    try {
      await runFile(path.join(initDir, file));
    } catch (e) {
      console.log(`${file}: ${e.message.split('\n')[0]}`);
    }
  }

  await pool.end();
  console.log('\nPostgreSQL setup complete.');
}

setup().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
