-- ============================================================
-- FORTI PORTAL – Migration v6
-- Adds: audit_logs, certificates/id-card fields on fb_submissions,
--       payment_method + payment_status columns, 3_yearly plan_type
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v6_migrate;
DELIMITER //
CREATE PROCEDURE forti_v6_migrate()
BEGIN

  -- ── audit_logs ─────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NULL,
    action      VARCHAR(200) NOT NULL,
    module      VARCHAR(80)  NOT NULL,
    record_id   VARCHAR(80)  NULL,
    old_values  JSON NULL,
    new_values  JSON NULL,
    ip_address  VARCHAR(60)  NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user   (user_id),
    INDEX idx_module (module),
    INDEX idx_created(created_at)
  );

  -- ── fb_submissions: certificate_pdf ────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='certificate_pdf'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN certificate_pdf VARCHAR(500) NULL AFTER card_generated;
  END IF;

  -- ── fb_submissions: id_card_pdf ────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='id_card_pdf'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN id_card_pdf VARCHAR(500) NULL AFTER certificate_pdf;
  END IF;

  -- ── fb_submissions: payment_status ────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='payment_status'
  ) THEN
    ALTER TABLE fb_submissions
      ADD COLUMN payment_status ENUM('pending','submitted','verified','rejected')
        NOT NULL DEFAULT 'pending' AFTER member_status;
  END IF;

  -- ── fb_submissions: approved_at ───────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='fb_submissions' AND column_name='approved_at'
  ) THEN
    ALTER TABLE fb_submissions ADD COLUMN approved_at DATETIME NULL AFTER payment_status;
  END IF;

  -- ── invoices: payment_method column ───────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema='forti_membership' AND table_name='invoices' AND column_name='payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method VARCHAR(120) NULL AFTER total_amount;
  END IF;

  -- ── portal_packages: allow 3_yearly plan_type ─────────────────────────────
  -- Modify ENUM to include 3_yearly (safe: MODIFY COLUMN keeps existing data)
  ALTER TABLE portal_packages
    MODIFY COLUMN plan_type ENUM('yearly','3_yearly','lifetime','both') NOT NULL DEFAULT 'both';

END //
DELIMITER ;
CALL forti_v6_migrate();
DROP PROCEDURE IF EXISTS forti_v6_migrate;
