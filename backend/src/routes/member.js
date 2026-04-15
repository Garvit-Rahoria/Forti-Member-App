const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Middleware: Only MEMBER
router.use(requireRole('member'));

// GET /api/member/profile
router.get('/profile', async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
    const [[member]] = await pool.query('SELECT * FROM members WHERE user_id=?', [req.user.id]);
    res.json({ success: true, data: { user, member } });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/member/profile
router.put('/profile', async (req, res) => {
  try {
    await pool.query('UPDATE users SET name=?, phone=? WHERE id=?', [req.body.name, req.body.phone, req.user.id]);
    await pool.query('UPDATE members SET company_name=?, business_type=?, gst_number=?, pan_number=?, address=?, city=?, state=?, country=? WHERE user_id=?', [req.body.company_name, req.body.business_type, req.body.gst_number, req.body.pan_number, req.body.address, req.body.city, req.body.state, req.body.country, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/member/payments
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payments WHERE user_id=? ORDER BY payment_date DESC', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/member/documents
router.get('/documents', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM documents WHERE user_id=?', [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/member/documents
router.post('/documents', async (req, res) => {
  try {
    const { type, file_url } = req.body;
    await pool.query('INSERT INTO documents (user_id, type, file_url) VALUES (?, ?, ?)', [req.user.id, type, file_url]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/member/downloads/certificate
router.get('/downloads/certificate', async (req, res) => {
  try {
    // Find the member's submission
    const [[member]] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name AS full_name, s.applicant_email,
              s.expiry_date, s.certificate_pdf
       FROM member_accounts ma
       JOIN fb_submissions s ON s.id = ma.submission_id
       WHERE ma.email = ? AND s.status IN ('active','approved')
       LIMIT 1`,
      [req.user.email]
    );
    if (!member) return res.status(404).json({ success: false, message: 'No active membership found' });

    // Check if certificate already exists on disk
    if (member.certificate_pdf) {
      const certPath = path.join(__dirname, '../../', member.certificate_pdf);
      if (fs.existsSync(certPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="certificate_${member.membership_id}.pdf"`);
        return fs.createReadStream(certPath).pipe(res);
      }
    }

    // Generate on the fly using certificate module
    const { generateCertPDF } = require('./certificates');
    const dir = path.join(__dirname, '../../storage/certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `cert_${member.membership_id || member.id}.pdf`);

    await generateCertPDF(member, filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${member.membership_id}.pdf"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[member/downloads/certificate]', err);
    res.status(500).json({ success: false, message: 'Could not generate certificate' });
  }
});

// GET /api/member/downloads/card
router.get('/downloads/card', async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name AS full_name, s.applicant_email,
              s.expiry_date, s.id_card_pdf,
              pp.name AS package_name
       FROM member_accounts ma
       JOIN fb_submissions s ON s.id = ma.submission_id
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE ma.email = ? AND s.status IN ('active','approved')
       LIMIT 1`,
      [req.user.email]
    );
    if (!member) return res.status(404).json({ success: false, message: 'No active membership found' });

    // Check if card already exists on disk
    if (member.id_card_pdf) {
      const cardPath = path.join(__dirname, '../../', member.id_card_pdf);
      if (fs.existsSync(cardPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="card_${member.membership_id}.pdf"`);
        return fs.createReadStream(cardPath).pipe(res);
      }
    }

    // Generate on the fly
    const { generateCardPDF } = require('./certificates');
    const dir = path.join(__dirname, '../../storage/cards');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `card_${member.membership_id || member.id}.pdf`);

    await generateCardPDF(member, filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="card_${member.membership_id}.pdf"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[member/downloads/card]', err);
    res.status(500).json({ success: false, message: 'Could not generate card' });
  }
});

module.exports = router;
