const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

// ── Internal seed helper ─────────────────────────────────────────────────────
async function ensureCurrencySeeded() {
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM currency_settings');
  if (Number(cnt) > 0) return;

  const SEEDS = [
    { iso: 'IN', code: 'INR', sym: '₹',   name: 'Indian Rupee',       rate: 1,      def: 1 },
    { iso: 'US', code: 'USD', sym: '$',    name: 'US Dollar',          rate: 0.012,  def: 0 },
    { iso: 'GB', code: 'GBP', sym: '£',    name: 'British Pound',      rate: 0.0094, def: 0 },
    { iso: 'AE', code: 'AED', sym: 'د.إ', name: 'UAE Dirham',         rate: 0.044,  def: 0 },
    { iso: 'JP', code: 'JPY', sym: '¥',    name: 'Japanese Yen',       rate: 1.77,   def: 0 },
    { iso: 'AU', code: 'AUD', sym: 'A$',   name: 'Australian Dollar',  rate: 0.018,  def: 0 },
    { iso: 'CA', code: 'CAD', sym: 'C$',   name: 'Canadian Dollar',    rate: 0.016,  def: 0 },
    { iso: 'SG', code: 'SGD', sym: 'S$',   name: 'Singapore Dollar',   rate: 0.016,  def: 0 },
    { iso: 'DE', code: 'EUR', sym: '€',    name: 'Euro',               rate: 0.011,  def: 0 },
    { iso: 'SA', code: 'SAR', sym: '﷼',   name: 'Saudi Riyal',        rate: 0.045,  def: 0 },
    { iso: 'QA', code: 'QAR', sym: '﷼',   name: 'Qatari Riyal',       rate: 0.044,  def: 0 },
  ];

  // Global default
  await pool.query(
    `INSERT INTO currency_settings
       (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
     VALUES (NULL, 'INR', '₹', 'Indian Rupee', 1.000000, TRUE, TRUE)
     ON CONFLICT (country_id, currency_code) DO NOTHING`
  );
  for (const s of SEEDS) {
    const [[row]] = await pool.query('SELECT id FROM countries WHERE iso_code=? LIMIT 1', [s.iso]);
    if (!row) continue;
    await pool.query(
      `INSERT INTO currency_settings
         (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
       VALUES (?, ?, ?, ?, ?, FALSE, TRUE)
       ON CONFLICT (country_id, currency_code) DO NOTHING`,
      [row.id, s.code, s.sym, s.name, s.rate]
    );
  }
}

// GET /api/currency-settings/list  PUBLIC – used by form/display
router.get('/list', async (req, res) => {
  try {
    await ensureCurrencySeeded();
    const { country_id } = req.query;
    let where = 'WHERE cs.is_active=1';
    const params = [];
    if (country_id) {
      // Prefer country-specific, fall back to global
      where += ' AND (cs.country_id=? OR cs.country_id IS NULL)';
      params.push(country_id);
    }
    const [rows] = await pool.query(
      `SELECT cs.*, c.name AS country_name
       FROM currency_settings cs
       LEFT JOIN countries c ON c.id = cs.country_id
       ${where}
       ORDER BY cs.country_id IS NULL, cs.is_default DESC, cs.currency_code`,
      params
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// All admin endpoints require auth
router.use(authMiddleware);

// GET /api/currency-settings  – admin list (auto-seeds if empty)
router.get('/', async (req, res) => {
  try {
    await ensureCurrencySeeded();
    const [rows] = await pool.query(
      `SELECT cs.*, c.name AS country_name
       FROM currency_settings cs
       LEFT JOIN countries c ON c.id = cs.country_id
       ORDER BY cs.country_id IS NULL DESC, c.name, cs.currency_code`
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/currency-settings
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active } = req.body;
  if (!currency_code) return fail(res, 'currency_code is required', 422);
  try {
    // If setting as default, unset previous default for same scope
    if (Number(is_default) === 1) {
      await pool.query(
        'UPDATE currency_settings SET is_default=0 WHERE country_id <=> ? AND is_default=1',
        [country_id || null]
      );
    }
    const [r] = await pool.query(
      `INSERT INTO currency_settings
         (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
       VALUES (?,?,?,?,?,?,?)`,
      [
        country_id || null,
        currency_code.toUpperCase(),
        currency_symbol || currency_code,
        currency_name || currency_code,
        Number(exchange_rate) || 1,
        Number(is_default) || 0,
        Number(is_active) !== 0 ? 1 : 0,
      ]
    );
    createAuditLog(req.user.id, 'CREATE_CURRENCY', 'currency_settings', String(r.insertId), req.ip);
    return ok(res, { id: r.insertId }, 'Currency setting added', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Currency already configured for this country', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/currency-settings/:id
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active } = req.body;
  try {
    // Fetch current to get country_id scope for default unsetting
    const [[current]] = await pool.query('SELECT country_id FROM currency_settings WHERE id=?', [req.params.id]);
    if (!current) return fail(res, 'Not found', 404);

    if (Number(is_default) === 1) {
      await pool.query(
        'UPDATE currency_settings SET is_default=0 WHERE country_id <=> ? AND id != ? AND is_default=1',
        [country_id !== undefined ? (country_id || null) : current.country_id, req.params.id]
      );
    }
    await pool.query(
      `UPDATE currency_settings SET
         country_id=?, currency_code=?, currency_symbol=?, currency_name=?,
         exchange_rate=?, is_default=?, is_active=?
       WHERE id=?`,
      [
        country_id !== undefined ? (country_id || null) : current.country_id,
        (currency_code || '').toUpperCase(),
        currency_symbol, currency_name,
        Number(exchange_rate) || 1,
        Number(is_default) || 0,
        Number(is_active) !== 0 ? 1 : 0,
        req.params.id,
      ]
    );
    createAuditLog(req.user.id, 'UPDATE_CURRENCY', 'currency_settings', req.params.id, req.ip);
    return ok(res, null, 'Updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// DELETE /api/currency-settings/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM currency_settings WHERE id=?', [req.params.id]);
    createAuditLog(req.user.id, 'DELETE_CURRENCY', 'currency_settings', req.params.id, req.ip);
    return ok(res, null, 'Deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
