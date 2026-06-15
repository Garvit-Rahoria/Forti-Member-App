-- Auth middleware requires token_blacklist (logout / session revoke)
CREATE TABLE IF NOT EXISTS token_blacklist (
  token VARCHAR(500) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL
);

-- Branch scoping for admin users (used by auth middleware + reports)
ALTER TABLE portal_admin_users
  ADD COLUMN IF NOT EXISTS assigned_branch_id INTEGER NULL;
