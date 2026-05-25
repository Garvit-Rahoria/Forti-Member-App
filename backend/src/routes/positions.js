const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active !== '0';
    const [rows] = await pool.query(
      `SELECT * FROM portal_positions ${activeOnly ? 'WHERE is_active = TRUE' : ''} ORDER BY level DESC, sort_order`
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.use(authMiddleware);

router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { title, slug, level, wing_scope, description, sort_order, is_active } = req.body;
  if (!title || !slug) return fail(res, 'title and slug required', 422);
  try {
    const [r] = await pool.query(
      `INSERT INTO portal_positions (title, slug, level, wing_scope, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, level ?? 50, wing_scope || 'per_wing', description || null, sort_order ?? 0, is_active !== false]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_positions WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Position created', 201);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'Slug already exists', 409);
    return fail(res, 'Server error', 500);
  }
});

router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { title, slug, level, wing_scope, description, sort_order, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE portal_positions SET title=COALESCE(?,title), slug=COALESCE(?,slug),
       level=COALESCE(?,level), wing_scope=COALESCE(?,wing_scope),
       description=COALESCE(?,description), sort_order=COALESCE(?,sort_order),
       is_active=COALESCE(?,is_active), updated_at=NOW() WHERE id=?`,
      [title, slug, level, wing_scope, description, sort_order, is_active, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM portal_positions WHERE id = ?', [req.params.id]);
    return ok(res, row);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
