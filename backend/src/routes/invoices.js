const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const path = require('path');
const fs = require('fs');
const { extractCountryNameFromSubmissionData, getCurrencyCodeByCountry } = require('../utils/membershipCurrency');

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

// GET /api/invoices/:id/download  – stream PDF (generate if needed)
router.get('/:id/download', async (req, res) => {
  try {
    const [[inv]] = await pool.query(
      `SELECT i.*, s.membership_id, s.applicant_phone,
              pp.name AS pkg_name, pp.location AS pkg_location, pp.membership_type, pp.duration AS pkg_duration
       FROM invoices i
       LEFT JOIN fb_submissions s ON s.id=i.submission_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE i.id=?`, [req.params.id]
    );
    if (!inv) return fail(res, 'Invoice not found', 404);

    // Fetch org settings
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const cfg = {};
    for (const s of settings) cfg[s.setting_key] = s.setting_value;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 0, size: 'A4' });

    const filename = `invoice-${inv.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    const pageW = 595.28;
    const BLUE = '#1a3c6e';
    const LIGHT_BLUE = '#2a5ca8';
    const amount = parseFloat(inv.amount || 0);
    const tax = parseFloat(inv.tax_amount || 0);
    const total = parseFloat(inv.total_amount || amount + tax);
    const fmtAmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Blue Header Banner ──────────────────────────────────────────
    doc.rect(0, 0, pageW, 100).fill(BLUE);
    // Wave curve at bottom of banner
    doc.save();
    doc.moveTo(0, 85).bezierCurveTo(150, 120, 400, 70, pageW, 100).lineTo(pageW, 100).lineTo(0, 100).fill(BLUE);
    doc.restore();
    doc.save();
    doc.moveTo(0, 90).bezierCurveTo(200, 115, 450, 80, pageW, 105).lineTo(pageW, 105).lineTo(0, 105).fill('#fff');
    doc.restore();

    // Title
    doc.fontSize(28).fillColor('#fff').font('Helvetica-Bold').text('INVOICE', 50, 30);
    doc.fontSize(10).fillColor('#fff').font('Helvetica').text(`NO: ${inv.invoice_number}`, pageW - 250, 40, { width: 200, align: 'right' });

    // ── Bill To / From ──────────────────────────────────────────────
    const infoY = 125;
    doc.fontSize(12).fillColor(BLUE).font('Helvetica-Bold').text('Bill To:', 50, infoY);
    doc.fontSize(10).fillColor('#333').font('Helvetica');
    doc.text(inv.member_name || '—', 50, infoY + 18);
    if (inv.member_email) doc.text(inv.member_email, 50, doc.y + 2);
    if (inv.applicant_phone) doc.text(inv.applicant_phone, 50, doc.y + 2);
    if (inv.membership_id || inv.member_id_str) doc.text(`Member ID: ${inv.membership_id || inv.member_id_str}`, 50, doc.y + 2);

    doc.fontSize(12).fillColor(BLUE).font('Helvetica-Bold').text('From:', pageW - 250, infoY, { width: 200, align: 'right' });
    doc.fontSize(10).fillColor('#333').font('Helvetica');
    doc.text(cfg.site_name || 'FORTI Membership Portal', pageW - 250, infoY + 18, { width: 200, align: 'right' });
    if (cfg.support_email) doc.text(cfg.support_email, pageW - 250, doc.y + 2, { width: 200, align: 'right' });
    if (cfg.support_phone) doc.text(cfg.support_phone, pageW - 250, doc.y + 2, { width: 200, align: 'right' });

    // ── Date ────────────────────────────────────────────────────────
    const dateY = Math.max(doc.y, infoY + 75) + 15;
    doc.fontSize(10).fillColor('#333').font('Helvetica-Bold').text(
      `Date: ${new Date(inv.issued_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      50, dateY
    );

    // ── Table ───────────────────────────────────────────────────────
    const tableY = dateY + 30;
    const colX = [50, 300, 380, 470];
    const colW = [250, 80, 90, 75];
    const rowH = 30;

    // Table header
    doc.rect(50, tableY, pageW - 100, rowH).fill(BLUE);
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold');
    doc.text('Description', colX[0] + 10, tableY + 9);
    doc.text('Qty', colX[1] + 10, tableY + 9, { width: colW[1], align: 'center' });
    doc.text('Price', colX[2] + 10, tableY + 9, { width: colW[2], align: 'center' });
    doc.text('Total', colX[3], tableY + 9, { width: colW[3], align: 'center' });

    // Row 1: Package
    let curY = tableY + rowH;
    doc.rect(50, curY, pageW - 100, rowH).fill('#f8f9fb');
    doc.rect(50, curY, pageW - 100, rowH).strokeColor('#e5e7eb').stroke();
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    doc.text(inv.package_name || inv.pkg_name || 'Membership Package', colX[0] + 10, curY + 9, { width: colW[0] });
    doc.text('1', colX[1] + 10, curY + 9, { width: colW[1], align: 'center' });
    doc.text(fmtAmt(amount), colX[2] + 10, curY + 9, { width: colW[2], align: 'center' });
    doc.text(fmtAmt(amount), colX[3], curY + 9, { width: colW[3], align: 'center' });

    // Row 2: Tax (if applicable)
    if (tax > 0) {
      curY += rowH;
      doc.rect(50, curY, pageW - 100, rowH).fill('#fff');
      doc.rect(50, curY, pageW - 100, rowH).strokeColor('#e5e7eb').stroke();
      doc.text('Tax', colX[0] + 10, curY + 9, { width: colW[0] });
      doc.text('', colX[1] + 10, curY + 9, { width: colW[1], align: 'center' });
      doc.text(fmtAmt(tax), colX[2] + 10, curY + 9, { width: colW[2], align: 'center' });
      doc.text(fmtAmt(tax), colX[3], curY + 9, { width: colW[3], align: 'center' });
    }

    // Sub Total row
    curY += rowH + 5;
    doc.rect(colX[2], curY, colW[2] + colW[3] + 10, rowH).fill(BLUE);
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold');
    doc.text('Sub Total', colX[2] + 10, curY + 9, { width: colW[2], align: 'center' });
    doc.text(fmtAmt(total), colX[3], curY + 9, { width: colW[3], align: 'center' });

    // ── Note section ────────────────────────────────────────────────
    curY += rowH + 25;
    doc.fontSize(10).fillColor('#333').font('Helvetica-Bold').text('Note:', 50, curY);
    doc.moveTo(50, curY + 15).lineTo(200, curY + 15).strokeColor('#999').lineWidth(0.5).stroke();
    if (inv.notes) {
      doc.fontSize(9).fillColor('#666').font('Helvetica').text(inv.notes, 50, curY + 20, { width: 200 });
    }

    // ── Payment Information ─────────────────────────────────────────
    curY += 55;
    doc.fontSize(11).fillColor('#333').font('Helvetica-Bold').text('Payment Information:', 50, curY);
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    if (inv.payment_method) {
      doc.font('Helvetica-Bold').text('Method:', 50, curY + 18, { continued: true }).font('Helvetica').text(`  ${inv.payment_method}`);
    }
    if (inv.member_email) {
      doc.font('Helvetica-Bold').text('Email:', 50, doc.y + 3, { continued: true }).font('Helvetica').text(`    ${inv.member_email}`);
    }

    // ── Thank You ───────────────────────────────────────────────────
    doc.fontSize(28).fillColor(BLUE).font('Helvetica-Bold').text('Thank You!', pageW - 250, curY + 10, { width: 200, align: 'right' });

    // ── Footer ──────────────────────────────────────────────────────
    doc.fontSize(8).fillColor('#aaa').font('Helvetica')
       .text('This is a system-generated invoice.', 50, 780, { align: 'center', width: pageW - 100 });

    doc.end();
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
    }

    createAuditLog(req.user.id, 'GENERATE_INVOICE', 'invoices', String(invoiceId), req.ip);
    return ok(res, { id: invoiceId, invoice_number: invoiceNum }, 'Invoice ready');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
