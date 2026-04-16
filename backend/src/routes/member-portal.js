const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { JWT_SECRET } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// ── PUBLIC: GET /api/member/track-status?email=... ───────────────────────
// Returns application_status, payment_status, membership_status for tracking
router.get('/track-status', async (req, res) => {
  const { email } = req.query;
  if (!email || !String(email).trim()) return fail(res, 'email is required', 422);
  try {
    const [[sub]] = await pool.query(
      `SELECT s.status AS application_status,
              COALESCE(pp.status, 'pending') AS payment_status,
              COALESCE(s.member_status, 'inactive') AS membership_status
       FROM fb_submissions s
       LEFT JOIN portal_payments pp ON pp.submission_id = s.id
         AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
       WHERE s.applicant_email = ? AND s.status NOT IN ('draft')
       ORDER BY s.created_at DESC LIMIT 1`,
      [String(email).trim()]
    );
    if (!sub) return fail(res, 'Application not found', 404);
    return ok(res, {
      application_status: sub.application_status,
      payment_status: sub.payment_status,
      membership_status: sub.membership_status,
    });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// Returns active packages filterable by membership_type
router.get('/packages', async (req, res) => {
  try {
    const { membership_type } = req.query;
    const conditions = ['is_active = 1'];
    const params = [];
    if (membership_type) { conditions.push('membership_type = ?'); params.push(membership_type); }
    const [rows] = await pool.query(
      `SELECT id, name, price, currency, duration_months, duration, membership_type, description, benefits
       FROM portal_packages WHERE ${conditions.join(' AND ')} ORDER BY sort_order, price ASC`,
      params
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PUBLIC: GET /api/member/payment-methods ───────────────────────────────
// Cascading: country_code → location → is_default=1 → all active
router.get('/payment-methods', async (req, res) => {
  try {
    const { country_code, location } = req.query;
    let rows = [];

    // 1. Country-specific methods (overseas with specific country)
    if (country_code) {
      const [r] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 AND country_code=? ORDER BY sort_order, id',
        [country_code]
      );
      if (r.length) rows = r;
    }

    // 2. Region/location methods (e.g. rajasthan, other_states, overseas)
    if (!rows.length && location) {
      const [r] = await pool.query(
        "SELECT * FROM portal_payment_methods WHERE is_active=1 AND location=? AND (country_code IS NULL OR country_code='') ORDER BY sort_order, id",
        [location]
      );
      if (r.length) rows = r;
    }

    // 3. Default methods (is_default = 1) — e.g. UPI / Bank Transfer for domestic
    if (!rows.length) {
      const [r] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 AND is_default=1 ORDER BY sort_order, id'
      );
      if (r.length) rows = r;
    }

    // 4. Last resort: any active method
    if (!rows.length) {
      const [r] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 ORDER BY sort_order, id'
      );
      rows = r;
    }

    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PUBLIC: GET /api/member/payment-settings ─────────────────────────────
// Returns UPI ID, bank account details, and payment instructions from settings
router.get('/payment-settings', async (req, res) => {
  try {
    const KEYS = ['upi_id','bank_account_number','bank_ifsc','bank_name','bank_account_name','payment_instructions','support_phone','support_whatsapp'];
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (${KEYS.map(()=>'?').join(',')})`,
      KEYS
    );
    const settings = {};
    for (const r of rows) settings[r.setting_key] = r.setting_value;
    return ok(res, settings);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── Member auth middleware ─────────────────────────────────────────────────
function memberAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'member') return fail(res, 'Access denied', 403);
    req.member = decoded;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

// ── GET /api/member/status — lightweight status check (auth-protected) ──────
router.get('/status', memberAuth, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT s.status, s.member_status
       FROM fb_submissions s
       WHERE s.id = ? LIMIT 1`,
      [req.member.submission_id]
    );
    if (!row) return fail(res, 'Not found', 404);
    return ok(res, { status: row.status, member_status: row.member_status });
  } catch (err) {
    console.error('[GET /api/member/status]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── GET /api/member/me ─────────────────────────────────────────────────────
router.get('/me', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT COALESCE(ma.id, 0) AS id,
            ma.uuid,
            COALESCE(ma.email, s.applicant_email) AS email,
            COALESCE(ma.full_name, s.applicant_name) AS full_name,
            COALESCE(ma.phone, s.applicant_phone) AS phone,
            COALESCE(ma.membership_id, s.membership_id) AS membership_id,
            ma.last_login,
            s.id AS submission_id, s.uuid AS sub_uuid, s.status, s.member_status,
            s.expiry_date, s.submitted_at, s.created_at AS applied_at,
            s.approved_at AS start_date,
            s.data,
            COALESCE(ma.package_id, s.package_id) AS package_id,
            COALESCE(ma.plan_type, s.plan_type, p.plan_type) AS plan_type,
            s.membership_type,
            p.name AS package_name, p.price AS package_price,
            p.plan_type AS pkg_plan_type,
            p.duration_months, p.currency,
            pp.status AS payment_status, pp.amount AS payment_amount,
            pp.transaction_id, pp.created_at AS payment_date,
            pm.name AS payment_method
     FROM fb_submissions s
     LEFT JOIN member_accounts ma ON ma.submission_id = s.id
     LEFT JOIN portal_packages p ON p.id = COALESCE(ma.package_id, s.package_id)
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
       AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
     LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
     WHERE s.id = ? LIMIT 1`,
    [req.member.submission_id]
  );
  if (!rows.length) return fail(res, 'Member not found', 404);

  const member = rows[0];
  if (member.data && typeof member.data === 'string') {
    try { member.data = JSON.parse(member.data); } catch {}
  }
  return ok(res, member);
});

// ── GET /api/member/applications ──────────────────────────────────────────
router.get('/applications', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.uuid, s.membership_id, s.status, s.member_status, s.expiry_date,
            s.submitted_at, s.created_at,
            p.name AS package_name, p.price, p.currency, p.duration_months,
            pp.status AS payment_status, pp.amount, pp.transaction_id
     FROM fb_submissions s
     LEFT JOIN portal_packages p ON p.id = s.package_id
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
     WHERE s.applicant_email = ? AND s.status NOT IN ('draft')
     ORDER BY s.created_at DESC`,
    [req.member.email]
  );
  return ok(res, rows);
});

// ── GET /api/member/application/:uuid ─────────────────────────────────────
router.get('/application/:uuid', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, p.name AS package_name, p.price, p.currency, p.duration_months,
            pp.status AS payment_status, pp.amount, pp.transaction_id, pp.screenshot_path,
            pm.name AS payment_method_name
     FROM fb_submissions s
     LEFT JOIN portal_packages p ON p.id = s.package_id
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
     LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
     WHERE s.uuid = ? AND s.applicant_email = ? LIMIT 1`,
    [req.params.uuid, req.member.email]
  );
  if (!rows.length) return fail(res, 'Application not found', 404);
  const row = rows[0];
  if (row.data && typeof row.data === 'string') {
    try { row.data = JSON.parse(row.data); } catch {}
  }
  return ok(res, row);
});

// ── GET /api/member/invoice/:submission_uuid ──────────────────────────────
router.get('/invoice/:uuid', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.* FROM invoices i
     JOIN fb_submissions s ON s.id = i.submission_id
     WHERE s.uuid = ? AND s.applicant_email = ?
     ORDER BY i.created_at DESC LIMIT 1`,
    [req.params.uuid, req.member.email]
  );
  if (!rows.length) return fail(res, 'Invoice not found', 404);
  return ok(res, rows[0]);
});

// ── GET /api/member/certificate/:submission_uuid/download ─────────────────
router.get('/certificate/:uuid/download', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, s.applicant_email
     FROM portal_certificates c
     JOIN fb_submissions s ON s.id = c.submission_id
     WHERE s.uuid = ? AND s.applicant_email = ? LIMIT 1`,
    [req.params.uuid, req.member.email]
  );
  if (!rows.length) return fail(res, 'Certificate not found or not yet generated', 404);

  const cert = rows[0];
  if (!cert.pdf_path) return fail(res, 'Certificate PDF not yet generated', 404);

  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(__dirname, '../../storage', cert.pdf_path.replace(/^\/?(storage\/)?/, ''));
  if (!fs.existsSync(filePath)) return fail(res, 'Certificate file not found', 404);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FORTI_Certificate_${cert.certificate_number || req.params.uuid}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// ── GET /api/member/idcard/:submission_uuid/download ──────────────────────
router.get('/idcard/:uuid/download', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, s.applicant_email
     FROM portal_certificates c
     JOIN fb_submissions s ON s.id = c.submission_id
     WHERE s.uuid = ? AND s.applicant_email = ? LIMIT 1`,
    [req.params.uuid, req.member.email]
  );
  if (!rows.length) return fail(res, 'ID Card not found or not yet generated', 404);

  const cert = rows[0];
  const idCardPath = cert.id_card_path || cert.pdf_path;
  if (!idCardPath) return fail(res, 'ID Card not yet generated', 404);

  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(__dirname, '../../storage', idCardPath.replace(/^\/?(storage\/)?/, ''));
  if (!fs.existsSync(filePath)) return fail(res, 'ID Card file not found', 404);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FORTI_IDCard_${cert.certificate_number || req.params.uuid}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// ── GET /api/member/invoice/:submission_uuid/download ─────────────────────
router.get('/invoice/:uuid/download', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.*, s.applicant_email
     FROM invoices i
     JOIN fb_submissions s ON s.id = i.submission_id
     WHERE s.uuid = ? AND s.applicant_email = ?
     ORDER BY i.created_at DESC LIMIT 1`,
    [req.params.uuid, req.member.email]
  );
  if (!rows.length) return fail(res, 'Invoice not found', 404);

  const invoice = rows[0];
  if (!invoice.pdf_path) return fail(res, 'Invoice PDF not yet generated', 404);

  const path = require('path');
  const fs = require('fs');
  const filePath = path.join(__dirname, '../../storage', invoice.pdf_path.replace(/^\/?(storage\/)?/, ''));
  if (!fs.existsSync(filePath)) return fail(res, 'Invoice file not found', 404);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FORTI_Invoice_${invoice.invoice_number}.pdf"`);
  fs.createReadStream(filePath).pipe(res);
});

// ── GET /api/member/payment-history ───────────────────────────────────────
router.get('/payment-history', memberAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT pp.id, pp.uuid, pp.transaction_id, pp.amount, pp.status,
            pp.created_at AS payment_date,
            pp.currency,
            pm.name AS method_name,
            s.membership_id, s.uuid AS submission_uuid
     FROM portal_payments pp
     JOIN fb_submissions s ON s.id = pp.submission_id
     LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
     WHERE s.id = ?
     ORDER BY pp.created_at DESC`,
    [req.member.submission_id]
  );
  return ok(res, rows);
});

// ── GET /api/member/renewals ───────────────────────────────────────────────
router.get('/renewals', memberAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.uuid, r.status, r.amount, r.currency, r.transaction_id,
              r.old_expiry_date, r.new_expiry_date, r.created_at, r.notes, r.screenshot_path,
              s.membership_id,
              p.name AS package_name,
              pm.name AS payment_method_name, pm.type AS payment_method_type
       FROM portal_renewals r
       JOIN fb_submissions s ON s.id = r.submission_id
       LEFT JOIN portal_packages p ON p.id = r.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = r.payment_method_id
       WHERE s.applicant_email = ?
       ORDER BY r.created_at DESC`,
      [req.member.email]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});


// ── POST /api/member/renewal/apply ────────────────────────────────────────
// Body: { submission_uuid, package_id, payment_method_id, transaction_id, amount }
// Files: payment_screenshot (required)
router.post('/renewal/apply', memberAuth, upload.single('payment_screenshot'), async (req, res) => {
  const { submission_uuid, package_id, payment_method_id, transaction_id } = req.body;
  if (!submission_uuid)        return fail(res, 'submission_uuid is required', 422);
  if (!payment_method_id)      return fail(res, 'payment_method_id is required', 422);
  if (!transaction_id?.trim()) return fail(res, 'transaction_id is required', 422);
  if (!req.file)               return fail(res, 'payment_screenshot is required', 422);

  try {
    const [sRows] = await pool.query(
      'SELECT * FROM fb_submissions WHERE uuid = ? AND applicant_email = ? LIMIT 1',
      [submission_uuid, req.member.email]
    );
    if (!sRows.length) return fail(res, 'Submission not found', 404);
    const sub = sRows[0];

    // Use provided package_id or fall back to the member's current plan
    const resolvedPackageId = package_id || sub.package_id;
    if (!resolvedPackageId) return fail(res, 'No active plan found to renew. Please contact support.', 422);

    // Check for already-pending renewal
    const [[pending]] = await pool.query(
      "SELECT id FROM portal_renewals WHERE submission_id=? AND status IN ('pending','payment_submitted') LIMIT 1",
      [sub.id]
    );
    if (pending) return fail(res, 'A renewal request is already pending. Please wait for it to be processed.', 409);

    const renewalUuid = crypto.randomUUID();
    const oldExpiry   = sub.expiry_date;
    const screenshotPath = `/uploads/payments/${req.file.filename}`;

    // Fetch package details
    let pkgPrice = 0;
    let newExpiry = null;
    const [[pkg]] = await pool.query('SELECT * FROM portal_packages WHERE id = ? LIMIT 1', [resolvedPackageId]);
    if (!pkg) return fail(res, 'Package not found', 404);
    pkgPrice = pkg.price;
    const base = oldExpiry && new Date(oldExpiry) > new Date() ? new Date(oldExpiry) : new Date();
    if (pkg.duration_months && pkg.duration_months < 999) {
      newExpiry = new Date(base);
      newExpiry.setMonth(newExpiry.getMonth() + pkg.duration_months);
      newExpiry = newExpiry.toISOString().split('T')[0];
    }

    await pool.query(
      `INSERT INTO portal_renewals
         (uuid, submission_id, package_id, amount, old_expiry_date, new_expiry_date,
          payment_method_id, transaction_id, screenshot_path, status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [renewalUuid, sub.id, resolvedPackageId, pkgPrice, oldExpiry, newExpiry,
       payment_method_id, transaction_id.trim(), screenshotPath]
    );

    return ok(res, { renewal_uuid: renewalUuid }, 'Payment submitted and under verification.', 201);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── POST /api/member/renewal/resubmit ────────────────────────────────────
// Resubmit a rejected renewal with new payment proof
router.post('/renewal/resubmit', memberAuth, upload.single('payment_screenshot'), async (req, res) => {
  const { renewal_uuid, transaction_id, payment_method_id } = req.body;
  if (!renewal_uuid)           return fail(res, 'renewal_uuid is required', 422);
  if (!transaction_id?.trim()) return fail(res, 'transaction_id is required', 422);
  if (!req.file)               return fail(res, 'payment_screenshot is required', 422);

  try {
    const [[renewal]] = await pool.query(
      `SELECT r.*, s.applicant_email FROM portal_renewals r
       JOIN fb_submissions s ON s.id = r.submission_id
       WHERE r.uuid = ? LIMIT 1`,
      [renewal_uuid]
    );
    if (!renewal) return fail(res, 'Renewal not found', 404);
    if (renewal.applicant_email !== req.member.email) return fail(res, 'Access denied', 403);
    if (renewal.status !== 'rejected') return fail(res, 'Only rejected renewals can be resubmitted', 422);

    const screenshotPath = `/uploads/payments/${req.file.filename}`;
    await pool.query(
      `UPDATE portal_renewals SET status='pending', transaction_id=?, screenshot_path=?,
       payment_method_id=COALESCE(?,payment_method_id), notes=NULL, processed_by=NULL,
       processed_at=NULL, updated_at=NOW()
       WHERE uuid=?`,
      [transaction_id.trim(), screenshotPath, payment_method_id || null, renewal_uuid]
    );

    return ok(res, null, 'Payment resubmitted and under verification.');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUT /api/member/profile ───────────────────────────────────────────────
// Update full_name, phone (member_accounts) + address, organisation_name (submission data JSON)
router.put('/profile', memberAuth, async (req, res) => {
  const { full_name, phone, address, organisation_name } = req.body;
  try {
    const updates = [];
    const params = [];
    if (full_name?.trim()) { updates.push('full_name = ?'); params.push(full_name.trim()); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone?.trim() || null); }
    if (updates.length) {
      params.push(req.member.id);
      await pool.query(`UPDATE member_accounts SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    // Update JSON data in fb_submissions
    if (address !== undefined || organisation_name !== undefined) {
      const [[sub]] = await pool.query(
        `SELECT s.id, s.data FROM fb_submissions s
         JOIN member_accounts ma ON ma.submission_id = s.id
         WHERE ma.id = ? LIMIT 1`,
        [req.member.id]
      );
      if (sub) {
        let data = {};
        try { data = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {}); } catch {}
        if (address !== undefined) data.address = address?.trim() || '';
        if (organisation_name !== undefined) data.organisation_name = organisation_name?.trim() || '';
        await pool.query('UPDATE fb_submissions SET data = ? WHERE id = ?', [JSON.stringify(data), sub.id]);
      }
    }
    return ok(res, null, 'Profile updated successfully.');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── GET /api/member/verify/:membership_id  (PUBLIC – no auth) ─────────────
router.get('/verify/:membership_id', async (req, res) => {
  const { membership_id } = req.params;
  if (!membership_id) return fail(res, 'membership_id required', 422);
  try {
    const [rows] = await pool.query(
      `SELECT ma.full_name, ma.membership_id,
              s.member_status, s.expiry_date, s.submitted_at,
              p.name AS package_name, p.membership_type,
              c.name AS country_name, st.name AS state_name
       FROM member_accounts ma
       JOIN fb_submissions s ON s.id = ma.submission_id
       LEFT JOIN portal_packages p ON p.id = s.package_id
       LEFT JOIN countries c ON c.id = s.country_id
       LEFT JOIN states st ON st.id = s.state_id
       WHERE ma.membership_id = ? LIMIT 1`,
      [membership_id.toUpperCase().trim()]
    );
    if (!rows.length) return fail(res, 'Membership ID not found', 404);
    const m = rows[0];
    const isValid = m.member_status === 'active' && (!m.expiry_date || new Date(m.expiry_date) > new Date());
    return ok(res, {
      valid: isValid,
      membership_id: m.membership_id,
      full_name: m.full_name,
      membership_type: m.membership_type,
      package_name: m.package_name,
      member_status: m.member_status,
      expiry_date: m.expiry_date,
      country: m.country_name,
      state: m.state_name,
    }, isValid ? 'Valid membership' : 'Membership is not active');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Public: Track application status by membership_id ──
// No auth required — user types their Application ID
router.get('/track', async (req, res) => {
  const { membership_id } = req.query;
  if (!membership_id || !String(membership_id).trim()) return fail(res, 'membership_id is required', 422);
  try {
    const [[sub]] = await pool.query(
      `SELECT s.membership_id, s.status, s.member_status, s.submitted_at, s.approved_at,
              pp.status AS payment_status, pp.created_at AS payment_date
       FROM fb_submissions s
       LEFT JOIN portal_payments pp ON pp.submission_id = s.id
         AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
       WHERE s.membership_id = ? LIMIT 1`,
      [String(membership_id).trim()]
    );
    if (!sub) return fail(res, 'Application not found', 404);
    return ok(res, {
      membership_id: sub.membership_id,
      status:         sub.status,
      member_status:  sub.member_status,
      submitted_at:   sub.submitted_at,
      approved_at:    sub.approved_at,
      payment_status: sub.payment_status,
      payment_date:   sub.payment_date,
    });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
