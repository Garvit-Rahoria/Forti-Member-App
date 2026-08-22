const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

/**
 * Normalize stored exchange_rate to "INR per 1 unit of foreign currency".
 * - rate >= 1  → admin-friendly "1 USD = ₹90" style
 * - rate < 1   → legacy seed "1 INR = 0.012 USD" style
 */
function inrPerForeignUnit(currencyCode, exchangeRate) {
  const code = String(currencyCode || '').toUpperCase();
  const rate = Number(exchangeRate);
  if (!code || code === 'INR') return 1;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate >= 1 ? rate : (1 / rate);
}

function roundMoney(n, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
}

// ── Internal seed helper ─────────────────────────────────────────────────────
async function ensureCurrencySeeded() {
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM currency_settings');
  if (Number(cnt) > 0) return;

  // Rates stored as INR per 1 unit of foreign currency (1 USD = ₹83.33)
  const SEEDS = [
    { iso: 'IN', code: 'INR', sym: '₹',   name: 'Indian Rupee',       rate: 1,      def: 1 },
    { iso: 'US', code: 'USD', sym: '$',    name: 'US Dollar',          rate: 83.33,  def: 0 },
    { iso: 'GB', code: 'GBP', sym: '£',    name: 'British Pound',      rate: 106.0,  def: 0 },
    { iso: 'AE', code: 'AED', sym: 'د.إ', name: 'UAE Dirham',         rate: 22.70,  def: 0 },
    { iso: 'JP', code: 'JPY', sym: '¥',    name: 'Japanese Yen',       rate: 0.56,   def: 0 },
    { iso: 'AU', code: 'AUD', sym: 'A$',   name: 'Australian Dollar',  rate: 55.50,  def: 0 },
    { iso: 'CA', code: 'CAD', sym: 'C$',   name: 'Canadian Dollar',    rate: 62.50,  def: 0 },
    { iso: 'SG', code: 'SGD', sym: 'S$',   name: 'Singapore Dollar',   rate: 62.50,  def: 0 },
    { iso: 'DE', code: 'EUR', sym: '€',    name: 'Euro',               rate: 90.90,  def: 0 },
    { iso: 'SA', code: 'SAR', sym: '﷼',   name: 'Saudi Riyal',        rate: 22.20,  def: 0 },
    { iso: 'QA', code: 'QAR', sym: '﷼',   name: 'Qatari Riyal',       rate: 22.70,  def: 0 },
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

// GET /api/currency-settings/convert?amount=4999&from=INR&to=USD  PUBLIC
// Converts membership fee (INR base) to target currency using admin-configured rates.
router.get('/convert', async (req, res) => {
  try {
    await ensureCurrencySeeded();
    const amount = Number(req.query.amount);
    const from = String(req.query.from || 'INR').toUpperCase();
    const to = String(req.query.to || 'USD').toUpperCase();

    if (!Number.isFinite(amount) || amount < 0) {
      return fail(res, 'Valid amount is required', 422);
    }
    if (from !== 'INR') {
      return fail(res, 'Only INR base conversion is supported currently', 422);
    }

    if (to === 'INR') {
      return ok(res, {
        base_amount: roundMoney(amount),
        base_currency: 'INR',
        target_currency: 'INR',
        exchange_rate: 1,
        exchange_rate_label: '1 INR = ₹1',
        payable_amount: roundMoney(amount),
        instruction: `Please transfer exactly ₹${roundMoney(amount).toLocaleString('en-IN')} INR.`,
      });
    }

    // Prefer global (country_id NULL) active rate, else any active row for the code
    const [[row]] = await pool.query(
      `SELECT currency_code, currency_symbol, exchange_rate
       FROM currency_settings
       WHERE is_active = TRUE AND UPPER(currency_code) = ?
       ORDER BY country_id IS NULL DESC, is_default DESC, id ASC
       LIMIT 1`,
      [to]
    );
    if (!row) return fail(res, `Exchange rate for ${to} is not configured`, 404);

    const inrPerUnit = inrPerForeignUnit(row.currency_code, row.exchange_rate);
    if (!inrPerUnit) return fail(res, `Invalid exchange rate configured for ${to}`, 500);

    const payable = roundMoney(amount / inrPerUnit, to === 'JPY' ? 0 : 2);
    const rateDisplay = roundMoney(inrPerUnit, 2);
    const sym = row.currency_symbol || to;

    return ok(res, {
      base_amount: roundMoney(amount),
      base_currency: 'INR',
      target_currency: to,
      target_symbol: sym,
      exchange_rate: rateDisplay,
      exchange_rate_raw: Number(row.exchange_rate),
      exchange_rate_label: `1 ${to} = ₹${rateDisplay.toLocaleString('en-IN')} INR`,
      payable_amount: payable,
      instruction: `Please transfer exactly ${sym}${Number(payable).toLocaleString(to === 'INR' ? 'en-IN' : 'en-US')} ${to}.`,
    });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
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
