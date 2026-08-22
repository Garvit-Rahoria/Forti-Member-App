const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();
router.use(authMiddleware);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePackage(pkg) {
  if (!pkg) return pkg;
  if (pkg.benefits && typeof pkg.benefits === 'string') {
    try { pkg.benefits = JSON.parse(pkg.benefits); } catch {}
  }
  return pkg;
}

function toBool(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function durationToMonths(duration) {
  const d = String(duration || '').toLowerCase().trim();
  if (d === 'lifetime') return 999;
  if (d === '1year' || d === 'yearly') return 12;
  if (d === '3years') return 36;
  const match = d.match(/^(\d+)\s*years?$/);
  if (match) return Number(match[1]) * 12;
  return 12;
}

function isDuplicateError(err) {
  return err?.code === 'ER_DUP_ENTRY' || err?.code === '23505';
}

// GET /api/packages
router.get('/', async (req, res) => {
  try {
    const { location, membership_type, duration } = req.query;
    const conditions = [];
    const params = [];
    if (location)        { conditions.push('location = ?');        params.push(location); }
    if (membership_type) { conditions.push('membership_type = ?'); params.push(membership_type); }
    if (duration)        { conditions.push('duration = ?');        params.push(duration); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await pool.query(
      'SELECT * FROM portal_packages' + where + ' ORDER BY sort_order, id', params
    );
    return ok(res, rows.map(parsePackage));
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/packages/by-location – public: active packages for a given location
router.get('/by-location', async (req, res) => {
  try {
    const { location, membership_type, duration } = req.query;
    const conditions = ['is_active = 1'];
    const params = [];
    if (location)        { conditions.push('location = ?');        params.push(location); }
    if (membership_type) { conditions.push('membership_type = ?'); params.push(membership_type); }
    if (duration)        { conditions.push('duration = ?');        params.push(duration); }
    const [rows] = await pool.query(
      'SELECT * FROM portal_packages WHERE ' + conditions.join(' AND ') + ' ORDER BY sort_order, id', params
    );
    return ok(res, rows.map(parsePackage));
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/packages/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM portal_packages WHERE id = ?', [req.params.id]);
    if (!row) return fail(res, 'Not found', 404);
    return ok(res, parsePackage(row));
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/packages
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const {
    name, code, price, location, membership_type, duration,
    description, benefits, is_active = true, country_id, currency, wing_id
  } = req.body;

  if (!name || !code) return fail(res, 'Name and code are required', 422);
  if (!location || !membership_type || !duration) return fail(res, 'Location, membership_type, and duration are required', 422);

  try {
    const durationMonths = durationToMonths(duration);
    const [r] = await pool.query(
      `INSERT INTO portal_packages
         (name, code, price, location, membership_type, duration, duration_months, country_id, description, benefits, is_active, currency, auto_generated, wing_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
      [
        name, code, Number(price) || 0,
        location, membership_type, duration, durationMonths,
        country_id || null,
        description || null,
        typeof benefits === 'string' ? benefits : JSON.stringify(benefits || []),
        toBool(is_active, true),
        currency || 'INR',
        wing_id || null
      ]
    );

    const [[pkg]] = await pool.query('SELECT * FROM portal_packages WHERE id = ?', [r.insertId]);
    createAuditLog(req.user.id, 'CREATE_PACKAGE', 'packages', String(r.insertId), req.ip);
    return ok(res, parsePackage(pkg), 'Package created', 201);
  } catch (err) {
    if (isDuplicateError(err)) return fail(res, 'Package code already exists', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/packages/:id
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const {
    name, code, price, location: newLoc, membership_type: newType, duration: newDur,
    description, benefits, is_active, country_id: newCountryId, currency, wing_id
  } = req.body;

  try {
    const [[current]] = await pool.query('SELECT * FROM portal_packages WHERE id = ?', [req.params.id]);
    if (!current) return fail(res, 'Not found', 404);

    const nextDuration = newDur || current.duration;
    await pool.query(
      `UPDATE portal_packages SET
         name = ?, code = ?, price = ?, location = ?, membership_type = ?, duration = ?,
         duration_months = ?, country_id = ?, description = ?, benefits = ?, is_active = ?, currency = ?, wing_id = ?
       WHERE id = ?`,
      [
        name || current.name,
        code || current.code,
        price !== undefined ? Number(price) : current.price,
        newLoc !== undefined ? newLoc : current.location,
        newType !== undefined ? newType : current.membership_type,
        nextDuration,
        durationToMonths(nextDuration),
        newCountryId !== undefined ? (newCountryId || null) : current.country_id,
        description !== undefined ? description : current.description,
        benefits !== undefined
          ? (typeof benefits === 'string' ? benefits : JSON.stringify(benefits || []))
          : current.benefits,
        is_active !== undefined ? toBool(is_active, current.is_active) : current.is_active,
        currency !== undefined ? (currency || 'INR') : (current.currency || 'INR'),
        wing_id !== undefined ? (wing_id || null) : current.wing_id,
        req.params.id,
      ]
    );

    const [[pkg]] = await pool.query('SELECT * FROM portal_packages WHERE id = ?', [req.params.id]);
    createAuditLog(req.user.id, 'UPDATE_PACKAGE', 'packages', req.params.id, req.ip);
    return ok(res, parsePackage(pkg), 'Package updated');
  } catch (err) {
    if (isDuplicateError(err)) return fail(res, 'Package code already exists', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// DELETE /api/packages/:id  (hard delete — permanently removes the package)
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM portal_packages WHERE id = ?', [req.params.id]);
    createAuditLog(req.user.id, 'DELETE_PACKAGE', 'packages', req.params.id, req.ip);
    return ok(res, null, 'Package deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;

