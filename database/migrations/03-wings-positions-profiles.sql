-- Wings, positions (designations), public profiles, link hub
-- Member identity = fb_submissions.id (submission_id)

CREATE TABLE IF NOT EXISTS portal_wings (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  slug        VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_positions (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  level       SMALLINT NOT NULL DEFAULT 100,
  wing_scope  VARCHAR(20) NOT NULL DEFAULT 'per_wing',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_wing_assignments (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES fb_submissions(id) ON DELETE CASCADE,
  wing_id         INTEGER NOT NULL REFERENCES portal_wings(id),
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  assigned_by     INTEGER,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mwa_submission ON member_wing_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_mwa_current ON member_wing_assignments(submission_id) WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS member_position_assignments (
  id                SERIAL PRIMARY KEY,
  submission_id     INTEGER NOT NULL REFERENCES fb_submissions(id) ON DELETE CASCADE,
  position_id       INTEGER NOT NULL REFERENCES portal_positions(id),
  wing_id           INTEGER REFERENCES portal_wings(id),
  start_date        DATE NOT NULL,
  end_date          DATE,
  appointment_type  VARCHAR(20) NOT NULL DEFAULT 'appointed',
  appointed_by      INTEGER,
  notes             TEXT,
  is_current        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mpa_submission ON member_position_assignments(submission_id);
CREATE INDEX IF NOT EXISTS idx_mpa_current ON member_position_assignments(submission_id, is_current) WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS member_public_profiles (
  submission_id       INTEGER PRIMARY KEY REFERENCES fb_submissions(id) ON DELETE CASCADE,
  public_slug         VARCHAR(120) UNIQUE,
  is_public           BOOLEAN NOT NULL DEFAULT FALSE,
  headline            VARCHAR(200),
  about_me            TEXT,
  my_org              TEXT,
  org_history         TEXT,
  show_email          BOOLEAN NOT NULL DEFAULT FALSE,
  show_phone          BOOLEAN NOT NULL DEFAULT FALSE,
  show_positions      BOOLEAN NOT NULL DEFAULT TRUE,
  show_past_positions BOOLEAN NOT NULL DEFAULT TRUE,
  theme_color         VARCHAR(20) DEFAULT '#6C3EAB',
  cover_image_path    VARCHAR(500),
  profile_photo_path  VARCHAR(500),
  view_count          INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_profile_links (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES fb_submissions(id) ON DELETE CASCADE,
  link_type       VARCHAR(30) NOT NULL DEFAULT 'custom',
  title           VARCHAR(120) NOT NULL,
  url             TEXT,
  content         TEXT,
  media_path      VARCHAR(500),
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mpl_submission ON member_profile_links(submission_id);

ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS wing_id INTEGER REFERENCES portal_wings(id);

INSERT INTO portal_wings (name, slug, sort_order) VALUES
  ('Main', 'main', 1),
  ('Youth', 'youth', 2),
  ('Women', 'women', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portal_positions (title, slug, level, sort_order) VALUES
  ('Member', 'member', 10, 1),
  ('Executive Member', 'executive-member', 20, 2),
  ('Secretary', 'secretary', 50, 3),
  ('Treasurer', 'treasurer', 55, 4),
  ('Vice President', 'vice-president', 80, 5),
  ('President', 'president', 100, 6)
ON CONFLICT (slug) DO NOTHING;
