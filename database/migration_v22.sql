-- ============================================================================
-- Migration v22: Add suspension tracking columns to fb_submissions
-- Stores reason, who suspended, and when for member suspension auditing.
-- ============================================================================

-- 1. Add suspension_reason column
SET @has_reason = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'suspension_reason'
);
SET @sql_reason = IF(@has_reason = 0,
  'ALTER TABLE fb_submissions ADD COLUMN suspension_reason TEXT NULL DEFAULT NULL AFTER member_status',
  'SELECT 1 -- suspension_reason already exists'
);
PREPARE stmt FROM @sql_reason; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add suspended_by column (references portal_admin_users.id)
SET @has_by = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'suspended_by'
);
SET @sql_by = IF(@has_by = 0,
  'ALTER TABLE fb_submissions ADD COLUMN suspended_by INT UNSIGNED NULL DEFAULT NULL AFTER suspension_reason',
  'SELECT 1 -- suspended_by already exists'
);
PREPARE stmt2 FROM @sql_by; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 3. Add suspended_at column
SET @has_at = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'suspended_at'
);
SET @sql_at = IF(@has_at = 0,
  'ALTER TABLE fb_submissions ADD COLUMN suspended_at DATETIME NULL DEFAULT NULL AFTER suspended_by',
  'SELECT 1 -- suspended_at already exists'
);
PREPARE stmt3 FROM @sql_at; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

SELECT 'Migration v22 complete: suspension tracking columns added to fb_submissions' AS result;
