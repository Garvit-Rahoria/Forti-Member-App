const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

// All manager routes require JWT + branch_manager role
router.use(authMiddleware);
router.use(requireRole('branch_manager'));

// ── Helper: build state-scoped WHERE clause from the logged-in manager ────────
function regionScope(user) {
  if (user.assigned_state_id) {
    return { clause: ' AND s.state_id = ?', params: [user.assigned_state_id] };
  }
  // If no state assigned, manager sees nothing outside their scope for safety
  return { clause: ' AND 1=0', params: [] };
}

// ── GET /api/manager/region ───────────────────────────────────────────────────
// Returns the manager's assigned region info
router.get('/region', async (req, res) => {
  try {
    const user = req.user;
    let regionName = 'All Regions';
    if (user.assigned_state_id) {
      const [[state]] = await pool.query('SELECT name FROM states WHERE id = ? LIMIT 1', [user.assigned_state_id]);
      if (state) regionName = state.name;
    }
    return ok(res, {
      assigned_state_id: user.assigned_state_id,
      assigned_city: user.assigned_city || null,
      region_name: regionName,
      location_type: user.assigned_location_type || null,
    });
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── GET /api/manager/dashboard ────────────────────────────────────────────────
// Region-specific summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const sc = regionScope(req.user);

    const [[{ total_members }]] = await pool.query(
      `SELECT COUNT(*) AS total_members FROM fb_submissions s WHERE s.status IN ('active','approved')${sc.clause}`,
      sc.params);

    const [[{ active_members }]] = await pool.query(
      `SELECT COUNT(*) AS active_members FROM fb_submissions s WHERE s.status='active' AND s.member_status='active'${sc.clause}`,
      sc.params);

    const [[{ pending_applications }]] = await pool.query(
      `SELECT COUNT(*) AS pending_applications FROM fb_submissions s WHERE s.status IN ('submitted','under_review')${sc.clause}`,
      sc.params);

    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total_revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified'${sc.clause.replace(' AND s.state_id', ' AND s.state_id')}`,
      sc.params);

    const [[{ this_month_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS this_month_revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified'
         AND MONTH(p.created_at)=MONTH(NOW()) AND YEAR(p.created_at)=YEAR(NOW())${sc.clause}`,
      sc.params);

    const [[{ expiring_soon }]] = await pool.query(
      `SELECT COUNT(*) AS expiring_soon FROM fb_submissions s
       WHERE s.status IN ('active','approved') AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= 30${sc.clause}`,
      sc.params);

    // Recent 5 pending applications for this region
    const [recent_pending] = await pool.query(
      `SELECT s.id, s.applicant_name, s.applicant_email, s.status, s.membership_type,
              s.submitted_at, pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status IN ('submitted','under_review')${sc.clause}
       ORDER BY s.submitted_at ASC LIMIT 5`,
      sc.params);

    const [status_breakdown] = await pool.query(
      `SELECT s.status, COUNT(*) AS cnt FROM fb_submissions s
       WHERE s.status != 'draft'${sc.clause}
       GROUP BY s.status ORDER BY cnt DESC`,
      sc.params);

    return ok(res, {
      total_members, active_members, pending_applications,
      total_revenue, this_month_revenue, expiring_soon,
      recent_pending, status_breakdown,
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// ── GET /api/manager/applications ────────────────────────────────────────────
// Paginated list of applications in the manager's region
router.get('/applications', async (req, res) => {
  const { page = 1, per_page = 20, status, q } = req.query;
  const sc = regionScope(req.user);
  const params = [...sc.params];
  let where = `s.status != 'draft'${sc.clause}`;

  if (status && status !== 'all') { where += ' AND s.status=?'; params.push(status); }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.applicant_name, s.applicant_email, s.membership_id,
              s.status, s.member_status, s.membership_type, s.submitted_at, s.created_at,
              pp.name AS package_name, pmt.status AS pmt_status, pmt.amount AS payment_amount
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN portal_payments pmt ON pmt.submission_id=s.id AND pmt.id=(
         SELECT MAX(px.id) FROM portal_payments px WHERE px.submission_id=s.id
       )
       WHERE ${where}
       ORDER BY s.submitted_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// ── GET /api/manager/applications/:id ────────────────────────────────────────
// View single application (must be in manager's region)
router.get('/applications/:id', async (req, res) => {
  try {
    const sc = regionScope(req.user);
    const [[sub]] = await pool.query(
      `SELECT s.* FROM fb_submissions s WHERE s.id=? ${sc.clause} LIMIT 1`,
      [req.params.id, ...sc.params]
    );
    if (!sub) return fail(res, 'Application not found or outside your region', 404);
    return ok(res, sub);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PATCH /api/manager/applications/:id/approve ───────────────────────────────
router.patch('/applications/:id/approve', async (req, res) => {
  const { notes } = req.body;
  try {
    const sc = regionScope(req.user);
    const [[sub]] = await pool.query(
      `SELECT * FROM fb_submissions s WHERE s.id=? ${sc.clause} LIMIT 1`,
      [req.params.id, ...sc.params]
    );
    if (!sub) return fail(res, 'Application not found or outside your region', 404);

    // Ensure payment is verified before manager can approve
    const [[pmt]] = await pool.query(
      'SELECT status FROM portal_payments WHERE submission_id=? ORDER BY id DESC LIMIT 1',
      [req.params.id]
    );
    if (!pmt || !['verified','approved'].includes(pmt.status)) {
      return fail(res, 'Cannot approve: payment must be verified first', 422);
    }

    // Assign membership_id if not set
    let membershipId = sub.membership_id;
    if (!membershipId) {
      const [[{ cnt }]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
      );
      membershipId = `FORTI${String(cnt + 1).padStart(4, '0')}`;
      await pool.query('UPDATE fb_submissions SET membership_id=?, approved_at=COALESCE(approved_at,NOW()) WHERE id=?',
        [membershipId, req.params.id]);
    }

    // Create member account if not exists
    const [existing] = await pool.query('SELECT id FROM member_accounts WHERE submission_id=? LIMIT 1', [req.params.id]);
    if (!existing.length) {
      const { v4: uuidv4 } = require('uuid');
      let expiryDate = null;
      if (sub.plan_type === 'yearly' || sub.plan_type === '1year') {
        const d = new Date(); d.setFullYear(d.getFullYear() + 1); expiryDate = d.toISOString().split('T')[0];
      } else if (['3years','3_years'].includes(sub.plan_type)) {
        const d = new Date(); d.setFullYear(d.getFullYear() + 3); expiryDate = d.toISOString().split('T')[0];
      }
      await pool.query(
        `INSERT INTO member_accounts (uuid,submission_id,email,full_name,phone,membership_id,plan_type,membership_type,expiry_date)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), req.params.id, sub.applicant_email, sub.applicant_name,
         sub.applicant_phone||null, membershipId, sub.plan_type||null, sub.membership_type||null, expiryDate]
      ).catch(e => console.error('[manager approve member_account]', e.message));
    }

    await pool.query(
      `UPDATE fb_submissions SET status='active', member_status='active', reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?`,
      [req.user.id, notes || null, req.params.id]
    );

    // Send approval emails
    const { sendApplicationApproved, sendMembershipConfirmed } = require('../utils/email');
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/login`;
    sendApplicationApproved({ to: sub.applicant_email, name: sub.applicant_name, membershipId })
      .catch(e => console.error('[manager approve email]', e.message));
    sendMembershipConfirmed({ to: sub.applicant_email, name: sub.applicant_name, membershipId, loginUrl })
      .catch(e => console.error('[manager approve email2]', e.message));

    createAuditLog(req.user.id, 'MANAGER_APPROVE_MEMBER', 'submissions', String(req.params.id), req.ip);
    return ok(res, { id: Number(req.params.id), status: 'active' }, 'Application approved');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// ── PATCH /api/manager/applications/:id/reject ────────────────────────────────
router.patch('/applications/:id/reject', async (req, res) => {
  const { notes, reason } = req.body;
  const rejectReason = notes || reason || null;
  try {
    const sc = regionScope(req.user);
    const [[sub]] = await pool.query(
      `SELECT * FROM fb_submissions s WHERE s.id=? ${sc.clause} LIMIT 1`,
      [req.params.id, ...sc.params]
    );
    if (!sub) return fail(res, 'Application not found or outside your region', 404);

    await pool.query(
      `UPDATE fb_submissions SET status='rejected', reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?`,
      [req.user.id, rejectReason, req.params.id]
    );

    const { sendApplicationRejected } = require('../utils/email');
    sendApplicationRejected({ to: sub.applicant_email, name: sub.applicant_name, reason: rejectReason })
      .catch(e => console.error('[manager reject email]', e.message));

    createAuditLog(req.user.id, 'MANAGER_REJECT_MEMBER', 'submissions', String(req.params.id), req.ip);
    return ok(res, { id: Number(req.params.id), status: 'rejected' }, 'Application rejected');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PATCH /api/manager/applications/:id/under-review ─────────────────────────
router.patch('/applications/:id/under-review', async (req, res) => {
  const { notes } = req.body;
  try {
    const sc = regionScope(req.user);
    const [[sub]] = await pool.query(
      `SELECT id FROM fb_submissions s WHERE s.id=? ${sc.clause} LIMIT 1`,
      [req.params.id, ...sc.params]
    );
    if (!sub) return fail(res, 'Application not found or outside your region', 404);

    await pool.query(
      `UPDATE fb_submissions SET status='under_review', reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?`,
      [req.user.id, notes || null, req.params.id]
    );
    createAuditLog(req.user.id, 'MANAGER_MARK_UNDER_REVIEW', 'submissions', String(req.params.id), req.ip);
    return ok(res, { id: Number(req.params.id), status: 'under_review' }, 'Marked under review');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── GET /api/manager/members ──────────────────────────────────────────────────
router.get('/members', async (req, res) => {
  const { page = 1, per_page = 20, q } = req.query;
  const sc = regionScope(req.user);
  const params = [...sc.params];
  let where = `s.status IN ('active','approved')${sc.clause}`;
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.membership_id, s.applicant_name, s.applicant_email,
              s.member_status, s.membership_type, s.expiry_date, s.created_at,
              pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE ${where} ORDER BY s.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── GET /api/manager/reports ──────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const sc = regionScope(req.user);

    const [byPackage] = await pool.query(
      `SELECT pp.name AS package_name, COUNT(s.id) AS count
       FROM fb_submissions s LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status IN ('active','approved')${sc.clause}
       GROUP BY pp.id ORDER BY count DESC LIMIT 10`,
      sc.params);

    const [byStatus] = await pool.query(
      `SELECT s.status, COUNT(*) AS count FROM fb_submissions s
       WHERE s.status != 'draft'${sc.clause} GROUP BY s.status ORDER BY count DESC`,
      sc.params);

    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(s.created_at,'%Y-%m') AS month, COUNT(*) AS count
       FROM fb_submissions s WHERE s.status IN ('active','approved')
         AND s.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)${sc.clause}
       GROUP BY month ORDER BY month`,
      sc.params);

    const [expiring] = await pool.query(
      `SELECT s.id, s.membership_id, s.applicant_name, s.expiry_date,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_left
       FROM fb_submissions s WHERE s.status IN ('active','approved')
         AND s.expiry_date IS NOT NULL AND DATEDIFF(s.expiry_date, CURDATE()) <= 60
         AND s.expiry_date >= CURDATE()${sc.clause}
       ORDER BY s.expiry_date ASC LIMIT 20`,
      sc.params);

    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total_revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified'${sc.clause}`,
      sc.params);

    const [monthly_revenue] = await pool.query(
      `SELECT DATE_FORMAT(p.created_at,'%Y-%m') AS month, COALESCE(SUM(p.amount),0) AS revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)${sc.clause}
       GROUP BY month ORDER BY month`,
      sc.params);

    return ok(res, { byPackage, byStatus, monthly, expiring, total_revenue, monthly_revenue });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;

