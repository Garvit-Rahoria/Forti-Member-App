'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Running migration v25: add credited_inr_amount + exchange_rate to portal_payments...');

    const [[colCheck]] = await conn.query(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='credited_inr_amount'"
    );
    if (colCheck.c === 0) {
      await conn.query("ALTER TABLE portal_payments ADD COLUMN credited_inr_amount DECIMAL(12,2) DEFAULT NULL AFTER currency");
      console.log('  ✓ credited_inr_amount column added');
    } else {
      console.log('  – credited_inr_amount already exists, skipping');
    }

    const [[colCheck2]] = await conn.query(
      "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='exchange_rate'"
    );
    if (colCheck2.c === 0) {
      await conn.query("ALTER TABLE portal_payments ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT NULL AFTER credited_inr_amount");
      console.log('  ✓ exchange_rate column added');
    } else {
      console.log('  – exchange_rate already exists, skipping');
    }

    console.log('Migration v25 complete.');
  } catch (err) {
    console.error('Migration v25 failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
