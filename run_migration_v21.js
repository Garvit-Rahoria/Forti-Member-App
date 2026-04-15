'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    // 1. Add package_id column
    const [[{ c }]] = await conn.query(
      `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='member_accounts' AND COLUMN_NAME='package_id'`
    );
    if (!c) {
      await conn.query(
        `ALTER TABLE member_accounts ADD COLUMN package_id INT UNSIGNED NULL AFTER membership_type`
      );
      console.log('+ Added column: member_accounts.package_id');
    } else {
      console.log('= package_id already exists in member_accounts');
    }

    // 2. Backfill from fb_submissions
    const [r1] = await conn.query(
      `UPDATE member_accounts ma
       JOIN fb_submissions s ON s.id = ma.submission_id
       SET ma.package_id = s.package_id
       WHERE ma.package_id IS NULL AND s.package_id IS NOT NULL`
    );
    console.log(`+ Backfilled ${r1.affectedRows} rows from fb_submissions`);

    // 3. Backfill remaining nulls from latest verified renewal
    const [r2] = await conn.query(
      `UPDATE member_accounts ma
       JOIN (
         SELECT r.submission_id, r.package_id
         FROM portal_renewals r
         INNER JOIN (
           SELECT submission_id, MAX(id) AS latest_id
           FROM portal_renewals
           WHERE package_id IS NOT NULL AND status = 'verified'
           GROUP BY submission_id
         ) lr ON lr.latest_id = r.id
       ) newest ON newest.submission_id = ma.submission_id
       SET ma.package_id = newest.package_id
       WHERE ma.package_id IS NULL AND newest.package_id IS NOT NULL`
    );
    console.log(`+ Backfilled ${r2.affectedRows} rows from portal_renewals`);

    console.log('Migration v21 complete.');
  } finally {
    conn.release();
    process.exit(0);
  }
})().catch(e => { console.error(e); process.exit(1); });
