const express = require('express');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── 1. POST /api/contact (Public Submit) ───────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message, state_id, state_name, branch_id, branch_name } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return fail(res, 'Name, email, and message are required', 422);
  }

  // Resolve state_name from DB if state_id provided and name not sent
  let resolvedStateName = state_name?.trim() || null;
  const resolvedStateId = state_id ? Number(state_id) : null;
  if (resolvedStateId && !resolvedStateName) {
    try {
      const [[stateRow]] = await pool.query('SELECT name FROM states WHERE id = ? LIMIT 1', [resolvedStateId]);
      if (stateRow) resolvedStateName = stateRow.name;
    } catch (e) { /* non-fatal */ }
  }

  let resolvedBranchName = branch_name?.trim() || null;
  const resolvedBranchId = branch_id ? Number(branch_id) : null;
  if (resolvedBranchId && !resolvedBranchName) {
    try {
      const [[branchRow]] = await pool.query('SELECT name FROM portal_branches WHERE id = ? LIMIT 1', [resolvedBranchId]);
      if (branchRow) resolvedBranchName = branchRow.name;
    } catch (e) { /* non-fatal */ }
  }

  try {
    await pool.query(
      `INSERT INTO portal_contact_messages (name, email, phone, subject, message, state_id, state_name, branch_id, branch_name, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [name.trim(), email.trim(), phone?.trim() || null, subject?.trim() || null, message.trim(), resolvedStateId, resolvedStateName, resolvedBranchId, resolvedBranchName]
    );
    return ok(res, null, 'Message sent successfully');
  } catch (err) {
    console.error('[POST /api/contact error]', err.message);
    return fail(res, 'Failed to save message. Please try again.', 500);
  }
});

// All following routes require authentication
router.use(authMiddleware);

// ── 2. GET /api/contact/unread-count (Unread count — state-scoped for office_staff) ──
router.get('/unread-count', requireRole('office_staff'), async (req, res) => {
  try {
    const user = req.user;
    let sql = 'SELECT COUNT(*) AS cnt FROM portal_contact_messages WHERE is_read = FALSE';
    const params = [];

    // Branch scoping: office_staff only see their assigned branch's messages
    if (user.assigned_branch_id) {
      sql += ' AND branch_id = ?';
      params.push(user.assigned_branch_id);
    }

    const [[row]] = await pool.query(sql, params);
    return ok(res, { count: Number(row?.cnt || 0) });
  } catch (err) {
    console.error('[GET /api/contact/unread-count error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// ── 3. GET /api/contact/messages (List messages — state-scoped for office_staff) ──
router.get('/messages', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    const user = req.user;
    let sql = 'SELECT * FROM portal_contact_messages';
    const params = [];

    // Branch scoping: branch_manager and office_staff only see their branch's messages
    // Super admin and admin see all messages
    if ((user.role === 'office_staff' || user.role === 'branch_manager') && user.assigned_branch_id) {
      sql += ' WHERE branch_id = ?';
      params.push(user.assigned_branch_id);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error('[GET /api/contact/messages error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// ── 4. PATCH /api/contact/messages/:id/read (Mark message as read) ─────────
router.patch('/messages/:id/read', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    await pool.query(
      'UPDATE portal_contact_messages SET is_read = TRUE WHERE id = ?',
      [req.params.id]
    );
    return ok(res, null, 'Message marked as read');
  } catch (err) {
    console.error('[PATCH /api/contact/messages/:id/read error]', err.message);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
