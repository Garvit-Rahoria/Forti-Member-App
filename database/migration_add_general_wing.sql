-- Migration: Add General wing
-- Run this on existing databases to add the General wing between Main and Youth

INSERT INTO portal_wings (name, slug, sort_order, is_active)
VALUES ('General', 'general', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- Shift Youth and Women sort_order to make room
UPDATE portal_wings SET sort_order = 3 WHERE slug = 'youth';
UPDATE portal_wings SET sort_order = 4 WHERE slug = 'women';
