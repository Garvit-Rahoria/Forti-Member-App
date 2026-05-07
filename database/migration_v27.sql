-- Migration v27: RBAC enhancements
-- 1. Add `role` column to member_accounts (applicant → member lifecycle)
-- 2. Add `assigned_state_id` to portal_admin_users for office_staff branch scoping
-- 3. Add `assigned_branch` label column for display

-- 1. member_accounts: track applicant vs member role
ALTER TABLE member_accounts
  ADD COLUMN IF NOT EXISTS `role` VARCHAR(20) NOT NULL DEFAULT 'applicant'
    COMMENT 'applicant = not yet activated; member = active member';

-- 2. portal_admin_users: ensure office_staff can be branch-scoped
-- assigned_state_id already exists; add assigned_branch_label for display
ALTER TABLE portal_admin_users
  ADD COLUMN IF NOT EXISTS `assigned_branch_label` VARCHAR(100) DEFAULT NULL
    COMMENT 'Human-readable branch name for display purposes';

-- 3. Update existing active member_accounts to role = member
UPDATE member_accounts ma
  INNER JOIN fb_submissions s ON s.id = ma.submission_id
  SET ma.role = 'member'
  WHERE s.status = 'active' AND s.member_status = 'active';

-- 4. Ensure fb_submissions has state_id index for branch scoping performance
CREATE INDEX IF NOT EXISTS idx_fb_submissions_state_id ON fb_submissions(state_id);
