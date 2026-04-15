-- ============================================================================
-- Migration v18: Add password reset token columns to portal_admin_users
-- ============================================================================

SET @col1 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'portal_admin_users' AND COLUMN_NAME = 'reset_token');
SET @sql1 = IF(@col1 = 0,
  'ALTER TABLE portal_admin_users ADD COLUMN reset_token VARCHAR(64) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2 = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'portal_admin_users' AND COLUMN_NAME = 'reset_token_expires');
SET @sql2 = IF(@col2 = 0,
  'ALTER TABLE portal_admin_users ADD COLUMN reset_token_expires DATETIME NULL DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration v18 complete: password reset columns added to portal_admin_users' AS result;
