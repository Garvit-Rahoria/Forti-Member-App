-- ============================================================================
-- Migration v23: Fix plan_type column on fb_submissions
-- Changes ENUM('yearly','lifetime') → VARCHAR(20) to support all plan types
-- including '3years', '3_years', '1year', etc.
-- Also clears the ENUM error value '' stored for unsupported old values.
-- ============================================================================

-- 1. Modify plan_type column from ENUM to VARCHAR(20)
SET @col_type = (
  SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'fb_submissions'
    AND COLUMN_NAME  = 'plan_type'
);
SET @sql_alter = IF(@col_type = 'enum',
  'ALTER TABLE fb_submissions MODIFY COLUMN plan_type VARCHAR(20) NULL',
  'SELECT 1 -- plan_type already VARCHAR or does not exist'
);
PREPARE stmt FROM @sql_alter;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Clean up any empty-string ENUM error values stored previously
UPDATE fb_submissions SET plan_type = NULL WHERE plan_type = '';

-- 3. Backfill plan_type on fb_submissions from portal_packages where package_id is set
--    and plan_type is still NULL (records where 3years/1year was submitted)
UPDATE fb_submissions s
  JOIN portal_packages pp ON pp.id = s.package_id
SET s.plan_type = pp.plan_type
WHERE s.plan_type IS NULL AND s.package_id IS NOT NULL;

-- 4. Backfill plan_type on member_accounts from fb_submissions
UPDATE member_accounts ma
  JOIN fb_submissions s ON s.id = ma.submission_id
SET ma.plan_type = s.plan_type
WHERE (ma.plan_type IS NULL OR ma.plan_type = '') AND s.plan_type IS NOT NULL;

SELECT 'Migration v23 complete: plan_type fixed on fb_submissions and member_accounts' AS result;
