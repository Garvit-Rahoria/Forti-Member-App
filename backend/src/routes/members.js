const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// Portal members = fb_submissions with status 'approved'
// ─────────────────────────────────────────────────────────

// GET /api/members
router.get('/', async (req, res) => {
  const { q, status, member_status, expiring_days, wing_id, page = 1, per_page = 20 } = req.query;

  // Default: show active + approved (approved is a transitional state before active)
  let where;
  const params = [];
  if (status && status !== 'all') {
    where = 's.status=?'; params.push(status);
  } else {
    where = "s.status IN ('active','approved')";
  }

  // Branch scoping: branch_manager AND office_staff see only their state
  if (
    (req.user.role === 'branch_manager' || req.user.role === 'office_staff') &&
    req.user.assigned_state_id
  ) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }

  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (member_status) { where += ' AND s.member_status=?'; params.push(member_status); }
  if (wing_id) { where += ' AND s.wing_id=?'; params.push(wing_id); }
  if (expiring_days) {
    where += ' AND s.expiry_date IS NOT NULL AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= ?';
    params.push(Number(expiring_days));
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.membership_id, s.applicant_name, s.applicant_email,
              s.applicant_phone, s.status, s.member_status, s.membership_type, s.expiry_date,
              s.package_id, s.plan_type, s.wing_id, s.submitted_at, s.created_at, s.position,
              f.name AS form_name, f.form_type,
              pp.name AS package_name,
              pw.name AS wing_name,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_to_expiry,
              COALESCE(
                NULLIF(org.value, ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.organisation_name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.organization_name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.company_name')), '')
              ) AS organisation_name,
              COALESCE(
                NULLIF(org.value, ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.organisation_name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.organization_name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.data, '$.company_name')), '')
              ) AS organization_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN portal_wings pw ON pw.id=s.wing_id
       LEFT JOIN fb_submission_data org ON org.submission_id=s.id AND org.field_key='organisation_name'
       WHERE ${where} ORDER BY s.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/members/:id
router.get('/:id', async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT s.*, f.name AS form_name, f.form_type
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       WHERE s.id=?`, [req.params.id]
    );
    if (!member) return fail(res, 'Member not found', 404);
    const [fields] = await pool.query(
      `SELECT sd.field_key, sd.value, sd.file_path, fld.label, fld.field_type
       FROM fb_submission_data sd LEFT JOIN fb_fields fld ON fld.id=sd.field_id
       WHERE sd.submission_id=?`, [req.params.id]
    );
    member.field_data = fields;
    return ok(res, member);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/members/:id/full
router.get('/:id/full', async (req, res) => {
  try {
    const [[member]] = await pool.query(
      `SELECT s.*, f.name AS form_name, f.form_type, pw.name AS wing_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       LEFT JOIN portal_wings pw ON pw.id=s.wing_id
       WHERE s.id=?`, [req.params.id]
    );
    if (!member) return fail(res, 'Member not found', 404);
    
    // Member Accounts
    const [memberAccounts] = await pool.query(
      `SELECT id, email, phone, full_name, role, is_active, last_login 
       FROM member_accounts WHERE submission_id = ?`, [member.id]
    );
    member.accounts = memberAccounts;

    // Field Data (without file_path for document hiding)
    const [fields] = await pool.query(
      `SELECT sd.field_key, sd.value, sd.file_path, fld.label, fld.field_type
       FROM fb_submission_data sd LEFT JOIN fb_fields fld ON fld.id=sd.field_id
       WHERE sd.submission_id=?`, [member.id]
    );
    member.field_data = fields.filter(f => !f.file_path);

    // Public Profile
    const [[profile]] = await pool.query(
      'SELECT * FROM member_public_profiles WHERE submission_id = ?', [member.id]
    );
    const [links] = await pool.query(
      'SELECT * FROM member_profile_links WHERE submission_id = ? ORDER BY sort_order, id', [member.id]
    );

    // Payment History
    const [paymentHistory] = await pool.query(
      `SELECT pp.id, pp.uuid, pp.transaction_id, pp.amount, pp.status,
              pp.created_at AS payment_date, pp.currency, pp.screenshot_path,
              pm.name AS method_name
       FROM portal_payments pp
       LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
       WHERE pp.submission_id = ?
       ORDER BY pp.created_at DESC`, [member.id]
    );

    // Renewal History
    const [renewalHistory] = await pool.query(
      `SELECT r.id, r.uuid, r.status, r.amount, r.currency, r.transaction_id,
              r.old_expiry_date, r.new_expiry_date, r.created_at, r.notes, r.screenshot_path,
              p.name AS package_name, pm.name AS payment_method_name
       FROM portal_renewals r
       LEFT JOIN portal_packages p ON p.id = r.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id = r.payment_method_id
       WHERE r.submission_id = ?
       ORDER BY r.created_at DESC`, [member.id]
    );

    // Org Positions (currently unsupported)
    const positionHistory = [];

    return ok(res, {
      member,
      profile,
      links,
      paymentHistory,
      renewalHistory,
      positionHistory
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PATCH /api/members/:id/status
router.patch('/:id/status', requireRole('super_admin', 'admin'), async (req, res) => {
  const { status, reason } = req.body;
  const valid = ['active', 'suspended', 'inactive'];
  if (!valid.includes(status)) return fail(res, 'Invalid status. Must be: active, suspended, or inactive', 422);
  try {
    if (status === 'suspended') {
      await pool.query(
        `UPDATE fb_submissions SET member_status=?, suspension_reason=?, suspended_by=?, suspended_at=NOW() WHERE id=?`,
        [status, reason || null, req.user.id, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE fb_submissions SET member_status=?, suspension_reason=NULL, suspended_by=NULL, suspended_at=NULL WHERE id=?',
        [status, req.params.id]
      );
    }
    if (status === 'inactive') {
      const { endPositionsOnMembershipExpiry } = require('../utils/memberOrg');
      await endPositionsOnMembershipExpiry(req.params.id);
    }
    return ok(res, null, `Member status updated to ${status}`);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/members/:id/submissions
router.get('/:id/submissions', async (req, res) => {
  try {
    const [[sub]] = await pool.query(
      'SELECT applicant_uuid, applicant_email FROM fb_submissions WHERE id=?', [req.params.id]
    );
    if (!sub) return fail(res, 'Member not found', 404);
    const [rows] = await pool.query(
      `SELECT s.*, f.name AS form_name FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       WHERE s.applicant_uuid=? OR s.applicant_email=?
       ORDER BY s.created_at DESC`,
      [sub.applicant_uuid || '', sub.applicant_email || '']
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

router.use('/:id/org', require('./member-org'));

// DELETE /api/members/:id
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_submissions WHERE id=?', [req.params.id]);
    return ok(res, null, 'Record deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/members/:id/position
router.patch('/:id/position', requireRole('super_admin', 'admin'), async (req, res) => {
  const { position } = req.body;
  if (!position) return fail(res, 'Position is required', 422);

  try {
    const [[member]] = await pool.query('SELECT id FROM fb_submissions WHERE id=?', [req.params.id]);
    if (!member) return fail(res, 'Member not found', 404);

    await pool.query('UPDATE fb_submissions SET position = ?, updated_at = NOW() WHERE id=?', [position, req.params.id]);
    
    return ok(res, null, 'Position successfully updated');
  } catch (err) { 
    console.error(err); 
    return fail(res, 'Server error', 500); 
  }
});

module.exports = router;

