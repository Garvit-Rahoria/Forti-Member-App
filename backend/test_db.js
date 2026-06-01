const { pool } = require('./src/config/database');

async function test() {
  const [rows] = await pool.query(`SELECT location, membership_type, duration, count(*) as count FROM portal_packages GROUP BY location, membership_type, duration`);
  console.table(rows);
  process.exit(0);
}

test();
