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
       FROM portal_admin_users
       WHERE ${where} AND id IN (SELECT MAX(id) FROM portal_admin_users GROUP BY LOWER(email))
       ORDER BY created_at DESC`,
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
  const validRoles = ['super_admin', 'branch_manager', 'office_staff'];
  if (!validRoles.includes(role)) return fail(res, `Invalid role. Allowed: ${validRoles.join(', ')}`, 422);
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

// PUT /api/users/:id  Update user (partial updates supported)
router.put('/:id', requireRole('super_admin'), async (req, res) => {
  const { full_name, email, role, is_active, assigned_state_id } = req.body;
  const validRoles = ['super_admin', 'branch_manager', 'office_staff'];
  if (role && !validRoles.includes(role)) return fail(res, `Invalid role. Allowed: ${validRoles.join(', ')}`, 422);
  try {
    // Build dynamic update — only update fields that were explicitly provided
    const fields = [];
    const params = [];
    if (full_name !== undefined)       { fields.push('full_name=?');        params.push(full_name); }
    if (email !== undefined)           { fields.push('email=?');            params.push(email); }
    if (role !== undefined)            { fields.push('role=?');             params.push(role); }
    if (is_active !== undefined)       { fields.push('is_active=?');        params.push(is_active ? 1 : 0); }
    if (assigned_state_id !== undefined) { fields.push('assigned_state_id=?'); params.push(assigned_state_id || null); }
    if (!fields.length) return fail(res, 'No fields to update', 422);
    params.push(req.params.id);
    await pool.query(`UPDATE portal_admin_users SET ${fields.join(', ')} WHERE id=?`, params);
    createAuditLog(req.user.id, 'UPDATE_USER', 'users', req.params.id, req.ip);
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

// POST /api/users/:id/send-reset  Send password reset email using latest DB email
router.post('/:id/send-reset', requireRole('super_admin'), async (req, res) => {
  try {
    // Always fetch fresh email from DB — never trust cached/request data
    const [[user]] = await pool.query(
      'SELECT id, full_name, email FROM portal_admin_users WHERE id=? AND is_active=1 LIMIT 1',
      [req.params.id]
    );
    if (!user) return fail(res, 'User not found or inactive', 404);
    console.log(`[send-reset] Sending reset to DB email: ${user.email} for user ID: ${user.id}`);

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      'UPDATE portal_admin_users SET reset_token=?, reset_token_expires=? WHERE id=?',
      [token, expires, user.id]
    );
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const { sendMail } = require('../utils/email');
    try {
      await sendMail({
        to: user.email,
        subject: 'FORTI Portal — Password Reset',
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
            <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:28px 32px;text-align:center">
              <p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:3px">FORTI</p>
              <p style="color:#c4b5fd;font-size:11px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">Admin Portal</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:16px;font-weight:600;color:#1f2937;margin:0 0 8px">Hi ${user.full_name},</p>
              <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 20px">A password reset was requested for your FORTI Portal admin account.</p>
              <div style="text-align:center;margin:24px 0">
                <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.3px">Reset My Password</a>
              </div>
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 12px">Or copy this link into your browser:</p>
              <p style="background:#f3f4f6;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:12px;color:#374151;word-break:break-all;margin:0 0 20px">${resetUrl}</p>
              <p style="color:#9ca3af;font-size:13px;margin:0 0 4px">⏰ This link expires in <strong>1 hour</strong>.</p>
              <p style="color:#9ca3af;font-size:13px;margin:0">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="color:#9ca3af;font-size:11px;margin:0">FORTI Membership Management System</p>
            </div>
          </div>
        `,
      });
      console.log(`[send-reset] Email delivered to ${user.email}`);
    } catch (emailErr) {
      console.error('[send-reset] Email delivery failed:', emailErr.message);
      return fail(res, `User updated but email delivery failed: ${emailErr.message}`, 502);
    }
    createAuditLog(req.user.id, 'PASSWORD_RESET_REQUESTED', 'users', req.params.id, req.ip);
    return ok(res, { email: user.email }, 'Reset link sent to current email');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
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

