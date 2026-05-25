-- Chamber blog: menus, nested categories, tags, posts, blocks, relations

CREATE TABLE IF NOT EXISTS portal_blog_menus (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(80) NOT NULL UNIQUE,
  label         VARCHAR(120) NOT NULL,
  description   TEXT,
  nav_path      VARCHAR(200),
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  show_in_header BOOLEAN NOT NULL DEFAULT TRUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_blog_categories (
  id              SERIAL PRIMARY KEY,
  menu_id         INTEGER NOT NULL REFERENCES portal_blog_menus(id) ON DELETE CASCADE,
  parent_id       INTEGER REFERENCES portal_blog_categories(id) ON DELETE SET NULL,
  slug            VARCHAR(120) NOT NULL,
  name            VARCHAR(160) NOT NULL,
  description     TEXT,
  nav_label       VARCHAR(160),
  nav_visibility  VARCHAR(24) NOT NULL DEFAULT 'hub_only',
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (menu_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_cat_menu ON portal_blog_categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_blog_cat_parent ON portal_blog_categories(parent_id);

CREATE TABLE IF NOT EXISTS portal_blog_tags (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(80) NOT NULL UNIQUE,
  name        VARCHAR(120) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_blog_posts (
  id                  SERIAL PRIMARY KEY,
  uuid                VARCHAR(36) NOT NULL UNIQUE,
  menu_id             INTEGER NOT NULL REFERENCES portal_blog_menus(id),
  category_id         INTEGER REFERENCES portal_blog_categories(id) ON DELETE SET NULL,
  slug                VARCHAR(200) NOT NULL,
  title               VARCHAR(300) NOT NULL,
  excerpt             TEXT,
  body                TEXT,
  post_type           VARCHAR(40) NOT NULL DEFAULT 'news',
  featured_image_path VARCHAR(500),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  author_id           INTEGER,
  published_at        TIMESTAMP,
  view_count          INTEGER NOT NULL DEFAULT 0,
  meta_title          VARCHAR(200),
  meta_description    TEXT,
  sort_order          SMALLINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (menu_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_blog_posts_menu ON portal_blog_posts(menu_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON portal_blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON portal_blog_posts(status, published_at DESC);

CREATE TABLE IF NOT EXISTS portal_blog_post_tags (
  post_id   INTEGER NOT NULL REFERENCES portal_blog_posts(id) ON DELETE CASCADE,
  tag_id    INTEGER NOT NULL REFERENCES portal_blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS portal_blog_blocks (
  id          SERIAL PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES portal_blog_posts(id) ON DELETE CASCADE,
  block_type  VARCHAR(40) NOT NULL DEFAULT 'paragraph',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_blocks_post ON portal_blog_blocks(post_id, sort_order);

CREATE TABLE IF NOT EXISTS portal_blog_post_relations (
  post_id          INTEGER NOT NULL REFERENCES portal_blog_posts(id) ON DELETE CASCADE,
  related_post_id  INTEGER NOT NULL REFERENCES portal_blog_posts(id) ON DELETE CASCADE,
  sort_order       SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, related_post_id),
  CHECK (post_id != related_post_id)
);

INSERT INTO portal_blog_menus (slug, label, description, nav_path, sort_order) VALUES
  ('insights', 'News & Insights', 'Chamber news, industry updates, and regulatory briefings', '/content/insights', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portal_blog_categories (menu_id, parent_id, slug, name, description, nav_visibility, sort_order)
SELECT m.id, NULL, v.slug, v.name, v.description, v.nav_vis, v.ord
FROM portal_blog_menus m,
(VALUES
  ('news', 'News', 'Official FORTI announcements and chamber news', 'main_dropdown', 1),
  ('industry-updates', 'Industry Updates', 'Sector trends and business intelligence', 'main_dropdown', 2),
  ('tax-updates', 'Tax & Regulatory', 'GST, tax, and compliance updates for members', 'main_dropdown', 3)
) AS v(slug, name, description, nav_vis, ord)
WHERE m.slug = 'insights'
ON CONFLICT (menu_id, slug) DO NOTHING;

INSERT INTO portal_blog_categories (menu_id, parent_id, slug, name, nav_visibility, sort_order)
SELECT m.id, p.id, v.slug, v.name, 'hub_only', v.ord
FROM portal_blog_menus m
JOIN portal_blog_categories p ON p.menu_id = m.id AND p.slug = 'industry-updates'
CROSS JOIN (VALUES
  ('manufacturing', 'Manufacturing', 1),
  ('trade', 'Trade & Export', 2),
  ('policy', 'Policy & Reform', 3)
) AS v(slug, name, ord)
WHERE m.slug = 'insights'
ON CONFLICT (menu_id, slug) DO NOTHING;

INSERT INTO portal_blog_tags (slug, name) VALUES
  ('gst', 'GST'),
  ('membership', 'Membership'),
  ('events', 'Events'),
  ('policy', 'Policy')
ON CONFLICT (slug) DO NOTHING;
