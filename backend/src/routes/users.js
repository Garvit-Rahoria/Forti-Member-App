const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users  List admin users
router.get('/', requireRole('super_admin'), async (req, res) => {
  const { q, role, page = 1, per_page = 20 } = req.query;
  let where = '1=1';
  const params = [];
  if (role) { where += ' AND role=?'; params.push(role); }
  if (q)    { where += ' AND (full_name LIKE ? OR email LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  try {
    const result = await paginate(
      pool,
      `SELECT id, uuid, full_name, email, role, is_active, last_login, created_at, assigned_state_id
       FROM portal_admin_users WHERE ${where} ORDER BY created_at DESC`,
      params,
      Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/users/:id
router.get('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const [[user]] = await pool.query(
      'SELECT id, uuid, full_name, email, role, is_active, last_login, created_at, assigned_state_id FROM portal_admin_users WHERE id=?',
      [req.params.id]
    );
    if (!user) return fail(res, 'Not found', 404);
    return ok(res, user);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/users  Create admin user
router.post('/', requireRole('super_admin'), async (req, res) => {
  const { full_name, email, password, role = 'office_staff', assigned_state_id } = req.body;
  if (!full_name || !email || !password) return fail(res, 'full_name, email, password required', 422);
  const validRoles = ['super_admin', 'admin', 'branch_manager', 'office_staff'];
  if (!validRoles.includes(role)) return fail(res, 'Invalid role', 422);
  try {
    const hash = await bcrypt.hash(password, 12);
    const uuid = require('crypto').randomUUID();
    const [r] = await pool.query(
      'INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role, assigned_state_id) VALUES (?,?,?,?,?,?)',
      [uuid, full_name, email.toLowerCase().trim(), hash, role, assigned_state_id || null]
    );
    const [[user]] = await pool.query(
      'SELECT id, uuid, full_name, email, role, is_active, created_at, assigned_state_id FROM portal_admin_users WHERE id=?',
      [r.insertId]
    );
    createAuditLog(req.user.id, 'CREATE_USER', 'users', String(r.insertId), req.ip);
    return ok(res, user, 'User created', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Email already exists', 409);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/users/:id  Update user
router.put('/:id', requireRole('super_admin'), async (req, res) => {
  const { full_name, email, role, is_active, assigned_state_id } = req.body;
  try {
    await pool.query(
      'UPDATE portal_admin_users SET full_name=?, email=?, role=?, is_active=?, assigned_state_id=? WHERE id=?',
      [full_name, email, role, is_active, assigned_state_id || null, req.params.id]
    );
    return ok(res, null, 'User updated');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Email already in use', 409);
    return fail(res, 'Server error', 500);
  }
});

// PATCH /api/users/:id/password  Reset password
router.patch('/:id/password', requireRole('super_admin'), async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return fail(res, 'Password must be at least 8 characters', 422);
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE portal_admin_users SET password_hash=? WHERE id=?', [hash, req.params.id]);
    return ok(res, null, 'Password updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/users/me/password  Change own password
router.patch('/me/password', async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return fail(res, 'current_password and new_password required', 422);
  if (new_password.length < 8) return fail(res, 'New password must be at least 8 characters', 422);
  try {
    const [[user]] = await pool.query('SELECT password_hash FROM portal_admin_users WHERE id=?', [req.user.id]);
    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return fail(res, 'Current password incorrect', 401);
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE portal_admin_users SET password_hash=? WHERE id=?', [hash, req.user.id]);
    return ok(res, null, 'Password changed');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) return fail(res, 'Cannot delete your own account', 400);
  try {
    await pool.query('DELETE FROM portal_admin_users WHERE id=?', [req.params.id]);
    return ok(res, null, 'User deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;

