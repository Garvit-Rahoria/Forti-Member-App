const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// GET /api/sections?form_id=  List sections for a form
router.get('/', async (req, res) => {
  const { form_id } = req.query;
  if (!form_id) return fail(res, 'form_id required', 422);
  try {
    const [rows] = await pool.query(
      `SELECT s.*,
         (SELECT COUNT(*) FROM fb_fields f WHERE f.section_id = s.id AND f.is_active = 1) AS field_count
       FROM fb_sections s WHERE s.form_id = ? ORDER BY s.section_order, s.id`,
      [form_id]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/sections  Create section
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { form_id, title, description, icon, section_order, is_active = 1 } = req.body;
  if (!form_id || !title) return fail(res, 'form_id and title required', 422);
  try {
    // Auto-order: append at end
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(section_order), -1) AS maxOrder FROM fb_sections WHERE form_id = ?',
      [form_id]
    );
    const order = section_order !== undefined ? section_order : maxOrder + 1;

    const [result] = await pool.query(
      'INSERT INTO fb_sections (form_id, title, description, icon, section_order, is_active) VALUES (?,?,?,?,?,?)',
      [form_id, title, description, icon || 'document', order, is_active]
    );
    const [rows] = await pool.query('SELECT * FROM fb_sections WHERE id = ?', [result.insertId]);
    return ok(res, rows[0], 'Section created', 201);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PUT /api/sections/:id  Update section
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { title, description, icon, section_order, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE fb_sections SET title=?, description=?, icon=?, section_order=?, is_active=?, updated_at=NOW() WHERE id=?',
      [title, description, icon, section_order, is_active, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM fb_sections WHERE id = ?', [req.params.id]);
    return ok(res, rows[0], 'Section updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/sections/reorder  Bulk reorder
router.patch('/reorder', requireRole('super_admin', 'admin'), async (req, res) => {
  // body: { orders: [ {id: 1, section_order: 0}, ... ] }
  const { orders } = req.body;
  if (!Array.isArray(orders)) return fail(res, 'orders array required', 422);
  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    for (const { id, section_order } of orders) {
      await conn.query('UPDATE fb_sections SET section_order=? WHERE id=?', [section_order, id]);
    }
    await conn.commit();
    conn.release();
    return ok(res, null, 'Sections reordered');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// DELETE /api/sections/:id
router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_sections WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Section deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
