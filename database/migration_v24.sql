-- ============================================================================
-- Migration v24: Fix member_status default, add activated_at/activated_by,
--                fix submission default, add pending_info to status ENUM
-- ============================================================================

-- 1. Change fb_submissions.member_status DEFAULT from 'active' to 'inactive'
--    (New applications should start as inactive until admin explicitly activates)
ALTER TABLE fb_submissions
  MODIFY COLUMN member_status
    ENUM('active','expired','suspended','inactive','payment_verified')
    NOT NULL DEFAULT 'inactive';

-- 2. Fix existing submissions: anything not actually active should be 'inactive'
UPDATE fb_submissions
  SET member_status = 'inactive'
  WHERE member_status = 'active'
    AND status NOT IN ('active');

-- 3. Add 'pending_info' to fb_submissions.status ENUM (was missing from migration_v15)
ALTER TABLE fb_submissions
  MODIFY COLUMN status
    ENUM('draft','submitted','under_review','payment_pending','payment_submitted',
         'payment_verified','approved','rejected','active','expired','pending_info')
    NOT NULL DEFAULT 'draft';

-- 4. Add activated_at column
SET @has_act = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'activated_at'
);
SET @sql_act = IF(@has_act = 0,
  'ALTER TABLE fb_submissions ADD COLUMN activated_at DATETIME NULL DEFAULT NULL AFTER approved_at',
  'SELECT 1'
);
PREPARE stmt FROM @sql_act; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Add activated_by column
SET @has_by = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'activated_by'
);
SET @sql_by = IF(@has_by = 0,
  'ALTER TABLE fb_submissions ADD COLUMN activated_by INT UNSIGNED NULL DEFAULT NULL AFTER activated_at',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql_by; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 6. Also add info_request_message if missing (from migration_v15)
SET @has_msg = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'info_request_message'
);
SET @sql_msg = IF(@has_msg = 0,
  'ALTER TABLE fb_submissions ADD COLUMN info_request_message TEXT DEFAULT NULL AFTER review_notes',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql_msg; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 7. Fix member_accounts: already-active member entries should stay active
--    (these have been properly activated before this migration)
UPDATE member_accounts ma
  JOIN fb_submissions s ON s.id = ma.submission_id
  SET s.member_status = 'active'
  WHERE ma.is_active = 1 AND s.status = 'active';

SELECT 'Migration v24 complete: member_status default fixed, pending_info added, activated_at/by added' AS result;
