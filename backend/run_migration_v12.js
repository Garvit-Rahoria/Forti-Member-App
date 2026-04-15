require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    await pool.query('ALTER TABLE portal_packages ADD COLUMN location VARCHAR(50) NULL AFTER is_overseas');
    console.log('location column added');
  } catch (e) {
    console.log('location:', e.message);
  }

  try {
    await pool.query('ALTER TABLE portal_packages ADD COLUMN duration VARCHAR(20) NULL AFTER location');
    console.log('duration column added');
  } catch (e) {
    console.log('duration:', e.message);
  }

  try {
    await pool.query(`UPDATE portal_packages SET duration = CASE
      WHEN plan_type = 'yearly' THEN '1year'
      WHEN plan_type = 'lifetime' THEN 'lifetime'
      ELSE '1year'
    END WHERE duration IS NULL`);
    console.log('backfill done');
  } catch (e) {
    console.log('backfill:', e.message);
  }

  process.exit(0);
})();
