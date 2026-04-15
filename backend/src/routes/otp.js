const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { sendOTP } = require('../utils/email');
const { sendSMS } = require('../utils/sms');

const router = express.Router();

// ── Generate a 6-digit OTP ─────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

// ── POST /api/otp/send ─────────────────────────────────────────────────────
// Body: { email, full_name, phone, purpose: 'apply'|'login' }
router.post('/send', async (req, res) => {
  const { email, full_name, phone, purpose = 'apply' } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(res, 'A valid email address is required', 422);
  }

  // For 'apply' purpose, require name
  if (purpose === 'apply' && !full_name?.trim()) {
    return fail(res, 'Full name is required', 422);
  }

  // For 'login' purpose, check the member exists
  if (purpose === 'login') {
    const [accounts] = await pool.query(
      'SELECT id FROM member_accounts WHERE email = ? AND is_active = 1 LIMIT 1',
      [email.toLowerCase().trim()]
    );
    if (!accounts.length) {
      return fail(res, 'No active member account found for this email. Please apply for membership first.', 404);
    }
  }

  // Rate-limit: max 3 OTPs per email per 10 minutes
  const [recent] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM member_otps
     WHERE email = ? AND purpose = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
    [email.toLowerCase().trim(), purpose]
  );
  if (recent[0].cnt >= 3) {
    return fail(res, 'Too many OTP requests. Please wait 10 minutes before trying again.', 429);
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate previous OTPs for this email + purpose
  await pool.query(
    'UPDATE member_otps SET verified = 1 WHERE email = ? AND purpose = ? AND verified = 0',
    [email.toLowerCase().trim(), purpose]
  );

  await pool.query(
    'INSERT INTO member_otps (email, phone, full_name, otp_code, purpose, expires_at) VALUES (?,?,?,?,?,?)',
    [email.toLowerCase().trim(), phone || null, full_name || null, otp, purpose, expiresAt]
  );

  // Send email OTP (async – don't block request)
  sendOTP({ to: email.trim(), name: full_name || null, otp, purpose }).catch(e => {
    console.error('[OTP email error]', e.message);
  });

  // Send SMS OTP (async – don't block request)
  if (phone) {
    sendSMS({ phone: phone.trim(), otp, name: full_name || null }).catch(e => {
      console.error('[OTP sms error]', e.message);
    });
  }

  // In development, include OTP in response for testing
  const devPayload = process.env.NODE_ENV === 'development' ? { _dev_otp: otp } : {};

  return ok(res, { email: email.toLowerCase().trim(), ...devPayload }, `OTP sent to ${email}`);
});

// ── POST /api/otp/verify ───────────────────────────────────────────────────
// Body: { email, otp, purpose }
// Returns: { verified: true, token } — token used to gate the form or member session
router.post('/verify', async (req, res) => {
  const { email, otp, purpose = 'apply' } = req.body;

  if (!email || !otp) {
    return fail(res, 'Email and OTP are required', 422);
  }

  const [rows] = await pool.query(
    `SELECT * FROM member_otps
     WHERE email = ? AND purpose = ? AND verified = 0
     ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase().trim(), purpose]
  );

  if (!rows.length) {
    return fail(res, 'No pending OTP found for this email. Please request a new OTP.', 400);
  }

  const record = rows[0];

  // Check expiry
  if (new Date() > new Date(record.expires_at)) {
    return fail(res, 'OTP has expired. Please request a new OTP.', 400);
  }

  // Increment attempts
  await pool.query('UPDATE member_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);

  // Max attempts
  if (record.attempts >= 5) {
    return fail(res, 'Too many incorrect attempts. Please request a new OTP.', 400);
  }

  // Check OTP
  if (record.otp_code !== String(otp).trim()) {
    return fail(res, 'Invalid OTP. Please check and try again.', 400);
  }

  // Mark verified
  await pool.query(
    'UPDATE member_otps SET verified = 1, verified_at = NOW() WHERE id = ?',
    [record.id]
  );

  // For 'login' purpose, generate a member JWT
  if (purpose === 'login') {
    const [accounts] = await pool.query(
      `SELECT ma.*, s.status, s.membership_id AS m_id, s.expiry_date, s.member_status
       FROM member_accounts ma
       JOIN fb_submissions s ON s.id = ma.submission_id
       WHERE ma.email = ? AND ma.is_active = 1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    if (!accounts.length) return fail(res, 'Member account not found', 404);

    const member = accounts[0];
    await pool.query('UPDATE member_accounts SET last_login = NOW() WHERE id = ?', [member.id]);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: member.id, email: member.email, submission_id: member.submission_id, role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return ok(res, {
      token,
      member: {
        id: member.id,
        uuid: member.uuid,
        email: member.email,
        full_name: member.full_name,
        membership_id: member.membership_id,
        submission_id: member.submission_id,
      }
    }, 'OTP verified. Login successful.');
  }

  // For 'apply' purpose, return a short-lived verification token
  const jwt = require('jsonwebtoken');
  const verifyToken = jwt.sign(
    { email: email.toLowerCase().trim(), full_name: record.full_name, phone: record.phone, purpose: 'apply' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  return ok(res, {
    verified: true,
    token: verifyToken,
    applicant: {
      email: email.toLowerCase().trim(),
      full_name: record.full_name,
      phone: record.phone,
    }
  }, 'OTP verified successfully');
});

module.exports = router;
