'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    const [cols1] = await conn.query(
      `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='iban'`
    );
    if (!cols1[0].c) {
      await conn.query(`ALTER TABLE portal_payment_methods ADD COLUMN iban VARCHAR(50) NULL AFTER swift_code`);
      console.log('+ Added column: iban');
    } else {
      console.log('= iban already exists');
    }

    const [cols2] = await conn.query(
      `SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='bank_address'`
    );
    if (!cols2[0].c) {
      await conn.query(`ALTER TABLE portal_payment_methods ADD COLUMN bank_address TEXT NULL AFTER iban`);
      console.log('+ Added column: bank_address');
    } else {
      console.log('= bank_address already exists');
    }

    console.log('Migration v19 complete.');
  } finally {
    conn.release();
    process.exit(0);
  }
})().catch(e => { console.error(e); process.exit(1); });
