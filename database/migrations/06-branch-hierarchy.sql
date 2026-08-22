-- Migration: Country → State → City → Branch hierarchy on portal_branches
-- Safe for existing data (adds nullable columns, then backfills).

ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS city_id INTEGER;

-- Allow overseas branches without a state
ALTER TABLE portal_branches ALTER COLUMN state_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portal_branches_country ON portal_branches(country_id);
CREATE INDEX IF NOT EXISTS idx_portal_branches_city ON portal_branches(city_id);

-- Optional: cities can hang directly under a country (overseas)
ALTER TABLE cities ADD COLUMN IF NOT EXISTS country_id INTEGER;
ALTER TABLE cities ALTER COLUMN state_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id);

-- Backfill country_id from states
UPDATE portal_branches b
SET country_id = s.country_id
FROM states s
WHERE b.state_id = s.id
  AND (b.country_id IS NULL OR b.country_id <> s.country_id);

-- Backfill city_id for Rajasthan-style "City Branch" / "City HQ" names
UPDATE portal_branches b
SET city_id = c.id
FROM cities c
WHERE b.city_id IS NULL
  AND b.state_id IS NOT NULL
  AND c.state_id = b.state_id
  AND (
    lower(b.name) = lower(c.name)
    OR lower(b.name) = lower(c.name || ' Branch')
    OR lower(b.name) = lower(c.name || ' HQ')
    OR lower(regexp_replace(b.name, '\s+(Branch|HQ)$', '', 'i')) = lower(c.name)
  );

-- Default India country for any remaining state-linked branches
UPDATE portal_branches b
SET country_id = (
  SELECT id FROM countries WHERE upper(COALESCE(iso_code, '')) = 'IN' ORDER BY id LIMIT 1
)
WHERE b.country_id IS NULL AND b.state_id IS NOT NULL;
