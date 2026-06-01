const { pool } = require('./src/config/database');

async function fix() {
  await pool.query(`UPDATE portal_packages SET duration = '1year' WHERE duration = 'yearly'`);
  console.log('Fixed duration values in db.');
  process.exit(0);
}

fix();
