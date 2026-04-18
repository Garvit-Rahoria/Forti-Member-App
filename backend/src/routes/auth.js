const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const { createAuditLog } = require('../utils/auditLog');
const { sendMail } = require('../utils/email');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 'Email and password required', 422);

  try {
    const [rows] = await pool.query(
      'SELECT * FROM portal_admin_users WHERE email = ? AND is_active = 1',
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return fail(res, 'Invalid credentials', 401);

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return fail(res, 'Invalid credentials', 401);

    await pool.query('UPDATE portal_admin_users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    createAuditLog(user.id, 'ADMIN_LOGIN', 'auth', String(user.id), req.ip);

    return ok(res, {
      token,
      user: { id: user.id, uuid: user.uuid, full_name: user.full_name, email: user.email, role: user.role, assigned_state_id: user.assigned_state_id, assigned_country_id: user.assigned_country_id },
    }, 'Login successful');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// POST /api/auth/register (super_admin only – create new admin accounts)
router.post('/register', require('../middleware/auth').authMiddleware, require('../middleware/auth').requireRole('super_admin'), async (req, res) => {
  const { full_name, email, password, role = 'staff' } = req.body;
  if (!full_name || !email || !password) return fail(res, 'All fields required', 422);

  try {
    const [exists] = await pool.query('SELECT id FROM portal_admin_users WHERE email = ?', [email]);
    if (exists.length) return fail(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    await pool.query(
      'INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role) VALUES (?,?,?,?,?)',
      [uuid, full_name, email.toLowerCase().trim(), hash, role]
    );
    return ok(res, null, 'Admin user created', 201);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  return ok(res, req.user);
});

// POST /api/auth/forgot-password  — generates a reset link and emails it
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return fail(res, 'Email is required', 422);

  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email FROM portal_admin_users WHERE email=? AND is_active=1 LIMIT 1',
      [email.toLowerCase().trim()]
    );

    // Always return success to avoid email enumeration
    if (!rows.length) return ok(res, null, 'If that email exists, a reset link has been sent.');

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE portal_admin_users SET reset_token=?, reset_token_expires=? WHERE id=?',
      [token, expires, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'FORTI Portal — Password Reset',
      html: `
        <p>Hi ${user.full_name},</p>
        <p>A password reset was requested for your FORTI Portal account.</p>
        <p><a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">Reset Password</a></p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">FORTI Membership Management System</p>
      `,
    }).catch(e => console.error('[forgot-password email]', e.message));

    createAuditLog(user.id, 'PASSWORD_RESET_REQUESTED', 'auth', String(user.id), req.ip);
    return ok(res, null, 'If that email exists, a reset link has been sent.');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// POST /api/auth/reset-password  — validates token and sets new password
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return fail(res, 'token and new_password are required', 422);
  if (new_password.length < 8) return fail(res, 'Password must be at least 8 characters', 422);

  try {
    const [rows] = await pool.query(
      'SELECT id, full_name FROM portal_admin_users WHERE reset_token=? AND reset_token_expires > NOW() AND is_active=1 LIMIT 1',
      [token]
    );
    if (!rows.length) return fail(res, 'Reset link is invalid or has expired', 400);

    const user = rows[0];
    const hash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE portal_admin_users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?',
      [hash, user.id]
    );

    createAuditLog(user.id, 'PASSWORD_RESET', 'auth', String(user.id), req.ip);
    return ok(res, null, 'Password updated successfully. You can now log in.');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
