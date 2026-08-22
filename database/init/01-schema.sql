-- FORTI Membership Portal – PostgreSQL schema (consolidated from MySQL migrations)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Admin Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_admin_users (
  id                    SERIAL PRIMARY KEY,
  uuid                  VARCHAR(36) UNIQUE NOT NULL,
  full_name             VARCHAR(120) NOT NULL,
  email                 VARCHAR(180) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  role                  VARCHAR(30) NOT NULL DEFAULT 'office_staff',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  last_login            TIMESTAMP NULL,
  reset_token           VARCHAR(64) NULL,
  reset_token_expires   TIMESTAMP NULL,
  assigned_country_id   SMALLINT NULL,
  assigned_state_id     INTEGER NULL,
  assigned_location_type VARCHAR(30) NULL,
  assigned_city         VARCHAR(100) NULL,
  assigned_branch_label VARCHAR(100) NULL,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Forms ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_forms (
  id              SERIAL PRIMARY KEY,
  uuid            VARCHAR(36) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(120) UNIQUE NOT NULL,
  description     TEXT,
  form_type       VARCHAR(40) NOT NULL DEFAULT 'membership_application',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_multi_step   BOOLEAN NOT NULL DEFAULT TRUE,
  allow_draft     BOOLEAN NOT NULL DEFAULT TRUE,
  submit_label    VARCHAR(100) DEFAULT 'Submit Application',
  success_message TEXT,
  created_by      INTEGER,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fb_sections (
  id            SERIAL PRIMARY KEY,
  form_id       INTEGER NOT NULL REFERENCES fb_forms(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  icon          VARCHAR(60) DEFAULT 'document',
  section_order SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fb_fields (
  id               SERIAL PRIMARY KEY,
  form_id          INTEGER NOT NULL REFERENCES fb_forms(id) ON DELETE CASCADE,
  section_id       INTEGER NOT NULL REFERENCES fb_sections(id) ON DELETE CASCADE,
  field_key        VARCHAR(120) NOT NULL,
  label            VARCHAR(200) NOT NULL,
  field_type       VARCHAR(40) NOT NULL DEFAULT 'text',
  placeholder      VARCHAR(255),
  help_text        TEXT,
  default_value    TEXT,
  is_required      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  field_order      SMALLINT NOT NULL DEFAULT 0,
  col_width        VARCHAR(10) DEFAULT 'full',
  validation_rules JSONB,
  options_source   VARCHAR(20) DEFAULT 'manual',
  options_table    VARCHAR(100),
  options_group_id INTEGER NULL,
  has_condition    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (form_id, field_key)
);

CREATE TABLE IF NOT EXISTS fb_field_options (
  id         SERIAL PRIMARY KEY,
  field_id   INTEGER NOT NULL REFERENCES fb_fields(id) ON DELETE CASCADE,
  label      VARCHAR(255) NOT NULL,
  value      VARCHAR(255) NOT NULL,
  opt_order  SMALLINT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fb_field_conditions (
  id       SERIAL PRIMARY KEY,
  field_id INTEGER NOT NULL REFERENCES fb_fields(id) ON DELETE CASCADE,
  action   VARCHAR(10) NOT NULL DEFAULT 'show',
  logic    VARCHAR(5) NOT NULL DEFAULT 'AND'
);

CREATE TABLE IF NOT EXISTS fb_condition_rules (
  id             SERIAL PRIMARY KEY,
  condition_id   INTEGER NOT NULL REFERENCES fb_field_conditions(id) ON DELETE CASCADE,
  watch_field_id INTEGER NOT NULL REFERENCES fb_fields(id) ON DELETE CASCADE,
  operator       VARCHAR(20) NOT NULL DEFAULT 'equals',
  value          VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS fb_dropdown_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) UNIQUE NOT NULL,
  description VARCHAR(255),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fb_dropdown_items (
  id         SERIAL PRIMARY KEY,
  group_id   INTEGER NOT NULL REFERENCES fb_dropdown_groups(id) ON DELETE CASCADE,
  label      VARCHAR(255) NOT NULL,
  value      VARCHAR(255) NOT NULL,
  item_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fb_submissions (
  id                   SERIAL PRIMARY KEY,
  uuid                 VARCHAR(36) UNIQUE NOT NULL,
  form_id              INTEGER NOT NULL REFERENCES fb_forms(id),
  user_id              INTEGER NOT NULL DEFAULT 0,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft',
  current_step         SMALLINT NOT NULL DEFAULT 1,
  submitted_at         TIMESTAMP NULL,
  ip_address           VARCHAR(45),
  user_agent           VARCHAR(500),
  data                 JSONB,
  applicant_name       VARCHAR(200),
  applicant_email      VARCHAR(200),
  applicant_phone      VARCHAR(30),
  applicant_uuid       VARCHAR(36),
  applicant_city       VARCHAR(100),
  membership_id        VARCHAR(80),
  approval_stage       INTEGER,
  rejection_reason     TEXT,
  cert_generated       BOOLEAN NOT NULL DEFAULT FALSE,
  card_generated       BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_pdf      VARCHAR(500),
  id_card_pdf          VARCHAR(500),
  expiry_date          DATE,
  member_status        VARCHAR(30) NOT NULL DEFAULT 'inactive',
  package_id           INTEGER,
  plan_type            VARCHAR(20),
  membership_type      VARCHAR(20),
  payment_status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at          TIMESTAMP NULL,
  activated_at         TIMESTAMP NULL,
  activated_by         INTEGER,
  reviewed_by          INTEGER,
  review_notes         TEXT,
  reviewed_at          TIMESTAMP NULL,
  info_request_message TEXT,
  suspension_reason    TEXT,
  suspended_by         INTEGER,
  suspended_at         TIMESTAMP NULL,
  country_id           INTEGER,
  state_id             INTEGER,
  city_id              INTEGER,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fb_submissions_state_id ON fb_submissions(state_id);

CREATE TABLE IF NOT EXISTS fb_submission_data (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES fb_submissions(id) ON DELETE CASCADE,
  field_id        INTEGER NOT NULL,
  field_key       VARCHAR(120) NOT NULL,
  value           TEXT,
  file_path       VARCHAR(500),
  edited_by_staff BOOLEAN DEFAULT FALSE,
  original_value  TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (submission_id, field_id)
);

CREATE TABLE IF NOT EXISTS fb_approval_workflows (
  id        SERIAL PRIMARY KEY,
  form_id   INTEGER NOT NULL UNIQUE REFERENCES fb_forms(id) ON DELETE CASCADE,
  name      VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fb_approval_stages (
  id            SERIAL PRIMARY KEY,
  workflow_id   INTEGER NOT NULL REFERENCES fb_approval_workflows(id) ON DELETE CASCADE,
  stage_name    VARCHAR(120) NOT NULL,
  stage_order   SMALLINT NOT NULL DEFAULT 0,
  approver_role VARCHAR(60) NOT NULL DEFAULT 'admin',
  approve_label VARCHAR(60) DEFAULT 'Approve',
  reject_label  VARCHAR(60) DEFAULT 'Reject',
  is_final      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS fb_approval_actions (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES fb_submissions(id),
  stage_id      INTEGER NOT NULL,
  action        VARCHAR(20) NOT NULL,
  notes         TEXT,
  acted_by      INTEGER NOT NULL,
  acted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_activity (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL,
  event_type    VARCHAR(80) NOT NULL,
  notes         TEXT,
  acted_by      INTEGER,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_application_activity_sub ON application_activity(submission_id);

CREATE TABLE IF NOT EXISTS application_notes (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL,
  created_by    INTEGER NOT NULL,
  note          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_application_notes_sub ON application_notes(submission_id);

-- ── Portal config ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id            SERIAL PRIMARY KEY,
  setting_key   VARCHAR(120) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_email_templates (
  id         SERIAL PRIMARY KEY,
  slug       VARCHAR(120) UNIQUE NOT NULL,
  name       VARCHAR(200) NOT NULL,
  subject    VARCHAR(500) NOT NULL,
  body_html  TEXT,
  variables  JSONB,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id         SERIAL PRIMARY KEY,
  event_key  VARCHAR(64) NOT NULL UNIQUE,
  subject    VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_packages (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  code             VARCHAR(60) UNIQUE NOT NULL,
  price            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  tax_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency         VARCHAR(10) NOT NULL DEFAULT 'INR',
  currency_id      INTEGER,
  duration_months  SMALLINT NOT NULL DEFAULT 12,
  max_members      INTEGER,
  benefits         JSONB,
  description      TEXT,
  membership_type  VARCHAR(20) NOT NULL DEFAULT 'both',
  plan_type        VARCHAR(20) NOT NULL DEFAULT 'both',
  country_id       SMALLINT,
  state_id         SMALLINT,
  city_id          INTEGER,
  is_overseas      BOOLEAN NOT NULL DEFAULT FALSE,
  auto_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  location         VARCHAR(50),
  duration         VARCHAR(20),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_package_combo_v10
  ON portal_packages (country_id, state_id, city_id, membership_type, plan_type);

CREATE TABLE IF NOT EXISTS portal_payment_methods (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  type         VARCHAR(30) NOT NULL DEFAULT 'upi',
  instructions TEXT,
  qr_image     VARCHAR(500),
  upi_id       VARCHAR(200),
  account_name VARCHAR(200),
  ifsc_code    VARCHAR(20),
  account_type VARCHAR(50),
  routing_number VARCHAR(50),
  currency     VARCHAR(10),
  country_id   SMALLINT,
  state_id     INTEGER,
  city_id      INTEGER,
  location     VARCHAR(50),
  country_code VARCHAR(10),
  country_name VARCHAR(100),
  account_number VARCHAR(100),
  bank_name    VARCHAR(150),
  branch_name  VARCHAR(150),
  swift_code   VARCHAR(50),
  iban         VARCHAR(50),
  bank_address TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_payment_methods (
  id         SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES portal_packages(id) ON DELETE CASCADE,
  method_id  INTEGER NOT NULL REFERENCES portal_payment_methods(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (package_id, method_id)
);

CREATE TABLE IF NOT EXISTS portal_payments (
  id                  SERIAL PRIMARY KEY,
  uuid                VARCHAR(36) UNIQUE NOT NULL,
  submission_id       INTEGER NOT NULL REFERENCES fb_submissions(id),
  invoice_id          INTEGER,
  member_id           INTEGER,
  amount              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
  credited_inr_amount DECIMAL(12,2),
  exchange_rate       DECIMAL(10,4),
  method_id           INTEGER,
  transaction_id      VARCHAR(200),
  upi_id              VARCHAR(200),
  screenshot_path     VARCHAR(500),
  notes               TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
  verified_by         INTEGER,
  verified_at         TIMESTAMP NULL,
  approved_by         INTEGER,
  approved_at         TIMESTAMP NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_renewals (
  id                SERIAL PRIMARY KEY,
  uuid              VARCHAR(36) UNIQUE NOT NULL,
  submission_id     INTEGER NOT NULL REFERENCES fb_submissions(id),
  package_id        INTEGER,
  amount            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency          VARCHAR(10) NOT NULL DEFAULT 'INR',
  old_expiry_date   DATE,
  new_expiry_date   DATE,
  payment_method_id INTEGER,
  transaction_id    VARCHAR(200),
  screenshot_path   VARCHAR(500),
  status            VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes             TEXT,
  processed_by      INTEGER,
  processed_at      TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id              SERIAL PRIMARY KEY,
  invoice_number  VARCHAR(40) UNIQUE NOT NULL,
  submission_id   INTEGER NOT NULL REFERENCES fb_submissions(id),
  renewal_id      INTEGER,
  payment_id      INTEGER,
  invoice_type    VARCHAR(20) NOT NULL DEFAULT 'membership',
  member_name     VARCHAR(200),
  member_email    VARCHAR(200),
  member_id_str   VARCHAR(80),
  package_name    VARCHAR(200),
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method  VARCHAR(120),
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  notes           TEXT,
  pdf_path        VARCHAR(500),
  issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_renewal_reminders (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES fb_submissions(id),
  remind_days   SMALLINT NOT NULL DEFAULT 30,
  sent_at       TIMESTAMP NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_otps (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(200) NOT NULL,
  phone       VARCHAR(30),
  full_name   VARCHAR(200),
  otp_code    VARCHAR(10) NOT NULL,
  purpose     VARCHAR(10) NOT NULL DEFAULT 'apply',
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMP NOT NULL,
  verified_at TIMESTAMP NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_member_otps_email ON member_otps(email, purpose);

CREATE TABLE IF NOT EXISTS member_accounts (
  id              SERIAL PRIMARY KEY,
  uuid            VARCHAR(36) UNIQUE NOT NULL,
  submission_id   INTEGER NOT NULL REFERENCES fb_submissions(id),
  email           VARCHAR(200) NOT NULL,
  full_name       VARCHAR(200),
  phone           VARCHAR(30),
  membership_id   VARCHAR(80),
  role            VARCHAR(20) NOT NULL DEFAULT 'applicant',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMP NULL,
  expiry_date     DATE,
  plan_type       VARCHAR(20),
  membership_type VARCHAR(30),
  package_id      INTEGER,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_log (
  id         SERIAL PRIMARY KEY,
  to_email   VARCHAR(200) NOT NULL,
  subject    VARCHAR(500) NOT NULL,
  template   VARCHAR(100),
  ref_id     VARCHAR(80),
  status     VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_msg  TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER,
  action     VARCHAR(200) NOT NULL,
  module     VARCHAR(80) NOT NULL,
  record_id  VARCHAR(80),
  old_values JSONB,
  new_values JSONB,
  details    TEXT,
  ip_address VARCHAR(60),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS currency_settings (
  id              SERIAL PRIMARY KEY,
  country_id      SMALLINT,
  currency_code   VARCHAR(10) NOT NULL DEFAULT 'INR',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
  currency_name   VARCHAR(80) NOT NULL DEFAULT 'Indian Rupee',
  exchange_rate   DECIMAL(14,6) NOT NULL DEFAULT 1.000000,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (country_id, currency_code)
);

CREATE TABLE IF NOT EXISTS package_pricing_rules (
  id                    SERIAL PRIMARY KEY,
  location              VARCHAR(50) NOT NULL,
  membership_type       VARCHAR(20) NOT NULL,
  yearly_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  lifetime_multiplier   DECIMAL(5,2) NOT NULL DEFAULT 10,
  three_year_multiplier DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (location, membership_type)
);

CREATE TABLE IF NOT EXISTS application_fields (
  id          SERIAL PRIMARY KEY,
  field_key   VARCHAR(100) NOT NULL UNIQUE,
  label       VARCHAR(255) NOT NULL,
  field_type  VARCHAR(50) NOT NULL DEFAULT 'text',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  field_order INTEGER NOT NULL DEFAULT 0,
  placeholder VARCHAR(255),
  options     JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS countries (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  iso_code     VARCHAR(5),
  phone_prefix VARCHAR(10),
  currency     VARCHAR(10),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_countries_iso ON countries(iso_code);

CREATE TABLE IF NOT EXISTS states (
  id         SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL,
  name       VARCHAR(120) NOT NULL,
  code       VARCHAR(10)
);
CREATE INDEX IF NOT EXISTS idx_states_country ON states(country_id);

CREATE TABLE IF NOT EXISTS cities (
  id         SERIAL PRIMARY KEY,
  state_id   INTEGER NULL,
  country_id INTEGER NULL,
  name       VARCHAR(120) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state_id);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id);

CREATE TABLE IF NOT EXISTS durations (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(50) NOT NULL,
  value      SMALLINT,
  type       VARCHAR(10) NOT NULL DEFAULT 'year',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_certificates (
  id                 SERIAL PRIMARY KEY,
  submission_id      INTEGER NOT NULL REFERENCES fb_submissions(id),
  certificate_number VARCHAR(80) UNIQUE,
  pdf_path           VARCHAR(500),
  id_card_path       VARCHAR(500),
  issued_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_portal_certificates_submission_id ON portal_certificates(submission_id);

CREATE TABLE IF NOT EXISTS portal_organization_types (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL UNIQUE,
  slug       VARCHAR(160) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
