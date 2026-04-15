-- ============================================================
-- FORTI PORTAL – Migration v5
-- Adds: member_otps, member_accounts, email_log
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v5_migrate;
DELIMITER //
CREATE PROCEDURE forti_v5_migrate()
BEGIN

  -- ── member_otps (for pre-form verification & member login) ────────────────
  CREATE TABLE IF NOT EXISTS member_otps (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(200) NOT NULL,
    phone       VARCHAR(30) NULL,
    full_name   VARCHAR(200) NULL,
    otp_code    VARCHAR(10) NOT NULL,
    purpose     ENUM('apply','login') NOT NULL DEFAULT 'apply',
    verified    TINYINT(1) NOT NULL DEFAULT 0,
    attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at  DATETIME NOT NULL,
    verified_at DATETIME NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_purpose (email, purpose),
    INDEX idx_expires (expires_at)
  );

  -- ── member_accounts (public member login accounts) ────────────────────────
  -- Created automatically when a membership application is Approved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE table_schema='forti_membership' AND table_name='member_accounts'
  ) THEN
    CREATE TABLE member_accounts (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid            VARCHAR(36) UNIQUE NOT NULL,
      submission_id   INT UNSIGNED NOT NULL,
      email           VARCHAR(200) UNIQUE NOT NULL,
      full_name       VARCHAR(200) NULL,
      phone           VARCHAR(30) NULL,
      membership_id   VARCHAR(80) NULL,
      is_active       TINYINT(1) NOT NULL DEFAULT 1,
      last_login      DATETIME NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
    );
  END IF;

  -- ── email_log (track all sent emails) ─────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE table_schema='forti_membership' AND table_name='email_log'
  ) THEN
    CREATE TABLE email_log (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      to_email    VARCHAR(200) NOT NULL,
      subject     VARCHAR(500) NOT NULL,
      template    VARCHAR(100) NULL,
      ref_id      VARCHAR(80) NULL,
      status      ENUM('sent','failed') NOT NULL DEFAULT 'sent',
      error_msg   TEXT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_to_email (to_email),
      INDEX idx_ref (ref_id)
    );
  END IF;

END //
DELIMITER ;
CALL forti_v5_migrate();
DROP PROCEDURE IF EXISTS forti_v5_migrate;
