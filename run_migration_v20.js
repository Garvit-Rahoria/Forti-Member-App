'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    // 1. Update role ENUM
    await conn.query(`
      ALTER TABLE portal_admin_users
        MODIFY COLUMN role ENUM(
          'super_admin','admin','manager','staff',
          'state_manager','office_staff','branch_manager'
        ) NOT NULL DEFAULT 'office_staff'
    `);
    console.log('+ role ENUM updated');

    // 2. Create application_notes table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS application_notes (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        submission_id INT UNSIGNED NOT NULL,
        created_by    INT UNSIGNED NOT NULL,
        note          TEXT NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sub  (submission_id),
        INDEX idx_user (created_by)
      )
    `);
    console.log('+ application_notes table ready');

    // 3. assigned_city on portal_admin_users
    const [c1] = await conn.query(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_admin_users' AND COLUMN_NAME='assigned_city'`);
    if (!c1[0].c) {
      await conn.query(`ALTER TABLE portal_admin_users ADD COLUMN assigned_city VARCHAR(100) NULL DEFAULT NULL AFTER assigned_location_type`);
      console.log('+ Added column: portal_admin_users.assigned_city');
    } else { console.log('= assigned_city already exists'); }

    // 4. applicant_city on fb_submissions
    const [c2] = await conn.query(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='applicant_city'`);
    if (!c2[0].c) {
      await conn.query(`ALTER TABLE fb_submissions ADD COLUMN applicant_city VARCHAR(100) NULL DEFAULT NULL AFTER applicant_phone`);
      console.log('+ Added column: fb_submissions.applicant_city');
    } else { console.log('= applicant_city already exists'); }

    // 5. edited_by_staff flag on fb_submission_data
    const [c3] = await conn.query(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submission_data' AND COLUMN_NAME='edited_by_staff'`);
    if (!c3[0].c) {
      await conn.query(`ALTER TABLE fb_submission_data ADD COLUMN edited_by_staff TINYINT(1) DEFAULT 0 AFTER value`);
      console.log('+ Added column: fb_submission_data.edited_by_staff');
    } else { console.log('= edited_by_staff already exists'); }

    // 6. original_value on fb_submission_data
    const [c4] = await conn.query(`SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submission_data' AND COLUMN_NAME='original_value'`);
    if (!c4[0].c) {
      await conn.query(`ALTER TABLE fb_submission_data ADD COLUMN original_value TEXT NULL DEFAULT NULL AFTER edited_by_staff`);
      console.log('+ Added column: fb_submission_data.original_value');
    } else { console.log('= original_value already exists'); }

    console.log('\nMigration v20 complete.');
  } catch (err) {
    console.error('Migration v20 FAILED:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
})();
