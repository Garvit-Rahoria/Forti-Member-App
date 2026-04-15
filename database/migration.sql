-- ============================================================
-- FORTI PORTAL – Dynamic Form Builder Migration
-- Run against: forti_membership database (port 3307)
-- ============================================================

USE forti_membership;

-- ── Admin Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          VARCHAR(36) UNIQUE NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('super_admin','admin','manager','staff') NOT NULL DEFAULT 'staff',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  last_login    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Forms ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_forms (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid                VARCHAR(36) UNIQUE NOT NULL,
  name                VARCHAR(200) NOT NULL,
  slug                VARCHAR(120) UNIQUE NOT NULL,
  description         TEXT,
  form_type           ENUM('membership_application','renewal','upgrade','event_registration','custom') NOT NULL DEFAULT 'membership_application',
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  is_multi_step       TINYINT(1) NOT NULL DEFAULT 1,
  allow_draft         TINYINT(1) NOT NULL DEFAULT 1,
  submit_label        VARCHAR(100) DEFAULT 'Submit Application',
  success_message     TEXT,
  created_by          INT UNSIGNED,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Sections (steps) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_sections (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id          INT UNSIGNED NOT NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  icon             VARCHAR(60) DEFAULT 'document',
  section_order    SMALLINT NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES fb_forms(id) ON DELETE CASCADE
);

-- ── Fields ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_fields (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id          INT UNSIGNED NOT NULL,
  section_id       INT UNSIGNED NOT NULL,
  field_key        VARCHAR(120) NOT NULL,
  label            VARCHAR(200) NOT NULL,
  field_type       ENUM(
    'text','number','email','phone','date','datetime','time',
    'textarea','dropdown','radio','checkbox','toggle',
    'file','image',
    'aadhaar','pan','gst','ifsc',
    'country','state','city','region',
    'payment_method','transaction_id','upi_id','bank_details','qr_upload',
    'heading','paragraph','divider','hidden'
  ) NOT NULL DEFAULT 'text',
  placeholder      VARCHAR(255),
  help_text        TEXT,
  default_value    TEXT,
  is_required      TINYINT(1) NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  field_order      SMALLINT NOT NULL DEFAULT 0,
  col_width        ENUM('full','half','third') DEFAULT 'full',
  validation_rules JSON,
  options_source   ENUM('manual','table','dropdown_group') DEFAULT 'manual',
  options_table    VARCHAR(100),
  options_group_id INT UNSIGNED NULL,
  has_condition    TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id)    REFERENCES fb_forms(id)    ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES fb_sections(id) ON DELETE CASCADE,
  UNIQUE KEY uq_form_field (form_id, field_key)
);

-- ── Field Options (manual options for dropdown/radio/checkbox) ─
CREATE TABLE IF NOT EXISTS fb_field_options (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  field_id     INT UNSIGNED NOT NULL,
  label        VARCHAR(255) NOT NULL,
  value        VARCHAR(255) NOT NULL,
  opt_order    SMALLINT NOT NULL DEFAULT 0,
  is_default   TINYINT(1) NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (field_id) REFERENCES fb_fields(id) ON DELETE CASCADE
);

-- ── Conditional Logic ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_field_conditions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  field_id         INT UNSIGNED NOT NULL,
  action           ENUM('show','hide') NOT NULL DEFAULT 'show',
  logic            ENUM('AND','OR') NOT NULL DEFAULT 'AND',
  FOREIGN KEY (field_id) REFERENCES fb_fields(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fb_condition_rules (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  condition_id   INT UNSIGNED NOT NULL,
  watch_field_id INT UNSIGNED NOT NULL,
  operator       ENUM('equals','not_equals','contains','starts_with','greater_than','less_than','is_empty','is_not_empty') NOT NULL DEFAULT 'equals',
  value          VARCHAR(500),
  FOREIGN KEY (condition_id)   REFERENCES fb_field_conditions(id) ON DELETE CASCADE,
  FOREIGN KEY (watch_field_id) REFERENCES fb_fields(id) ON DELETE CASCADE
);

-- ── Dropdown Option Groups (reusable option sets) ─────────
CREATE TABLE IF NOT EXISTS fb_dropdown_groups (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) UNIQUE NOT NULL,
  description VARCHAR(255),
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fb_dropdown_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id   INT UNSIGNED NOT NULL,
  label      VARCHAR(255) NOT NULL,
  value      VARCHAR(255) NOT NULL,
  item_order SMALLINT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (group_id) REFERENCES fb_dropdown_groups(id) ON DELETE CASCADE
);

-- ── Form Submissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_submissions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid         VARCHAR(36) UNIQUE NOT NULL,
  form_id      INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  status       ENUM('draft','submitted','under_review','payment_pending','payment_submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  current_step SMALLINT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMP NULL,
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(500),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES fb_forms(id)
);

CREATE TABLE IF NOT EXISTS fb_submission_data (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id INT UNSIGNED NOT NULL,
  field_id      INT UNSIGNED NOT NULL,
  field_key     VARCHAR(120) NOT NULL,
  value         TEXT,
  file_path     VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_submission_field (submission_id, field_id)
);

-- ── Approval Workflow ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fb_approval_workflows (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  form_id   INT UNSIGNED NOT NULL UNIQUE,
  name      VARCHAR(200) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (form_id) REFERENCES fb_forms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fb_approval_stages (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id         INT UNSIGNED NOT NULL,
  stage_name          VARCHAR(120) NOT NULL,
  stage_order         SMALLINT NOT NULL DEFAULT 0,
  approver_role       VARCHAR(60) NOT NULL DEFAULT 'admin',
  approve_label       VARCHAR(60) DEFAULT 'Approve',
  reject_label        VARCHAR(60) DEFAULT 'Reject',
  is_final            TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (workflow_id) REFERENCES fb_approval_workflows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fb_approval_actions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id INT UNSIGNED NOT NULL,
  stage_id      INT UNSIGNED NOT NULL,
  action        ENUM('approved','rejected','returned','needs_info') NOT NULL,
  notes         TEXT,
  acted_by      INT UNSIGNED NOT NULL,
  acted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
);

-- ── (Optional) Seed default dropdown groups ───────────────
INSERT IGNORE INTO fb_dropdown_groups (name, slug, description) VALUES
  ('Gender',            'gender',            'Male, Female, Other, Prefer not to say'),
  ('Membership Type',   'membership-type',   'Individual, Organisation, Student, Senior'),
  ('ID Proof Type',     'id-proof-type',     'Aadhaar, PAN, Passport, Driving License'),
  ('Payment Method',    'payment-method',    'UPI, Bank Transfer, International Wire');

-- seed Gender items
INSERT IGNORE INTO fb_dropdown_items (group_id, label, value, item_order)
SELECT g.id, item.label, item.value, item.ord FROM fb_dropdown_groups g
JOIN (
  SELECT 'Male'                  AS label, 'male'                  AS value, 1 AS ord UNION ALL
  SELECT 'Female',                         'female',                          2 UNION ALL
  SELECT 'Other',                          'other',                           3 UNION ALL
  SELECT 'Prefer not to say',              'prefer_not_to_say',               4
) item WHERE g.slug = 'gender';

INSERT IGNORE INTO fb_dropdown_items (group_id, label, value, item_order)
SELECT g.id, item.label, item.value, item.ord FROM fb_dropdown_groups g
JOIN (
  SELECT 'Individual'  AS label, 'individual'  AS value, 1 AS ord UNION ALL
  SELECT 'Organisation',         'organisation',          2 UNION ALL
  SELECT 'Student',              'student',               3 UNION ALL
  SELECT 'Senior / Retired',     'senior',                4
) item WHERE g.slug = 'membership-type';

-- seed default super admin (password: Admin@12345)
INSERT IGNORE INTO portal_admin_users (uuid, full_name, email, password_hash, role)
VALUES (
  UUID(),
  'Super Admin',
  'admin@forti.org',
  '$2b$10$dFQ.PrNlBT4ODXCVsQzcleMD/kEAz7kBmw1.c5m1rlnP/ohfw.sE2',
  'super_admin'
);

-- seed default Membership Application form
INSERT IGNORE INTO fb_forms (uuid, name, slug, description, form_type, submit_label)
VALUES (
  UUID(),
  'Membership Application Form',
  'membership-application',
  'Standard membership application form for FORTI',
  'membership_application',
  'Submit Application'
);
