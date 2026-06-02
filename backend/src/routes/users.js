const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const { sendMail, verifyEmailService } = require('../utils/email');
const { ensurePasswordResetSchema } = require('../utils/passwordReset');

const router = express.Router();
router.use(authMiddleware);

function resolveFrontendResetBaseUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_PUBLIC_URL,
    process.env.PUBLIC_FRONTEND_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const parsed = new URL(String(candidate).trim());
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      // Try the next candidate.
    }
  }

  const err = new Error('No valid frontend URL configured for password reset emails');
  err.statusCode = 500;
  err.publicMessage = 'Password reset is unavailable because the frontend URL is not configured correctly.';
  throw err;
}

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
      `SELECT id, uuid, full_name, email, role, is_active, last_login, created_at, assigned_state_id, assigned_branch_id
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
      'SELECT id, uuid, full_name, email, role, is_active, last_login, created_at, assigned_state_id, assigned_branch_id FROM portal_admin_users WHERE id=?',
      [req.params.id]
    );
    if (!user) return fail(res, 'Not found', 404);
    return ok(res, user);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/users  Create admin user
router.post('/', requireRole('super_admin'), async (req, res) => {
  const { full_name, email, password, role = 'office_staff', assigned_state_id, assigned_branch_id } = req.body;
  if (!full_name || !email || !password) return fail(res, 'full_name, email, password required', 422);
  const validRoles = ['super_admin', 'branch_manager', 'office_staff'];
  if (!validRoles.includes(role)) return fail(res, `Invalid role. Allowed: ${validRoles.join(', ')}`, 422);
  try {
    const hash = await bcrypt.hash(password, 12);
    const uuid = require('crypto').randomUUID();
    const [r] = await pool.query(
      'INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role, assigned_state_id, assigned_branch_id) VALUES (?,?,?,?,?,?,?)',
      [uuid, full_name, email.toLowerCase().trim(), hash, role, assigned_state_id || null, assigned_branch_id || null]
    );
    const [[user]] = await pool.query(
      'SELECT id, uuid, full_name, email, role, is_active, created_at, assigned_state_id, assigned_branch_id FROM portal_admin_users WHERE id=?',
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
  const { full_name, email, role, is_active, assigned_state_id, assigned_branch_id } = req.body;
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
    if (assigned_branch_id !== undefined) { fields.push('assigned_branch_id=?'); params.push(assigned_branch_id || null); }
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
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return fail(res, 'Invalid user ID', 422);
  }

  try {
    await ensurePasswordResetSchema();

    // Always fetch fresh email from DB — never trust cached/request data
    const [[user]] = await pool.query(
      'SELECT id, full_name, email FROM portal_admin_users WHERE id=? AND is_active=1 LIMIT 1',
      [userId]
    );
    if (!user) return fail(res, 'User not found or inactive', 404);
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(user.email).trim())) {
      return fail(res, 'Selected user does not have a valid email address', 422);
    }

    console.info(`[send-reset] Requested by admin=${req.user.id} target=${user.id} email=${user.email}`);

    const crypto = require('crypto');
    let token;
    try {
      token = crypto.randomBytes(32).toString('hex');
    } catch (tokenErr) {
      console.error('[send-reset] Token generation failed:', tokenErr.message);
      return fail(res, 'Failed to generate reset token', 500);
    }

    const expires = new Date(Date.now() + 60 * 60 * 1000);

    try {
      const [result] = await pool.query(
        'UPDATE portal_admin_users SET reset_token=?, reset_token_expires=? WHERE id=?',
        [token, expires, user.id]
      );

      if (!result.affectedRows) {
        console.error('[send-reset] No rows updated while persisting reset token for user:', user.id);
        return fail(res, 'User account not found while preparing reset request', 404);
      }
    } catch (dbErr) {
      console.error('[send-reset] Failed to persist reset token:', dbErr.message);
      return fail(res, 'Failed to prepare password reset request', 500, {
        code: dbErr.code || 'RESET_TOKEN_PERSIST_FAILED',
      });
    }

    let resetUrl;
    try {
      const frontendUrl = resolveFrontendResetBaseUrl();
      resetUrl = `${frontendUrl}/reset-password/${token}`;
    } catch (urlErr) {
      console.error('[send-reset] Reset URL configuration failed:', urlErr.message);
      return fail(res, urlErr.publicMessage || 'Password reset URL is not configured correctly', urlErr.statusCode || 500);
    }

    try {
      await verifyEmailService();
    } catch (emailServiceErr) {
      console.error('[send-reset] Email service unavailable:', emailServiceErr.message);
      return fail(
        res,
        emailServiceErr.publicMessage || 'Email service unavailable.',
        emailServiceErr.statusCode || 503,
        { code: emailServiceErr.code || 'EMAIL_SERVICE_UNAVAILABLE' }
      );
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'FORTI Portal — Password Reset',
        template: 'password_reset_admin',
        refId: String(user.id),
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
      console.info(`[send-reset] Reset email delivered to ${user.email}`);
    } catch (emailErr) {
      console.error('[send-reset] Email delivery failed:', emailErr.message);
      return fail(
        res,
        emailErr.publicMessage || 'Failed to send reset email.',
        emailErr.statusCode || 502,
        { code: emailErr.code || 'EMAIL_DELIVERY_FAILED' }
      );
    }
    createAuditLog(req.user.id, 'PASSWORD_RESET_REQUESTED', 'users', String(user.id), req.ip);
    return ok(res, { email: user.email }, 'Reset email sent successfully.');
  } catch (err) {
    console.error('[send-reset] Unexpected failure:', err);
    return fail(res, err.publicMessage || 'Failed to send reset email.', err.statusCode || 500);
  }
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

