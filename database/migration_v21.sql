-- ============================================================================
-- Migration v21: Add package_id to member_accounts
-- Links each member account to their active membership plan.
-- Also backfills package_id from fb_submissions and portal_renewals.
-- ============================================================================

-- 1. Add package_id column to member_accounts (safe: checks first)
SET @has_pkg = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'member_accounts'
    AND COLUMN_NAME  = 'package_id'
);
SET @sql_pkg = IF(@has_pkg = 0,
  'ALTER TABLE member_accounts ADD COLUMN package_id INT UNSIGNED NULL AFTER membership_type',
  'SELECT 1 -- package_id already exists'
);
PREPARE stmt FROM @sql_pkg; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Backfill package_id from fb_submissions.package_id
UPDATE member_accounts ma
JOIN fb_submissions s ON s.id = ma.submission_id
SET ma.package_id = s.package_id
WHERE ma.package_id IS NULL
  AND s.package_id IS NOT NULL;

-- 3. Backfill remaining nulls from the latest verified renewal
UPDATE member_accounts ma
JOIN (
  SELECT r.submission_id, r.package_id
  FROM portal_renewals r
  INNER JOIN (
    SELECT submission_id, MAX(id) AS latest_id
    FROM portal_renewals
    WHERE package_id IS NOT NULL
      AND status = 'verified'
    GROUP BY submission_id
  ) lr ON lr.latest_id = r.id
) newest ON newest.submission_id = ma.submission_id
SET ma.package_id = newest.package_id
WHERE ma.package_id IS NULL
  AND newest.package_id IS NOT NULL;

SELECT 'Migration v21 complete: package_id added and backfilled in member_accounts' AS result;
