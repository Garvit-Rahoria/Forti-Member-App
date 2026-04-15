const path = require('path');
const fs   = require('fs');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const mysql = require(path.join(__dirname, 'backend', 'node_modules', 'mysql2', 'promise'));

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'forti_membership',
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'database/migration_v22.sql'),
      'utf8'
    );
    const [results] = await conn.query(sql);
    const last = Array.isArray(results) ? results[results.length - 1] : results;
    if (Array.isArray(last) && last[0]?.result) {
      console.log(last[0].result);
    } else {
      console.log('Migration v22 executed successfully.');
    }
  } finally {
    await conn.end();
  }
}

run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
