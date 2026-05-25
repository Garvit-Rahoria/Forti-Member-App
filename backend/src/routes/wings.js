const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active !== '0';
    const [rows] = await pool.query(
      `SELECT * FROM portal_wings ${activeOnly ? 'WHERE is_active = TRUE' : ''} ORDER BY sort_order, name`
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.use(authMiddleware);

router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, slug, description, sort_order, is_active } = req.body;
  if (!name || !slug) return fail(res, 'name and slug required', 422);
  try {
    const [r] = await pool.query(
      `INSERT INTO portal_wings (name, slug, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, slug, description || null, sort_order ?? 0, is_active !== false]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_wings WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Wing created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug already exists', 409);
    return fail(res, 'Server error', 500);
  }
});

router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, slug, description, sort_order, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE portal_wings SET name=COALESCE(?,name), slug=COALESCE(?,slug),
       description=COALESCE(?,description), sort_order=COALESCE(?,sort_order),
       is_active=COALESCE(?,is_active), updated_at=NOW() WHERE id=?`,
      [name, slug, description, sort_order, is_active, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_wings WHERE id = ?', [req.params.id]);
    return ok(res, row);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
