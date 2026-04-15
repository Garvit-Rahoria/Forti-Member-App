-- Migration v12: Add location column to portal_packages for simplified location system
-- Locations: jaipur, rajasthan, other_states, international
-- Duration mapping: plan_type 'yearly' = '1year', plan_type 'lifetime' = 'lifetime'

-- Add location column if not exists
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'portal_packages'
    AND COLUMN_NAME = 'location'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE portal_packages ADD COLUMN location VARCHAR(50) NULL AFTER is_overseas',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add duration column if not exists (maps: '1year', 'lifetime')
SET @col_exists2 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'portal_packages'
    AND COLUMN_NAME = 'duration'
);
SET @sql2 = IF(@col_exists2 = 0,
  'ALTER TABLE portal_packages ADD COLUMN duration VARCHAR(20) NULL AFTER location',
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Backfill duration from plan_type for existing rows
UPDATE portal_packages SET duration = CASE
  WHEN plan_type = 'yearly' THEN '1year'
  WHEN plan_type = 'lifetime' THEN 'lifetime'
  ELSE '1year'
END WHERE duration IS NULL;
