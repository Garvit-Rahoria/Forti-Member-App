const { pool } = require('./src/config/database');

async function run() {
  try {
    // 1. Backfill location from is_overseas
    const [r1] = await pool.query(`
      UPDATE portal_packages 
      SET location = CASE WHEN is_overseas = TRUE THEN 'overseas' ELSE 'rajasthan' END 
      WHERE location IS NULL
    `);
    console.log('Backfilled location rows:', r1.affectedRows);

    // 2. Backfill duration from plan_type
    const [r2] = await pool.query(`
      UPDATE portal_packages 
      SET duration = CASE 
        WHEN plan_type = 'yearly' THEN '1year' 
        WHEN plan_type = 'lifetime' THEN 'lifetime' 
        ELSE '1year' 
      END 
      WHERE duration IS NULL
    `);
    console.log('Backfilled duration rows:', r2.affectedRows);

    // 3. Verify
    const [rows] = await pool.query('SELECT id, name, location, duration, plan_type, is_overseas FROM portal_packages');
    console.table(rows);
    console.log('Backfill successful!');
  } catch (err) {
    console.error('Backfill failed:', err);
  }
  await pool.end();
}

run().catch(console.error);
