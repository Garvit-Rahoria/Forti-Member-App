const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { ok, fail, paginate } = require('../utils/helpers');
const { ensureAutoRenewals } = require('../utils/autoRenewals');
const crypto = require('crypto');

const RENEWAL_SORTS = {
  latest: 'r.created_at DESC',
  amount_desc: 'r.amount DESC, r.created_at DESC',
  amount_asc: 'r.amount ASC, r.created_at DESC',
  expiry_asc: 'COALESCE(r.new_expiry_date, r.old_expiry_date, s.expiry_date) ASC, r.created_at DESC',
  expiry_desc: 'COALESCE(r.new_expiry_date, r.old_expiry_date, s.expiry_date) DESC, r.created_at DESC',
  status: 'r.status ASC, r.created_at DESC',
};

function normalizeDateInput(value) {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const displayMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isFutureDate(dateString) {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateString}T00:00:00`);
  return !Number.isNaN(target.getTime()) && target > today;
}

const router = express.Router();

// ── Public: submit renewal request (from member portal) ──────────────────────

// POST /api/renewals/submit  (public – member submits renewal)
router.post(
  '/submit',
  upload.single('payment_screenshot'),
  async (req, res) => {
    const { submission_id, package_id, payment_method_id, transaction_id } = req.body;

    if (!submission_id)   return fail(res, 'submission_id required', 422);
    if (!transaction_id)  return fail(res, 'transaction_id required', 422);
    if (!payment_method_id) return fail(res, 'payment_method_id required', 422);
    if (!req.file)        return fail(res, 'payment_screenshot required', 422);

    const screenshotPath = `/uploads/payments/${req.file.filename}`;

    try {
      // Verify submission exists and is active or approved
      const [[sub]] = await pool.query(
        `SELECT id, membership_id, applicant_name, applicant_email, expiry_date, package_id
         FROM fb_submissions WHERE id = ? AND status IN ('active','approved')`,
        [submission_id]
      );
      if (!sub) return fail(res, 'Active member not found', 404);

      // ── STRICT: Renewal only allowed if expiry ≤ 30 days away OR already expired ──
      if (sub.expiry_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(sub.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysLeft > 30) {
          return fail(
            res,
            `Renewal not allowed yet. Your membership expires in ${daysLeft} days. Renewal opens 30 days before expiry.`,
            422
          );
        }
      }

      // Get package price
      let amount = 0;
      const pid = package_id || sub.package_id;
      if (pid) {
        const [[pkg]] = await pool.query('SELECT price FROM portal_packages WHERE id=?', [pid]);
        if (pkg) amount = pkg.price;
      }

      const uuid = crypto.randomUUID();
      const [r] = await pool.query(
        `INSERT INTO portal_renewals
           (uuid, submission_id, package_id, amount, old_expiry_date,
            payment_method_id, transaction_id, screenshot_path, status)
         VALUES (?,?,?,?,?,?,?,?,'pending')`,
        [uuid, submission_id, pid || null, amount,
         sub.expiry_date || null, payment_method_id,
         transaction_id, screenshotPath]
      );

      return ok(res, { renewal_id: r.insertId, uuid }, 'Renewal submitted', 201);
    } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
  }
);

// ── Admin routes (auth required) ─────────────────────────────────────────────
router.use(authMiddleware);

// GET /api/renewals  – paginated list
router.get('/', async (req, res) => {
  const { page = 1, per_page = 20, status, q, sort = 'latest', expiry_soon, duration, start_date, end_date } = req.query;
  const params = [];
  let where = '1=1';
  if (status) { where += ' AND r.status=?'; params.push(status); }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ? OR r.transaction_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (String(expiry_soon || '').toLowerCase() === 'true') {
    where += ' AND s.expiry_date IS NOT NULL AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= 30';
  }

  // The frontend now passes exact start_date and end_date based on the selected duration.
  // We no longer need to process the 'duration' string manually.
  if (start_date) {
    where += ' AND s.expiry_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    where += ' AND s.expiry_date <= ?';
    params.push(end_date);
  }
  // Branch scoping: branch_manager AND office_staff see only their state
  if (
    (req.user.role === 'branch_manager' || req.user.role === 'office_staff') &&
    req.user.assigned_state_id
  ) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }
  const orderBy = RENEWAL_SORTS[sort] || RENEWAL_SORTS.latest;
  try {
    await ensureAutoRenewals();
    const result = await paginate(
      pool,
      `SELECT r.id, r.uuid, r.status, r.amount, r.currency, r.transaction_id,
              r.submission_id,
              r.old_expiry_date, r.new_expiry_date, r.created_at, r.processed_at, r.screenshot_path,
              s.membership_id, s.applicant_name, s.applicant_email, s.expiry_date AS current_expiry,
              pp.name AS package_name, pm.name AS payment_method_name,
              pu.email AS processed_by_email
       FROM portal_renewals r
       LEFT JOIN fb_submissions s ON s.id = r.submission_id
       LEFT JOIN portal_packages pp ON pp.id = r.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = r.payment_method_id
       LEFT JOIN portal_admin_users pu ON pu.id = r.processed_by
       WHERE ${where} ORDER BY ${orderBy}`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/renewals/expiring  – members expiring within N days
router.get('/expiring', async (req, res) => {
  const { days = 30 } = req.query;
  const params = [Number(days)];
  let where = `s.status IN ('active','approved')
         AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE()
         AND DATEDIFF(s.expiry_date, CURDATE()) <= ?`;
  if (req.user.role === 'branch_manager' && req.user.assigned_state_id) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }
  try {
    await ensureAutoRenewals();
    const [rows] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date, s.member_status,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_left,
              pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE ${where}
       ORDER BY s.expiry_date ASC`,
      params
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/renewals/expired  – already expired members
router.get('/expired', async (req, res) => {
  const { page = 1, per_page = 20 } = req.query;
  const params = [];
  let where = `s.status IN ('active','approved') AND s.expiry_date IS NOT NULL AND s.expiry_date < CURDATE()`;
  if (req.user.role === 'branch_manager' && req.user.assigned_state_id) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date, s.member_status, pp.name AS package_name,
              DATEDIFF(CURDATE(), s.expiry_date) AS days_expired
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE ${where}
       ORDER BY s.expiry_date DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/renewals/:id
router.get('/:id', async (req, res) => {
  try {
    const [[renewal]] = await pool.query(
      `SELECT r.*, s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date AS current_expiry, pp.name AS package_name,
              pm.name AS payment_method_name, pm.instructions AS payment_instructions,
              pu.full_name AS processed_by_name, pu.email AS processed_by_email
       FROM portal_renewals r
       LEFT JOIN fb_submissions s ON s.id = r.submission_id
       LEFT JOIN portal_packages pp ON pp.id = r.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = r.payment_method_id
       LEFT JOIN portal_admin_users pu ON pu.id = r.processed_by
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!renewal) return fail(res, 'Not found', 404);
    return ok(res, renewal);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/renewals/:id/verify  – admin verifies and approves renewal
router.patch('/:id/verify', requireRole('super_admin', 'admin', 'accountant'), async (req, res) => {
  const renewalId = Number(req.params.id);
  const action = String(req.body.action || '').trim().toLowerCase();
  const newExpiryDate = normalizeDateInput(req.body.newExpiryDate || req.body.new_expiry_date);
  const notes = req.body.notes ? String(req.body.notes).trim() : null;
  const memberId = req.body.memberId ?? req.body.member_id ?? null;

  if (!renewalId) return fail(res, 'Invalid request', 422);
  if (!['approve', 'reject'].includes(action)) return fail(res, 'Action must be approve or reject', 422);
  if (action === 'approve' && !newExpiryDate) return fail(res, 'Expiry date required', 422);
  if (action === 'approve' && !isFutureDate(newExpiryDate)) return fail(res, 'Expiry date must be a future date', 422);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[renewal]] = await conn.query(
      'SELECT * FROM portal_renewals WHERE id=?', [renewalId]
    );
    if (!renewal) {
      await conn.rollback();
      return fail(res, 'Renewal not found', 404);
    }

    if (memberId && Number(memberId) !== Number(renewal.submission_id)) {
      await conn.rollback();
      return fail(res, 'Invalid request', 422);
    }

    if (renewal.status === 'verified' && action === 'approve') {
      await conn.rollback();
      return fail(res, 'Renewal has already been approved', 409);
    }

    if (renewal.status === 'rejected' && action === 'reject') {
      await conn.rollback();
      return fail(res, 'Renewal has already been rejected', 409);
    }

    const [[member]] = await conn.query(
      `SELECT s.id, s.status, s.package_id, s.membership_id, s.applicant_name, s.applicant_email
       FROM fb_submissions s
       WHERE s.id=?`,
      [renewal.submission_id]
    );
    if (!member) {
      await conn.rollback();
      return fail(res, 'Member not found', 404);
    }

    if (action === 'approve') {
      // Update renewal record
      await conn.query(
        `UPDATE portal_renewals
         SET status='verified', new_expiry_date=?, notes=?, processed_by=?, processed_at=NOW()
         WHERE id=?`,
        [newExpiryDate, notes, req.user.id, renewalId]
      );

      // Extend member's expiry date and ensure the membership is active.
      await conn.query(
        `UPDATE fb_submissions
         SET expiry_date=?, member_status='active', status='active',
             package_id=COALESCE(?, package_id), updated_at=NOW()
         WHERE id=?`,
        [newExpiryDate, renewal.package_id || null, renewal.submission_id]
      );

      // Sync member_accounts expiry + package_id
      await conn.query(
        `UPDATE member_accounts
         SET expiry_date=?, package_id=COALESCE(?,package_id)
         WHERE submission_id=?`,
        [newExpiryDate, renewal.package_id || null, renewal.submission_id]
      ).catch(e => console.error('[sync member_accounts on renewal]', e.message));

      // Auto-create invoice once per renewal.
      const [[existingInvoice]] = await conn.query(
        'SELECT id FROM invoices WHERE renewal_id=? LIMIT 1',
        [renewal.id]
      );
      if (!existingInvoice) {
        const invoiceNum = `INV-RNW-${Date.now()}`;
        const [[packageInfo]] = await conn.query(
          'SELECT name FROM portal_packages WHERE id=? LIMIT 1',
          [renewal.package_id || member.package_id || null]
        );
        await conn.query(
          `INSERT INTO invoices
             (invoice_number, submission_id, renewal_id, invoice_type, member_name, member_email,
              member_id_str, package_name, amount, total_amount, currency, notes)
           VALUES (?,?,?,'renewal',?,?,?,?,?,?,?,?)`,
          [
            invoiceNum,
            renewal.submission_id,
            renewal.id,
            member.applicant_name,
            member.applicant_email,
            member.membership_id,
            packageInfo?.name || '',
            renewal.amount,
            renewal.amount,
            renewal.currency || 'INR',
            notes,
          ]
        );
      }
    } else {
      await conn.query(
        `UPDATE portal_renewals
         SET status='rejected', notes=?, processed_by=?, processed_at=NOW()
         WHERE id=?`,
        [notes, req.user.id, renewalId]
      );
    }

    await conn.commit();
    return ok(res, null, `Renewal ${action === 'approve' ? 'approved' : 'rejected'}`);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return fail(res, err.message || (action === 'approve' ? 'Approval failed' : 'Rejection failed'), 500);
  } finally {
    conn.release();
  }
});

// POST /api/renewals  – admin manually creates a renewal
router.post('/', requireRole('super_admin', 'admin'), async (req, res) => {
  const { submission_id, package_id, amount, new_expiry_date, notes } = req.body;
  if (!submission_id || !new_expiry_date) return fail(res, 'submission_id and new_expiry_date required', 422);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[sub]] = await conn.query(
      'SELECT id, expiry_date, membership_id, applicant_name, applicant_email FROM fb_submissions WHERE id=?',
      [submission_id]
    );
    if (!sub) { await conn.rollback(); return fail(res, 'Member not found', 404); }

    const uuid = crypto.randomUUID();

    const [[existingCycle]] = await conn.query(
      'SELECT id FROM portal_renewals WHERE submission_id=? AND old_expiry_date <=> ? LIMIT 1',
      [submission_id, sub.expiry_date || null]
    );
    if (existingCycle) {
      await conn.rollback();
      return fail(res, 'Renewal already exists for this member cycle', 409);
    }

    const [r] = await conn.query(
      `INSERT INTO portal_renewals
         (uuid, submission_id, package_id, amount, currency, old_expiry_date,
          new_expiry_date, status, notes, processed_by, processed_at)
       VALUES (?,?,?,?,?,?,?,'verified',?,?,NOW())`,
      [uuid, submission_id, package_id || null, amount || 0, 'INR',
       sub.expiry_date || null, new_expiry_date, notes || null, req.user.id]
    );

    // Extend expiry
    await conn.query(
      'UPDATE fb_submissions SET expiry_date=?, member_status=\'active\' WHERE id=?',
      [new_expiry_date, submission_id]
    );

    // Auto-invoice
    const [[pkgRow]] = await conn.query(
      'SELECT name FROM portal_packages WHERE id=?', [package_id || null]
    );
    const invoiceNum = `INV-RNW-${Date.now()}`;
    await conn.query(
      `INSERT INTO invoices
         (invoice_number, submission_id, renewal_id, invoice_type,
          member_name, member_email, member_id_str, package_name, amount, total_amount, currency)
       VALUES (?,?,?,'renewal',?,?,?,?,?,?,'INR')`,
      [invoiceNum, submission_id, r.insertId,
       sub.applicant_name, sub.applicant_email, sub.membership_id,
       pkgRow?.name || '', amount || 0, amount || 0]
    );

    await conn.commit();
    return ok(res, { id: r.insertId, uuid }, 'Renewal created', 201);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return fail(res, 'Server error', 500);
  } finally {
    conn.release();
  }
});

// DELETE /api/renewals/:id  (soft – reject only)
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query("UPDATE portal_renewals SET status='rejected' WHERE id=?", [req.params.id]);
    return ok(res, null, 'Renewal rejected');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;

