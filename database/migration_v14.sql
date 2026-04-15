-- Migration v14: Fix package duration values and update prices from pricing rules
-- ================================================================================

-- 1. Deactivate old '1year' packages where a 'yearly' version already exists
UPDATE portal_packages old_pkg
  JOIN portal_packages new_pkg
    ON old_pkg.location = new_pkg.location
   AND old_pkg.membership_type = new_pkg.membership_type
   AND old_pkg.duration = '1year'
   AND new_pkg.duration = 'yearly'
   AND new_pkg.is_active = 1
SET old_pkg.is_active = 0
WHERE old_pkg.duration = '1year';

-- 2. For remaining '1year' packages (no 'yearly' version exists), rename duration
UPDATE portal_packages SET duration = 'yearly' WHERE duration = '1year' AND is_active = 1;

-- 3. Update auto-created packages that have price=0 with values from pricing rules
UPDATE portal_packages p
  JOIN package_pricing_rules r
    ON r.location = p.location AND r.membership_type = p.membership_type AND r.is_active = 1
SET
  p.price    = CASE WHEN p.duration = 'lifetime' THEN r.yearly_price * r.lifetime_multiplier ELSE r.yearly_price END,
  p.currency = r.currency
WHERE p.price = 0 AND p.auto_created = 1;

SELECT id, name, code, price, currency, location, membership_type, duration, is_active, auto_created FROM portal_packages ORDER BY id;
