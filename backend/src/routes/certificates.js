const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();
router.use(authMiddleware);

// Helper: generate member certificate PDF
async function generateCertificatePDF(member, outputPath) {
  const PDFDocument = require('pdfkit');
  const QRCode = require('qrcode');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const W = 595.28;
    const H = 841.89;

    // ── Colour palette ─────────────────────────────────────────────
    const NAVY   = '#0d2b5e';
    const GOLD   = '#c9a84c';
    const LGOLD  = '#e8d5a0';
    const WHITE  = '#ffffff';
    const CREAM  = '#fafaf7';
    const DARK   = '#1a1a2e';
    const MID    = '#4a4a6a';
    const LIGHT  = '#8888aa';

    // ── Background ─────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill(CREAM);

    // Subtle top-left and bottom-right corner decorative arcs
    doc.save();
    doc.circle(0, 0, 120).fillOpacity(0.04).fill(NAVY);
    doc.circle(W, H, 120).fillOpacity(0.04).fill(NAVY);
    doc.restore();

    // ── Outer border (navy thick) ──────────────────────────────────
    doc.rect(22, 22, W - 44, H - 44)
       .lineWidth(3).strokeColor(NAVY).stroke();

    // ── Inner border (gold thin) ───────────────────────────────────
    doc.rect(30, 30, W - 60, H - 60)
       .lineWidth(0.8).strokeColor(GOLD).stroke();

    // ── Header band ────────────────────────────────────────────────
    doc.rect(22, 22, W - 44, 115).fill(NAVY);

    // Small gold top accent line inside header
    doc.rect(30, 30, W - 60, 2).fill(GOLD);

    // Organisation label (top-center, small caps feel)
    doc.fillColor(LGOLD).fontSize(8).font('Helvetica')
       .text('F  O  R  T  I   M  E  M  B  E  R  S  H  I  P   P  O  R  T  A  L', 0, 44, { align: 'center', width: W });

    // Main certificate title
    doc.fillColor(WHITE).fontSize(22).font('Helvetica-Bold')
       .text('MEMBERSHIP CERTIFICATE', 0, 62, { align: 'center', width: W, characterSpacing: 2 });

    // Gold rule under title
    const ruleY = 98;
    doc.moveTo(W / 2 - 110, ruleY).lineTo(W / 2 + 110, ruleY)
       .lineWidth(1).strokeColor(GOLD).stroke();

    // Small diamond ornaments
    const dX = W / 2;
    doc.save();
    doc.translate(dX - 115, ruleY).rotate(45).rect(-4, -4, 8, 8).fill(GOLD);
    doc.restore();
    doc.save();
    doc.translate(dX + 115, ruleY).rotate(45).rect(-4, -4, 8, 8).fill(GOLD);
    doc.restore();
    doc.save();
    doc.translate(dX, ruleY).rotate(45).rect(-3, -3, 6, 6).fill(LGOLD);
    doc.restore();

    // Sub-label
    doc.fillColor(LGOLD).fontSize(8).font('Helvetica')
       .text('O F F I C I A L   D O C U M E N T', 0, 108, { align: 'center', width: W });

    // ── Certify preamble ───────────────────────────────────────────
    doc.fillColor(MID).fontSize(11).font('Helvetica')
       .text('This is to certify that', 0, 160, { align: 'center', width: W });

    // ── Member name ────────────────────────────────────────────────
    // Name background bar (very subtle)
    doc.rect(80, 182, W - 160, 50).fill('#eeeef8');
    doc.rect(80, 182, 3, 50).fill(GOLD);
    doc.rect(W - 83, 182, 3, 50).fill(GOLD);

    doc.fillColor(DARK).fontSize(28).font('Helvetica-Bold')
       .text(member.full_name || 'Member', 0, 193, { align: 'center', width: W });

    // ── "is a registered member" ───────────────────────────────────
    doc.fillColor(MID).fontSize(11).font('Helvetica')
       .text('is a duly registered member of', 0, 248, { align: 'center', width: W });

    doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold')
       .text('FORTI — Federation of Rajasthan Trade & Industry', 0, 265, { align: 'center', width: W });

    // Gold divider
    doc.moveTo(80, 296).lineTo(W - 80, 296)
       .lineWidth(0.5).strokeColor(GOLD).stroke();

    // ── Info table ─────────────────────────────────────────────────
    const infoStartY = 316;
    const infoRows = [
      ['Membership ID',  member.membership_id || '—'],
      ['Category',       member.category_name || member.membership_type || '—'],
      ['Package',        member.package_name  || '—'],
      ['Valid Until',    member.expiry_date
        ? new Date(member.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : (member.duration_months
          ? (() => {
              const d = new Date(); d.setMonth(d.getMonth() + member.duration_months);
              return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            })()
          : 'Lifetime')
      ],
    ];

    infoRows.forEach(([label, value], idx) => {
      const rowY = infoStartY + idx * 40;
      const isEven = idx % 2 === 0;

      // Row background
      doc.rect(80, rowY, W - 160, 35).fill(isEven ? '#f0f0f8' : WHITE);

      // Left gold accent
      doc.rect(80, rowY, 3, 35).fill(GOLD);

      // Label
      doc.fillColor(LIGHT).fontSize(8).font('Helvetica')
         .text(label.toUpperCase(), 92, rowY + 6, { width: 160 });

      // Value
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold')
         .text(value, 92, rowY + 17, { width: W - 260 });

      // Row bottom border
      doc.moveTo(80, rowY + 35).lineTo(W - 80, rowY + 35)
         .lineWidth(0.3).strokeColor('#d0d0e0').stroke();
    });

    // ── Gold divider ───────────────────────────────────────────────
    const divY = infoStartY + infoRows.length * 40 + 18;
    doc.moveTo(80, divY).lineTo(W - 80, divY)
       .lineWidth(0.5).strokeColor(GOLD).stroke();

    // ── Bottom section: Signature | Seal | QR ─────────────────────
    const bottomY = divY + 20;

    // -- Signature block (left) -------------------------------------
    const sigX = 80;
    const sigLineY = bottomY + 60;

    // Signature decorative scrawl
    doc.save();
    doc.moveTo(sigX, sigLineY - 18).bezierCurveTo(sigX + 20, sigLineY - 30, sigX + 60, sigLineY - 10, sigX + 90, sigLineY - 20).stroke();
    doc.restore();

    doc.moveTo(sigX, sigLineY).lineTo(sigX + 120, sigLineY)
       .lineWidth(0.8).strokeColor(DARK).stroke();

    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
       .text('Authorized Signatory', sigX, sigLineY + 5, { width: 130 });
    doc.fillColor(LIGHT).fontSize(8).font('Helvetica')
       .text('FORTI Membership Authority', sigX, sigLineY + 18, { width: 130 });

    // -- FORTI VERIFIED circular seal (center) ----------------------
    const sealCX = W / 2;
    const sealCY = bottomY + 42;

    // Outer ring
    doc.circle(sealCX, sealCY, 42).lineWidth(2).strokeColor(GOLD).stroke();
    // Inner ring
    doc.circle(sealCX, sealCY, 36).lineWidth(0.6).strokeColor(GOLD).stroke();
    // Fill
    doc.circle(sealCX, sealCY, 35).fill(NAVY);

    // "FORTI" in seal
    doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
       .text('FORTI', sealCX - 60, sealCY - 10, { align: 'center', width: 120 });
    doc.fillColor(GOLD).fontSize(7).font('Helvetica')
       .text('V E R I F I E D', sealCX - 60, sealCY + 4, { align: 'center', width: 120 });

    // Stars / ornaments in seal
    doc.fillColor(LGOLD).fontSize(9).font('Helvetica')
       .text('★  ★  ★', sealCX - 60, sealCY + 18, { align: 'center', width: 120 });

    // -- QR Code (right) --------------------------------------------
    QRCode.toDataURL(
      `https://forti.org/verify?id=${member.membership_id || member.id}`,
      { width: 90, margin: 1, color: { dark: '#0d2b5e', light: '#fafaf7' } },
      (err, url) => {
        if (!err) {
          const base64Data = url.replace(/^data:image\/png;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          const qrX = W - 160;
          const qrY = bottomY + 8;

          // QR border box
          doc.rect(qrX - 4, qrY - 4, 78, 78).lineWidth(0.8).strokeColor(GOLD).stroke();
          doc.image(imgBuffer, qrX, qrY, { width: 70, height: 70 });

          doc.fillColor(LIGHT).fontSize(7).font('Helvetica')
             .text('Scan to verify', qrX - 4, qrY + 74, { width: 78, align: 'center' });
        }

        // ── Footer strip ───────────────────────────────────────────
        const footerY = H - 52;
        doc.rect(22, footerY, W - 44, 30).fill(NAVY);

        const issuedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.fillColor(LGOLD).fontSize(8.5).font('Helvetica')
           .text(`Issued on: ${issuedDate}`, 40, footerY + 10, { width: (W - 80) / 2 });
        doc.fillColor(LGOLD).fontSize(8.5).font('Helvetica')
           .text('This is an official FORTI membership document', (W / 2), footerY + 10,
             { width: (W - 80) / 2, align: 'right' });

        // Gold rule above footer
        doc.moveTo(30, footerY - 1).lineTo(W - 30, footerY - 1)
           .lineWidth(0.5).strokeColor(GOLD).stroke();

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      }
    );
  });
}

// GET /api/certificates/:submissionId  Generate + return certificate
router.get('/:submissionId([0-9]+)', async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name AS full_name, s.applicant_email,
              s.expiry_date, s.status, s.member_status,
              pp.name AS package_name, pp.duration_months
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.id = ? AND s.status IN ('approved','payment_verified','active')`,
      [req.params.submissionId]
    );
    if (!member) return fail(res, 'Member not found or not yet approved', 404);

    const dir = path.join(__dirname, '../../storage/certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `cert_${member.membership_id || member.id}.pdf`);

    await generateCertificatePDF(member, filePath);

    // Save path + mark generated
    const relPath = `storage/certificates/cert_${member.membership_id || member.id}.pdf`;
    await pool.query(
      'UPDATE fb_submissions SET cert_generated=1, certificate_pdf=? WHERE id=?',
      [relPath, member.id]
    ).catch(() => {});
    createAuditLog(req.user?.id, 'GENERATE_CERTIFICATE', 'certificates', String(member.id), req.ip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${member.membership_id || member.id}.pdf"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) { console.error(err); return fail(res, 'Could not generate certificate', 500); }
});

// GET /api/certificates/card/:submissionId  Generate digital ID card PDF
router.get('/card/:submissionId([0-9]+)', async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name AS full_name, s.applicant_email,
              s.expiry_date, s.status, s.member_status,
              pp.name AS package_name, pp.duration_months
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.id = ? AND s.status IN ('active','approved')`,
      [req.params.submissionId]
    );
    if (!member) return fail(res, 'Approved member not found', 404);

    const PDFDocument = require('pdfkit');
    const QRCode = require('qrcode');

    const dir = path.join(__dirname, '../../storage/cards');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `card_${member.membership_id || member.id}.pdf`);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [330, 210], margin: 15 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.rect(0, 0, 330, 210).fill('#1a0533');
      doc.rect(0, 0, 330, 55).fill('#6C3EAB');

      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
         .text('FORTI MEMBER CARD', 15, 18);
      doc.fillColor('#ddd').fontSize(8).font('Helvetica')
         .text('www.forti.org', 15, 38);

      doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
         .text(member.full_name, 15, 70);
      doc.fillColor('#ccc').fontSize(9).font('Helvetica')
         .text(`ID: ${member.membership_id || '—'}`, 15, 90)
         .text(`Package: ${member.package_name || ''}`, 15, 105)
         .text(`Valid: ${member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}`, 15, 120);

      QRCode.toDataURL(`FORTI:${member.membership_id || member.id}`, { width: 70 }, (err, url) => {
        if (!err) {
          const buf = Buffer.from(url.replace(/^data:image\/png;base64,/, ''), 'base64');
          doc.image(buf, 250, 65, { width: 70, height: 70 });
        }
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    });

    // Save path + mark generated
    const relPath = `storage/cards/card_${member.membership_id || member.id}.pdf`;
    await pool.query(
      'UPDATE fb_submissions SET card_generated=1, id_card_pdf=? WHERE id=?',
      [relPath, member.id]
    ).catch(() => {});
    createAuditLog(req.user?.id, 'GENERATE_ID_CARD', 'certificates', String(member.id), req.ip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="card_${member.membership_id || member.id}.pdf"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) { console.error(err); return fail(res, 'Could not generate card', 500); }
});

// GET /api/certificates/list  Members with status=active/approved AND payment_status=approved
router.get('/list', async (req, res) => {
  const { q, page = 1, per_page = 20 } = req.query;
  let where = "s.status IN ('active','approved') AND s.payment_status IN ('approved','verified')";
  const params = [];
  if (req.user.role === 'branch_manager' || req.user.role === 'office_staff') {
    if (req.user.assigned_branch_id) {
      where += ' AND s.branch_id=?'; params.push(req.user.assigned_branch_id);
    } else if (req.user.assigned_state_id) {
      where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
    }
  }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.membership_id, s.applicant_name, s.applicant_email,
              s.member_status, s.payment_status, s.expiry_date, s.approved_at,
              s.cert_generated, s.certificate_pdf,
              s.card_generated, s.id_card_pdf,
              pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE ${where} ORDER BY s.approved_at DESC, s.id DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// Export PDF generators so payments.js can use them for auto-generation
async function generateCertPDF(member, outputPath) {
  return generateCertificatePDF(member, outputPath);
}

async function generateCardPDF(member, outputPath) {
  const PDFDocument = require('pdfkit');
  const QRCode = require('qrcode');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [330, 210], margin: 15 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    doc.rect(0, 0, 330, 210).fill('#1a0533');
    doc.rect(0, 0, 330, 55).fill('#6C3EAB');
    doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold').text('FORTI MEMBER CARD', 15, 18);
    doc.fillColor('#ddd').fontSize(8).font('Helvetica').text('www.forti.org', 15, 38);
    doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold').text(member.full_name || '', 15, 70);
    doc.fillColor('#ccc').fontSize(9).font('Helvetica')
       .text(`ID: ${member.membership_id || '—'}`, 15, 90)
       .text(`Package: ${member.package_name || ''}`, 15, 105)
       .text(`Valid: ${member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}`, 15, 120);
    QRCode.toDataURL(`FORTI:${member.membership_id || 'UNKNOWN'}`, { width: 70 }, (err, url) => {
      if (!err) {
        const buf = Buffer.from(url.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(buf, 250, 65, { width: 70, height: 70 });
      }
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  });
}

module.exports = router;
module.exports.generateCertPDF = generateCertPDF;
module.exports.generateCardPDF = generateCardPDF;

