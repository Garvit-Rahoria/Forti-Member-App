-- ============================================================================
-- Migration: Standardize Manual Payment System
-- Run this migration to align database with the new payment workflow.
-- Safe to run multiple times — uses IF NOT EXISTS / IGNORE where possible.
-- ============================================================================

-- 1. Add invoice_id column to portal_payments (links payment to invoice)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'portal_payments' AND COLUMN_NAME = 'invoice_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE portal_payments ADD COLUMN invoice_id INT NULL AFTER submission_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add unique index on transaction_id (prevent duplicate payment submissions)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'portal_payments' AND INDEX_NAME = 'uniq_transaction_id');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE portal_payments ADD UNIQUE KEY uniq_transaction_id (transaction_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Migrate old status values: submitted → pending, verified → approved
UPDATE portal_payments SET status = 'pending'  WHERE status = 'submitted';
UPDATE portal_payments SET status = 'approved' WHERE status = 'verified';

-- 4. Update fb_submissions payment_status to align
UPDATE fb_submissions SET payment_status = 'pending'  WHERE payment_status = 'submitted';
UPDATE fb_submissions SET payment_status = 'approved' WHERE payment_status = 'verified';

-- 5. Add paid_amount, remaining_amount, status columns to invoices
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'paid_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE invoices ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'remaining_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE invoices ADD COLUMN remaining_amount DECIMAL(12,2) DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  "ALTER TABLE invoices ADD COLUMN status VARCHAR(20) DEFAULT 'unpaid'",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Initialize remaining_amount for existing invoices
UPDATE invoices SET remaining_amount = GREATEST(COALESCE(total_amount, 0) - COALESCE(paid_amount, 0), 0)
WHERE remaining_amount = 0 AND total_amount > 0;

-- Done
SELECT 'Migration complete: Manual Payment System standardized' AS result;
