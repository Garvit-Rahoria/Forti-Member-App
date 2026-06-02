const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

// GET /api/branches (Public/Authenticated - get active branches)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.name, b.state_id, s.name as state_name, b.is_active, b.created_at
       FROM portal_branches b
       JOIN states s ON s.id = b.state_id
       ORDER BY s.name, b.name`
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[GET /api/branches]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// All following routes require super_admin
router.use(authMiddleware);
router.use(requireRole('super_admin'));

// POST /api/branches
router.post('/', async (req, res) => {
  const { name, state_id } = req.body;
  if (!name || !state_id) return fail(res, 'Name and state_id are required', 422);

  try {
    const [r] = await pool.query(
      'INSERT INTO portal_branches (name, state_id) VALUES (?, ?) RETURNING id',
      [name, state_id]
    );
    return ok(res, { id: r[0]?.id || r.insertId }, 'Branch created successfully', 201);
  } catch (err) {
    console.error('[POST /api/branches]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/branches/:id
router.put('/:id', async (req, res) => {
  const { name, state_id, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE portal_branches SET name=?, state_id=?, is_active=? WHERE id=?',
      [name, state_id, is_active, req.params.id]
    );
    return ok(res, null, 'Branch updated successfully');
  } catch (err) {
    console.error('[PUT /api/branches/:id]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// DELETE /api/branches/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM portal_branches WHERE id=?', [req.params.id]);
    return ok(res, null, 'Branch deleted successfully');
  } catch (err) {
    console.error('[DELETE /api/branches/:id]', err.message);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
