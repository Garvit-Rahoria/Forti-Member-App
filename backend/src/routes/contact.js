const express = require('express');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── 1. POST /api/contact (Public Submit) ───────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return fail(res, 'Name, email, and message are required', 422);
  }

  try {
    await pool.query(
      `INSERT INTO portal_contact_messages (name, email, phone, subject, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [name.trim(), email.trim(), phone?.trim() || null, subject?.trim() || null, message.trim()]
    );
    return ok(res, null, 'Message sent successfully');
  } catch (err) {
    console.error('[POST /api/contact error]', err.message);
    return fail(res, 'Failed to save message. Please try again.', 500);
  }
});

// All following routes require authentication
router.use(authMiddleware);

// ── 2. GET /api/contact/unread-count (Unread count for notifications) ───────
router.get('/unread-count', requireRole('office_staff'), async (req, res) => {
  try {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM portal_contact_messages WHERE is_read = FALSE"
    );
    return ok(res, { count: Number(row?.cnt || 0) });
  } catch (err) {
    console.error('[GET /api/contact/unread-count error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// ── 3. GET /api/contact/messages (List all messages) ───────────────────────
// Accessible to office_staff
router.get('/messages', requireRole('office_staff'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM portal_contact_messages ORDER BY created_at DESC"
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[GET /api/contact/messages error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// ── 4. PATCH /api/contact/messages/:id/read (Mark message as read) ─────────
router.patch('/messages/:id/read', requireRole('office_staff'), async (req, res) => {
  try {
    await pool.query(
      "UPDATE portal_contact_messages SET is_read = TRUE WHERE id = ?",
      [req.params.id]
    );
    return ok(res, null, 'Message marked as read');
  } catch (err) {
    console.error('[PATCH /api/contact/messages/:id/read error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
