const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

// GET /api/pricing-rules/list  PUBLIC — used by auto-create logic
router.get('/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM package_pricing_rules WHERE is_active = 1 ORDER BY location, membership_type'
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/pricing-rules/match  PUBLIC — get pricing for a specific combo
router.get('/match', async (req, res) => {
  const { location, membership_type } = req.query;
  if (!location || !membership_type) return fail(res, 'location and membership_type required', 422);
  try {
    const [[rule]] = await pool.query(
      'SELECT * FROM package_pricing_rules WHERE location = ? AND membership_type = ? AND is_active = 1 LIMIT 1',
      [location, membership_type]
    );
    return ok(res, rule || null);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// Admin routes
router.use(authMiddleware);

// GET /api/pricing-rules  Admin list all
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM package_pricing_rules ORDER BY location, membership_type'
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PUT /api/pricing-rules/:id  Update a pricing rule
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { yearly_price, lifetime_multiplier, three_year_multiplier, currency, is_active } = req.body;
  try {
    const [[existing]] = await pool.query('SELECT * FROM package_pricing_rules WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 'Not found', 404);

    await pool.query(
      `UPDATE package_pricing_rules SET
         yearly_price = ?, three_year_multiplier = ?, lifetime_multiplier = ?, currency = ?, is_active = ?
       WHERE id = ?`,
      [
        yearly_price !== undefined ? Number(yearly_price) : existing.yearly_price,
        three_year_multiplier !== undefined ? Number(three_year_multiplier) : (existing.three_year_multiplier ?? 3),
        lifetime_multiplier !== undefined ? Number(lifetime_multiplier) : existing.lifetime_multiplier,
        currency || existing.currency,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        req.params.id,
      ]
    );

    const [[updated]] = await pool.query('SELECT * FROM package_pricing_rules WHERE id = ?', [req.params.id]);
    return ok(res, updated, 'Pricing rule updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PUT /api/pricing-rules  Bulk update all rules
router.put('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { rules } = req.body;
  if (!Array.isArray(rules) || !rules.length) return fail(res, 'rules array required', 422);

  try {
    for (const rule of rules) {
      if (!rule.id) continue;
      await pool.query(
        `UPDATE package_pricing_rules SET
           yearly_price = ?, three_year_multiplier = ?, lifetime_multiplier = ?, currency = ?
         WHERE id = ?`,
        [
          Number(rule.yearly_price) || 0,
          Number(rule.three_year_multiplier) || 3,
          Number(rule.lifetime_multiplier) || 10,
          rule.currency || 'INR',
          rule.id,
        ]
      );
    }
    const [rows] = await pool.query('SELECT * FROM package_pricing_rules ORDER BY location, membership_type');
    return ok(res, rows, 'Pricing rules updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
