-- ============================================================
-- FORTI PORTAL – Migration v3
-- Adds membership_type / plan_type / country scope to packages,
-- country_id to payment_methods, and data JSON to fb_submissions
-- ============================================================

USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v3_migrate;

DELIMITER //
CREATE PROCEDURE forti_v3_migrate()
BEGIN
  -- fb_submissions: add data JSON column for storing full form payload
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='data'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN data JSON NULL AFTER user_agent;
  END IF;

  -- portal_packages: membership_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='portal_packages' AND column_name='membership_type'
  ) THEN
    ALTER TABLE portal_packages
      ADD COLUMN membership_type ENUM('individual','corporate','both') NOT NULL DEFAULT 'both';
  END IF;

  -- portal_packages: plan_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='portal_packages' AND column_name='plan_type'
  ) THEN
    ALTER TABLE portal_packages
      ADD COLUMN plan_type ENUM('yearly','lifetime','both') NOT NULL DEFAULT 'both';
  END IF;

  -- portal_packages: country_id (NULL = applies globally)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='portal_packages' AND column_name='country_id'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN country_id SMALLINT UNSIGNED NULL;
  END IF;

  -- portal_packages: state_id (NULL = applies to whole country)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='portal_packages' AND column_name='state_id'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN state_id SMALLINT UNSIGNED NULL;
  END IF;

  -- portal_payment_methods: country_id (NULL = global / default)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='portal_payment_methods' AND column_name='country_id'
  ) THEN
    ALTER TABLE portal_payment_methods ADD COLUMN country_id SMALLINT UNSIGNED NULL AFTER sort_order;
  END IF;
END //
DELIMITER ;

CALL forti_v3_migrate();
DROP PROCEDURE IF EXISTS forti_v3_migrate;

-- Update existing seed packages with proper membership_type and plan_type
UPDATE portal_packages SET membership_type='individual', plan_type='yearly'   WHERE code='IND-1YR';
UPDATE portal_packages SET membership_type='corporate',  plan_type='yearly'   WHERE code='CORP-1YR';
UPDATE portal_packages SET membership_type='individual', plan_type='yearly'   WHERE code='STU-1YR';
UPDATE portal_packages SET membership_type='individual', plan_type='lifetime' WHERE code='LFT';
