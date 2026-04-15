-- ============================================================
-- FORTI PORTAL – Supplemental Migration v2
-- Adds portal-specific tables that don't conflict with existing PHP project tables
-- ============================================================

USE forti_membership;

-- ── System Settings (key-value store for portal config) ────
CREATE TABLE IF NOT EXISTS system_settings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key   VARCHAR(120) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Email Templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_email_templates (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(120) UNIQUE NOT NULL,
  name       VARCHAR(200) NOT NULL,
  subject    VARCHAR(500) NOT NULL,
  body_html  LONGTEXT,
  variables  JSON,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Portal Packages (standalone, not conflicting with membership_packages) ─
CREATE TABLE IF NOT EXISTS portal_packages (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  code             VARCHAR(60) UNIQUE NOT NULL,
  price            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency         VARCHAR(10) NOT NULL DEFAULT 'INR',
  duration_months  SMALLINT NOT NULL DEFAULT 12,
  max_members      INT UNSIGNED NULL,
  benefits         JSON,
  description      TEXT,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Portal Payment Methods (simplified, for the dynamic form) ─
CREATE TABLE IF NOT EXISTS portal_payment_methods (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  type         ENUM('upi','bank_transfer','international_wire','cash','cheque','other') NOT NULL DEFAULT 'upi',
  instructions TEXT,
  qr_image     VARCHAR(500),
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Portal Payments (submission payments – separate from PHP payments table) ─
CREATE TABLE IF NOT EXISTS portal_payments (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          VARCHAR(36) UNIQUE NOT NULL,
  submission_id INT UNSIGNED NOT NULL,
  member_id     INT UNSIGNED NULL,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency      VARCHAR(10) NOT NULL DEFAULT 'INR',
  method_id     INT UNSIGNED NULL,
  transaction_id VARCHAR(200),
  upi_id        VARCHAR(200),
  screenshot_path VARCHAR(500),
  notes         TEXT,
  status        ENUM('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
  verified_by   INT UNSIGNED NULL,
  verified_at   TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);

-- ── Seed default system settings ────────────────────────────
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('site_name',          'FORTI Membership Portal'),
  ('site_logo',          ''),
  ('primary_color',      '#6C3EAB'),
  ('support_email',      'support@forti.org'),
  ('support_phone',      ''),
  ('currency',           'INR'),
  ('membership_id_prefix','FORTI-'),
  ('smtp_host',          ''),
  ('smtp_port',          '587'),
  ('smtp_user',          ''),
  ('smtp_pass',          ''),
  ('smtp_from',          'noreply@forti.org'),
  ('smtp_from_name',     'FORTI Portal'),
  ('otp_expiry_minutes', '10'),
  ('auto_approve',       '0'),
  ('cert_template',      ''),
  ('card_template',      '');

-- ── Seed default portal payment methods ─────────────────────
INSERT IGNORE INTO portal_payment_methods (name, type, instructions, is_active, sort_order) VALUES
  ('UPI Payment',        'upi',            'Pay via UPI ID: forti@upi. Share screenshot after payment.', 1, 1),
  ('Bank Transfer',      'bank_transfer',  'Transfer to: FORTI Bank, A/C: 1234567890, IFSC: FORT0000001. Share screenshot.', 1, 2),
  ('International Wire', 'international_wire', 'Contact admin for SWIFT details.', 1, 3);

-- ── Seed default portal packages ────────────────────────────
INSERT IGNORE INTO portal_packages (name, code, price, duration_months, description, sort_order) VALUES
  ('Individual Membership',    'IND-1YR',   2500.00, 12,  'Standard individual membership for 1 year',  1),
  ('Corporate Membership',     'CORP-1YR',  15000.00, 12, 'Corporate membership for organisations',      2),
  ('Student Membership',       'STU-1YR',   500.00,  12,  'Discounted membership for students',          3),
  ('Lifetime Membership',      'LFT',       25000.00, 0,  'Lifetime individual membership (unlimited)', 4);

-- ── Add extra columns to fb_submissions ──────────────────────
-- Using procedure to safely add columns (MySQL 8 doesn't support ADD COLUMN IF NOT EXISTS)
DROP PROCEDURE IF EXISTS add_col_if_missing;
DELIMITER //
CREATE PROCEDURE add_col_if_missing(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_col_if_missing('fb_submissions','applicant_name',  'VARCHAR(200) NULL');
CALL add_col_if_missing('fb_submissions','applicant_email', 'VARCHAR(200) NULL');
CALL add_col_if_missing('fb_submissions','applicant_phone', 'VARCHAR(30) NULL');
CALL add_col_if_missing('fb_submissions','applicant_uuid',  'VARCHAR(36) NULL');
CALL add_col_if_missing('fb_submissions','membership_id',   'VARCHAR(80) NULL');
CALL add_col_if_missing('fb_submissions','approval_stage',  'INT UNSIGNED NULL');
CALL add_col_if_missing('fb_submissions','rejection_reason','TEXT NULL');
CALL add_col_if_missing('fb_submissions','cert_generated',  'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_col_if_missing('fb_submissions','card_generated',  'TINYINT(1) NOT NULL DEFAULT 0');

DROP PROCEDURE IF EXISTS add_col_if_missing;
