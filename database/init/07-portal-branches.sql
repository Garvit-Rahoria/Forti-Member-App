-- Branch offices per state (used by /api/branches, contact routing, staff scoping)
CREATE TABLE IF NOT EXISTS portal_branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  state_id INTEGER NOT NULL REFERENCES states(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_branches_state ON portal_branches(state_id);
