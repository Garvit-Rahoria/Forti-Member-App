const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const { sendApplicationApproved, sendApplicationRejected, sendMembershipConfirmed } = require('../utils/email');
const { sendTemplatedEmail } = require('../utils/emailTemplates');
const { sendMail } = require('../utils/email');

const router = express.Router();

// Public: start/get form submission (user side – no JWT required but needs user_uuid or applicant_id)
// Admin: list/manage submissions requires JWT

// ──────── Public endpoints ────────────────────────────────────────────────────

// POST /api/submissions  Start or update a draft
//   Body: { form_id, applicant_uuid?, current_step, data: { field_key: value } }
router.post('/', upload.any(), async (req, res) => {
  const { form_id, applicant_uuid, submission_uuid, current_step, data = {} } = req.body;
  if (!form_id) return fail(res, 'form_id required', 422);

  try {
    let subId;
    if (submission_uuid) {
      const [[sub]] = await pool.query(
        'SELECT id FROM fb_submissions WHERE uuid = ? AND form_id = ?',
        [submission_uuid, form_id]
      );
      if (!sub) return fail(res, 'Submission not found', 404);
      if (sub.status === 'submitted') return fail(res, 'Already submitted', 409);
      await pool.query(
        'UPDATE fb_submissions SET current_step=?, updated_at=NOW() WHERE id=?',
        [current_step || 1, sub.id]
      );
      subId = sub.id;
    } else {
      const uuid = require('crypto').randomUUID();
      const [r] = await pool.query(
        `INSERT INTO fb_submissions (uuid, form_id, applicant_uuid, status, current_step, ip_address)
         VALUES (?,?,?,'draft',?,?)`,
        [uuid, form_id, applicant_uuid || null, current_step || 1, req.ip]
      );
      subId = r.insertId;
    }

    // Get field mapping (id by field_key)
    const [fields] = await pool.query(
      'SELECT id, field_key FROM fb_fields WHERE form_id = ? AND is_active = 1', [form_id]
    );
    const fieldMap = {};
    for (const f of fields) fieldMap[f.field_key] = f.id;

    // Handle uploaded files
    const uploads = {};
    if (req.files && req.files.length) {
      for (const file of req.files) {
        uploads[file.fieldname] = file.path.replace(/\\/g, '/');
      }
    }

    // Upsert field values
    const allData = { ...data, ...uploads };
    for (const [key, val] of Object.entries(allData)) {
      const fieldId = fieldMap[key];
      if (!fieldId) continue;
      const isFile = uploads[key] !== undefined;

      await pool.query(
        `INSERT INTO fb_submission_data (submission_id, field_id, field_key, value, file_path, updated_at)
         VALUES (?,?,?,?,?,NOW())
         ON CONFLICT (submission_id, field_id) DO UPDATE
           SET value = EXCLUDED.value,
               file_path = COALESCE(EXCLUDED.file_path, fb_submission_data.file_path),
               updated_at = NOW()`,
        [subId, fieldId, key, isFile ? null : String(val), isFile ? val : null]
      );
    }

    const [[row]] = await pool.query('SELECT uuid FROM fb_submissions WHERE id = ?', [subId]);
    return ok(res, { submission_uuid: row.uuid }, 'Saved', 200);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/submissions/:uuid/submit  Final submit
router.post('/:uuid/submit', async (req, res) => {
  try {
    const [[sub]] = await pool.query('SELECT * FROM fb_submissions WHERE uuid = ?', [req.params.uuid]);
    if (!sub) return fail(res, 'Not found', 404);
    if (sub.status !== 'draft') return fail(res, 'Already submitted', 409);

    await pool.query(
      `UPDATE fb_submissions SET status='submitted', submitted_at=NOW() WHERE id=?`,
      [sub.id]
    );

    // Create provisional member_accounts entry (is_active=0) pinned to THIS submission only.
    let memberId = null;
    let memberUuid = null;
    try {
      const { v4: uuidv4 } = require('uuid');
      const [[existing]] = await pool.query(
        'SELECT id, uuid FROM member_accounts WHERE submission_id=? LIMIT 1',
        [sub.id]
      );
      if (existing) {
        memberId = existing.id;
        memberUuid = existing.uuid;
      } else {
        memberUuid = uuidv4();
        const [ins] = await pool.query(
          `INSERT INTO member_accounts (uuid, submission_id, email, full_name, phone, is_active)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [memberUuid, sub.id, sub.applicant_email, sub.applicant_name, sub.applicant_phone || null]
        );
        memberId = ins.insertId;
      }
    } catch (e) {
      console.error('[submit: member_accounts upsert]', e.message);
    }

    return ok(res, {
      submission_uuid: sub.uuid,
      email: sub.applicant_email,
      applicationId: sub.membership_id || null,
      membership_id: sub.membership_id || null,
      membershipStatus: 'submitted',
      member: memberId ? {
        id: memberId,
        uuid: memberUuid,
        email: sub.applicant_email,
        full_name: sub.applicant_name,
        membership_id: sub.membership_id || null,
        submission_id: sub.id,
      } : null,
    }, 'Application submitted successfully');
  } catch (err) { console.error('[submit]', err); return fail(res, 'Server error', 500); }
});

// GET /api/submissions/:uuid  Fetch submission with all data
router.get('/:uuid', async (req, res) => {
  try {
    const [[sub]] = await pool.query('SELECT * FROM fb_submissions WHERE uuid = ?', [req.params.uuid]);
    if (!sub) return fail(res, 'Not found', 404);
    const [data] = await pool.query(
      'SELECT * FROM fb_submission_data WHERE submission_id = ?', [sub.id]
    );
    sub.data = {};
    for (const d of data) {
      sub.data[d.field_key] = d.file_path || d.value;
    }
    return ok(res, sub);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/submissions/:uuid/payment  Upload payment proof for an existing submission
// PUBLIC — no auth required; identified by submission uuid
// Body (multipart): method_id, transaction_id, amount
// File: payment_screenshot (required)
router.post('/:uuid/payment', upload.single('payment_screenshot'), async (req, res) => {
  const { method_id, transaction_id, amount } = req.body;
  if (!req.file)        return fail(res, 'payment_screenshot file is required', 422);
  if (!transaction_id)  return fail(res, 'transaction_id is required', 422);

  try {
    const [[sub]] = await pool.query(
      'SELECT * FROM fb_submissions WHERE uuid=? AND status NOT IN (?,?,?)',
      [req.params.uuid, 'approved', 'active', 'rejected']
    );
    if (!sub) return fail(res, 'Submission not found or cannot upload payment at this stage', 404);

    const screenshotPath = `/uploads/payments/${req.file.filename}`;
    const payUuid        = require('crypto').randomUUID();
    const payAmount      = amount ? Number(amount) : 0;

    // Upsert: if a pending payment already exists for this submission, update it
    const [[existing]] = await pool.query(
      "SELECT id FROM portal_payments WHERE submission_id=? AND status='pending' ORDER BY id DESC LIMIT 1",
      [sub.id]
    );
    if (existing) {
      await pool.query(
        'UPDATE portal_payments SET method_id=?, transaction_id=?, screenshot_path=?, amount=?, status=? WHERE id=?',
        [method_id || null, transaction_id, screenshotPath, payAmount, 'pending', existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO portal_payments (uuid, submission_id, method_id, transaction_id, screenshot_path, amount, status)
         VALUES (?,?,?,?,?,?,'pending')`,
        [payUuid, sub.id, method_id || null, transaction_id, screenshotPath, payAmount]
      );
    }

    // Advance submission status to payment_submitted
    await pool.query(
      "UPDATE fb_submissions SET status='payment_submitted' WHERE id=?",
      [sub.id]
    );

    return ok(res, { submission_uuid: req.params.uuid }, 'Payment proof uploaded. Awaiting verification.');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// ──────── Admin endpoints (require JWT) ──────────────────────────────────────
router.use(authMiddleware);

// GET /api/submissions  List all (admin)
router.get('/', async (req, res) => {
  const { form_id, status, q, page = 1, per_page = 20 } = req.query;

  let where = '1=1';
  const params = [];

  // Branch-level scoping: branch_manager AND office_staff see only their state
  if (
    (req.user.role === 'branch_manager' || req.user.role === 'office_staff') &&
    req.user.assigned_state_id
  ) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }

  if (form_id) { where += ' AND s.form_id=?'; params.push(form_id); }
  if (status)  { where += ' AND s.status=?';  params.push(status); }
  if (q) {
    where += ' AND (s.uuid LIKE ? OR s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.form_id, s.status, s.submitted_at, s.created_at,
              s.applicant_name, s.applicant_email, s.applicant_phone, s.membership_id, s.ip_address,
              f.name AS form_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id = s.form_id
       WHERE ${where}
       ORDER BY s.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/submissions/detail/:id  Full detail (admin) - structured section/field view
router.get('/detail/:id', async (req, res) => {
  try {
    const [[sub]] = await pool.query(
      `SELECT s.*, f.name AS form_name FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id WHERE s.id=?`,
      [req.params.id]
    );
    if (!sub) return fail(res, 'Not found', 404);

    // Parse JSON data blob
    if (sub.data && typeof sub.data === 'string') {
      try { sub.data = JSON.parse(sub.data); } catch {}
    }

    // ── Try Form Builder submission data (fb_submission_data) first ───────
    let rawEntries = [];
    try {
      [rawEntries] = await pool.query(
        `SELECT sd.id, sd.field_key, sd.value, sd.file_path,
                fld.label, fld.field_type, fld.field_order,
                sec.id AS section_id, sec.title AS section_title, sec.section_order
         FROM fb_submission_data sd
         LEFT JOIN fb_fields fld ON fld.id = sd.field_id
         LEFT JOIN fb_sections sec ON sec.id = fld.section_id
         WHERE sd.submission_id = ?
         ORDER BY sec.section_order, fld.field_order`,
        [sub.id]
      );
    } catch (sdErr) {
      // Fallback: fetch without section join if schema differs
      try {
        [rawEntries] = await pool.query(
          `SELECT sd.id, sd.field_key, sd.value, sd.file_path,
                  fld.label, fld.field_type
           FROM fb_submission_data sd
           LEFT JOIN fb_fields fld ON fld.id = sd.field_id
           WHERE sd.submission_id = ?`,
          [sub.id]
        );
      } catch (sdErr2) { console.error('[submission_data fetch]', sdErr2.message); }
    }

    if (rawEntries.length > 0) {
      // Group by section
      const sectionMap = new Map();
      for (const e of rawEntries) {
        const key  = e.section_id   || '__general__';
        const title = e.section_title || 'General';
        if (!sectionMap.has(key)) sectionMap.set(key, { title, fields: [] });
        sectionMap.get(key).fields.push({
          label:     e.label || e.field_key,
          value:     e.file_path || e.value,
          type:      e.field_type || 'text',
          field_key: e.field_key,
          file_path: e.file_path || null,
        });
      }
      sub.sections = Array.from(sectionMap.values());

    } else if (sub.data && typeof sub.data === 'object') {
      // ── Membership application: construct sections from JSON data blob ──
      const d = sub.data;

      // Resolve location type label
      const LOC_LABELS = { rajasthan: 'Rajasthan', other_states: 'Other States (India)', overseas: 'Overseas (International)' };

      const field = (label, value, type = 'text', file_path = null) =>
        value != null && value !== '' ? { label, value, type, file_path } : null;

      const personalFields = [
        field('Full Name',         sub.applicant_name),
        field('Email',             sub.applicant_email, 'email'),
        field('Phone',             sub.applicant_phone, 'tel'),
        field('Gender',            d.gender),
        field('Aadhaar Number',    d.aadhaar_number),
        field('Organisation',      d.organisation_name),
        (() => {
          const links = Array.isArray(d.social_links) ? d.social_links.filter(l => l?.url) : [];
          return links.length ? field('Social Links', links.map(l => `${l.platform}: ${l.url}`).join('\n')) : null;
        })(),
        field('Profile Photo',     d.profile_photo, 'file', d.profile_photo),
      ].filter(Boolean);

      const locationFields = [
        field('Location Type', d.location_type ? (LOC_LABELS[d.location_type] || d.location_type) : null),
      ].filter(Boolean);

      const membershipFields = [
        field('Membership Type', d.membership_type ? (d.membership_type.charAt(0).toUpperCase() + d.membership_type.slice(1)) : null),
        field('Plan Duration',   d.plan_type       ? (d.plan_type.charAt(0).toUpperCase() + d.plan_type.slice(1)) : null),
      ].filter(Boolean);

      const paymentFields = [
        field('Transaction ID', d.transaction_id),
        field('Payment Screenshot', d.payment_screenshot, 'file', d.payment_screenshot),
      ].filter(Boolean);

      sub.sections = [
        personalFields.length   ? { title: 'Personal Details',  fields: personalFields }   : null,
        locationFields.length   ? { title: 'Location Details',  fields: locationFields }   : null,
        membershipFields.length ? { title: 'Membership Details', fields: membershipFields } : null,
        paymentFields.length    ? { title: 'Payment Details',   fields: paymentFields }     : null,
      ].filter(Boolean);
    } else {
      // ── Fallback: construct sections from submission metadata columns ──
      const field = (label, value, type = 'text', file_path = null) =>
        value != null && value !== '' ? { label, value, type, file_path } : null;

      const personalFields = [
        field('Full Name', sub.applicant_name),
        field('Email', sub.applicant_email, 'email'),
        field('Phone', sub.applicant_phone, 'tel'),
      ].filter(Boolean);

      const membershipFields = [
        field('Membership Type', sub.membership_type ? (sub.membership_type.charAt(0).toUpperCase() + sub.membership_type.slice(1)) : null),
        field('Plan Duration', sub.plan_type ? (sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1)) : null),
      ].filter(Boolean);

      sub.sections = [
        personalFields.length ? { title: 'Personal Details', fields: personalFields } : null,
        membershipFields.length ? { title: 'Membership Details', fields: membershipFields } : null,
      ].filter(Boolean);
    }

    // ── Fetch package ──────────────────────────────────────────────────────
    const pkgId = sub.data?.package_id || sub.package_id;
    if (pkgId) {
      try {
        const [[pkg]] = await pool.query(
          `SELECT p.*, c.name AS country_name, st.name AS state_name
           FROM portal_packages p
           LEFT JOIN countries c  ON c.id  = p.country_id
           LEFT JOIN states st    ON st.id = p.state_id
           WHERE p.id = ?`,
          [pkgId]
        );
        if (pkg) {
          if (pkg.benefits && typeof pkg.benefits === 'string') {
            try { pkg.benefits = JSON.parse(pkg.benefits); } catch {}
          }
          sub.package = pkg;
        }
      } catch (pkgErr) {
        // Fallback: fetch package without location joins
        try {
          const [[pkg]] = await pool.query('SELECT * FROM portal_packages WHERE id=?', [pkgId]);
          if (pkg) {
            if (pkg.benefits && typeof pkg.benefits === 'string') {
              try { pkg.benefits = JSON.parse(pkg.benefits); } catch {}
            }
            sub.package = pkg;
          }
        } catch (pkgErr2) { console.error('[pkg fetch]', pkgErr2.message); }
      }
    }

    // ── Fetch payment record ───────────────────────────────────────────────
    try {
      const [[payment]] = await pool.query(
        `SELECT pp.*, pm.name AS method_name, pm.type AS method_type, pm.instructions
         FROM portal_payments pp
         LEFT JOIN portal_payment_methods pm ON pm.id = pp.method_id
         WHERE pp.submission_id = ? LIMIT 1`,
        [sub.id]
      );
      if (payment) sub.payment = payment;
    } catch (payErr) { console.error('[payment fetch]', payErr.message); }

    return ok(res, sub);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PATCH /api/submissions/:id/status  Admin: change status (full approval workflow)
router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const allowed = [
    'under_review', 'approved', 'rejected', 'submitted', 'draft',
    'payment_pending', 'payment_submitted', 'payment_verified', 'active', 'expired',
  ];
  if (!allowed.includes(status)) return fail(res, 'Invalid status', 422);

  try {
    // Fetch current submission
    const [[sub]] = await pool.query('SELECT * FROM fb_submissions WHERE id=?', [req.params.id]);
    if (!sub) return fail(res, 'Not found', 404);

    // Base status update
    await pool.query(
      'UPDATE fb_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?',
      [status, req.user.id, notes || null, req.params.id]
    );

    // ── APPROVE: generate membership ID, create member account, send emails ──
    if (status === 'approved') {
      // Generate membership ID if not already assigned
      let membershipId = sub.membership_id;
      if (!membershipId) {
        const [[{ cnt }]] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
        );
        membershipId = `FORTI${String(cnt + 1).padStart(4, '0')}`;
        await pool.query(
          'UPDATE fb_submissions SET membership_id=?, approved_at=NOW(), member_status=? WHERE id=?',
          [membershipId, 'active', req.params.id]
        );
      } else {
        await pool.query(
          "UPDATE fb_submissions SET approved_at=COALESCE(approved_at,NOW()), member_status='active' WHERE id=?",
          [req.params.id]
        );
      }

      // Create member_account entry if not already present
      const [existing] = await pool.query(
        'SELECT id FROM member_accounts WHERE submission_id=? LIMIT 1', [req.params.id]
      );
      if (!existing.length) {
        const { v4: uuidv4 } = require('uuid');
        // Calculate expiry based on plan_type or package duration_months
        let expiryDate = null;
        if (sub.package_id) {
          try {
            const [[pkgForExpiry]] = await pool.query('SELECT duration_months FROM portal_packages WHERE id=?', [sub.package_id]);
            if (pkgForExpiry?.duration_months && pkgForExpiry.duration_months < 999) {
              const d = new Date(); d.setMonth(d.getMonth() + pkgForExpiry.duration_months);
              expiryDate = d.toISOString().split('T')[0];
            }
          } catch {}
        } else if (sub.plan_type === 'yearly' || sub.plan_type === '1year') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          expiryDate = d.toISOString().split('T')[0];
        } else if (sub.plan_type === '3years' || sub.plan_type === '3_years') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 3);
          expiryDate = d.toISOString().split('T')[0];
        }
        await pool.query(
          `INSERT INTO member_accounts
             (uuid, submission_id, email, full_name, phone, membership_id,
              plan_type, membership_type, expiry_date, package_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), req.params.id, sub.applicant_email, sub.applicant_name,
           sub.applicant_phone || null, membershipId,
           sub.plan_type || null, sub.membership_type || null, expiryDate,
           sub.package_id || null]
        ).catch(e => console.error('[member_account create]', e.message));
      } else {
        // Update membership_id and package info on existing account
        await pool.query(
          `UPDATE member_accounts
             SET membership_id=?, plan_type=COALESCE(plan_type,?),
                 membership_type=COALESCE(membership_type,?),
                 package_id=COALESCE(package_id,?)
           WHERE submission_id=?`,
          [membershipId, sub.plan_type || null, sub.membership_type || null,
           sub.package_id || null, req.params.id]
        );
      }

      if (sub.wing_id) {
        try {
          const { assignWing, getCurrentWing } = require('../utils/memberOrg');
          const current = await getCurrentWing(req.params.id);
          if (!current || current.id !== sub.wing_id) {
            await assignWing({
              submissionId: Number(req.params.id),
              wingId: sub.wing_id,
              assignedBy: req.user.id,
              notes: 'Confirmed on approval',
            });
          }
        } catch (e) {
          console.error('[wing assign on approve]', e.message);
        }
      }

      // Auto-generate invoice for this approval
      try {
        const [[pkgRow]] = await pool.query(
          `SELECT pp.name AS package_name, pp.price, pp.currency
           FROM portal_packages pp WHERE pp.id=?`,
          [sub.package_id]
        );
        if (pkgRow) {
          const [[existingInv]] = await pool.query(
            "SELECT id FROM invoices WHERE submission_id=? AND invoice_type='membership' LIMIT 1",
            [req.params.id]
          );
          if (!existingInv) {
            const invoiceNum = `INV-${membershipId}-${Date.now()}`;
            await pool.query(
              `INSERT INTO invoices
                 (invoice_number, submission_id, invoice_type, member_name, member_email,
                  member_id_str, package_name, amount, tax_amount, total_amount, currency)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [
                invoiceNum, req.params.id, 'membership',
                sub.applicant_name, sub.applicant_email, membershipId,
                pkgRow.package_name || '', pkgRow.price || 0, 0, pkgRow.price || 0,
                pkgRow.currency || 'INR',
              ]
            );
          }
        }
      } catch (e) { console.error('[auto-invoice on approve]', e.message); }

      // Send approval emails (fire-and-forget)
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/login`;
      sendApplicationApproved({ to: sub.applicant_email, name: sub.applicant_name, membershipId })
        .catch(e => console.error('[approval email]', e.message));
      sendMembershipConfirmed({ to: sub.applicant_email, name: sub.applicant_name, membershipId, loginUrl })
        .catch(e => console.error('[membership confirmed email]', e.message));

      // Send event-driven email for application approved
      if (sub.applicant_email) {
        await sendTemplatedEmail(
          'approved',
          sub.applicant_email,
          {
            name: sub.applicant_name,
            membership_id: membershipId,
            form_name: sub.form_name || '',
          },
          async (to, subject, body) => sendMail({ to, subject, html: body, template: 'approved', refId: membershipId })
        );
      }

      createAuditLog(req.user.id, 'APPROVE_APPLICATION', 'members', String(req.params.id), req.ip);
    }

    // ── REJECT ──────────────────────────────────────────────────────────────
    if (status === 'rejected') {
      await pool.query(
        "UPDATE fb_submissions SET member_status='inactive' WHERE id=?",
        [req.params.id]
      );
      sendApplicationRejected({
        to: sub.applicant_email, name: sub.applicant_name,
        membershipId: sub.membership_id, reason: notes,
      }).catch(e => console.error('[rejection email]', e.message));

      createAuditLog(req.user.id, 'REJECT_APPLICATION', 'members', String(req.params.id), req.ip);
    }

    // ── All other status changes: log to audit ───────────────────────────────
    if (!['approved', 'rejected'].includes(status)) {
      createAuditLog(
        req.user.id,
        `STATUS_CHANGE_${status.toUpperCase()}`,
        'members', String(req.params.id), req.ip
      );
    }

    // ── Sync portal_payments when payment is verified from application view ──
    if (status === 'payment_verified') {
      try {
        await pool.query(
          `UPDATE portal_payments SET status='verified', approved_by=?, approved_at=NOW()
           WHERE submission_id=? AND status != 'verified'`,
          [req.user.id, req.params.id]
        );
      } catch (payErr) { console.error('[payment sync]', payErr.message); }
    }

    // ── When payment_submitted, ensure a portal_payment record exists ────────
    if (status === 'payment_submitted') {
      try {
        const [[existingPay]] = await pool.query(
          'SELECT id FROM portal_payments WHERE submission_id=? LIMIT 1',
          [req.params.id]
        );
        if (existingPay) {
          await pool.query(
            `UPDATE portal_payments SET status='submitted', updated_at=NOW()
             WHERE submission_id=? AND status NOT IN ('verified')`,
            [req.params.id]
          );
        }
      } catch (payErr) { console.error('[payment_submitted sync]', payErr.message); }
    }

    return ok(res, null, 'Status updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;

