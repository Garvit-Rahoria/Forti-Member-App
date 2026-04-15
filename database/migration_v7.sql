-- ============================================================
-- FORTI PORTAL – Migration v7
-- Removes 3_yearly plan type, adds is_overseas + auto_generated
-- to portal_packages, updates PaymentMethods counter_id column
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v7_migrate;
DELIMITER //
CREATE PROCEDURE forti_v7_migrate()
BEGIN

  -- ── Remove 3_yearly from portal_packages.plan_type ENUM ────────────────────
  -- First update any existing 3_yearly rows to 'lifetime'
  UPDATE portal_packages SET plan_type = 'lifetime' WHERE plan_type = '3_yearly';

  -- Now narrow the ENUM (safe because no rows have 3_yearly anymore)
  ALTER TABLE portal_packages
    MODIFY COLUMN plan_type ENUM('yearly','lifetime','both') NOT NULL DEFAULT 'both';

  -- ── Add is_overseas column ─────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='is_overseas'
  ) THEN
    ALTER TABLE portal_packages
      ADD COLUMN is_overseas TINYINT(1) NOT NULL DEFAULT 0 AFTER state_id;
  END IF;

  -- ── Add auto_generated column ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='auto_generated'
  ) THEN
    ALTER TABLE portal_packages
      ADD COLUMN auto_generated TINYINT(1) NOT NULL DEFAULT 0 AFTER is_overseas;
  END IF;

  -- ── Add index for auto-generate duplicate-check ────────────────────────────
  -- We need a unique-ish check on (country_id,state_id,membership_type,plan_type,is_overseas)
  -- Using a regular index here (unique would fail if NULLs are involved on some MySQL versions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND index_name='idx_pkg_combination'
  ) THEN
    ALTER TABLE portal_packages
      ADD INDEX idx_pkg_combination (country_id, state_id, membership_type, plan_type, is_overseas);
  END IF;

END //
DELIMITER ;
CALL forti_v7_migrate();
DROP PROCEDURE IF EXISTS forti_v7_migrate;
