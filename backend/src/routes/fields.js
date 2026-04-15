const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// GET /api/fields?section_id=  or  ?form_id=
router.get('/', async (req, res) => {
  const { section_id, form_id } = req.query;
  try {
    let query, params;
    if (section_id) {
      query  = 'SELECT * FROM fb_fields WHERE section_id = ? AND is_active = 1 ORDER BY field_order, id';
      params = [section_id];
    } else if (form_id) {
      query  = 'SELECT * FROM fb_fields WHERE form_id = ? AND is_active = 1 ORDER BY section_id, field_order, id';
      params = [form_id];
    } else {
      return fail(res, 'section_id or form_id required', 422);
    }
    const [rows] = await pool.query(query, params);
    for (const field of rows) {
      const [opts] = await pool.query(
        'SELECT * FROM fb_field_options WHERE field_id = ? ORDER BY opt_order', [field.id]
      );
      field.options = opts;
    }
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/fields  Create field
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const {
    form_id, section_id, field_key, label, field_type,
    placeholder, help_text, default_value,
    is_required = 0, is_active = 1, field_order,
    col_width = 'full', validation_rules,
    options_source = 'manual', options_table, options_group_id,
    options = [],
  } = req.body;

  if (!form_id || !section_id || !field_key || !label || !field_type)
    return fail(res, 'form_id, section_id, field_key, label, field_type required', 422);

  try {
    // Auto-order
    const [[{ maxOrder }]] = await pool.query(
      'SELECT COALESCE(MAX(field_order), -1) AS maxOrder FROM fb_fields WHERE section_id = ?',
      [section_id]
    );
    const order = field_order !== undefined ? field_order : maxOrder + 1;

    const [result] = await pool.query(
      `INSERT INTO fb_fields
         (form_id, section_id, field_key, label, field_type, placeholder, help_text, default_value,
          is_required, is_active, field_order, col_width, validation_rules, options_source, options_table, options_group_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [form_id, section_id, field_key, label, field_type, placeholder, help_text, default_value,
       is_required, is_active, order, col_width,
       validation_rules ? JSON.stringify(validation_rules) : null,
       options_source, options_table, options_group_id || null]
    );

    const fieldId = result.insertId;

    // Insert manual options
    if (options && options.length) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await pool.query(
          'INSERT INTO fb_field_options (field_id, label, value, opt_order, is_default) VALUES (?,?,?,?,?)',
          [fieldId, opt.label, opt.value, i, opt.is_default || 0]
        );
      }
    }

    const [field] = await pool.query('SELECT * FROM fb_fields WHERE id = ?', [fieldId]);
    const [opts]  = await pool.query('SELECT * FROM fb_field_options WHERE field_id = ? ORDER BY opt_order', [fieldId]);
    field[0].options = opts;
    return ok(res, field[0], 'Field created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Field key already exists in this form', 409);
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/fields/:id  Update field
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const {
    label, field_type, placeholder, help_text, default_value,
    is_required, is_active, field_order, col_width, validation_rules,
    options_source, options_table, options_group_id,
    options = [],
  } = req.body;

  try {
    await pool.query(
      `UPDATE fb_fields SET
         label=?, field_type=?, placeholder=?, help_text=?, default_value=?,
         is_required=?, is_active=?, field_order=?, col_width=?, validation_rules=?,
         options_source=?, options_table=?, options_group_id=?, updated_at=NOW()
       WHERE id=?`,
      [label, field_type, placeholder, help_text, default_value,
       is_required, is_active, field_order, col_width,
       validation_rules ? JSON.stringify(validation_rules) : null,
       options_source, options_table, options_group_id || null,
       req.params.id]
    );

    // Replace options
    if (options !== undefined) {
      await pool.query('DELETE FROM fb_field_options WHERE field_id = ?', [req.params.id]);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await pool.query(
          'INSERT INTO fb_field_options (field_id, label, value, opt_order, is_default, is_active) VALUES (?,?,?,?,?,?)',
          [req.params.id, opt.label, opt.value, i, opt.is_default || 0, opt.is_active !== false ? 1 : 0]
        );
      }
    }

    const [field] = await pool.query('SELECT * FROM fb_fields WHERE id = ?', [req.params.id]);
    const [opts]  = await pool.query('SELECT * FROM fb_field_options WHERE field_id = ? ORDER BY opt_order', [req.params.id]);
    field[0].options = opts;
    return ok(res, field[0], 'Field updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PATCH /api/fields/reorder  Bulk reorder
router.patch('/reorder', requireRole('super_admin', 'admin'), async (req, res) => {
  const { orders } = req.body;
  if (!Array.isArray(orders)) return fail(res, 'orders array required', 422);
  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    for (const { id, field_order, section_id } of orders) {
      await conn.query(
        'UPDATE fb_fields SET field_order=?, section_id=COALESCE(?,section_id) WHERE id=?',
        [field_order, section_id || null, id]
      );
    }
    await conn.commit();
    conn.release();
    return ok(res, null, 'Fields reordered');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PUT /api/fields/:id/conditions  Save conditional logic
router.put('/:id/conditions', requireRole('super_admin', 'admin'), async (req, res) => {
  const fieldId = req.params.id;
  const { conditions } = req.body; // [{action, logic, rules:[{watch_field_id, operator, value}]}]

  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    // Delete existing
    const [existingConds] = await conn.query('SELECT id FROM fb_field_conditions WHERE field_id = ?', [fieldId]);
    for (const c of existingConds) {
      await conn.query('DELETE FROM fb_condition_rules WHERE condition_id = ?', [c.id]);
    }
    await conn.query('DELETE FROM fb_field_conditions WHERE field_id = ?', [fieldId]);

    // Insert new
    if (conditions && conditions.length > 0) {
      for (const cond of conditions) {
        const [cr] = await conn.query(
          'INSERT INTO fb_field_conditions (field_id, action, logic) VALUES (?,?,?)',
          [fieldId, cond.action || 'show', cond.logic || 'AND']
        );
        for (const rule of (cond.rules || [])) {
          await conn.query(
            'INSERT INTO fb_condition_rules (condition_id, watch_field_id, operator, value) VALUES (?,?,?,?)',
            [cr.insertId, rule.watch_field_id, rule.operator, rule.value]
          );
        }
      }
      await conn.query('UPDATE fb_fields SET has_condition=1 WHERE id=?', [fieldId]);
    } else {
      await conn.query('UPDATE fb_fields SET has_condition=0 WHERE id=?', [fieldId]);
    }

    await conn.commit();
    conn.release();
    return ok(res, null, 'Conditions saved');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// DELETE /api/fields/:id
router.delete('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_fields WHERE id = ?', [req.params.id]);
    return ok(res, null, 'Field deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
