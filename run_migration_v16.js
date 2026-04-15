/**
 * Migration v16 — Dynamic payment methods: add is_default column + seed locations
 * Run: node backend/run_migration_v16.js
 */
'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    // 1. Add is_default column if missing
    const [cols] = await conn.query(`
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'portal_payment_methods'
        AND COLUMN_NAME  = 'is_default'
    `);
    if (!cols.length) {
      await conn.query(`
        ALTER TABLE portal_payment_methods
          ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0 AFTER sort_order
      `);
      console.log('  + Added column: is_default');
    } else {
      console.log('  = Column already exists: is_default');
    }

    // 2. Mark UPI & Bank Transfer (NULL location) as is_default = 1
    const [r1] = await conn.query(`
      UPDATE portal_payment_methods
        SET is_default = 1
      WHERE is_active = 1
        AND type IN ('upi', 'bank_transfer')
        AND (location IS NULL OR location = '')
    `);
    console.log(`  ~ Marked ${r1.affectedRows} UPI/Bank Transfer method(s) as is_default=1`);

    // 3. Move International Wire to overseas location (only if still unassigned)
    const [r2] = await conn.query(`
      UPDATE portal_payment_methods
        SET location = 'overseas', is_default = 0
      WHERE type = 'international_wire'
        AND (location IS NULL OR location = '')
    `);
    console.log(`  ~ Moved ${r2.affectedRows} International Wire method(s) to location='overseas'`);

    console.log('\nMigration v16 applied successfully.');
  } catch (err) {
    console.error('Migration v16 failed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit();
  }
})();
