-- ============================================================
-- FORTI PORTAL – Migration v11
-- Adds:
--   • plan_payment_methods  (junction table: plan ↔ payment method)
--   • portal_packages: currency_id FK to currency_settings
--   • fb_submissions: package_id, plan_type, membership_type columns
--   • portal_payments: payment_proof column rename guard
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v11_migrate;
DELIMITER //
CREATE PROCEDURE forti_v11_migrate()
BEGIN

  -- ── plan_payment_methods junction table ──────────────────────────────────
  CREATE TABLE IF NOT EXISTS plan_payment_methods (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    package_id INT UNSIGNED NOT NULL,
    method_id  INT UNSIGNED NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_plan_method (package_id, method_id),
    FOREIGN KEY (package_id) REFERENCES portal_packages(id)  ON DELETE CASCADE,
    FOREIGN KEY (method_id)  REFERENCES portal_payment_methods(id) ON DELETE CASCADE
  );

  -- ── portal_packages: currency_id (FK to currency_settings) ───────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='currency_id'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN currency_id INT UNSIGNED NULL AFTER currency;
  END IF;

  -- ── fb_submissions: package_id ────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='fb_submissions'
      AND column_name='package_id'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN package_id INT UNSIGNED NULL;
  END IF;

  -- ── fb_submissions: plan_type ─────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='fb_submissions'
      AND column_name='plan_type'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN plan_type ENUM('yearly','lifetime') NULL;
  END IF;

  -- ── fb_submissions: membership_type ──────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='fb_submissions'
      AND column_name='membership_type'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN membership_type ENUM('individual','corporate') NULL;
  END IF;

  -- ── portal_payments: screenshot_path guard ────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_payments'
      AND column_name='screenshot_path'
  ) THEN
    ALTER TABLE portal_payments ADD COLUMN screenshot_path VARCHAR(500) NULL;
  END IF;

  -- ── portal_payments: approved_by / approved_at ────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_payments'
      AND column_name='approved_by'
  ) THEN
    ALTER TABLE portal_payments ADD COLUMN approved_by INT UNSIGNED NULL;
    ALTER TABLE portal_payments ADD COLUMN approved_at TIMESTAMP NULL;
  END IF;

  -- ── member_accounts: expiry_date ─────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='member_accounts'
      AND column_name='expiry_date'
  ) THEN
    ALTER TABLE member_accounts ADD COLUMN expiry_date DATE NULL;
    ALTER TABLE member_accounts ADD COLUMN plan_type VARCHAR(20) NULL;
    ALTER TABLE member_accounts ADD COLUMN membership_type VARCHAR(30) NULL;
  END IF;

END //
DELIMITER ;
CALL forti_v11_migrate();
DROP PROCEDURE IF EXISTS forti_v11_migrate;

-- Backfill plan_payment_methods from existing JSON payment_methods
-- (runs only once, safe to run again since it uses INSERT IGNORE)
INSERT IGNORE INTO plan_payment_methods (package_id, method_id)
SELECT p.id, pm.id
FROM portal_packages p
JOIN portal_payment_methods pm
  ON JSON_CONTAINS(p.payment_methods, CAST(pm.id AS JSON), '$')
WHERE p.payment_methods IS NOT NULL AND p.payment_methods != '[]' AND p.payment_methods != 'null';

SELECT 'migration_v11 OK' AS result;
