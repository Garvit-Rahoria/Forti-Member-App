const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const path = require('path');
const fs = require('fs');
const { extractCountryNameFromSubmissionData, getCurrencyCodeByCountry } = require('../utils/membershipCurrency');
const { sendInvoiceGenerated } = require('../utils/email');

const router = express.Router();
router.use(authMiddleware);

// Ensure invoices PDF dir exists
const PDF_DIR = path.join(__dirname, '../../storage/invoices');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// GET /api/invoices  paginated list
router.get('/', async (req, res) => {
  const { page = 1, per_page = 20, type, q } = req.query;
  let where = '1=1';
  const params = [];
  if (type) { where += ' AND i.invoice_type=?'; params.push(type); }
  if (q) {
    where += ' AND (i.member_name LIKE ? OR i.member_email LIKE ? OR i.invoice_number LIKE ? OR i.member_id_str LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT i.id, i.invoice_number, i.invoice_type, i.member_name, i.member_email,
              i.member_id_str, i.package_name, i.amount, i.tax_amount, i.total_amount,
              i.currency, i.issued_at, i.submission_id, i.payment_id, i.renewal_id,
              i.pdf_path
       FROM invoices i WHERE ${where} ORDER BY i.issued_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const [[inv]] = await pool.query(
      `SELECT i.*, s.membership_id
       FROM invoices i
       LEFT JOIN fb_submissions s ON s.id = i.submission_id
       WHERE i.id=?`, [req.params.id]
    );
    if (!inv) return fail(res, 'Invoice not found', 404);
    return ok(res, inv);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/invoices/:id/download  – stream PDF via Puppeteer (beautiful Tailwind template)
router.get('/:id/download', async (req, res) => {
  try {
    const { htmlToPdf, buildInvoiceHtml } = require('../utils/pdfGenerator');

    const [[inv]] = await pool.query(
      `SELECT i.*, s.membership_id, s.applicant_phone, s.data,
              pp.name AS pkg_name, pp.location AS pkg_location,
              pp.membership_type AS pkg_membership_type, pp.duration AS pkg_duration
       FROM invoices i
       LEFT JOIN fb_submissions s ON s.id=i.submission_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE i.id=?`, [req.params.id]
    );
    if (!inv) return fail(res, 'Invoice not found', 404);

    // Resolve payment method name and transaction ID from portal_payments
    let paymentMethodName = inv.payment_method || null;
    let transactionId = null;
    if (inv.payment_id || inv.submission_id) {
      const payQ = inv.payment_id
        ? `SELECT pay.transaction_id, pm.name AS method_name
           FROM portal_payments pay
           LEFT JOIN portal_payment_methods pm ON pm.id = pay.method_id
           WHERE pay.id = ? LIMIT 1`
        : `SELECT pay.transaction_id, pm.name AS method_name
           FROM portal_payments pay
           LEFT JOIN portal_payment_methods pm ON pm.id = pay.method_id
           WHERE pay.submission_id = ?
           ORDER BY pay.id DESC LIMIT 1`;
      const payParam = inv.payment_id || inv.submission_id;
      const [[payRow]] = await pool.query(payQ, [payParam]);
      if (payRow) {
        paymentMethodName = paymentMethodName || payRow.method_name;
        transactionId = payRow.transaction_id;
      }
    }

    // Parse extra fields from submission data JSON
    let orgName = null;
    let phone = inv.applicant_phone || null;
    if (inv.data) {
      try {
        const d = typeof inv.data === 'string' ? JSON.parse(inv.data) : inv.data;
        orgName = d.organisation_name || null;
      } catch {}
    }

    const amount      = parseFloat(inv.amount || 0);
    const taxAmount   = parseFloat(inv.tax_amount || 0);
    const totalAmount = parseFloat(inv.total_amount || amount + taxAmount);
    const currency    = inv.currency || 'INR';
    const dateStr     = new Date(inv.issued_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = buildInvoiceHtml({
      memberName:    inv.member_name || 'Member',
      memberEmail:   inv.member_email || '',
      memberId:      inv.membership_id || inv.member_id_str || '',
      invoiceNum:    inv.invoice_number,
      packageName:   inv.package_name || inv.pkg_name || 'FORTI Membership',
      amount, taxAmount, totalAmount,
      currency, dateStr,
      txnId:         transactionId || '—',
      paymentMethod: paymentMethodName,
      phone, orgName,
    });

    const pdfBuffer = await htmlToPdf(html, {
      format: 'A4',
      printBackground: true,
    });

    const filename = `FORTI_Invoice_${inv.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Invoice PDF error:', err);
    if (!res.headersSent) return fail(res, 'PDF generation failed', 500);
  }
});

// POST /api/invoices  – manually create invoice (admin)
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { submission_id, invoice_type = 'membership', package_name, amount, tax_amount = 0, notes } = req.body;
  if (!submission_id || !amount) return fail(res, 'submission_id and amount required', 422);

  try {
    const [[sub]] = await pool.query(
      'SELECT applicant_name, applicant_email, membership_id FROM fb_submissions WHERE id=?',
      [submission_id]
    );
    if (!sub) return fail(res, 'Member not found', 404);

    const total = parseFloat(amount) + parseFloat(tax_amount || 0);
    const invoiceNum = `INV-${Date.now()}`;
    const [r] = await pool.query(
      `INSERT INTO invoices
         (invoice_number, submission_id, invoice_type, member_name, member_email,
          member_id_str, package_name, amount, tax_amount, total_amount, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [invoiceNum, submission_id, invoice_type, sub.applicant_name, sub.applicant_email,
       sub.membership_id, package_name || '', amount, tax_amount, total, notes || null]
    );
    createAuditLog(req.user.id, 'GENERATE_INVOICE', 'invoices', String(r.insertId), req.ip);
    return ok(res, { id: r.insertId, invoice_number: invoiceNum }, 'Invoice created', 201);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/invoices/member/:submissionId  – get invoices for a specific member
router.get('/member/:submissionId([0-9]+)', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.* FROM invoices i WHERE i.submission_id=? ORDER BY i.issued_at DESC`,
      [req.params.submissionId]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/invoices/member/:submissionId/generate  – auto-generate invoice for a member
router.post('/member/:submissionId([0-9]+)/generate', requireRole('super_admin', 'admin'), async (req, res) => {
  const { payment_id } = req.body;
  try {
    const [[sub]] = await pool.query(
      `SELECT s.*, pp.name AS package_name, pp.price AS package_price, pp.total_amount AS package_total, pp.currency
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.id=?
       LIMIT 1`,
      [req.params.submissionId]
    );
    if (!sub) return fail(res, 'Member not found', 404);

    // Fetch payment separately to avoid correlated-subquery join issues
    const [[latestPay]] = await pool.query(
      `SELECT pay.amount AS payment_amount, pay.id AS pay_id, pm.name AS method_name
       FROM portal_payments pay
       LEFT JOIN portal_payment_methods pm ON pm.id = pay.method_id
       WHERE pay.submission_id = ?
       ORDER BY pay.id DESC LIMIT 1`,
      [req.params.submissionId]
    );

    const amount = parseFloat(
      latestPay?.payment_amount ||
      sub.package_total ||
      sub.package_price ||
      0
    );
    const methodName = latestPay?.method_name || sub.method_name || null;
    const tax = 0;
    const total = amount + tax;
    const invoiceNum = `INV-${sub.membership_id || sub.id}-${Date.now()}`;
    const derivedCurrency = getCurrencyCodeByCountry(extractCountryNameFromSubmissionData(sub.data, sub.location_type));

    // Check if invoice already exists for this member (or this payment if payment_id provided)
    const checkQuery = payment_id
      ? 'SELECT id FROM invoices WHERE payment_id=? LIMIT 1'
      : "SELECT id FROM invoices WHERE submission_id=? AND invoice_type='membership' LIMIT 1";
    const checkParam = payment_id ? payment_id : req.params.submissionId;
    const [[existing]] = await pool.query(checkQuery, [checkParam]);

    let invoiceId;
    let isNewInvoice = false;
    if (existing) {
      // Update existing invoice with correct amount if it was 0
      await pool.query(
        `UPDATE invoices SET amount=?, total_amount=?, payment_method=?, currency=? WHERE id=?`,
        [amount, total, methodName, derivedCurrency, existing.id]
      );
      invoiceId = existing.id;
    } else {
      const [r] = await pool.query(
        `INSERT INTO invoices
           (invoice_number, submission_id, payment_id, invoice_type, member_name, member_email,
            member_id_str, package_name, amount, tax_amount, total_amount, currency, payment_method)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          invoiceNum, req.params.submissionId, payment_id || null, 'membership',
          sub.applicant_name, sub.applicant_email, sub.membership_id,
          sub.package_name || '', amount, tax, total,
          derivedCurrency, methodName,
        ]
      );
      invoiceId = r.insertId;
      isNewInvoice = true;
    }

    createAuditLog(req.user.id, 'GENERATE_INVOICE', 'invoices', String(invoiceId), req.ip);

    if (isNewInvoice) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
      sendInvoiceGenerated({
        to: sub.applicant_email,
        name: sub.applicant_name,
        membershipId: sub.membership_id || sub.id,
        invoiceNumber: invoiceNum,
        amount: total,
        currency: derivedCurrency,
        invoiceUrl: `${frontendUrl}/member/invoices`
      }).catch(err => console.error('Failed to send invoice generated email:', err));
    }

    return ok(res, { id: invoiceId, invoice_number: invoiceNum }, 'Invoice ready');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
