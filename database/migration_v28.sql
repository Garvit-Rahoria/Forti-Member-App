-- Migration v28: Create portal_certificates table for membership certificates & ID cards

CREATE TABLE IF NOT EXISTS portal_certificates (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id      INT UNSIGNED NOT NULL,
  certificate_number VARCHAR(80)  UNIQUE,
  pdf_path           VARCHAR(500) DEFAULT NULL,
  id_card_path       VARCHAR(500) DEFAULT NULL,
  issued_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);

-- Index for fast lookup by submission
CREATE INDEX IF NOT EXISTS idx_portal_certificates_submission_id
  ON portal_certificates(submission_id);
