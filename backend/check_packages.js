const { pool } = require('./src/config/database');

async function run() {
  const [rows] = await pool.query('SELECT id, name, code, price, currency, location, membership_type, duration, duration_months, is_active, auto_generated FROM portal_packages');
  console.log('--- portal_packages rows ---');
  console.log(rows);
  await pool.end();
}

run().catch(console.error);
