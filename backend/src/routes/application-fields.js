const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

// GET /api/application-fields/list  PUBLIC — used by membership form Step 1
router.get('/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM application_fields WHERE is_active = 1 ORDER BY field_order, id'
    );
    // Parse options JSON
    for (const f of rows) {
      if (f.options && typeof f.options === 'string') {
        try { f.options = JSON.parse(f.options); } catch { f.options = []; }
      }
    }
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// Admin routes
router.use(authMiddleware);

// GET /api/application-fields  Admin list all (including inactive)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM application_fields ORDER BY field_order, id'
    );
    for (const f of rows) {
      if (f.options && typeof f.options === 'string') {
        try { f.options = JSON.parse(f.options); } catch { f.options = []; }
      }
    }
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/application-fields  Create field
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { step, field_key, label, field_type = 'text', is_required = 0, placeholder, options } = req.body;
  if (!field_key || !label) return fail(res, 'field_key and label are required', 422);

  try {
    // Auto-order: place at end within the same step
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(field_order), -1) AS maxOrder FROM application_fields WHERE step = ?',
      [step || 1]
    );

    const [r] = await pool.query(
      `INSERT INTO application_fields (step, field_key, label, field_type, is_required, field_order, placeholder, options)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        step || 1, field_key, label, field_type, is_required ? 1 : 0,
        maxOrder + 1, placeholder || null,
        options ? JSON.stringify(options) : null,
      ]
    );

    const [[field]] = await pool.query('SELECT * FROM application_fields WHERE id = ?', [r.insertId]);
    if (field.options && typeof field.options === 'string') {
      try { field.options = JSON.parse(field.options); } catch { field.options = []; }
    }
    return ok(res, field, 'Field created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Field key already exists', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/application-fields/:id  Update field
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { step, label, field_type, is_required, placeholder, options, is_active } = req.body;

  try {
    const [[existing]] = await pool.query('SELECT * FROM application_fields WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 'Not found', 404);

    await pool.query(
      `UPDATE application_fields SET
         step = ?, label = ?, field_type = ?, is_required = ?, placeholder = ?, options = ?, is_active = ?
       WHERE id = ?`,
      [
        step !== undefined ? step : existing.step,
        label !== undefined ? label : existing.label,
        field_type !== undefined ? field_type : existing.field_type,
        is_required !== undefined ? (is_required ? 1 : 0) : existing.is_required,
        placeholder !== undefined ? (placeholder || null) : existing.placeholder,
        options !== undefined ? JSON.stringify(options) : existing.options,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        req.params.id,
      ]
    );

    const [[field]] = await pool.query('SELECT * FROM application_fields WHERE id = ?', [req.params.id]);
    if (field.options && typeof field.options === 'string') {
      try { field.options = JSON.parse(field.options); } catch { field.options = []; }
    }
    return ok(res, field, 'Field updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PATCH /api/application-fields/reorder  Bulk reorder
router.patch('/reorder', requireRole('super_admin', 'admin'), async (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) return fail(res, 'orders array required', 422);
  try {
    for (const { id, field_order } of orders) {
      await pool.query('UPDATE application_fields SET field_order = ? WHERE id = ?', [field_order, id]);
    }
    return ok(res, null, 'Fields reordered');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// DELETE /api/application-fields/:id  Soft-delete (set is_active = 0)
router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('UPDATE application_fields SET is_active = 0 WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Field deactivated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
