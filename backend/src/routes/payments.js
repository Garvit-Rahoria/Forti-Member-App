const express = require('express');
const path    = require('path');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const {
  sendPaymentConfirmed,
  sendPaymentSubmitted,
  sendMembershipConfirmed,
  sendInvoiceGenerated,
  sendCertificateGenerated,
} = require('../utils/email');
const { sendMail } = require('../utils/email');
const { extractCountryNameFromSubmissionData, getCurrencyCodeByCountry } = require('../utils/membershipCurrency');

const router = express.Router();

// -- GET /api/payments/methods/list  PUBLIC -------------------------------------
// Cascading: country_code → location → is_default=1 → all active
router.get('/methods/list', async (req, res) => {
  try {
    const { location, country_code } = req.query;
    let rows = [];

    // 1. Country-specific methods
    if (country_code) {
      const [r] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 AND country_code=? ORDER BY sort_order, id',
        [country_code]
      );
      if (r.length) rows = r;
    }

    // 2. Region/location methods
    if (!rows.length && location) {
      const [r] = await pool.query(
        "SELECT * FROM portal_payment_methods WHERE is_active=1 AND location=? AND (country_code IS NULL OR country_code='') ORDER BY sort_order, id",
        [location]
      );
      if (r.length) rows = r;
    }

    // 3. Default methods (is_default = 1)
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

router.use(authMiddleware);

// -- GET /api/payments/methods  ADMIN ------------------------------------------
router.get('/methods', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM portal_payment_methods ORDER BY location, sort_order, id'
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- GET /api/payments  (paginated list) ---------------------------------------
router.get('/', async (req, res) => {
  const { q, status, page = 1, per_page = 20 } = req.query;
  const params = [];
  let where = '1=1';
  if (status) { where += ' AND p.status=?'; params.push(status); }
  if (q) {
    where += ' AND (p.transaction_id LIKE ? OR s.applicant_email LIKE ? OR s.applicant_name LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT p.*, s.applicant_name, s.applicant_email, s.membership_id,
              s.membership_type, s.plan_type,
              pm.name AS method_name, pp.name AS package_name, pp.currency AS pkg_currency,
              u.full_name AS verified_by_name
       FROM portal_payments p
       LEFT JOIN fb_submissions s         ON s.id  = p.submission_id
       LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
       LEFT JOIN portal_packages pp        ON pp.id = s.package_id
       LEFT JOIN portal_admin_users u      ON u.id  = p.verified_by
       WHERE ${where} ORDER BY p.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- GET /api/payments/:id -----------------------------------------------------
router.get('/:id([0-9]+)', async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT p.*, s.applicant_name, s.applicant_email, s.membership_id,
              pm.name AS method_name, pp.name AS package_name, pp.price, pp.currency,
              u.full_name AS verified_by_name
       FROM portal_payments p
       LEFT JOIN fb_submissions s         ON s.id  = p.submission_id
       LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
       LEFT JOIN portal_packages pp        ON pp.id = s.package_id
       LEFT JOIN portal_admin_users u      ON u.id  = p.verified_by
       WHERE p.id=?`,
      [req.params.id]
    );
    if (!row) return fail(res, 'Not found', 404);
    return ok(res, row);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// -- PATCH /api/payments/:id/credit-inr  (admin: convert foreign currency to INR & verify) ----
router.patch('/:id([0-9]+)/credit-inr', requireRole('super_admin', 'admin', 'office_staff'), async (req, res) => {
  const { credited_inr_amount, exchange_rate, notes } = req.body;
  if (!credited_inr_amount || Number(credited_inr_amount) <= 0)
    return fail(res, 'credited_inr_amount must be a positive number', 422);

  try {
    const [[payment]] = await pool.query(
      `SELECT p.*, s.membership_id, s.applicant_name, s.applicant_email,
              s.id AS sub_id, s.status AS sub_status, s.package_id, s.plan_type, s.membership_type,
              pp.name AS package_name, pm.name AS method_name
       FROM portal_payments p
       LEFT JOIN fb_submissions s         ON s.id  = p.submission_id
       LEFT JOIN portal_packages pp        ON pp.id = s.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
       WHERE p.id=?`, [req.params.id]
    );
    if (!payment)                       return fail(res, 'Payment not found', 404);
    if (payment.status === 'verified')  return fail(res, 'Payment already verified', 409);
    if (payment.status === 'rejected')  return fail(res, 'Cannot credit a rejected payment', 409);

    // Save credited_inr_amount + exchange_rate + mark verified
    await pool.query(
      `UPDATE portal_payments
         SET status='verified', credited_inr_amount=?, exchange_rate=?,
             verified_by=?, verified_at=NOW(), notes=?
       WHERE id=?`,
      [credited_inr_amount, exchange_rate || null, req.user.id, notes || null, req.params.id]
    );

    // Assign membership_id if missing
    let membershipId = payment.membership_id;
    if (!membershipId) {
      const year = new Date().getFullYear();
      const [[{ cnt }]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
      );
      membershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
      await pool.query('UPDATE fb_submissions SET membership_id=? WHERE id=?', [membershipId, payment.sub_id]);
    }

    // Update submission status
    await pool.query(
      `UPDATE fb_submissions
         SET payment_status='verified', member_status='payment_verified', membership_id=?,
             status=IF(status='submitted','payment_verified',status)
       WHERE id=?`,
      [membershipId, payment.sub_id]
    );

    createAuditLog(req.user.id, 'PAYMENT_CREDITED_INR', 'payments', String(payment.id), req.ip);

    // Send payment confirmed email — fire-and-forget
    if (payment.applicant_email) {
      sendPaymentConfirmed({
        to: payment.applicant_email,
        name: payment.applicant_name,
        membershipId: membershipId,
        amount: payment.amount,
        currency: payment.currency || 'USD',
        transactionId: payment.transaction_id,
      }).catch(e => console.error('[payment_credited email]', e.message));
    }

    return ok(res, { status: 'verified', credited_inr_amount, membership_id: membershipId }, 'Payment credited in INR and verified');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- PATCH /api/payments/:id/verify --------------------------------------------

// Standardized payment verification endpoint
// Accepts action: 'approve'/'verify' → approved, 'reject' → rejected
router.patch('/:id/verify', requireRole('super_admin', 'admin', 'office_staff'), async (req, res) => {
  const { action, notes } = req.body;
  if (!['approve', 'verify', 'reject'].includes(action)) return fail(res, 'action must be approve/verify or reject', 422);
  const isApprove = action === 'approve' || action === 'verify';
  // ENUM on portal_payments.status is ('pending','submitted','verified','rejected')
  const newStatus = isApprove ? 'verified' : 'rejected';
  try {
    const [[payment]] = await pool.query(
      `SELECT p.*, s.membership_id, s.applicant_name, s.applicant_email,
              s.applicant_phone, s.id AS sub_id, s.package_id, s.status AS sub_status,
              s.plan_type, s.membership_type,
              pp.name AS package_name, pp.price, pp.currency, pp.duration_months,
              pm.name AS method_name
       FROM portal_payments p
       LEFT JOIN fb_submissions s         ON s.id  = p.submission_id
       LEFT JOIN portal_packages pp        ON pp.id = s.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
       WHERE p.id=?`, [req.params.id]
    );
    if (!payment) return fail(res, 'Payment not found', 404);

    // Prevent double-action
    if (payment.status === 'verified') return fail(res, 'Payment already approved', 409);
    if (payment.status === 'rejected' && isApprove) return fail(res, 'Cannot approve a rejected payment', 409);
    if (payment.status === 'rejected') return fail(res, 'Payment already rejected', 409);

    await pool.query(
      'UPDATE portal_payments SET status=?, verified_by=?, verified_at=NOW(), notes=? WHERE id=?',
      [newStatus, req.user.id, notes || null, req.params.id]
    );

    await pool.query(
      'UPDATE fb_submissions SET payment_status=? WHERE id=?',
      [isApprove ? 'verified' : 'rejected', payment.submission_id]
    );

    if (isApprove) {
      // Assign membership_id if not set
      let membershipId = payment.membership_id;
      if (!membershipId) {
        const year = new Date().getFullYear();
        const [[{ cnt }]] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
        );
        membershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
        await pool.query(
          'UPDATE fb_submissions SET membership_id=? WHERE id=?',
          [membershipId, payment.submission_id]
        );
      }

      // Mark payment as verified and update submission payment_status
      // NOTE: Do NOT set status='active' or member_status='active' here.
      // Admin must click "Activate Membership" explicitly after payment verification.
      await pool.query(
        `UPDATE fb_submissions
         SET payment_status='verified', member_status='payment_verified',
             membership_id=?, status=IF(status='submitted','payment_verified',status)
         WHERE id=?`,
        [membershipId, payment.submission_id]
      );

      // Create audit log
      createAuditLog(req.user.id, 'PAYMENT_APPROVED', 'payments', String(payment.id), req.ip);

      // Send email — fire-and-forget (do NOT await — prevents slow SMTP blocking the response)
      if (payment.applicant_email) {
        sendPaymentConfirmed({
          to: payment.applicant_email,
          name: payment.applicant_name,
          membershipId: membershipId,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          transactionId: payment.transaction_id,
        }).catch(e => console.error('[payment_verified email]', e.message));
      }
    } else {
      // Rejection
      createAuditLog(req.user.id, 'PAYMENT_REJECTED', 'payments', String(payment.id), req.ip);
    }

    return ok(res, { status: newStatus }, isApprove ? 'Payment approved' : 'Payment rejected');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- POST /api/payments  (member submits payment) -----------------------------

// Standardized payment submission endpoint
router.post('/', upload.single('screenshot'), async (req, res) => {
  const { submission_id, amount, currency, method_id, transaction_id, upi_id, invoice_id } = req.body;
  // Validate required fields
  if (!submission_id || !amount || !method_id || !transaction_id) {
    return fail(res, 'submission_id, amount, method_id, transaction_id required', 422);
  }
  // Screenshot is mandatory
  if (!req.file) {
    return fail(res, 'Screenshot is required', 422);
  }
  try {
    let resolvedCurrency = currency || 'INR';
    if (submission_id) {
      const [[submission]] = await pool.query('SELECT data FROM fb_submissions WHERE id=? LIMIT 1', [submission_id]);
      if (submission?.data) {
        const countryName = extractCountryNameFromSubmissionData(submission.data);
        resolvedCurrency = getCurrencyCodeByCountry(countryName);
      }
    }

    // Check unique transaction_id
    const [[exists]] = await pool.query(
      'SELECT id FROM portal_payments WHERE transaction_id=? LIMIT 1',
      [transaction_id]
    );
    if (exists) {
      return fail(res, 'Transaction ID already used. Please enter a unique transaction ID.', 422);
    }

    // Optionally, check amount matches plan/invoice (if invoice_id provided)
    if (invoice_id) {
      const [[invoice]] = await pool.query('SELECT total_amount FROM invoices WHERE id=?', [invoice_id]);
      if (!invoice) return fail(res, 'Invoice not found', 404);
      if (Number(amount) !== Number(invoice.total_amount)) {
        return fail(res, 'Amount does not match invoice', 422);
      }
    }

    const screenshotPath = `uploads/payments/${req.file.filename}`;

    const [r] = await pool.query(
      `INSERT INTO portal_payments
         (uuid, submission_id, invoice_id, amount, currency, method_id, transaction_id, upi_id, screenshot_path, status)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [submission_id, invoice_id || null, amount, resolvedCurrency, method_id,
       transaction_id, upi_id || null, screenshotPath]
    );

    await pool.query(
      "UPDATE fb_submissions SET payment_status='pending', status='payment_submitted' WHERE id=?",
      [submission_id]
    );

    // Fetch submission for email
    const [[sub]] = await pool.query(
      'SELECT applicant_name, applicant_email, membership_id FROM fb_submissions WHERE id=?',
      [submission_id]
    );
    if (sub?.applicant_email) {
      sendPaymentSubmitted({
        to: sub.applicant_email,
        name: sub.applicant_name,
        membershipId: sub.membership_id || '',
        amount: amount,
        currency: resolvedCurrency,
        transactionId: transaction_id,
      }).catch(e => console.error('[payment_submitted email]', e.message));
    }

    return ok(res, { id: r.insertId }, 'Payment submitted. Payment is under review.', 201);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- POST /api/payments/methods ------------------------------------------------
router.post('/methods', requireRole('super_admin', 'admin'), upload.single('qr_image'), async (req, res) => {
  const {
    name, type = 'upi',
    account_name, bank_name, account_number, ifsc_code, upi_id, swift_code, iban, bank_address,
    instructions, sort_order = 0, is_active = 1, is_default = 0, location,
    country_code, country_name,
  } = req.body;
  if (!name) return fail(res, 'name is required', 422);
  try {
    const qrPath = req.file ? `uploads/qr/${req.file.filename}` : null;
    const [r] = await pool.query(
      `INSERT INTO portal_payment_methods
         (name, type, account_name, bank_name, account_number, ifsc_code, upi_id, branch_name, account_type,
          swift_code, iban, bank_address, routing_number, currency,
          instructions, sort_order, is_active, is_default, location, country_code, country_name, qr_image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, type,
       account_name || null, bank_name || null, account_number || null, ifsc_code || null, upi_id || null,
       req.body.branch_name || null, req.body.account_type || null,
       swift_code || null, iban || null, bank_address || null,
       req.body.routing_number || null, req.body.currency || null,
       instructions || null, sort_order, is_active, is_default,
       location || null, country_code || null, country_name || null, qrPath]
    );
    const [[created]] = await pool.query('SELECT * FROM portal_payment_methods WHERE id=?', [r.insertId]);
    return ok(res, created, 'Payment method created', 201);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- PUT /api/payments/methods/:id ---------------------------------------------
router.put('/methods/:id', requireRole('super_admin', 'admin'), upload.single('qr_image'), async (req, res) => {
  const {
    name, type,
    account_name, bank_name, account_number, ifsc_code, upi_id, swift_code, iban, bank_address,
    instructions, sort_order, is_active, is_default, location, qr_image,
    country_code, country_name, branch_name, account_type, routing_number, currency,
  } = req.body;
  try {
    const [[existing]] = await pool.query('SELECT * FROM portal_payment_methods WHERE id=?', [req.params.id]);
    if (!existing) return fail(res, 'Not found', 404);

    let qrPath = existing.qr_image;
    if (req.file) {
      qrPath = `uploads/qr/${req.file.filename}`;
    } else if (qr_image === 'null' || qr_image === '') {
      qrPath = null;
    }

    await pool.query(
      `UPDATE portal_payment_methods SET
         name=?, type=?,
         account_name=?, bank_name=?, account_number=?, ifsc_code=?, upi_id=?,
         branch_name=?, account_type=?,
         swift_code=?, iban=?, bank_address=?, routing_number=?, currency=?,
         instructions=?, sort_order=?, is_active=?, is_default=?, location=?, country_code=?, country_name=?, qr_image=?
       WHERE id=?`,
      [name || existing.name, type || existing.type,
       account_name ?? existing.account_name,
       bank_name    ?? existing.bank_name,
       account_number ?? existing.account_number,
       ifsc_code    ?? existing.ifsc_code,
       upi_id       ?? existing.upi_id,
       branch_name  ?? existing.branch_name,
       account_type ?? existing.account_type,
       swift_code   ?? existing.swift_code,
       iban         ?? existing.iban,
       bank_address ?? existing.bank_address,
       routing_number ?? existing.routing_number,
       currency     ?? existing.currency,
       instructions ?? existing.instructions,
       sort_order   ?? existing.sort_order,
       is_active    !== undefined ? is_active : existing.is_active,
       is_default   !== undefined ? is_default : existing.is_default,
       location !== undefined ? (location || null) : existing.location,
       country_code !== undefined ? (country_code || null) : existing.country_code,
       country_name !== undefined ? (country_name || null) : existing.country_name,
       qrPath, req.params.id]
    );
    const [[updated]] = await pool.query('SELECT * FROM portal_payment_methods WHERE id=?', [req.params.id]);
    return ok(res, updated, 'Payment method updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// -- DELETE /api/payments/methods/:id -----------------------------------------
router.delete('/methods/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('UPDATE portal_payment_methods SET is_active=0 WHERE id=?', [req.params.id]);
    return ok(res, null, 'Payment method deactivated');
  } catch (err) { return fail(res, 'Server error', 500); }
});


// ────────────── ADMIN PAYMENT VERIFICATION LISTING ──────────────

// GET /api/payments/pending  – dedicated pending payments list for admin verification
router.get('/pending', requireRole('super_admin', 'admin', 'office_staff'), async (req, res) => {
  const { status = 'pending', q, page = 1, per_page = 20 } = req.query;
  const params = [];
  let where = '1=1';
  if (status && status !== 'all') {
    where += ' AND p.status=?';
    params.push(status);
  }
  if (q) {
    where += ' AND (p.transaction_id LIKE ? OR s.applicant_name LIKE ? OR s.applicant_email LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT p.id AS payment_id, p.uuid, p.submission_id,
              s.applicant_name AS user_name,
              s.applicant_email AS user_email,
              s.membership_id,
              pp.name AS plan_name,
              i.invoice_number AS invoice_no,
              p.amount, p.currency,
              pm.name AS payment_method, pm.type AS payment_method_type,
              p.transaction_id,
              p.screenshot_path AS screenshot_url,
              p.status,
              p.created_at,
              p.verified_by, p.verified_at, p.notes,
              u.full_name AS verified_by_name
         FROM portal_payments p
         LEFT JOIN fb_submissions s ON s.id = p.submission_id
         LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
         LEFT JOIN portal_packages pp ON pp.id = s.package_id
         LEFT JOIN invoices i ON i.id = p.invoice_id
         LEFT JOIN portal_admin_users u ON u.id = p.verified_by
         WHERE ${where}
         ORDER BY p.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
