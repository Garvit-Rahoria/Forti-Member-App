-- ============================================================================
-- Migration v20: Role enhancements — application_notes, staff edits, manager region
-- ============================================================================

-- 1. Ensure role ENUM contains all required values
ALTER TABLE portal_admin_users
  MODIFY COLUMN role ENUM(
    'super_admin','admin','manager','staff',
    'state_manager','office_staff','branch_manager'
  ) NOT NULL DEFAULT 'office_staff';

-- 2. application_notes — internal staff/manager notes on submissions (not visible to applicant)
CREATE TABLE IF NOT EXISTS application_notes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id INT UNSIGNED NOT NULL,
  created_by    INT UNSIGNED NOT NULL,              -- portal_admin_users.id
  note          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sub  (submission_id),
  INDEX idx_user (created_by)
);

-- 3. Add assigned_city column to portal_admin_users so city-level managers can be scoped
SET @has_city = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'portal_admin_users'
    AND COLUMN_NAME  = 'assigned_city'
);
SET @sql_city = IF(@has_city = 0,
  'ALTER TABLE portal_admin_users ADD COLUMN assigned_city VARCHAR(100) NULL DEFAULT NULL AFTER assigned_location_type',
  'SELECT 1 -- assigned_city already exists');
PREPARE stmt FROM @sql_city; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Add city column to fb_submissions for city-level region filtering
SET @has_sub_city = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'applicant_city'
);
SET @sql_sub_city = IF(@has_sub_city = 0,
  'ALTER TABLE fb_submissions ADD COLUMN applicant_city VARCHAR(100) NULL DEFAULT NULL AFTER applicant_phone',
  'SELECT 1 -- applicant_city already exists');
PREPARE stmt2 FROM @sql_sub_city; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 5. Add staff_editable flag to fb_submission_data — track which fields were edited by staff
SET @has_flag = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submission_data'
    AND COLUMN_NAME  = 'edited_by_staff'
);
SET @sql_flag = IF(@has_flag = 0,
  'ALTER TABLE fb_submission_data ADD COLUMN edited_by_staff TINYINT(1) DEFAULT 0 AFTER updated_at',
  'SELECT 1 -- edited_by_staff already exists');
PREPARE stmt3 FROM @sql_flag; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 6. Add original_value column to fb_submission_data so staff edits are auditable
SET @has_orig = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submission_data'
    AND COLUMN_NAME  = 'original_value'
);
SET @sql_orig = IF(@has_orig = 0,
  'ALTER TABLE fb_submission_data ADD COLUMN original_value TEXT NULL DEFAULT NULL AFTER edited_by_staff',
  'SELECT 1 -- original_value already exists');
PREPARE stmt4 FROM @sql_orig; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

SELECT 'Migration v20 complete: application_notes table created, staff edit columns added' AS result;
