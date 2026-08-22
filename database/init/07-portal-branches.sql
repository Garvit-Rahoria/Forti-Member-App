-- Branch offices: Country → State → City → Branch hierarchy
CREATE TABLE IF NOT EXISTS portal_branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  country_id INTEGER NULL REFERENCES countries(id),
  state_id INTEGER NULL REFERENCES states(id),
  city_id INTEGER NULL REFERENCES cities(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_branches_state ON portal_branches(state_id);
CREATE INDEX IF NOT EXISTS idx_portal_branches_country ON portal_branches(country_id);
CREATE INDEX IF NOT EXISTS idx_portal_branches_city ON portal_branches(city_id);
