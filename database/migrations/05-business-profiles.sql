-- FORTI Business Profile schema (Postgres)
-- Linked to existing member via fb_submissions.id — no duplicate accounts

CREATE TABLE IF NOT EXISTS business_categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  parent_id   INTEGER REFERENCES business_categories(id) ON DELETE CASCADE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_profiles (
  id                    SERIAL PRIMARY KEY,
  submission_id         INTEGER NOT NULL UNIQUE REFERENCES fb_submissions(id) ON DELETE CASCADE,
  -- Overview (name/type/logo primarily reused from submission.data)
  description           TEXT,
  established_year      SMALLINT,
  employee_count        VARCHAR(40),
  website               VARCHAR(500),
  business_email        VARCHAR(200),
  business_phone        VARCHAR(40),
  logo_path             VARCHAR(500),
  cover_image           VARCHAR(500),
  -- Category
  primary_category_id   INTEGER REFERENCES business_categories(id) ON DELETE SET NULL,
  sub_category_id       INTEGER REFERENCES business_categories(id) ON DELETE SET NULL,
  -- Location
  address               TEXT,
  city                  VARCHAR(120),
  district              VARCHAR(120),
  state                 VARCHAR(120),
  country               VARCHAR(120),
  pin_code              VARCHAR(20),
  show_address_publicly BOOLEAN NOT NULL DEFAULT FALSE,
  -- Networking (JSON arrays of strings)
  looking_for           JSONB NOT NULL DEFAULT '[]'::jsonb,
  offering              JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Status
  status                VARCHAR(30) NOT NULL DEFAULT 'draft',
  completion_percent    SMALLINT NOT NULL DEFAULT 0,
  submitted_at          TIMESTAMP,
  published_at          TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_state ON business_profiles(state);
CREATE INDEX IF NOT EXISTS idx_business_profiles_primary_cat ON business_profiles(primary_category_id);

CREATE TABLE IF NOT EXISTS business_keywords (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  keyword     VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_business_keywords_keyword ON business_keywords(LOWER(keyword));

CREATE TABLE IF NOT EXISTS business_products_services (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  item_type   VARCHAR(20) NOT NULL DEFAULT 'service',
  description TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_social_links (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  platform    VARCHAR(60) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_gallery (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  image_path  VARCHAR(500) NOT NULL,
  caption     VARCHAR(200),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_achievements (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  year        SMALLINT,
  issued_by   VARCHAR(200),
  description TEXT,
  image_path  VARCHAR(500),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_offers (
  id              SERIAL PRIMARY KEY,
  profile_id      INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  offer_type      VARCHAR(40) NOT NULL DEFAULT 'percentage',
  discount_value  VARCHAR(80),
  description     TEXT,
  valid_until     DATE,
  terms           TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_offers_status ON business_offers(status);

CREATE TABLE IF NOT EXISTS business_quote_requests (
  id                       SERIAL PRIMARY KEY,
  business_profile_id      INTEGER NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  requester_submission_id  INTEGER NOT NULL REFERENCES fb_submissions(id) ON DELETE CASCADE,
  product_service_id       INTEGER REFERENCES business_products_services(id) ON DELETE SET NULL,
  product_service_name     VARCHAR(200),
  requirement              TEXT NOT NULL,
  budget                   VARCHAR(80),
  quantity                 VARCHAR(80),
  timeline                 VARCHAR(120),
  message                  TEXT,
  status                   VARCHAR(30) NOT NULL DEFAULT 'new',
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bqr_business ON business_quote_requests(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_bqr_requester ON business_quote_requests(requester_submission_id);
CREATE INDEX IF NOT EXISTS idx_bqr_status ON business_quote_requests(status);
