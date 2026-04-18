-- Fix all missing columns (MySQL 8.0 compatible, no ADD COLUMN IF NOT EXISTS)
-- Run this once against forti_membership

-- ── fb_submissions ───────────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='reviewed_by')=0,
  'ALTER TABLE fb_submissions ADD COLUMN reviewed_by INT UNSIGNED NULL AFTER approved_at','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='review_notes')=0,
  'ALTER TABLE fb_submissions ADD COLUMN review_notes TEXT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='reviewed_at')=0,
  'ALTER TABLE fb_submissions ADD COLUMN reviewed_at DATETIME NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='info_request_message')=0,
  'ALTER TABLE fb_submissions ADD COLUMN info_request_message TEXT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='fb_submissions' AND COLUMN_NAME='applicant_city')=0,
  'ALTER TABLE fb_submissions ADD COLUMN applicant_city VARCHAR(100) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── audit_logs ───────────────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='audit_logs' AND COLUMN_NAME='details')=0,
  'ALTER TABLE audit_logs ADD COLUMN details TEXT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── portal_payment_methods ───────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='location')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN location VARCHAR(50) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='swift_code')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN swift_code VARCHAR(50) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='account_number')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN account_number VARCHAR(100) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='bank_name')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN bank_name VARCHAR(150) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='branch_name')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN branch_name VARCHAR(150) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='country_code')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN country_code VARCHAR(10) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='country_name')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN country_name VARCHAR(100) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='iban')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN iban VARCHAR(50) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payment_methods' AND COLUMN_NAME='bank_address')=0,
  'ALTER TABLE portal_payment_methods ADD COLUMN bank_address TEXT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── portal_admin_users ───────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_admin_users' AND COLUMN_NAME='assigned_country_id')=0,
  'ALTER TABLE portal_admin_users ADD COLUMN assigned_country_id SMALLINT UNSIGNED NULL DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_admin_users' AND COLUMN_NAME='assigned_state_id')=0,
  'ALTER TABLE portal_admin_users ADD COLUMN assigned_state_id INT UNSIGNED NULL DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_admin_users' AND COLUMN_NAME='assigned_location_type')=0,
  'ALTER TABLE portal_admin_users ADD COLUMN assigned_location_type VARCHAR(30) NULL DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_admin_users' AND COLUMN_NAME='assigned_city')=0,
  'ALTER TABLE portal_admin_users ADD COLUMN assigned_city VARCHAR(100) NULL DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── portal_packages ──────────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_packages' AND COLUMN_NAME='auto_created')=0,
  'ALTER TABLE portal_packages ADD COLUMN auto_created TINYINT(1) NOT NULL DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── portal_payments ──────────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='screenshot_path')=0,
  'ALTER TABLE portal_payments ADD COLUMN screenshot_path VARCHAR(500) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='approved_by')=0,
  'ALTER TABLE portal_payments ADD COLUMN approved_by INT UNSIGNED NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='approved_at')=0,
  'ALTER TABLE portal_payments ADD COLUMN approved_at TIMESTAMP NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='credited_inr_amount')=0,
  'ALTER TABLE portal_payments ADD COLUMN credited_inr_amount DECIMAL(12,2) DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='portal_payments' AND COLUMN_NAME='exchange_rate')=0,
  'ALTER TABLE portal_payments ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ── member_accounts ──────────────────────────────────────────────────────────
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='member_accounts' AND COLUMN_NAME='expiry_date')=0,
  'ALTER TABLE member_accounts ADD COLUMN expiry_date DATE NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='member_accounts' AND COLUMN_NAME='plan_type')=0,
  'ALTER TABLE member_accounts ADD COLUMN plan_type VARCHAR(20) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='member_accounts' AND COLUMN_NAME='membership_type')=0,
  'ALTER TABLE member_accounts ADD COLUMN membership_type VARCHAR(30) NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SELECT 'schema_fix complete' AS result;
