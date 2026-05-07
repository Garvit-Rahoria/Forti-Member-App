require('./backend/node_modules/dotenv').config({ path: './backend/.env' });
const fs = require('fs');
const path = require('path');
const mysql = require('./backend/node_modules/mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'forti',
    password: process.env.DB_PASS || 'forti@2026',
    database: process.env.DB_NAME || 'forti_membership',
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'migration_v29.sql'), 'utf8');
    const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      try {
        await conn.query(statement);
        console.log('OK:', statement.slice(0, 80));
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log('SKIP (already exists):', statement.slice(0, 80));
        } else {
          console.error('ERR:', error.message, '\nStmt:', statement.slice(0, 120));
        }
      }
    }
    console.log('Migration v29 complete.');
  } finally {
    await conn.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});