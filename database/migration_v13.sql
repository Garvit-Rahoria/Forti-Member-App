-- ============================================================
-- FORTI PORTAL – Migration v13
-- Feature 1: Base pricing rules for dynamic package pricing
-- Feature 2: Simplified dynamic form builder (application_fields)
-- Feature 3: Country-based payment method system
-- ============================================================
USE forti_membership;

DROP PROCEDURE IF EXISTS forti_v13_migrate;
DELIMITER //
CREATE PROCEDURE forti_v13_migrate()
BEGIN

  -- ═══════════════════════════════════════════════════════════
  -- FEATURE 1: Base Pricing Rules
  -- ═══════════════════════════════════════════════════════════

  CREATE TABLE IF NOT EXISTS package_pricing_rules (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location             VARCHAR(50)   NOT NULL,
    membership_type      VARCHAR(20)   NOT NULL,
    yearly_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
    lifetime_multiplier  DECIMAL(5,2)  NOT NULL DEFAULT 10,
    currency             VARCHAR(10)   NOT NULL DEFAULT 'INR',
    is_active            TINYINT(1)    NOT NULL DEFAULT 1,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pricing_loc_type (location, membership_type)
  );

  INSERT IGNORE INTO package_pricing_rules (location, membership_type, yearly_price, lifetime_multiplier, currency)
  VALUES
    ('rajasthan',    'individual',  1000,  10, 'INR'),
    ('rajasthan',    'corporate',   5000,  10, 'INR'),
    ('other_states', 'individual',  1500,  10, 'INR'),
    ('other_states', 'corporate',   7500,  10, 'INR'),
    ('overseas',     'individual',   100,  10, 'USD'),
    ('overseas',     'corporate',    500,  10, 'USD');

  -- ═══════════════════════════════════════════════════════════
  -- FEATURE 2: Simplified Dynamic Form Fields for Step 1
  -- ═══════════════════════════════════════════════════════════

  CREATE TABLE IF NOT EXISTS application_fields (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    field_key     VARCHAR(100)  NOT NULL UNIQUE,
    label         VARCHAR(255)  NOT NULL,
    field_type    VARCHAR(50)   NOT NULL DEFAULT 'text',
    is_required   TINYINT(1)    NOT NULL DEFAULT 0,
    field_order   INT           NOT NULL DEFAULT 0,
    placeholder   VARCHAR(255)  NULL,
    options       JSON          NULL,
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  INSERT IGNORE INTO application_fields (field_key, label, field_type, is_required, field_order, placeholder, options) VALUES
    ('profile_photo',      'Profile Photo',                 'image',    0, 0,  NULL, NULL),
    ('full_name',          'Full Name',                     'text',     1, 1,  'Your full name', NULL),
    ('email',              'Email Address',                 'email',    1, 2,  'email@example.com', NULL),
    ('phone',              'Phone Number',                  'phone',    1, 3,  '10-digit mobile number', NULL),
    ('gender',             'Gender',                        'dropdown', 0, 4,  NULL, '["Male","Female","Other","Prefer not to say"]'),
    ('date_of_birth',      'Date of Birth',                 'date',     0, 5,  NULL, NULL),
    ('pin_code',           'PIN Code',                      'text',     0, 6,  '6-digit PIN code', NULL),
    ('aadhaar_number',     'Aadhaar Number',                'text',     0, 7,  '12-digit Aadhaar number', NULL),
    ('organisation_name',  'Organisation / Company Name',   'text',     0, 8,  'Your organisation name', NULL),
    ('organisation_type',  'Organisation Type',             'dropdown', 0, 9,  NULL, '["Company / Pvt Ltd","Society / Trust","NGO / Charitable","Government / PSU","Educational Institution","Individual Practice","Other"]'),
    ('organisation_logo',  'Organisation Logo',             'image',    0, 10, NULL, NULL),
    ('social_links',       'Social Media Links',            'social_links', 0, 11, NULL, '["LinkedIn","Twitter / X","Facebook","Instagram","YouTube","Google","Website","Other"]');

  -- ═══════════════════════════════════════════════════════════
  -- FEATURE 3: Country-based Payment Methods
  -- ═══════════════════════════════════════════════════════════

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema = 'forti_membership'
      AND table_name   = 'portal_payment_methods'
      AND column_name  = 'country_code'
  ) THEN
    ALTER TABLE portal_payment_methods
      ADD COLUMN country_code VARCHAR(10) NULL AFTER location;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema = 'forti_membership'
      AND table_name   = 'portal_payment_methods'
      AND column_name  = 'country_name'
  ) THEN
    ALTER TABLE portal_payment_methods
      ADD COLUMN country_name VARCHAR(100) NULL AFTER country_code;
  END IF;

END //
DELIMITER ;

CALL forti_v13_migrate();
DROP PROCEDURE IF EXISTS forti_v13_migrate;
