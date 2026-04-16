const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

// GET /api/durations — public list of active durations (no auth required)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, label, value, type, sort_order FROM durations WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[durations] GET /', err);
    return fail(res, 'Failed to load durations', 500);
  }
});

// POST /api/durations — admin: create a new duration
router.post('/', authMiddleware, requireRole(['super_admin', 'admin']), async (req, res) => {
  const { label, value, type, sort_order } = req.body;
  if (!label?.trim()) return fail(res, 'Label is required', 422);
  if (!['year', 'lifetime'].includes(type)) return fail(res, 'Type must be year or lifetime', 422);
  try {
    const [result] = await pool.query(
      'INSERT INTO durations (label, value, type, sort_order) VALUES (?, ?, ?, ?)',
      [label.trim(), type === 'lifetime' ? null : (value || null), type, sort_order || 0]
    );
    const [[row]] = await pool.query('SELECT id, label, value, type, sort_order FROM durations WHERE id = ?', [result.insertId]);
    return ok(res, row, 'Duration created', 201);
  } catch (err) {
    console.error('[durations] POST /', err);
    return fail(res, 'Failed to create duration', 500);
  }
});

// DELETE /api/durations/:id — admin: remove a duration
router.delete('/:id', authMiddleware, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    await pool.query('DELETE FROM durations WHERE id = ?', [req.params.id]);
    return ok(res, { deleted: true });
  } catch (err) {
    console.error('[durations] DELETE /:id', err);
    return fail(res, 'Failed to delete duration', 500);
  }
});

module.exports = router;
