'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Running migration v26: create durations table...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS durations (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        label      VARCHAR(50)  NOT NULL,
        value      TINYINT UNSIGNED NULL,
        type       ENUM('year','lifetime') NOT NULL DEFAULT 'year',
        sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
        is_active  TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  ✓ durations table created (or already exists)');

    // Seed defaults if empty
    const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM durations');
    if (cnt === 0) {
      await conn.query(`
        INSERT INTO durations (label, value, type, sort_order) VALUES
          ('1 Year',   1,    'year',     1),
          ('3 Years',  3,    'year',     2),
          ('Lifetime', NULL, 'lifetime', 3)
      `);
      console.log('  ✓ Default durations seeded (1 Year, 3 Years, Lifetime)');
    } else {
      console.log(`  – durations already has ${cnt} row(s), skipping seed`);
    }

    console.log('\nMigration v26 complete!');
  } catch (err) {
    console.error('Migration v26 failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
