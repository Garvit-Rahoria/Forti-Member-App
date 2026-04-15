-- migration_v9.sql
-- Adds a UNIQUE constraint on portal_packages(country_id, state_id, membership_type, plan_type)
-- so the package generator cannot create duplicate combos at the DB level.
--
-- Before adding the constraint, remove any actual duplicates that share the same 4-tuple.
-- (The 648 auto-generated packages were already deleted; this is a safety net.)

-- Step 1: Remove remaining duplicates keeping the lowest id for each combo.
DELETE p1
FROM portal_packages p1
INNER JOIN portal_packages p2
  ON  (p1.country_id <=> p2.country_id)
  AND (p1.state_id   <=> p2.state_id)
  AND p1.membership_type = p2.membership_type
  AND p1.plan_type       = p2.plan_type
  AND p1.id > p2.id;

-- Step 2: Add the unique constraint.
ALTER TABLE portal_packages
  ADD CONSTRAINT uq_package_combo
  UNIQUE (country_id, state_id, membership_type, plan_type);
