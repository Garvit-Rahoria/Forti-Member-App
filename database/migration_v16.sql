-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v16: Dynamic payment methods — add is_default + location-seeding
-- Run once against the forti_membership database.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add is_default column if not present
DROP PROCEDURE IF EXISTS _add_is_default;
DELIMITER //
CREATE PROCEDURE _add_is_default()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'portal_payment_methods'
      AND COLUMN_NAME  = 'is_default'
  ) THEN
    ALTER TABLE portal_payment_methods
      ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0
      AFTER sort_order;
  END IF;
END //
DELIMITER ;
CALL _add_is_default();
DROP PROCEDURE IF EXISTS _add_is_default;

-- 2. Mark UPI & Bank Transfer methods (location IS NULL) as is_default=1
--    These are shown to domestic applicants (rajasthan / other_states) as fallback.
UPDATE portal_payment_methods
  SET is_default = 1
WHERE is_active = 1
  AND type IN ('upi', 'bank_transfer')
  AND (location IS NULL OR location = '');

-- 3. Move International Wire to overseas location so it is NOT shown to India users.
--    Only updates rows that still have no location set.
UPDATE portal_payment_methods
  SET location = 'overseas', is_default = 0
WHERE type = 'international_wire'
  AND (location IS NULL OR location = '');
