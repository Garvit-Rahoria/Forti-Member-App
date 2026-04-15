const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// ──────── Dropdown Groups ────────────────────────────────────────────────────

// GET /api/dropdowns/groups
router.get('/groups', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, COUNT(i.id) AS item_count
       FROM fb_dropdown_groups g
       LEFT JOIN fb_dropdown_items i ON i.group_id = g.id AND i.is_active = 1
       GROUP BY g.id ORDER BY g.name`
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/dropdowns/groups
router.post('/groups', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, slug, description, items = [] } = req.body;
  if (!name || !slug) return fail(res, 'name and slug required', 422);
  try {
    const [result] = await pool.query(
      'INSERT INTO fb_dropdown_groups (name, slug, description) VALUES (?,?,?)',
      [name, slug, description || null]
    );
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        'INSERT INTO fb_dropdown_items (group_id, label, value, item_order) VALUES (?,?,?,?)',
        [result.insertId, items[i].label, items[i].value, i]
      );
    }
    const [group] = await pool.query('SELECT * FROM fb_dropdown_groups WHERE id = ?', [result.insertId]);
    return ok(res, group[0], 'Group created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Slug already exists', 409);
    console.error(err); return fail(res, 'Server error', 500);
  }
});

// GET /api/dropdowns/groups/:id  with items
router.get('/groups/:id', async (req, res) => {
  try {
    const [[group]] = await pool.query('SELECT * FROM fb_dropdown_groups WHERE id = ?', [req.params.id]);
    if (!group) return fail(res, 'Not found', 404);
    const [items] = await pool.query(
      'SELECT * FROM fb_dropdown_items WHERE group_id = ? ORDER BY item_order, id',
      [req.params.id]
    );
    group.items = items;
    return ok(res, group);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/dropdowns/groups/:id
router.put('/groups/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, description, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE fb_dropdown_groups SET name=?, description=?, is_active=? WHERE id=?',
      [name, description, is_active, req.params.id]
    );
    return ok(res, null, 'Group updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/dropdowns/groups/:id
router.delete('/groups/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_dropdown_groups WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Group deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ──────── Dropdown Items ──────────────────────────────────────────────────────

// GET /api/dropdowns/groups/:id/items
router.get('/groups/:id/items', async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM fb_dropdown_items WHERE group_id = ? ORDER BY item_order, id',
      [req.params.id]
    );
    return ok(res, items);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/dropdowns/groups/:id/items
router.post('/groups/:id/items', requireRole('super_admin', 'admin'), async (req, res) => {
  const { label, value, item_order = 0 } = req.body;
  if (!label || !value) return fail(res, 'label and value required', 422);
  try {
    const [r] = await pool.query(
      'INSERT INTO fb_dropdown_items (group_id, label, value, item_order) VALUES (?,?,?,?)',
      [req.params.id, label, value, item_order]
    );
    const [[item]] = await pool.query('SELECT * FROM fb_dropdown_items WHERE id = ?', [r.insertId]);
    return ok(res, item, 'Item added', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/dropdowns/groups/:gid/items/:iid
router.put('/groups/:gid/items/:iid', requireRole('super_admin', 'admin'), async (req, res) => {
  const { label, value, item_order, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE fb_dropdown_items SET label=?, value=?, item_order=?, is_active=? WHERE id=? AND group_id=?',
      [label, value, item_order, is_active, req.params.iid, req.params.gid]
    );
    return ok(res, null, 'Item updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/dropdowns/groups/:id/items/reorder
router.patch('/groups/:id/items/reorder', requireRole('super_admin', 'admin'), async (req, res) => {
  const { orders } = req.body; // [{id, item_order}]
  if (!Array.isArray(orders)) return fail(res, 'orders array required', 422);
  try {
    for (const { id, item_order } of orders) {
      await pool.query('UPDATE fb_dropdown_items SET item_order=? WHERE id=? AND group_id=?',
        [item_order, id, req.params.id]);
    }
    return ok(res, null, 'Reordered');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/dropdowns/groups/:gid/items/:iid
router.delete('/groups/:gid/items/:iid', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_dropdown_items WHERE id=? AND group_id=?',
      [req.params.iid, req.params.gid]);
    return ok(res, null, 'Item deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/dropdowns/groups/:id/items/bulk  Bulk replace items
router.post('/groups/:id/items/bulk', requireRole('super_admin', 'admin'), async (req, res) => {
  const { items = [] } = req.body;
  try {
    await pool.query('DELETE FROM fb_dropdown_items WHERE group_id = ?', [req.params.id]);
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        'INSERT INTO fb_dropdown_items (group_id, label, value, item_order) VALUES (?,?,?,?)',
        [req.params.id, items[i].label, items[i].value, i]
      );
    }
    return ok(res, null, 'Items saved');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
