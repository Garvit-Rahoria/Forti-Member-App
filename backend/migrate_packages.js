const { pool } = require('./src/config/database');

(async () => {
  try {
    // 1. Add location column if not exists
    try {
      await pool.query("ALTER TABLE portal_packages ADD COLUMN location VARCHAR(50) DEFAULT NULL AFTER is_overseas");
      console.log('Added location column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('location column already exists');
      else throw e;
    }

    // 2. Add duration column if not exists
    try {
      await pool.query("ALTER TABLE portal_packages ADD COLUMN duration VARCHAR(50) DEFAULT NULL AFTER plan_type");
      console.log('Added duration column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('duration column already exists');
      else throw e;
    }

    // 3. Backfill location from is_overseas
    await pool.query(`
      UPDATE portal_packages 
      SET location = CASE WHEN is_overseas = 1 THEN 'overseas' ELSE 'rajasthan' END 
      WHERE location IS NULL
    `);
    console.log('Backfilled location');

    // 4. Backfill duration from plan_type
    await pool.query(`
      UPDATE portal_packages 
      SET duration = CASE 
        WHEN plan_type = 'yearly' THEN '1year' 
        WHEN plan_type = 'lifetime' THEN 'lifetime' 
        ELSE '1year' 
      END 
      WHERE duration IS NULL
    `);
    console.log('Backfilled duration');

    // 5. Verify
    const [rows] = await pool.query('SELECT id, name, location, duration, plan_type, is_overseas, country_id FROM portal_packages');
    console.table(rows);

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
