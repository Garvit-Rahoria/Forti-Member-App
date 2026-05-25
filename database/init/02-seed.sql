-- Seed data for fresh PostgreSQL database

INSERT INTO fb_dropdown_groups (name, slug, description) VALUES
  ('Gender', 'gender', 'Male, Female, Other, Prefer not to say'),
  ('Membership Type', 'membership-type', 'Individual, Organisation, Student, Senior'),
  ('ID Proof Type', 'id-proof-type', 'Aadhaar, PAN, Passport, Driving License'),
  ('Payment Method', 'payment-method', 'UPI, Bank Transfer, International Wire')
ON CONFLICT DO NOTHING;

INSERT INTO fb_dropdown_items (group_id, label, value, item_order)
SELECT g.id, v.label, v.value, v.ord
FROM fb_dropdown_groups g
CROSS JOIN (VALUES
  ('Male', 'male', 1), ('Female', 'female', 2), ('Other', 'other', 3), ('Prefer not to say', 'prefer_not_to_say', 4)
) AS v(label, value, ord)
WHERE g.slug = 'gender'
  AND NOT EXISTS (
    SELECT 1 FROM fb_dropdown_items i
    WHERE i.group_id = g.id AND i.value = v.value
  );

INSERT INTO fb_dropdown_items (group_id, label, value, item_order)
SELECT g.id, v.label, v.value, v.ord
FROM fb_dropdown_groups g
CROSS JOIN (VALUES
  ('Individual', 'individual', 1), ('Organisation', 'organisation', 2),
  ('Student', 'student', 3), ('Senior / Retired', 'senior', 4)
) AS v(label, value, ord)
WHERE g.slug = 'membership-type'
  AND NOT EXISTS (
    SELECT 1 FROM fb_dropdown_items i
    WHERE i.group_id = g.id AND i.value = v.value
  );

INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role)
VALUES (
  gen_random_uuid()::text,
  'Super Admin',
  'admin@forti.org',
  '$2b$10$dFQ.PrNlBT4ODXCVsQzcleMD/kEAz7kBmw1.c5m1rlnP/ohfw.sE2',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO fb_forms (uuid, name, slug, description, form_type, submit_label)
VALUES (
  gen_random_uuid()::text,
  'Membership Application Form',
  'membership-application',
  'Standard membership application form for FORTI',
  'membership_application',
  'Submit Application'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('site_name', 'FORTI Membership Portal'),
  ('site_logo', '/images/brand/logo.png'),
  ('president_photo', '/images/president/suresh-agarwal.jpg'),
  ('primary_color', '#6C3EAB'),
  ('support_email', 'support@forti.org'),
  ('support_phone', ''),
  ('currency', 'INR'),
  ('membership_id_prefix', 'FORTI-'),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from', 'noreply@forti.org'),
  ('smtp_from_name', 'FORTI Portal'),
  ('otp_expiry_minutes', '10'),
  ('auto_approve', '0'),
  ('cert_template', ''),
  ('card_template', '')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO portal_payment_methods (name, type, instructions, is_active, sort_order)
SELECT v.name, v.type, v.instructions, TRUE, v.sort_order
FROM (VALUES
  ('UPI Payment', 'upi', 'Pay via UPI ID: forti@upi. Share screenshot after payment.', 1),
  ('Bank Transfer', 'bank_transfer', 'Transfer to: FORTI Bank, A/C: 1234567890, IFSC: FORT0000001. Share screenshot.', 2),
  ('International Wire', 'international_wire', 'Contact admin for SWIFT details.', 3)
) AS v(name, type, instructions, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM portal_payment_methods m WHERE m.name = v.name);

INSERT INTO portal_packages (name, code, price, duration_months, description, sort_order, membership_type, plan_type) VALUES
  ('Individual Membership', 'IND-1YR', 2500.00, 12, 'Standard individual membership for 1 year', 1, 'individual', 'yearly'),
  ('Corporate Membership', 'CORP-1YR', 15000.00, 12, 'Corporate membership for organisations', 2, 'corporate', 'yearly'),
  ('Student Membership', 'STU-1YR', 500.00, 12, 'Discounted membership for students', 3, 'individual', 'yearly'),
  ('Lifetime Membership', 'LFT', 25000.00, 0, 'Lifetime individual membership (unlimited)', 4, 'individual', 'lifetime')
ON CONFLICT (code) DO NOTHING;

INSERT INTO currency_settings (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default) VALUES
  (NULL, 'INR', '₹', 'Indian Rupee', 1.000000, TRUE),
  (NULL, 'USD', '$', 'US Dollar', 0.012000, FALSE),
  (NULL, 'EUR', '€', 'Euro', 0.011000, FALSE),
  (NULL, 'GBP', '£', 'British Pound', 0.0094, FALSE),
  (NULL, 'AED', 'د.إ', 'UAE Dirham', 0.044000, FALSE),
  (NULL, 'SGD', 'S$', 'Singapore Dollar', 0.016000, FALSE),
  (NULL, 'AUD', 'A$', 'Australian Dollar', 0.018000, FALSE),
  (NULL, 'CAD', 'C$', 'Canadian Dollar', 0.016000, FALSE)
ON CONFLICT (country_id, currency_code) DO NOTHING;

INSERT INTO package_pricing_rules (location, membership_type, yearly_price, lifetime_multiplier, currency) VALUES
  ('rajasthan', 'individual', 1000, 10, 'INR'),
  ('rajasthan', 'corporate', 5000, 10, 'INR'),
  ('other_states', 'individual', 1500, 10, 'INR'),
  ('other_states', 'corporate', 7500, 10, 'INR'),
  ('overseas', 'individual', 100, 10, 'USD'),
  ('overseas', 'corporate', 500, 10, 'USD')
ON CONFLICT (location, membership_type) DO NOTHING;

INSERT INTO application_fields (field_key, label, field_type, is_required, field_order, placeholder, options) VALUES
  ('profile_photo', 'Profile Photo', 'image', FALSE, 0, NULL, NULL),
  ('full_name', 'Full Name', 'text', TRUE, 1, 'Your full name', NULL),
  ('email', 'Email Address', 'email', TRUE, 2, 'email@example.com', NULL),
  ('phone', 'Phone Number', 'phone', TRUE, 3, '10-digit mobile number', NULL),
  ('gender', 'Gender', 'dropdown', FALSE, 4, NULL, '["Male","Female","Other","Prefer not to say"]'::jsonb),
  ('date_of_birth', 'Date of Birth', 'date', FALSE, 5, NULL, NULL),
  ('pin_code', 'PIN Code', 'text', FALSE, 6, '6-digit PIN code', NULL),
  ('aadhaar_number', 'Aadhaar Number', 'text', FALSE, 7, '12-digit Aadhaar number', NULL),
  ('organisation_name', 'Organisation / Company Name', 'text', FALSE, 8, 'Your organisation name', NULL),
  ('organisation_type', 'Organisation Type', 'dropdown', FALSE, 9, NULL, '["Company / Pvt Ltd","Society / Trust","NGO / Charitable","Government / PSU","Educational Institution","Individual Practice","Other"]'::jsonb),
  ('organisation_logo', 'Organisation Logo', 'image', FALSE, 10, NULL, NULL),
  ('social_links', 'Social Media Links', 'social_links', FALSE, 11, NULL, '["LinkedIn","Twitter / X","Facebook","Instagram","YouTube","Google","Website","Other"]'::jsonb)
ON CONFLICT (field_key) DO NOTHING;

INSERT INTO email_templates (event_key, subject, body, is_active) VALUES
  ('application_submitted', 'Application Submitted', 'Dear {{name}},\n\nYour application has been submitted successfully.\n\nMembership ID: {{membership_id}}', TRUE),
  ('under_review', 'Application Under Review', 'Dear {{name}},\n\nYour application is under review. We will notify you once a decision is made.', TRUE),
  ('approved', 'Application Approved', 'Congratulations {{name}},\n\nYour application has been approved!\nMembership ID: {{membership_id}}', TRUE),
  ('rejected', 'Application Rejected', 'Dear {{name}},\n\nWe regret to inform you that your application was rejected. Reason: {{reason}}', TRUE),
  ('payment_pending', 'Payment Pending', 'Dear {{name}},\n\nYour payment is pending. Please complete the payment to proceed.', TRUE),
  ('payment_submitted', 'Payment Submitted', 'Dear {{name}},\n\nYour payment has been submitted and is under review.', TRUE),
  ('payment_verified', 'Payment Verified', 'Dear {{name}},\n\nYour payment has been verified. Membership ID: {{membership_id}}', TRUE),
  ('member_activated', 'Membership Activated', 'Dear {{name}},\n\nYour membership is now active! Membership ID: {{membership_id}}', TRUE)
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO durations (label, value, type, sort_order)
SELECT v.label, v.value, v.type, v.sort_order
FROM (VALUES
  ('1 Year', 1::smallint, 'year', 1),
  ('3 Years', 3::smallint, 'year', 2),
  ('Lifetime', NULL::smallint, 'lifetime', 3)
) AS v(label, value, type, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM durations d WHERE d.label = v.label);

INSERT INTO portal_organization_types (name, slug, sort_order, is_active) VALUES
  ('Individual / Student', 'individual-student', 1, TRUE),
  ('Freelancer / Self-employed', 'freelancer-self-employed', 2, TRUE),
  ('Startup', 'startup', 3, TRUE),
  ('Private Company', 'private-company', 4, TRUE),
  ('Government Organization', 'government-organization', 5, TRUE),
  ('NGO / Non-profit', 'ngo-non-profit', 6, TRUE),
  ('Corporate / Enterprise', 'corporate-enterprise', 7, TRUE),
  ('Other', 'other', 8, TRUE)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO system_settings (setting_key, setting_value)
VALUES ('org_types', '["Individual / Student","Freelancer / Self-employed","Startup","Private Company","Government Organization","NGO / Non-profit","Corporate / Enterprise","Other"]')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP;
