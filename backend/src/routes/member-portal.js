const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { JWT_SECRET } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

const STATUS_PRIORITY_SQL = `CASE s.status
  WHEN 'active' THEN 0
  WHEN 'approved' THEN 1
  WHEN 'payment_verified' THEN 2
  WHEN 'payment_pending' THEN 3
  WHEN 'payment_submitted' THEN 4
  WHEN 'under_review' THEN 5
  WHEN 'submitted' THEN 6
  WHEN 'pending' THEN 7
  WHEN 'rejected' THEN 8
  ELSE 9
END`;

function deriveMembershipStatus(row) {
  const applicationStatus = row?.status || row?.application_status || row?.applicationStatus || null;
  const memberStatus = row?.member_status || row?.membership_status || row?.membershipStatus || null;

  if (memberStatus && memberStatus !== 'inactive') return memberStatus;
  if (applicationStatus === 'active') return 'active';
  if (applicationStatus === 'submitted') return 'submitted';
  return memberStatus || 'inactive';
}

function normalizeApplication(row) {
  if (!row) return null;

  return {
    id: row.submission_id || row.id,
    submission_id: row.submission_id || row.id,
    submission_uuid: row.submission_uuid || row.submissionUuid || row.uuid || null,
    applicationId: row.applicationId || row.membership_id || null,
    membership_id: row.membership_id || row.applicationId || null,
    email: row.email || row.applicant_email || null,
    full_name: row.full_name || row.applicant_name || null,
    status: row.status || row.application_status || null,
    applicationStatus: row.status || row.application_status || null,
    member_status: row.member_status || row.membership_status || 'inactive',
    membershipStatus: deriveMembershipStatus(row),
    payment_status: row.payment_status || 'pending',
    submitted_at: row.submitted_at || null,
    approved_at: row.approved_at || null,
    payment_date: row.payment_date || null,
    expiry_date: row.expiry_date || null,
  };
}

async function getApplicationByEmail(email, preferredSubmissionId = 0) {
  const [[row]] = await pool.query(
    `SELECT s.id AS submission_id,
            s.uuid AS submission_uuid,
            s.membership_id,
            s.applicant_email AS email,
            s.applicant_name AS full_name,
            s.status,
            s.member_status,
            s.submitted_at,
            s.approved_at,
            s.expiry_date,
            pp.status AS payment_status,
            pp.created_at AS payment_date
     FROM fb_submissions s
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
       AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
     WHERE s.applicant_email = ? AND s.status != 'draft'
     ORDER BY (s.id = ?) DESC,
              CASE COALESCE(s.member_status, 'inactive')
                WHEN 'active' THEN 0
                ELSE 1
              END ASC,
              ${STATUS_PRIORITY_SQL} ASC,
              s.created_at DESC,
              s.id DESC
     LIMIT 1`,
    [email, Number(preferredSubmissionId) || 0]
  );

  return normalizeApplication(row);
}

async function getApplicationByIdentifier(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;

  const [[row]] = await pool.query(
    `SELECT s.id AS submission_id,
            s.uuid AS submission_uuid,
            s.membership_id,
            s.applicant_email AS email,
            s.applicant_name AS full_name,
            s.status,
            s.member_status,
            s.submitted_at,
            s.approved_at,
            s.expiry_date,
            s.review_notes,
            pp.status AS payment_status,
            pp.created_at AS payment_date
     FROM fb_submissions s
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
       AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
     WHERE s.status != 'draft'
       AND (s.membership_id = ? OR s.uuid = ? OR CAST(s.id AS CHAR) = ?)
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT 1`,
    [value, value, value]
  );

  return normalizeApplication(row);
}

// ── PUBLIC: GET /api/member/track-status?email=... ───────────────────────
// Returns application_status, payment_status, membership_status for tracking
router.get('/track-status', async (req, res) => {
  const { email, applicationId } = req.query;
  if (!email && !applicationId) return fail(res, 'email or applicationId is required', 422);
  try {
    const application = applicationId
      ? await getApplicationByIdentifier(applicationId)
      : await getApplicationByEmail(String(email).trim());

    if (!application) return fail(res, 'Application not found', 404);
    return ok(res, application);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.get('/application/by-email', async (req, res) => {
  const { email } = req.query;
  if (!email || !String(email).trim()) return fail(res, 'email is required', 422);

  try {
    const application = await getApplicationByEmail(String(email).trim());
    if (!application) return fail(res, 'Application not found', 404);
    return ok(res, application);
  } catch (err) {
    console.error('[GET /api/member/application/by-email]', err);
    return fail(res, 'Server error', 500);
  }
});

router.get('/application/:id', async (req, res) => {
  try {
    const application = await getApplicationByIdentifier(req.params.id);
    if (!application) return fail(res, 'Application not found', 404);
    return ok(res, application);
  } catch (err) {
    console.error('[GET /api/member/application/:id]', err);
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
// Accepts role = 'member' (active) OR 'applicant' (submitted, not yet activated)
async function memberAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    const [blRows] = await pool.query('SELECT token FROM token_blacklist WHERE token = ? LIMIT 1', [token]);
    if (blRows.length > 0) {
      return fail(res, 'Token has been revoked. Please log in again.', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'member' && decoded.role !== 'applicant')
      return fail(res, 'Access denied', 403);
    req.member = decoded;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

// ── GET /api/member/status — lightweight status check (auth-protected) ──────
router.get('/status', memberAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const application = await getApplicationByEmail(req.member.email, req.member.submission_id);
    if (!application) return fail(res, 'Not found', 404);
    return ok(res, application);
  } catch (err) {
    console.error('[GET /api/member/status]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── GET /api/member/me ─────────────────────────────────────────────────────
router.get('/me', memberAuth, async (req, res) => {
  const email = req.member.email;
  const tokenSubmissionId = req.member.submission_id;

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    let [rows] = await pool.query(
      `SELECT COALESCE(ma.id, 0) AS id,
              ma.uuid,
              COALESCE(ma.email, s.applicant_email) AS email,
              COALESCE(ma.full_name, s.applicant_name) AS full_name,
              COALESCE(ma.phone, s.applicant_phone) AS phone,
              COALESCE(ma.membership_id, s.membership_id) AS membership_id,
              IF(COALESCE(s.member_status,'inactive')='active','member','applicant') AS role,
              ma.last_login,
              s.id AS submission_id, s.uuid AS sub_uuid,
              s.status,
              s.status AS applicationStatus,
              s.member_status,
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
       LEFT JOIN member_accounts ma ON ma.id = (
         SELECT ma2.id FROM member_accounts ma2
         WHERE ma2.submission_id = s.id
         ORDER BY ma2.is_active DESC, ma2.id DESC
         LIMIT 1
       )
       LEFT JOIN portal_packages p ON p.id = COALESCE(ma.package_id, s.package_id)
       LEFT JOIN portal_payments pp ON pp.submission_id = s.id
         AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
       LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
       WHERE s.applicant_email = ? AND s.id = ? AND s.status != 'draft'
       LIMIT 1`,
      [email, Number(tokenSubmissionId) || 0]
    );

    if (!rows.length) {
      [rows] = await pool.query(
        `SELECT COALESCE(ma.id, 0) AS id,
                ma.uuid,
                COALESCE(ma.email, s.applicant_email) AS email,
                COALESCE(ma.full_name, s.applicant_name) AS full_name,
                COALESCE(ma.phone, s.applicant_phone) AS phone,
                COALESCE(ma.membership_id, s.membership_id) AS membership_id,
                IF(COALESCE(s.member_status,'inactive')='active','member','applicant') AS role,
                ma.last_login,
                s.id AS submission_id, s.uuid AS sub_uuid,
                s.status,
                s.status AS applicationStatus,
                s.member_status,
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
         LEFT JOIN member_accounts ma ON ma.id = (
           SELECT ma2.id FROM member_accounts ma2
           WHERE ma2.submission_id = s.id
           ORDER BY ma2.is_active DESC, ma2.id DESC
           LIMIT 1
         )
         LEFT JOIN portal_packages p ON p.id = COALESCE(ma.package_id, s.package_id)
         LEFT JOIN portal_payments pp ON pp.submission_id = s.id
           AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id)
         LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
         WHERE s.applicant_email = ? AND s.status != 'draft'
         ORDER BY (s.id = ?) DESC,
                  CASE COALESCE(s.member_status, 'inactive')
                    WHEN 'active' THEN 0
                    ELSE 1
                  END ASC,
                  ${STATUS_PRIORITY_SQL} ASC,
                  s.created_at DESC,
                  s.id DESC
         LIMIT 1`,
        [email, Number(tokenSubmissionId) || 0]
      );
    }

    if (!rows.length) return fail(res, 'Member not found', 404);

    const member = rows[0];
    if (member.data && typeof member.data === 'string') {
      try { member.data = JSON.parse(member.data); } catch {}
    }
    member.applicationId = member.membership_id || null;
    member.membershipStatus = deriveMembershipStatus(member);
    return ok(res, member);
  } catch (err) {
    console.error('[GET /api/member/me]', err);
    return fail(res, 'Server error', 500);
  }
});

// ── GET /api/member/applications ──────────────────────────────────────────
router.get('/applications', memberAuth, async (req, res) => {
  try {
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
  } catch (err) { console.error('[GET /applications]', err); return fail(res, 'Server error', 500); }
});

// ── GET /api/member/application/:uuid ─────────────────────────────────────
router.get('/application/:uuid', memberAuth, async (req, res) => {
  try {
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
  } catch (err) { console.error('[GET /application/:uuid]', err); return fail(res, 'Server error', 500); }
});

// ── GET /api/member/invoice/:submission_uuid ──────────────────────────────
router.get('/invoice/:uuid', memberAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.* FROM invoices i
       JOIN fb_submissions s ON s.id = i.submission_id
       WHERE s.uuid = ? AND s.applicant_email = ?
       ORDER BY i.created_at DESC LIMIT 1`,
      [req.params.uuid, req.member.email]
    );
    if (!rows.length) return fail(res, 'Invoice not found', 404);
    return ok(res, rows[0]);
  } catch (err) { console.error('[GET /invoice/:uuid]', err); return fail(res, 'Server error', 500); }
});

// ── PDF helpers ───────────────────────────────────────────────────────────
const QRCode        = require('qrcode');
const { htmlToPdf, buildCertificateHtml, buildIdCardHtml, buildInvoiceHtml } = require('../utils/pdfGenerator');

// Fetch full member data for PDF generation
async function getMemberDataForPdf(uuid, email) {
  const [[row]] = await pool.query(
    `SELECT s.id AS submission_id, s.uuid, s.membership_id,
            s.applicant_name AS full_name, s.applicant_email AS email,
            s.status, s.member_status, s.submitted_at, s.approved_at, s.expiry_date,
            pp.amount, pp.currency, pp.transaction_id,
            pp.created_at AS payment_date,
            pm.name AS payment_method
     FROM fb_submissions s
     LEFT JOIN portal_payments pp ON pp.submission_id = s.id
       AND pp.id = (SELECT MAX(id) FROM portal_payments WHERE submission_id = s.id AND status = 'verified')
     LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
     WHERE s.uuid = ? AND s.applicant_email = ? AND s.status != 'draft'
     LIMIT 1`,
    [uuid, email]
  );
  return row || null;
}

// ── GET /api/member/certificate/:submission_uuid/download ─────────────────
router.get('/certificate/:uuid/download', memberAuth, async (req, res) => {
  try {
    const member = await getMemberDataForPdf(req.params.uuid, req.member.email);
    if (!member) return fail(res, 'Membership record not found', 404);

    const isActive = member.member_status === 'active' || member.status === 'active';
    if (!isActive) return fail(res, 'Certificate available only for active members', 403);

    const certNo    = member.membership_id || `FR-${String(member.submission_id).padStart(6, '0')}`;
    const issuedOn  = member.approved_at
      ? new Date(member.approved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const validUpto = member.expiry_date
      ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Lifetime';

    const html = buildCertificateHtml({
      fullName: member.full_name || 'Member',
      certNo, issuedOn, validUpto,
      email: member.email,
    });

    const pdfBuffer = await htmlToPdf(html, {
      format: 'A4',
      printBackground: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FORTI_Certificate_${certNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[GET /certificate/download]', err);
    if (!res.headersSent) return fail(res, 'Could not generate certificate. Please try again.', 500);
  }
});

// ── GET /api/member/idcard/:submission_uuid/download ──────────────────────
router.get('/idcard/:uuid/download', memberAuth, async (req, res) => {
  try {
    const member = await getMemberDataForPdf(req.params.uuid, req.member.email);
    if (!member) return fail(res, 'Membership record not found', 404);

    const isActive = member.member_status === 'active' || member.status === 'active';
    if (!isActive) return fail(res, 'ID Card available only for active members', 403);

    const certNo    = member.membership_id || `FR-${String(member.submission_id).padStart(6, '0')}`;
    const validUpto = member.expiry_date
      ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Lifetime';

    const qrData    = `FR-MEMBER:${certNo}:${member.email}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 160, margin: 1,
      color: { dark: '#5A2D95', light: '#FFFFFF' },
    });

    const html = buildIdCardHtml({
      fullName:   member.full_name || 'Member',
      certNo, validUpto,
      email:      member.email,
      qrDataUrl,
    });

    const pdfBuffer = await htmlToPdf(html, {
      format: 'A4',
      printBackground: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FORTI_IDCard_${certNo}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[GET /idcard/download]', err);
    if (!res.headersSent) return fail(res, 'Could not generate ID card. Please try again.', 500);
  }
});

// ── GET /api/member/invoice/:submission_uuid/download ─────────────────────
router.get('/invoice/:uuid/download', memberAuth, async (req, res) => {
  try {
    const [invRows] = await pool.query(
      `SELECT i.*, s.applicant_email, s.applicant_phone, s.data, s.uuid AS sub_uuid
       FROM invoices i
       JOIN fb_submissions s ON s.id = i.submission_id
       WHERE s.uuid = ? AND s.applicant_email = ?
       ORDER BY i.created_at DESC LIMIT 1`,
      [req.params.uuid, req.member.email]
    );

    const member = await getMemberDataForPdf(req.params.uuid, req.member.email);
    if (!invRows.length && !member) return fail(res, 'Invoice not found', 404);

    const inv         = invRows[0] || {};
    const memberName  = inv.member_name   || member?.full_name     || 'Member';
    const memberEmail = inv.member_email  || member?.email         || req.member.email;
    const memberId    = inv.member_id_str || member?.membership_id || `FR-${String(member?.submission_id || 0).padStart(6, '0')}`;
    const invoiceNum  = inv.invoice_number || `INV-${Date.now()}`;
    const packageName = inv.package_name   || 'FORTI Membership';
    const amount      = parseFloat(inv.amount      || member?.amount || 0);
    const taxAmount   = parseFloat(inv.tax_amount  || 0);
    const totalAmount = parseFloat(inv.total_amount || amount);
    const currency    = inv.currency || member?.currency || 'INR';
    const issuedAt    = inv.issued_at || member?.payment_date || new Date();
    const txnId       = member?.transaction_id || String(inv.payment_id || '') || '—';
    const dateStr     = new Date(issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Resolve payment method name
    const paymentMethod = member?.payment_method || inv.payment_method || null;

    // Parse extra data from submission JSON
    let phone = inv.applicant_phone || null;
    let orgName = null;
    const dataObj = inv.data || null;
    if (dataObj) {
      try {
        const d = typeof dataObj === 'string' ? JSON.parse(dataObj) : dataObj;
        orgName = d.organisation_name || null;
      } catch {}
    }

    const html = buildInvoiceHtml({
      memberName, memberEmail, memberId,
      invoiceNum, packageName,
      amount, taxAmount, totalAmount,
      currency, dateStr, txnId,
      paymentMethod, phone, orgName,
    });

    const pdfBuffer = await htmlToPdf(html, {
      format: 'A4',
      printBackground: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FORTI_Invoice_${invoiceNum}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('[GET /invoice/download]', err);
    if (!res.headersSent) return fail(res, 'Could not generate invoice. Please try again.', 500);
  }
});

// ── GET /api/member/payment-history ───────────────────────────────────────
router.get('/payment-history', memberAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pp.id, pp.uuid, pp.transaction_id, pp.amount, pp.status,
              pp.created_at AS payment_date,
              pp.currency,
              pm.name AS method_name,
              s.membership_id, s.uuid AS submission_uuid
       FROM portal_payments pp
       JOIN fb_submissions s ON s.id = pp.submission_id
       LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
       WHERE s.applicant_email = ?
       ORDER BY pp.created_at DESC`,
      [req.member.email]
    );
    return ok(res, rows);
  } catch (err) { console.error('[GET /payment-history]', err); return fail(res, 'Server error', 500); }
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

    const screenshotPath = `/uploads/payments/${req.file.filename}`;

    // Check for already-pending or payment_submitted renewal
    const [[existing]] = await pool.query(
      "SELECT id, status, uuid FROM portal_renewals WHERE submission_id=? AND status IN ('pending','payment_submitted') LIMIT 1",
      [sub.id]
    );

    if (existing) {
      if (existing.status === 'payment_submitted') {
        return fail(res, 'A renewal request is already pending verification. Please wait for it to be processed.', 409);
      }
      
      // If status is 'pending', we update it with the payment details
      await pool.query(
        `UPDATE portal_renewals SET 
           payment_method_id = ?, 
           transaction_id = ?, 
           screenshot_path = ?, 
           status = 'payment_submitted'
         WHERE id = ?`,
        [payment_method_id, transaction_id.trim(), screenshotPath, existing.id]
      );
      return ok(res, { renewal_uuid: existing.uuid }, 'Payment submitted and under verification.', 200);
    }

    const renewalUuid = crypto.randomUUID();
    const oldExpiry   = sub.expiry_date;

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
       VALUES (?,?,?,?,?,?,?,?,?,'payment_submitted')`,
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
// Update full_name, phone, email (member_accounts and fb_submissions)
// Also update other profile fields in fb_submissions.data
router.put('/profile', memberAuth, async (req, res) => {
  const { full_name, phone, email, company_name, designation, address, city, state, pin_code } = req.body;
  try {
    const updates = [];
    const params = [];
    if (full_name?.trim()) { updates.push('full_name = ?'); params.push(full_name.trim()); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone?.trim() || null); }
    if (email?.trim()) { updates.push('email = ?'); params.push(email.trim()); }
    
    if (updates.length) {
      params.push(req.member.id);
      await pool.query(`UPDATE member_accounts SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    const [[ma]] = await pool.query('SELECT submission_id FROM member_accounts WHERE id = ? LIMIT 1', [req.member.id]);
    if (ma) {
      const subUpdates = [];
      const subParams = [];
      if (email?.trim()) { subUpdates.push('applicant_email = ?'); subParams.push(email.trim()); }
      if (full_name?.trim()) { subUpdates.push('applicant_name = ?'); subParams.push(full_name.trim()); }
      if (phone !== undefined) { subUpdates.push('applicant_phone = ?'); subParams.push(phone?.trim() || null); }
      
      // Update JSON data
      if (company_name !== undefined || designation !== undefined || address !== undefined || city !== undefined || state !== undefined || pin_code !== undefined) {
        const [[sub]] = await pool.query('SELECT data FROM fb_submissions WHERE id = ? LIMIT 1', [ma.submission_id]);
        if (sub) {
          let dataObj = typeof sub.data === 'string' ? JSON.parse(sub.data || '{}') : (sub.data || {});
          
          if (company_name !== undefined) {
            // Save as organisation_name for consistency with Admin
            dataObj.organisation_name = company_name.trim();
            // Also update fb_submission_data to keep reports and Admin list synced
            await pool.query(
              "UPDATE fb_submission_data SET value = ? WHERE submission_id = ? AND field_key IN ('organisation_name', 'organization_name', 'company_name')",
              [company_name.trim(), ma.submission_id]
            );
          }
          
          if (designation !== undefined) dataObj.designation = designation.trim();
          if (address !== undefined) dataObj.address = address.trim();
          if (city !== undefined) dataObj.city = city.trim();
          if (state !== undefined) dataObj.state = state.trim();
          if (pin_code !== undefined) dataObj.pin_code = pin_code.trim();
          
          subUpdates.push('data = ?::jsonb');
          subParams.push(JSON.stringify(dataObj));
        }
      }
      
      if (subUpdates.length) {
        subParams.push(ma.submission_id);
        await pool.query(`UPDATE fb_submissions SET ${subUpdates.join(', ')} WHERE id = ?`, subParams);
      }
    }
    
    return ok(res, null, 'Profile updated successfully.');
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return fail(res, 'Email already in use', 409);
    return fail(res, 'Server error', 500);
  }
});

// ── POST /api/member/profile/photo ────────────────────────────────────────
router.post('/profile/photo', memberAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded', 422);
  const photoPath = `/uploads/photos/${req.file.filename}`;
  try {
    const [[ma]] = await pool.query('SELECT submission_id FROM member_accounts WHERE id = ? LIMIT 1', [req.member.id]);
    if (ma) {
      const [[sub]] = await pool.query('SELECT data FROM fb_submissions WHERE id = ?', [ma.submission_id]);
      if (sub) {
        let data = {};
        try { data = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {}); } catch {}
        data.profile_photo = photoPath;
        await pool.query('UPDATE fb_submissions SET data = ?::jsonb WHERE id = ?', [JSON.stringify(data), ma.submission_id]);
      }
      
      await pool.query(
        `INSERT INTO member_public_profiles (submission_id, profile_photo_path) VALUES (?, ?)
         ON CONFLICT (submission_id) DO UPDATE SET profile_photo_path=EXCLUDED.profile_photo_path, updated_at=NOW()
         RETURNING submission_id`,
        [ma.submission_id, photoPath]
      );
    }
    return ok(res, { profile_photo: photoPath }, 'Photo updated successfully.');
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
    const application = await getApplicationByIdentifier(membership_id);
    if (!application) return fail(res, 'Application not found', 404);
    return ok(res, application);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
