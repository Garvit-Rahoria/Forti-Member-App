-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v17: 3-Year plan duration support
-- - Adds three_year_multiplier column to package_pricing_rules
-- - Fixes duration_months = 36 for any existing '3years' packages
-- - Backfills 3-year packages for all location × membership_type combinations
-- Run once against the forti_membership database.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add three_year_multiplier column to package_pricing_rules
DROP PROCEDURE IF EXISTS _v17_add_3y_col;
DELIMITER //
CREATE PROCEDURE _v17_add_3y_col()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'package_pricing_rules'
      AND COLUMN_NAME  = 'three_year_multiplier'
  ) THEN
    ALTER TABLE package_pricing_rules
      ADD COLUMN three_year_multiplier DECIMAL(5,2) NOT NULL DEFAULT 3.00
      AFTER lifetime_multiplier;
  END IF;
END //
DELIMITER ;
CALL _v17_add_3y_col();
DROP PROCEDURE IF EXISTS _v17_add_3y_col;

-- Step 2: Fix duration_months for any existing '3years' packages
UPDATE portal_packages
  SET duration_months = 36
WHERE duration = '3years'
  AND (duration_months IS NULL OR duration_months != 36);

-- Step 3: Backfill 3-year packages for all location × type combos (skip existing)
DROP PROCEDURE IF EXISTS _v17_backfill_3y;
DELIMITER //
CREATE PROCEDURE _v17_backfill_3y()
BEGIN
  DECLARE done        INT DEFAULT FALSE;
  DECLARE v_loc       VARCHAR(50);
  DECLARE v_type      VARCHAR(20);
  DECLARE v_price     DECIMAL(12,2);
  DECLARE v_mult      DECIMAL(5,2);
  DECLARE v_curr      VARCHAR(10);
  DECLARE v_exists    INT;
  DECLARE v_loc_lbl   VARCHAR(50);
  DECLARE v_type_lbl  VARCHAR(20);
  DECLARE v_loc_code  VARCHAR(10);
  DECLARE v_type_code VARCHAR(10);
  DECLARE v_name      VARCHAR(200);
  DECLARE v_code      VARCHAR(100);
  DECLARE v_3y_price  DECIMAL(12,2);

  DECLARE cur CURSOR FOR
    SELECT location, membership_type, yearly_price, three_year_multiplier, currency
    FROM package_pricing_rules
    WHERE is_active = 1;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_loc, v_type, v_price, v_mult, v_curr;
    IF done THEN LEAVE read_loop; END IF;

    -- Check if a 3-year package already exists for this combo
    SELECT COUNT(*) INTO v_exists
    FROM portal_packages
    WHERE location = v_loc
      AND membership_type = v_type
      AND duration = '3years'
      AND country_id IS NULL
      AND is_active = 1;

    IF v_exists = 0 THEN
      SET v_loc_lbl  = CASE v_loc
        WHEN 'rajasthan'    THEN 'Rajasthan'
        WHEN 'other_states' THEN 'Other States'
        WHEN 'overseas'     THEN 'Overseas'
        ELSE v_loc END;
      SET v_type_lbl = CASE v_type
        WHEN 'individual' THEN 'Individual'
        WHEN 'corporate'  THEN 'Corporate'
        ELSE v_type END;
      SET v_loc_code  = CASE v_loc
        WHEN 'rajasthan'    THEN 'RAJ'
        WHEN 'other_states' THEN 'OTH'
        WHEN 'overseas'     THEN 'OVSEA'
        ELSE UPPER(SUBSTR(v_loc, 1, 3)) END;
      SET v_type_code = CASE v_type
        WHEN 'individual' THEN 'IND'
        WHEN 'corporate'  THEN 'CORP'
        ELSE UPPER(SUBSTR(v_type, 1, 4)) END;

      SET v_name     = CONCAT(v_loc_lbl, ' ', v_type_lbl, ' - 3 Years');
      SET v_code     = CONCAT(v_loc_code, '-', v_type_code, '-3Y');
      SET v_3y_price = ROUND(v_price * v_mult, 2);

      INSERT IGNORE INTO portal_packages
        (name, code, price, currency, location, membership_type, duration, duration_months,
         country_id, description, benefits, is_active, auto_generated)
      VALUES
        (v_name, v_code, v_3y_price, v_curr,
         v_loc, v_type, '3years', 36,
         NULL,
         CONCAT('3-year membership plan for ', v_loc_lbl, ' ', v_type_lbl),
         '["FORTI Membership Certificate","Digital ID Card with QR Code","Member Dashboard Access","Access to all events","3-year coverage"]',
         1, 1);
    END IF;
  END LOOP;
  CLOSE cur;
END //
DELIMITER ;
CALL _v17_backfill_3y();
DROP PROCEDURE IF EXISTS _v17_backfill_3y;

SELECT 'Migration v17 complete' AS status;
