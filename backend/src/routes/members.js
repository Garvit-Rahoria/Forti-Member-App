const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');

const router = express.Router();
router.use(authMiddleware);

// Portal members = fb_submissions with status 'approved'
// ─────────────────────────────────────────────────────────

// GET /api/members — list with filters (no HTTP cache — filters must always be fresh)
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');

  const {
    q,
    status,
    member_status,
    membership_type,
    package_id,
    package_name,
    expiring_days,
    wing_id,
    sort_by,
    sort_dir,
    page = 1,
    per_page = 20,
  } = req.query;

  // Default: show active + approved (approved is a transitional state before active)
  let where;
  const params = [];
  if (status && status !== 'all') {
    where = 's.status=?'; params.push(status);
  } else {
    where = "s.status IN ('active','approved')";
  }

  // Branch scoping: branch_manager AND office_staff see only their branch/state
  if (req.user.role === 'branch_manager' || req.user.role === 'office_staff') {
    if (req.user.assigned_branch_id) {
      where += ' AND s.branch_id=?'; params.push(req.user.assigned_branch_id);
    } else if (req.user.assigned_state_id) {
      where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
    }
  }

  if (q) {
    where += ' AND (LOWER(s.applicant_name) LIKE LOWER(?) OR LOWER(s.applicant_email) LIKE LOWER(?) OR LOWER(COALESCE(s.membership_id, \'\')) LIKE LOWER(?))';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (member_status) {
    if (String(member_status).toLowerCase() === 'expired') {
      where += ` AND (
        LOWER(COALESCE(s.member_status, '')) = 'expired'
        OR (s.expiry_date IS NOT NULL AND s.expiry_date < CURDATE())
      )`;
    } else {
      where += ' AND LOWER(COALESCE(s.member_status, \'\'))=LOWER(?)';
      params.push(String(member_status));
    }
  }
  if (membership_type) {
    where += ' AND LOWER(COALESCE(s.membership_type, \'\'))=LOWER(?)';
    params.push(String(membership_type));
  }
  if (package_id !== undefined && package_id !== null && String(package_id).trim() !== '') {
    where += ' AND s.package_id=?';
    params.push(Number(package_id));
  }
  if (package_name) {
    where += ' AND LOWER(COALESCE(pp.name, \'\'))=LOWER(?)';
    params.push(String(package_name));
  }
  if (wing_id !== undefined && wing_id !== null && String(wing_id).trim() !== '') {
    where += ' AND s.wing_id=?';
    params.push(Number(wing_id));
  }
  if (expiring_days) {
    where += ' AND s.expiry_date IS NOT NULL AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= ?';
    params.push(Number(expiring_days));
  }

  const sortKey = String(sort_by || '').toLowerCase();
  const sortDir = String(sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderBy = sortKey === 'name'
    ? `s.applicant_name ${sortDir}, s.id DESC`
    : sortKey === 'expiry'
      ? `s.expiry_date ${sortDir} NULLS LAST, s.id DESC`
      : `s.created_at DESC`;

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
       WHERE ${where} ORDER BY ${orderBy}`,
      params, Number(page), Math.min(100, Math.max(1, Number(per_page) || 20))
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/members/filter-options — distinct values actually used by members
router.get('/filter-options', async (req, res) => {
  try {
    const baseWhere = "s.status IN ('active','approved')";
    const params = [];
    let scope = '';
    if (req.user.role === 'branch_manager' || req.user.role === 'office_staff') {
      if (req.user.assigned_branch_id) {
        scope = ' AND s.branch_id=?';
        params.push(req.user.assigned_branch_id);
      } else if (req.user.assigned_state_id) {
        scope = ' AND s.state_id=?';
        params.push(req.user.assigned_state_id);
      }
    }
    const where = `${baseWhere}${scope}`;

    const [packages] = await pool.query(
      `SELECT s.package_id AS id,
              COALESCE(NULLIF(pp.name, ''), CONCAT('Package #', s.package_id)) AS name,
              pp.membership_type,
              COUNT(*)::int AS member_count
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE ${where} AND s.package_id IS NOT NULL
       GROUP BY s.package_id, pp.name, pp.membership_type
       ORDER BY name ASC`,
      params
    );

    const [wings] = await pool.query(
      `SELECT s.wing_id AS id,
              COALESCE(NULLIF(pw.name, ''), CONCAT('Wing #', s.wing_id)) AS name,
              COUNT(*)::int AS member_count
       FROM fb_submissions s
       LEFT JOIN portal_wings pw ON pw.id = s.wing_id
       WHERE ${where} AND s.wing_id IS NOT NULL
       GROUP BY s.wing_id, pw.name
       ORDER BY name ASC`,
      params
    );

    const [types] = await pool.query(
      `SELECT LOWER(s.membership_type) AS value, COUNT(*)::int AS member_count
       FROM fb_submissions s
       WHERE ${where} AND s.membership_type IS NOT NULL AND TRIM(s.membership_type) <> ''
       GROUP BY LOWER(s.membership_type)
       ORDER BY value ASC`,
      params
    );

    const [statuses] = await pool.query(
      `SELECT LOWER(s.member_status) AS value, COUNT(*)::int AS member_count
       FROM fb_submissions s
       WHERE ${where} AND s.member_status IS NOT NULL AND TRIM(s.member_status) <> ''
       GROUP BY LOWER(s.member_status)
       ORDER BY value ASC`,
      params
    );

    return ok(res, {
      packages: packages || [],
      wings: wings || [],
      types: (types || []).map(t => ({
        value: t.value,
        label: t.value === 'corporate' ? 'Corporate' : t.value === 'individual' ? 'Individual' : t.value,
        member_count: t.member_count,
      })),
      statuses: (statuses || []).map(s => ({
        value: s.value,
        label: String(s.value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        member_count: s.member_count,
      })),
    });
  } catch (err) {
    console.error('[members/filter-options]', err);
    return fail(res, 'Server error', 500);
  }
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
      `SELECT s.*, f.name AS form_name, f.form_type, pw.name AS wing_name,
              pp.name AS package_name, pp.duration AS package_duration
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       LEFT JOIN portal_wings pw ON pw.id=s.wing_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.id=?`, [req.params.id]
    );
    if (!member) return fail(res, 'Member not found', 404);

    const [memberAccounts] = await pool.query(
      `SELECT id, email, phone, full_name, role, is_active, last_login
       FROM member_accounts WHERE submission_id = ?`, [member.id]
    );
    member.accounts = memberAccounts;

    const [fields] = await pool.query(
      `SELECT sd.field_key, sd.value, sd.file_path, fld.label, fld.field_type
       FROM fb_submission_data sd LEFT JOIN fb_fields fld ON fld.id=sd.field_id
       WHERE sd.submission_id=?`, [member.id]
    );
    member.field_data = fields.filter(f => !f.file_path);

    const [[profile]] = await pool.query(
      'SELECT * FROM member_public_profiles WHERE submission_id = ?', [member.id]
    );
    const [links] = await pool.query(
      'SELECT * FROM member_profile_links WHERE submission_id = ? ORDER BY sort_order, id', [member.id]
    );

    const [paymentHistory] = await pool.query(
      `SELECT pp.id, pp.uuid, pp.transaction_id, pp.amount, pp.status,
              pp.created_at AS payment_date, pp.currency, pp.screenshot_path,
              pp.verified_at, pp.notes AS payment_notes,
              pm.name AS method_name,
              u.full_name AS verified_by_name
       FROM portal_payments pp
       LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
       LEFT JOIN portal_admin_users u ON u.id = pp.verified_by
       WHERE pp.submission_id = ?
       ORDER BY pp.created_at DESC`, [member.id]
    );

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

    let positionHistory = [];
    try {
      const { getPositionHistory } = require('../utils/memberOrg');
      positionHistory = await getPositionHistory(member.id);
    } catch (e) {
      console.error('[full positions]', e.message);
    }

    let activity = [];
    try {
      const [rows] = await pool.query(
        `SELECT a.id, a.event_type, a.notes, a.acted_by, a.created_at,
                u.full_name AS acted_by_name
         FROM application_activity a
         LEFT JOIN portal_admin_users u ON u.id = a.acted_by
         WHERE a.submission_id = ?
         ORDER BY a.created_at ASC, a.id ASC`,
        [member.id]
      );
      activity = [
        {
          event_type: 'application_submitted',
          notes: null,
          acted_by_name: member.applicant_name || 'Applicant',
          created_at: member.submitted_at || member.created_at,
        },
        ...rows,
      ];
    } catch (e) {
      console.error('[full activity]', e.message);
    }

    let notes = [];
    try {
      const [noteRows] = await pool.query(
        `SELECT an.id, an.note, an.created_at, an.created_by, u.full_name AS author_name
         FROM application_notes an
         LEFT JOIN portal_admin_users u ON u.id = an.created_by
         WHERE an.submission_id = ?
         ORDER BY an.created_at DESC`,
        [member.id]
      );
      notes = noteRows;
    } catch (e) {
      console.error('[full notes]', e.message);
    }

    const certificate = {
      available: !!(member.cert_generated || member.certificate_pdf),
      cert_generated: !!member.cert_generated,
      certificate_pdf: member.certificate_pdf || null,
      card_generated: !!member.card_generated,
      id_card_pdf: member.id_card_pdf || null,
      membership_id: member.membership_id || null,
      issue_date: member.submitted_at || member.created_at || null,
    };

    return ok(res, {
      member,
      profile: profile || null,
      links,
      paymentHistory,
      renewalHistory,
      positionHistory,
      activity,
      notes,
      certificate,
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/members/:id/notes
router.get('/:id/notes', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT an.id, an.note, an.created_at, an.created_by, u.full_name AS author_name
       FROM application_notes an
       LEFT JOIN portal_admin_users u ON u.id = an.created_by
       WHERE an.submission_id = ?
       ORDER BY an.created_at DESC`,
      [req.params.id]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/members/:id/notes
router.post('/:id/notes', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  const note = String(req.body?.note || '').trim();
  if (!note) return fail(res, 'Note is required', 422);
  try {
    const [[member]] = await pool.query('SELECT id FROM fb_submissions WHERE id=?', [req.params.id]);
    if (!member) return fail(res, 'Member not found', 404);
    await pool.query(
      'INSERT INTO application_notes (submission_id, created_by, note) VALUES (?,?,?)',
      [req.params.id, req.user.id, note]
    );
    const [[row]] = await pool.query(
      `SELECT an.id, an.note, an.created_at, an.created_by, u.full_name AS author_name
       FROM application_notes an
       LEFT JOIN portal_admin_users u ON u.id = an.created_by
       WHERE an.submission_id = ?
       ORDER BY an.id DESC LIMIT 1`,
      [req.params.id]
    );
    return ok(res, row, 'Note added');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PATCH /api/members/:id/status
router.patch('/:id/status', requireRole('super_admin', 'admin'), async (req, res) => {
  const { status, reason, note } = req.body;
  const valid = ['active', 'suspended', 'inactive', 'cancelled'];
  if (!valid.includes(status)) return fail(res, 'Invalid status. Must be: active, suspended, inactive, or cancelled', 422);

  if (status === 'cancelled' && !reason?.trim()) {
    return fail(res, 'Cancellation reason is required', 422);
  }

  try {
    if (status === 'suspended') {
      await pool.query(
        `UPDATE fb_submissions SET member_status=?, suspension_reason=?, suspended_by=?, suspended_at=NOW() WHERE id=?`,
        [status, reason || null, req.user.id, req.params.id]
      );
    } else if (status === 'cancelled') {
      await pool.query(
        `UPDATE fb_submissions
         SET member_status=?, suspension_reason=?, suspended_by=?, suspended_at=NOW()
         WHERE id=?`,
        ['cancelled', reason.trim(), req.user.id, req.params.id]
      );
      // Also deactivate the member_account so portal access is removed
      await pool.query(
        `UPDATE member_accounts SET is_active=FALSE WHERE submission_id=?`,
        [req.params.id]
      );
      // End any active positions
      const { endPositionsOnMembershipExpiry } = require('../utils/memberOrg');
      await endPositionsOnMembershipExpiry(req.params.id);
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

// PUT /api/members/:id
router.put('/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const id = req.params.id;
  const {
    applicant_name,
    applicant_email,
    applicant_phone,
    membership_id,
    organisation_name,
    wing_id,
    package_id,
    plan_type,
    membership_type,
    member_status,
    expiry_date
  } = req.body;

  try {
    const [[member]] = await pool.query('SELECT * FROM fb_submissions WHERE id=?', [id]);
    if (!member) return fail(res, 'Member not found', 404);

    let parsedData = {};
    try {
      parsedData = typeof member.data === 'string' ? JSON.parse(member.data) : (member.data || {});
    } catch (e) {
      parsedData = {};
    }

    if (organisation_name !== undefined) {
      if ('organisation_name' in parsedData) {
        parsedData.organisation_name = organisation_name;
      } else if ('organization_name' in parsedData) {
        parsedData.organization_name = organisation_name;
      } else if ('company_name' in parsedData) {
        parsedData.company_name = organisation_name;
      } else {
        parsedData.organisation_name = organisation_name;
      }
      
      // Also update fb_submission_data directly for easy reporting
      await pool.query(
        "UPDATE fb_submission_data SET value = ? WHERE submission_id = ? AND field_key IN ('organisation_name', 'organization_name', 'company_name')",
        [organisation_name, id]
      );
    }

    await pool.query(
      `UPDATE fb_submissions 
       SET applicant_name=?, applicant_email=?, applicant_phone=?, 
           membership_id=?, wing_id=?, package_id=?, plan_type=?, 
           membership_type=?, member_status=?, expiry_date=?,
           data=?, updated_at=NOW()
       WHERE id=?`,
      [
        applicant_name || member.applicant_name,
        applicant_email || member.applicant_email,
        applicant_phone || member.applicant_phone,
        membership_id || member.membership_id,
        wing_id || member.wing_id,
        package_id || member.package_id,
        plan_type || member.plan_type,
        membership_type || member.membership_type,
        member_status || member.member_status,
        expiry_date || member.expiry_date,
        JSON.stringify(parsedData),
        id
      ]
    );

    await pool.query(
      `UPDATE member_accounts 
       SET full_name=?, email=?, phone=?
       WHERE submission_id=?`,
      [
        applicant_name || member.applicant_name,
        applicant_email || member.applicant_email,
        applicant_phone || member.applicant_phone,
        id
      ]
    );

    return ok(res, null, 'Member updated successfully');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;

