-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v19: Add iban + bank_address to portal_payment_methods
-- Run once against the forti_membership database.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add iban column
SET @has_iban = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'portal_payment_methods'
    AND COLUMN_NAME  = 'iban');
SET @sql_iban = IF(@has_iban = 0,
  'ALTER TABLE portal_payment_methods ADD COLUMN iban VARCHAR(50) NULL AFTER swift_code',
  'SELECT 1 -- iban already exists');
PREPARE stmt FROM @sql_iban; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add bank_address column
SET @has_addr = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'portal_payment_methods'
    AND COLUMN_NAME  = 'bank_address');
SET @sql_addr = IF(@has_addr = 0,
  'ALTER TABLE portal_payment_methods ADD COLUMN bank_address TEXT NULL AFTER iban',
  'SELECT 1 -- bank_address already exists');
PREPARE stmt FROM @sql_addr; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration v19 complete: iban + bank_address added to portal_payment_methods' AS result;
