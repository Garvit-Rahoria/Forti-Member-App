-- Migration v29: Create master organization types table and seed standard values

CREATE TABLE IF NOT EXISTS portal_organization_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_portal_organization_types_name (name),
  UNIQUE KEY uniq_portal_organization_types_slug (slug),
  KEY idx_portal_organization_types_active_sort (is_active, sort_order, name)
);

INSERT INTO portal_organization_types (name, slug, sort_order, is_active)
VALUES
  ('Individual / Student', 'individual-student', 1, 1),
  ('Freelancer / Self-employed', 'freelancer-self-employed', 2, 1),
  ('Startup', 'startup', 3, 1),
  ('Private Company', 'private-company', 4, 1),
  ('Government Organization', 'government-organization', 5, 1),
  ('NGO / Non-profit', 'ngo-non-profit', 6, 1),
  ('Corporate / Enterprise', 'corporate-enterprise', 7, 1),
  ('Other', 'other', 8, 1)
ON DUPLICATE KEY UPDATE
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_settings (setting_key, setting_value)
VALUES (
  'org_types',
  JSON_ARRAY(
    'Individual / Student',
    'Freelancer / Self-employed',
    'Startup',
    'Private Company',
    'Government Organization',
    'NGO / Non-profit',
    'Corporate / Enterprise',
    'Other'
  )
)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP;