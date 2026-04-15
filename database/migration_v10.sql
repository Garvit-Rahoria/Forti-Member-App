-- ============================================================
-- FORTI PORTAL – Migration v10
-- Adds:
--   • city_id to portal_packages  (country→state→city hierarchy)
--   • tax_rate, tax_amount, total_amount to portal_packages
--   • state_id + city_id to portal_payment_methods
--   • currency_settings table  (country-wise currency config)
--   • Unique constraint update to include city_id
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v10_migrate;
DELIMITER //
CREATE PROCEDURE forti_v10_migrate()
BEGIN

  -- ── portal_packages: city_id ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='city_id'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN city_id INT UNSIGNED NULL AFTER state_id;
  END IF;

  -- ── portal_packages: tax_rate ─────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='tax_rate'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER price;
  END IF;

  -- ── portal_packages: tax_amount ───────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='tax_amount'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER tax_rate;
  END IF;

  -- ── portal_packages: total_amount ─────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_packages'
      AND column_name='total_amount'
  ) THEN
    ALTER TABLE portal_packages ADD COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER tax_amount;
  END IF;

  -- Back-fill total_amount for existing rows (price + tax_amount)
  UPDATE portal_packages SET total_amount = price + tax_amount WHERE total_amount = 0;

  -- ── portal_payment_methods: state_id ──────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_payment_methods'
      AND column_name='state_id'
  ) THEN
    ALTER TABLE portal_payment_methods ADD COLUMN state_id INT UNSIGNED NULL AFTER country_id;
  END IF;

  -- ── portal_payment_methods: city_id ───────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership'
      AND table_name='portal_payment_methods'
      AND column_name='city_id'
  ) THEN
    ALTER TABLE portal_payment_methods ADD COLUMN city_id INT UNSIGNED NULL AFTER state_id;
  END IF;

  -- ── Drop old unique constraint if it exists (we'll replace it) ────────────
  -- (safe to ignore error if constraint doesn't exist)
  BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
    ALTER TABLE portal_packages DROP INDEX uq_package_combo;
  END;

END //
DELIMITER ;
CALL forti_v10_migrate();
DROP PROCEDURE IF EXISTS forti_v10_migrate;


-- ── currency_settings table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currency_settings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_id      SMALLINT UNSIGNED NULL,              -- NULL = default/global
  currency_code   VARCHAR(10) NOT NULL DEFAULT 'INR',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
  currency_name   VARCHAR(80) NOT NULL DEFAULT 'Indian Rupee',
  exchange_rate   DECIMAL(14,6) NOT NULL DEFAULT 1.000000, -- relative to base
  is_default      TINYINT(1) NOT NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_currency_country UNIQUE (country_id, currency_code)
);

-- Seed default currencies (idempotent)
INSERT IGNORE INTO currency_settings
  (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default)
VALUES
  (NULL, 'INR', '₹',  'Indian Rupee',      1.000000, 1),
  (NULL, 'USD', '$',  'US Dollar',          0.012000, 0),
  (NULL, 'EUR', '€',  'Euro',               0.011000, 0),
  (NULL, 'GBP', '£',  'British Pound',      0.0094,   0),
  (NULL, 'AED', 'د.إ','UAE Dirham',          0.044000, 0),
  (NULL, 'SGD', 'S$', 'Singapore Dollar',   0.016000, 0),
  (NULL, 'AUD', 'A$', 'Australian Dollar',  0.018000, 0),
  (NULL, 'CAD', 'C$', 'Canadian Dollar',    0.016000, 0);


-- ── Rebuild unique constraint including city_id ───────────────────────────────
-- First clean up any duplicates that would violate the new constraint
DELETE p1 FROM portal_packages p1
INNER JOIN portal_packages p2
  ON  (p1.country_id <=> p2.country_id)
  AND (p1.state_id   <=> p2.state_id)
  AND (p1.city_id    <=> p2.city_id)
  AND p1.membership_type = p2.membership_type
  AND p1.plan_type       = p2.plan_type
  AND p1.id > p2.id;

ALTER TABLE portal_packages
  ADD CONSTRAINT uq_package_combo_v10
  UNIQUE (country_id, state_id, city_id, membership_type, plan_type);


-- Done
SELECT 'migration_v10 OK' AS result;
