const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// GET /api/audit  Paginated audit log
router.get('/', async (req, res) => {
  const { q, module, action, from, to, page = 1, per_page = 30 } = req.query;
  let where = '1=1';
  const params = [];
  if (module) { where += ' AND a.module=?'; params.push(module); }
  if (action) { where += ' AND a.action=?'; params.push(action); }
  if (from)   { where += ' AND a.created_at>=?'; params.push(from); }
  if (to)     { where += ' AND a.created_at<=?'; params.push(to + ' 23:59:59'); }
  if (q)      { where += ' AND (a.action LIKE ? OR a.module LIKE ? OR a.record_id LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  try {
    const result = await paginate(
      pool,
      `SELECT a.*, u.full_name AS admin_name, u.email AS admin_email
       FROM audit_logs a
       LEFT JOIN portal_admin_users u ON u.id=a.user_id
       WHERE ${where} ORDER BY a.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/audit/modules  Distinct modules for filter dropdown
router.get('/modules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT module FROM audit_logs ORDER BY module');
    return ok(res, rows.map(r => r.module));
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/audit  Internal helper – create audit record (used by other routes)
// This endpoint should not be called directly from frontend
router.post('/', requireRole('super_admin'), async (req, res) => {
  const { action, module, record_id, old_values, new_values } = req.body;
  if (!action || !module) return fail(res, 'action and module required', 422);
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, module, record_id, old_values, new_values, ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, action, module, record_id || null,
       old_values ? JSON.stringify(old_values) : null,
       new_values ? JSON.stringify(new_values) : null,
       req.ip]
    );
    return ok(res, null, 'Logged', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
