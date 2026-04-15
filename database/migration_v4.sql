-- ============================================================
-- FORTI PORTAL – Migration v4
-- Adds: invoices, portal_renewals, expiry_date on fb_submissions
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v4_migrate;
DELIMITER //
CREATE PROCEDURE forti_v4_migrate()
BEGIN
  -- fb_submissions: expiry_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='expiry_date'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN expiry_date DATE NULL AFTER membership_id;
  END IF;

  -- fb_submissions: member_status (active/expired/suspended/inactive)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='member_status'
  ) THEN
    ALTER TABLE fb_submissions
      ADD COLUMN member_status ENUM('active','expired','suspended','inactive') NOT NULL DEFAULT 'active'
      AFTER expiry_date;
  END IF;

  -- fb_submissions: package_id FK
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='package_id'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN package_id INT UNSIGNED NULL AFTER member_status;
  END IF;
END //
DELIMITER ;
CALL forti_v4_migrate();
DROP PROCEDURE IF EXISTS forti_v4_migrate;

-- ── Portal Renewals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_renewals (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid            VARCHAR(36) UNIQUE NOT NULL,
  submission_id   INT UNSIGNED NOT NULL,  -- the "member" being renewed
  package_id      INT UNSIGNED NULL,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  old_expiry_date DATE NULL,
  new_expiry_date DATE NULL,
  payment_method_id INT UNSIGNED NULL,
  transaction_id  VARCHAR(200),
  screenshot_path VARCHAR(500),
  status          ENUM('pending','payment_submitted','verified','rejected') NOT NULL DEFAULT 'pending',
  notes           TEXT,
  processed_by    INT UNSIGNED NULL,
  processed_at    TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);

-- ── Invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(40) UNIQUE NOT NULL,
  submission_id   INT UNSIGNED NOT NULL,
  renewal_id      INT UNSIGNED NULL,
  payment_id      INT UNSIGNED NULL,       -- portal_payments.id
  invoice_type    ENUM('membership','renewal','upgrade') NOT NULL DEFAULT 'membership',
  member_name     VARCHAR(200),
  member_email    VARCHAR(200),
  member_id_str   VARCHAR(80),             -- membership_id string
  package_name    VARCHAR(200),
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  notes           TEXT,
  pdf_path        VARCHAR(500),
  issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);

-- ── Portal Renewal Reminders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_renewal_reminders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id INT UNSIGNED NOT NULL,
  remind_days   SMALLINT NOT NULL DEFAULT 30,  -- days before expiry
  sent_at       DATETIME NULL,
  status        ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);
