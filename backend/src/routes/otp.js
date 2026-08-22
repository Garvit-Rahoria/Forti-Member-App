const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { sendOTP } = require('../utils/email');

const router = express.Router();

// ── Generate a 6-digit OTP ─────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

// ── POST /api/otp/send ─────────────────────────────────────────────────────
// Body: { email, full_name, phone, purpose: 'apply'|'login' }
router.post('/send', async (req, res) => {
  try {
    const { email, full_name, phone, purpose = 'apply' } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, 'A valid email address is required', 422);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // For 'apply' purpose, require name
    if (purpose === 'apply' && !full_name?.trim()) {
      return fail(res, 'Full name is required', 422);
    }

    if (purpose === 'apply') {
      const [existingMembers] = await pool.query(
        'SELECT id FROM member_accounts WHERE LOWER(email) = ? LIMIT 1',
        [normalizedEmail]
      );
      if (existingMembers.length) {
        return fail(res, 'This email is already registered. Please login or use a different email.', 409);
      }

      const [existingApplications] = await pool.query(
        "SELECT id FROM fb_submissions WHERE LOWER(applicant_email) = ? AND status != 'draft' LIMIT 1",
        [normalizedEmail]
      );
      if (existingApplications.length) {
        return fail(res, 'This email is already registered. Please login or use a different email.', 409);
      }

      // Check phone duplicate at OTP send step too
      if (phone && phone.trim()) {
        const normalizedPhone = phone.trim().replace(/\s+/g, '');
        const [existingPhone] = await pool.query(
          "SELECT id FROM fb_submissions WHERE REPLACE(applicant_phone, ' ', '') = ? AND status != 'draft' LIMIT 1",
          [normalizedPhone]
        );
        if (existingPhone.length) {
          return fail(res, 'This mobile number is already registered with another membership application.', 409);
        }
      }
    }

    // For 'login' purpose, check the member has applied (active OR pending)
    if (purpose === 'login') {
      const [accounts] = await pool.query(
        'SELECT id FROM member_accounts WHERE LOWER(email) = ? LIMIT 1',
        [normalizedEmail]
      );
      if (!accounts.length) {
        // Also check if they have a submitted application (before member_account is created)
        const [subs] = await pool.query(
          "SELECT id FROM fb_submissions WHERE LOWER(applicant_email) = ? AND status != 'draft' LIMIT 1",
          [normalizedEmail]
        );
        if (!subs.length) {
          return fail(res, 'No membership application found for this email. Please apply for membership first.', 404);
        }
      }
    }

// Rate-limit: max 10 OTPs per email per 10 minutes
  const [recent] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM member_otps
     WHERE email = ? AND purpose = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
    [normalizedEmail, purpose]
  );
  if (recent[0].cnt >= 10) {
      return fail(res, 'Too many OTP requests. Please wait 10 minutes before trying again.', 429);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this email + purpose
    await pool.query(
      'UPDATE member_otps SET verified = 1 WHERE email = ? AND purpose = ? AND verified = 0',
      [normalizedEmail, purpose]
    );

    await pool.query(
      'INSERT INTO member_otps (email, phone, full_name, otp_code, purpose, expires_at) VALUES (?,?,?,?,?,?)',
      [normalizedEmail, phone || null, full_name || null, otp, purpose, expiresAt]
    );

    // Send OTP via email only — await so MIME/CID errors are logged
    try {
      await sendOTP({ to: email.trim(), name: full_name || null, otp, purpose });
    } catch (e) {
      console.error('[OTP email error]', e.message);
    }

    // SMS intentionally not used — OTP is delivered via email only

    // OTP sent — no dev payload exposed
    return ok(res, { email: normalizedEmail }, `OTP sent to ${email}`);
  } catch (err) {
    console.error('[OTP /send error]', err.message);
    return fail(res, 'Failed to send OTP. Please try again.', 500);
  }
});

// ── POST /api/otp/verify ───────────────────────────────────────────────────
// Body: { email, otp, purpose }
// Returns: { verified: true, token } — token used to gate the form or member session
router.post('/verify', async (req, res) => {
  try {
  const { email, otp, purpose = 'apply' } = req.body;

  if (!email || !otp) {
    return fail(res, 'Email and OTP are required', 422);
  }

  // Master bypass removed — all OTPs must be verified via email

  const [rows] = await pool.query(
    `SELECT * FROM member_otps
     WHERE email = ? AND purpose = ? AND verified = 0
     ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase().trim(), purpose]
  );

  if (!rows.length) {
    return fail(res, 'No pending OTP found for this email. Please request a new OTP.', 400);
  }

  const record = rows[0] || {};

  // Check expiry
  if (record.expires_at && new Date() > new Date(record.expires_at)) {
    return fail(res, 'OTP has expired. Please request a new OTP.', 400);
  }

  // Increment attempts
  if (record.id) {
    await pool.query('UPDATE member_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);
  }

  // Max attempts
  if (record.attempts >= 5) {
    return fail(res, 'Too many incorrect attempts. Please request a new OTP.', 400);
  }

  // Validate OTP
  if (record.otp_code !== String(otp).trim()) {
    return fail(res, 'Invalid OTP. Please check and try again.', 400);
  }

  // Mark verified
  if (record.id) {
    await pool.query(
      'UPDATE member_otps SET verified = 1, verified_at = NOW() WHERE id = ?',
      [record.id]
    );
  }

  // For 'login' purpose, generate a member JWT
  if (purpose === 'login') {
    const [subs] = await pool.query(
      `SELECT s.id, s.uuid, s.applicant_email, s.applicant_name, s.applicant_phone,
              s.membership_id, s.status, s.member_status, s.expiry_date
       FROM fb_submissions s
       WHERE s.applicant_email = ? AND s.status != 'draft'
       ORDER BY
         CASE COALESCE(s.member_status, 'inactive')
           WHEN 'active' THEN 0
           ELSE 1
         END ASC,
         CASE s.status
           WHEN 'active'           THEN 0
           WHEN 'approved'         THEN 1
           WHEN 'payment_verified' THEN 2
           WHEN 'payment_pending'  THEN 3
           WHEN 'payment_submitted' THEN 4
           WHEN 'under_review'     THEN 5
           WHEN 'submitted'        THEN 6
           WHEN 'pending'          THEN 7
           WHEN 'rejected'         THEN 8
           ELSE 9
         END ASC,
         s.created_at DESC, s.id DESC LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    if (!subs.length) return fail(res, 'Member application not found', 404);

    const submission = subs[0];
    const [accounts] = await pool.query(
      `SELECT ma.*
       FROM member_accounts ma
       WHERE ma.submission_id = ?
       ORDER BY ma.id DESC LIMIT 1`,
      [submission.id]
    );

    let member = accounts[0];
    if (!member) {
      const memberUuid = require('crypto').randomUUID();
      try {
        const [insertResult] = await pool.query(
          `INSERT INTO member_accounts (uuid, submission_id, email, full_name, phone, membership_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            memberUuid,
            submission.id,
            submission.applicant_email,
            submission.applicant_name,
            submission.applicant_phone || null,
            submission.membership_id || null,
            submission.member_status === 'active' ? 1 : 0,
          ]
        );
        member = {
          id: insertResult.insertId,
          uuid: memberUuid,
          submission_id: submission.id,
          email: submission.applicant_email,
          full_name: submission.applicant_name,
          phone: submission.applicant_phone || null,
          membership_id: submission.membership_id || null,
        };
      } catch (memberErr) {
        if (memberErr.code === 'ER_DUP_ENTRY') {
          const [[emailAcc]] = await pool.query(
            'SELECT id, uuid, email, full_name, phone, membership_id FROM member_accounts WHERE email = ? LIMIT 1',
            [submission.applicant_email]
          );
          if (!emailAcc) throw memberErr;
          member = { ...emailAcc, submission_id: submission.id };
        } else {
          throw memberErr;
        }
      }
    }

    await pool.query('UPDATE member_accounts SET last_login = NOW() WHERE id = ?', [member.id]);

    // Determine role: 'member' if membership is active, 'applicant' otherwise
    const [[subStatus]] = await pool.query(
      'SELECT status, member_status FROM fb_submissions WHERE id = ? LIMIT 1',
      [member.submission_id]
    );
    const memberRole =
      subStatus && subStatus.status === 'active' && subStatus.member_status === 'active'
        ? 'member'
        : 'applicant';

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: member.id, email: member.email, submission_id: member.submission_id, role: memberRole },
      process.env.JWT_SECRET || 'your_super_secret_key_change_me_in_production',
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
  } catch (err) {
    console.error('[OTP /verify error]', err.message);
    return fail(res, 'OTP verification failed. Please try again.', 500);
  }
});

module.exports = router;
