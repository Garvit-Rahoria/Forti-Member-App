-- Migration v8: Approval workflow – missing columns + status expansion
-- Run once against forti_membership DB

-- 1. Add reviewed_by (FK to admin user) if not present
ALTER TABLE fb_submissions
  ADD COLUMN IF NOT EXISTS reviewed_by INT UNSIGNED NULL AFTER approved_at,
  ADD COLUMN IF NOT EXISTS review_notes TEXT NULL AFTER reviewed_by,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL AFTER review_notes;

-- 2. Expand status ENUM to include payment_verified, active, expired
ALTER TABLE fb_submissions MODIFY COLUMN
  status ENUM(
    'draft','submitted','under_review',
    'payment_pending','payment_submitted','payment_verified',
    'approved','rejected','active','expired'
  ) NOT NULL DEFAULT 'draft';

-- 3. Add FK index for reviewed_by (optional, non-blocking)
ALTER TABLE fb_submissions
  ADD INDEX IF NOT EXISTS idx_sub_reviewed_by (reviewed_by);

-- 4. Add audit_log details columns to store additional context
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS details TEXT NULL AFTER new_values;

-- Done
SELECT 'migration_v8 OK' AS result;
