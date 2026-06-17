const { pool } = require('./backend/src/config/database');

async function check() {
  try {
    const [rows] = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'portal_payment_methods';
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  pool.end();
}
check();
