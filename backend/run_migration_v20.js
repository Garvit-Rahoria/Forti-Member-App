'use strict';
// ─────────────────────────────────────────────────────────────
//  run_migration_v20.js  (run from inside /backend)
//  node run_migration_v20.js
// ─────────────────────────────────────────────────────────────
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql2 = require('mysql2/promise');

const pool = mysql2.createPool({
  host    : process.env.DB_HOST     || '127.0.0.1',
  port    : parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'forti_membership',
  user    : process.env.DB_USER     || 'forti',
  password: process.env.DB_PASS     || 'forti@2026',
  waitForConnections: true,
  connectionLimit   : 5,
});

(async () => {
  const conn = await pool.getConnection();
  console.log('Connected to MySQL.\n');

  try {
    // ── 1. Ensure role ENUM has all required values ──────────────────────
    await conn.query(`
      ALTER TABLE portal_admin_users
        MODIFY COLUMN role ENUM(
          'super_admin','admin','manager','staff',
          'state_manager','office_staff','branch_manager'
        ) NOT NULL DEFAULT 'office_staff'
    `);
    console.log('[1/6] role ENUM updated');

    // ── 2. Create application_notes table ────────────────────────────────
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[2/6] application_notes table ready');

    // ── 3. assigned_city on portal_admin_users ───────────────────────────
    const [[{ c: c1 }]] = await conn.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'portal_admin_users'
        AND COLUMN_NAME  = 'assigned_city'
    `);
    if (!c1) {
      await conn.query(`
        ALTER TABLE portal_admin_users
          ADD COLUMN assigned_city VARCHAR(100) NULL DEFAULT NULL
          AFTER assigned_state_id
      `);
      console.log('[3/6] Added column portal_admin_users.assigned_city');
    } else {
      console.log('[3/6] assigned_city already exists — skipped');
    }

    // ── 4. applicant_city on fb_submissions ──────────────────────────────
    const [[{ c: c2 }]] = await conn.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'fb_submissions'
        AND COLUMN_NAME  = 'applicant_city'
    `);
    if (!c2) {
      await conn.query(`
        ALTER TABLE fb_submissions
          ADD COLUMN applicant_city VARCHAR(100) NULL DEFAULT NULL
          AFTER applicant_phone
      `);
      console.log('[4/6] Added column fb_submissions.applicant_city');
    } else {
      console.log('[4/6] applicant_city already exists — skipped');
    }

    // ── 5. edited_by_staff flag on fb_submission_data ────────────────────
    const [[{ c: c3 }]] = await conn.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'fb_submission_data'
        AND COLUMN_NAME  = 'edited_by_staff'
    `);
    if (!c3) {
      await conn.query(`
        ALTER TABLE fb_submission_data
          ADD COLUMN edited_by_staff TINYINT(1) NOT NULL DEFAULT 0
          AFTER value
      `);
      console.log('[5/6] Added column fb_submission_data.edited_by_staff');
    } else {
      console.log('[5/6] edited_by_staff already exists — skipped');
    }

    // ── 6. original_value on fb_submission_data ──────────────────────────
    const [[{ c: c4 }]] = await conn.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'fb_submission_data'
        AND COLUMN_NAME  = 'original_value'
    `);
    if (!c4) {
      await conn.query(`
        ALTER TABLE fb_submission_data
          ADD COLUMN original_value TEXT NULL DEFAULT NULL
          AFTER edited_by_staff
      `);
      console.log('[6/6] Added column fb_submission_data.original_value');
    } else {
      console.log('[6/6] original_value already exists — skipped');
    }

    console.log('\n✓ Migration v20 completed successfully.');
  } catch (err) {
    console.error('\n✗ Migration v20 FAILED:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
})();
