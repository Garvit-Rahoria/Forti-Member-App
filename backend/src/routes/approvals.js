const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { sendApplicationApproved, sendApplicationRejected, sendMembershipConfirmed, sendApplicationUnderReview, sendPaymentConfirmed } = require('../utils/email');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();
router.use(authMiddleware);

async function logApplicationActivity(submissionId, eventType, actedBy, notes = null) {
  try {
    await pool.query(
      `INSERT INTO application_activity (submission_id, event_type, notes, acted_by)
       VALUES (?,?,?,?)`,
      [submissionId, eventType, notes || null, actedBy || null]
    );
  } catch (err) {
    console.error('[application_activity]', err.message);
  }
}

/** Allowed next statuses from current submission status (virtual actions included). */
function allowedTransitions(currentStatus) {
  const s = String(currentStatus || '').toLowerCase();
  const map = {
    // New applications must be marked under review before payment verification
    submitted:         ['under_review', 'rejected'],
    payment_submitted: ['under_review', 'rejected'],
    pending_info:      ['under_review', 'rejected'],
    under_review:      ['payment_verified', 'reject_payment', 'rejected'],
    // After payment rejection, stay in review cycle (status stored as payment_pending)
    payment_pending:   ['payment_verified', 'reject_payment', 'under_review', 'rejected'],
    payment_verified:  ['approved', 'rejected'],
    approved:          ['activate', 'active', 'rejected'],
    active:            [],
    rejected:          [],
  };
  return map[s] || [];
}

// GET /api/approvals/workflows
router.get('/workflows', async (req, res) => {
  const { form_id } = req.query;
  try {
    let q = `SELECT w.*, f.name AS form_name FROM fb_approval_workflows w
             LEFT JOIN fb_forms f ON f.id=w.form_id`;
    const params = [];
    if (form_id) { q += ' WHERE w.form_id=?'; params.push(form_id); }
    const [rows] = await pool.query(q, params);
    for (const w of rows) {
      const [stages] = await pool.query(
        'SELECT * FROM fb_approval_stages WHERE workflow_id=? ORDER BY stage_order', [w.id]
      );
      w.stages = stages;
    }
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/approvals/workflows
router.post('/workflows', requireRole('super_admin', 'admin'), async (req, res) => {
  const { form_id, name, stages = [] } = req.body;
  if (!form_id || !name) return fail(res, 'form_id and name required', 422);
  try {
    const [r] = await pool.query(
      'INSERT INTO fb_approval_workflows (form_id, name) VALUES (?,?)', [form_id, name]
    );
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      await pool.query(
        `INSERT INTO fb_approval_stages
           (workflow_id, stage_name, stage_order, approver_role, is_final)
         VALUES (?,?,?,?,?)`,
        [r.insertId, s.stage_name, i, s.approver_role || 'admin', s.is_final || 0]
      );
    }
    const [[wf]] = await pool.query('SELECT * FROM fb_approval_workflows WHERE id=?', [r.insertId]);
    const [wfStages] = await pool.query('SELECT * FROM fb_approval_stages WHERE workflow_id=? ORDER BY stage_order', [r.insertId]);
    wf.stages = wfStages;
    return ok(res, wf, 'Workflow created', 201);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PUT /api/approvals/workflows/:id  Update workflow + stages
router.put('/workflows/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { name, is_active, stages = [] } = req.body;
  try {
    await pool.query('UPDATE fb_approval_workflows SET name=?, is_active=? WHERE id=?', [name, is_active, req.params.id]);
    await pool.query('DELETE FROM fb_approval_stages WHERE workflow_id=?', [req.params.id]);
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      await pool.query(
        `INSERT INTO fb_approval_stages
           (workflow_id, stage_name, stage_order, approver_role, is_final)
         VALUES (?,?,?,?,?)`,
        [req.params.id, s.stage_name, i, s.approver_role || 'admin', s.is_final || 0]
      );
    }
    return ok(res, null, 'Workflow updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/approvals/workflows/:id
router.delete('/workflows/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fb_approval_workflows WHERE id=?', [req.params.id]);
    return ok(res, null, 'Deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ──────── Approval Actions ────────────────────────────────────────────────────

// GET /api/approvals/actions?submission_id=
router.get('/actions', async (req, res) => {
  const { submission_id } = req.query;
  if (!submission_id) return fail(res, 'submission_id required', 422);
  try {
    const [rows] = await pool.query(
      `SELECT a.*, s.stage_name, u.full_name AS acted_by_name
       FROM fb_approval_actions a
       LEFT JOIN fb_approval_stages s ON s.id=a.stage_id
       LEFT JOIN portal_admin_users u ON u.id=a.acted_by
       WHERE a.submission_id=? ORDER BY a.acted_at`,
      [submission_id]
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/approvals/actions  Take an action on a submission
// stage_id is now OPTIONAL — we fall back to a default stage lookup or 1
router.post('/actions', async (req, res) => {
  const { submission_id, stage_id, action, notes } = req.body;
  if (!submission_id || !action)
    return fail(res, 'submission_id and action required', 422);
  const validActions = ['approved', 'rejected', 'returned', 'under_review'];
  if (!validActions.includes(action)) return fail(res, 'Invalid action', 422);

  if (action === 'rejected' && (!notes || !notes.trim())) {
    return fail(res, 'A reason (notes) is required when rejecting an application.', 422);
  }

  try {
    // Resolve a real stage_id — look up the first approval stage for this submission's form
    let resolvedStageId = Number(stage_id) || null;
    if (!resolvedStageId) {
      const [[sub0]] = await pool.query('SELECT form_id FROM fb_submissions WHERE id=?', [submission_id]);
      if (sub0) {
        const [[stage]] = await pool.query(
          `SELECT s.id FROM fb_approval_stages s
           JOIN fb_approval_workflows w ON w.id=s.workflow_id
           WHERE w.form_id=? AND w.is_active=1
           ORDER BY s.stage_order LIMIT 1`, [sub0.form_id]
        );
        resolvedStageId = stage?.id || null;
      }
    }

    // Record action (stage_id may still be null if no workflow configured — that's OK)
    if (resolvedStageId) {
      await pool.query(
        'INSERT INTO fb_approval_actions (submission_id, stage_id, action, notes, acted_by) VALUES (?,?,?,?,?)',
        [submission_id, resolvedStageId, action, notes || null, req.user.id]
      );
    }

    // Map action → new status
    const statusMap = {
      approved:    'approved',
      rejected:    'rejected',
      returned:    'under_review',
      under_review:'under_review',
    };
    const newStatus = statusMap[action] || action;

    await pool.query(
      'UPDATE fb_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?',
      [newStatus, req.user.id, notes || null, submission_id]
    );

    // Fetch submission details for email + member account creation
    const [[sub]] = await pool.query(
      'SELECT * FROM fb_submissions WHERE id = ? LIMIT 1',
      [submission_id]
    );


    if (sub) {
      const memberName   = sub.applicant_name;
      const memberEmail  = sub.applicant_email;
      const membershipId = sub.membership_id;

      if (action === 'approved') {
        // Assign membership_id if not already set
        let finalMembershipId = membershipId;
        if (!finalMembershipId) {
          const [[{ cnt }]] = await pool.query(
            "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
          );
          finalMembershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
          await pool.query(
            'UPDATE fb_submissions SET membership_id=?, approved_at=COALESCE(approved_at, NOW()) WHERE id=?',
            [finalMembershipId, submission_id]
          );
        }
        // Do NOT activate membership here. Only update status to approved.
        // Send approval email only (no membership confirmation yet)
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/login`;
        sendApplicationApproved({ to: memberEmail, name: memberName, membershipId: finalMembershipId })
          .catch(e => console.error('[approval email]', e.message));
      }

      if (action === 'rejected') {
        sendApplicationRejected({ to: memberEmail, name: memberName, membershipId, reason: notes })
          .catch(e => console.error('[rejection email]', e.message));
      }

      if (action === 'under_review' || action === 'returned') {
        sendApplicationUnderReview({ to: memberEmail, name: memberName, membershipId: membershipId || sub.uuid })
          .catch(e => console.error('[under_review email]', e.message));
      }
    }

    const auditAction = action === 'approved' ? 'APPROVE_MEMBER' : action === 'rejected' ? 'REJECT_MEMBER' : 'REVIEW_MEMBER';
    createAuditLog(req.user.id, auditAction, 'members', String(submission_id), req.ip);

    return ok(res, { submission_id, newStatus }, `Application ${action}`);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// PATCH /api/approvals/:id/status  — inline status change with full workflow on approve
// office_staff: under_review, payment_verified only
// state_manager: can approve/reject for their state
// super_admin/admin: all transitions
router.patch('/:id/status', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  const { status, notes } = req.body;
  const role = req.user.role;

  // 'activate' / 'reject_payment' are virtual actions (not always stored as DB status)
  const ALL_VALID = ['submitted','under_review','approved','rejected','active','payment_pending','payment_approved','payment_submitted','pending_info','activate','payment_verified','reject_payment'];
  // office_staff: can verify/reject payment, mark under review — CANNOT approve/reject application
  const STAFF_VALID = ['under_review','payment_pending','payment_submitted','payment_approved','payment_verified','reject_payment'];
  // branch_manager: can approve/reject app (if payment approved), request info, and review steps
  const BM_VALID   = ['under_review','approved','rejected','active','pending_info','activate'];

  if (!ALL_VALID.includes(status)) return fail(res, 'Invalid status', 422);
  if (role === 'office_staff' && !STAFF_VALID.includes(status))
    return fail(res, 'Insufficient permission for this status change', 403);
  if (role === 'branch_manager' && !BM_VALID.includes(status))
    return fail(res, 'Insufficient permission for this status change', 403);

  if ((status === 'rejected' || status === 'reject_payment' || status === 'payment_pending') && (!notes || !notes.trim())) {
    if (status === 'rejected' || status === 'reject_payment') {
      return fail(res, 'A reason (notes) is required for this action.', 422);
    }
  }

  try {
    const [[sub]] = await pool.query('SELECT * FROM fb_submissions WHERE id=?', [req.params.id]);
    if (!sub) return fail(res, 'Not found', 404);

    // Idempotent activate: already active → success without re-running side effects
    if (status === 'activate' || status === 'active') {
      if (sub.status === 'active' || sub.member_status === 'active') {
        return ok(res, { id: Number(req.params.id), status: 'active', already_active: true }, 'Membership already active');
      }
    }

    // Enforce workflow transitions (admins still must follow sequence)
    const allowed = allowedTransitions(sub.status);
    if (!allowed.includes(status) && !(status === 'active' && allowed.includes('activate'))) {
      return fail(res, `Action not allowed from status "${sub.status}". Complete previous steps first.`, 422);
    }

    // Branch-level scoping: branch_manager AND office_staff can only act on their branch
    if (
      (role === 'branch_manager' || role === 'office_staff') &&
      req.user.assigned_branch_id
    ) {
      if (sub.branch_id && String(sub.branch_id) !== String(req.user.assigned_branch_id))
        return fail(res, 'Access denied to this branch application', 403);
    }

    // ── Branch manager: can only approve if payment is verified ──
    if (role === 'branch_manager' && (status === 'approved' || status === 'active')) {
      const [[pmt]] = await pool.query(
        'SELECT status FROM portal_payments WHERE submission_id=? ORDER BY id DESC LIMIT 1',
        [req.params.id]
      );
      if (!pmt || pmt.status !== 'verified') {
        return fail(res, 'Cannot approve: payment must be verified first', 422);
      }
    }

    // ── STRICT: No approval without payment verified (all roles) ──
    if (status === 'approved') {
      if (sub.status !== 'payment_verified') {
        return fail(res, 'Application must be Payment Verified before approval.', 422);
      }
      const [[pmt]] = await pool.query(
        `SELECT id, status FROM portal_payments
         WHERE submission_id=? AND status NOT IN ('superseded','reset')
         ORDER BY id DESC LIMIT 1`,
        [req.params.id]
      );

      if (!pmt || pmt.status !== 'verified') {
        return fail(res, 'Payment must be verified before approving the application.', 422);
      }
    }

    // ── STRICT: No activation without approved ──
    if (status === 'active') {
      if (!['approved'].includes(sub.status)) {
        return fail(res, 'Action not allowed. Application must be Approved before activation.', 422);
      }
    }

    // ── Pending info: store the info request message ──
    if (status === 'pending_info') {
      await pool.query(
        'UPDATE fb_submissions SET info_request_message=? WHERE id=?',
        [notes || 'Additional information required', req.params.id]
      );
    }

    // ── Payment approved: also mark the linked payment record as approved ──
    if (status === 'payment_approved') {
      await pool.query(
        `UPDATE portal_payments SET status='approved', verified_by=?, verified_at=NOW()
         WHERE submission_id=? ORDER BY id DESC LIMIT 1`,
        [req.user.id, req.params.id]
      ).catch(e => console.error('[sync payment approved]', e.message));
    }

    // ── Payment verified: only after Under Review (or payment_pending after reject) ──
    if (status === 'payment_verified') {
      if (!['under_review', 'payment_pending'].includes(sub.status)) {
        return fail(res, 'Mark application Under Review before verifying payment.', 422);
      }
      const [[existingPmt]] = await pool.query(
        `SELECT id, status FROM portal_payments
         WHERE submission_id=? AND status NOT IN ('superseded','reset')
         ORDER BY id DESC LIMIT 1`,
        [req.params.id]
      ).catch(() => [[null]]);
      if (existingPmt) {
        await pool.query(
          `UPDATE portal_payments SET status='verified', approved_by=?, approved_at=NOW()
           WHERE id=?`,
          [req.user.id, existingPmt.id]
        ).catch(e => console.error('[sync payment verified]', e.message));
      } else {
        const { v4: uuidv4 } = require('uuid');
        await pool.query(
          `INSERT INTO portal_payments (uuid, submission_id, status, approved_by, approved_at, created_at)
           VALUES (?, ?, 'verified', ?, NOW(), NOW())`,
          [uuidv4(), req.params.id, req.user.id]
        ).catch(e => console.error('[create payment stub on verify]', e.message));
      }
      await pool.query(
        `UPDATE fb_submissions SET payment_status='verified' WHERE id=?`,
        [req.params.id]
      ).catch(() => {});
    }

    // ── Reject payment: payment → rejected; applicant must re-submit proof ──
    if (status === 'reject_payment' || (status === 'payment_pending' && notes && String(notes).trim())) {
      if (!notes || !String(notes).trim()) {
        return fail(res, 'A reason is required when rejecting payment.', 422);
      }
      const [[p]] = await pool.query(
        `SELECT id FROM portal_payments
         WHERE submission_id=? AND status NOT IN ('superseded','reset')
         ORDER BY id DESC LIMIT 1`,
        [req.params.id]
      );
      if (p) {
        await pool.query(
          `UPDATE portal_payments SET status='rejected', notes=? WHERE id=?`,
          [notes, p.id]
        );
      }
      // After payment rejection, remain in review cycle so staff can re-verify new proof
      await pool.query(
        `UPDATE fb_submissions
         SET status='payment_pending', payment_status='rejected',
             reviewed_by=?, reviewed_at=NOW(), review_notes=?
         WHERE id=?`,
        [req.user.id, notes, req.params.id]
      );
      await logApplicationActivity(req.params.id, 'payment_rejected', req.user.id, notes);
      createAuditLog(req.user.id, 'STATUS_CHANGE_PAYMENT_REJECTED', 'submissions', req.params.id, req.ip);
      return ok(res, { id: Number(req.params.id), status: 'payment_pending', payment_status: 'rejected' }, 'Payment rejected — applicant must submit new proof');
    }

    // ── Legacy payment_pending without notes ──
    if (status === 'payment_pending') {
      await pool.query(
        `UPDATE portal_payments SET status='submitted'
         WHERE submission_id=? AND status NOT IN ('verified','rejected','superseded','reset')`,
        [req.params.id]
      ).catch(e => console.error('[sync payment pending]', e.message));
    }

    // ── Approve: assign membership_id but do NOT activate ──
    let finalMembershipId = sub.membership_id;
    if (status === 'approved') {
      if (!finalMembershipId) {
        const [[{ cnt }]] = await pool.query(
          "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
        );
        finalMembershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
        await pool.query(
          'UPDATE fb_submissions SET membership_id=?, approved_at=COALESCE(approved_at, NOW()) WHERE id=?',
          [finalMembershipId, req.params.id]
        );
      }
    }

    // ── ACTIVATE action: single-click approve+activate ──
    // Also generates membership_id if bypassing the separate approved step
    if (status === 'activate' && !finalMembershipId) {
      const [[{ cnt }]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM fb_submissions WHERE membership_id IS NOT NULL AND membership_id != ''"
      );
      finalMembershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
    }

    // ── ACTIVATE action: explicit admin-triggered membership activation ──
    if (status === 'activate') {
      if (sub.status !== 'approved') {
        return fail(res, 'Application must be Approved before activation.', 422);
      }
      // Block activation unless payment is verified
      const [[pmt]] = await pool.query(
        `SELECT status FROM portal_payments
         WHERE submission_id=? AND status NOT IN ('superseded','reset')
         ORDER BY id DESC LIMIT 1`,
        [req.params.id]
      );
      if (!pmt || pmt.status !== 'verified') {
        return fail(res, 'Payment not verified. Cannot activate membership.', 422);
      }
      // Calculate expiry based on package duration_months or plan_type fallback
      let expiryDate = null;
      if (sub.package_id) {
        try {
          const [[pkg]] = await pool.query('SELECT duration_months FROM portal_packages WHERE id=?', [sub.package_id]);
          if (pkg?.duration_months && pkg.duration_months < 999) {
            const d = new Date(); d.setMonth(d.getMonth() + pkg.duration_months);
            expiryDate = d.toISOString().split('T')[0];
          }
        } catch {}
      }
      if (!expiryDate) {
        if (sub.plan_type === 'yearly' || sub.plan_type === '1year') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 1);
          expiryDate = d.toISOString().split('T')[0];
        } else if (sub.plan_type === '3years' || sub.plan_type === '3_years') {
          const d = new Date(); d.setFullYear(d.getFullYear() + 3);
          expiryDate = d.toISOString().split('T')[0];
        }
        // lifetime: expiryDate stays null
      }

      // Update submission: status='active', member_status='active', activated_at=NOW
      await pool.query(
        `UPDATE fb_submissions
         SET status='active', member_status='active',
             activated_at=NOW(), approved_at=COALESCE(approved_at, NOW()), 
             activated_by=?, reviewed_by=?,
             membership_id=?, expiry_date=COALESCE(expiry_date,?)
         WHERE id=?`,
        [req.user.id, req.user.id, finalMembershipId, expiryDate, req.params.id]
      );

      // Upsert member_accounts for THIS submission only. Never repoint another account by email.
      try {
        const [[existingAcc]] = await pool.query(
          'SELECT id FROM member_accounts WHERE submission_id=? LIMIT 1',
          [req.params.id]
        );
        if (existingAcc) {
          await pool.query(
            `UPDATE member_accounts
             SET submission_id=?, membership_id=?, is_active=1, expiry_date=?,
                 plan_type=COALESCE(?,plan_type),
                 membership_type=COALESCE(?,membership_type),
                 package_id=COALESCE(?,package_id)
             WHERE id=?`,
            [req.params.id, finalMembershipId, expiryDate,
             sub.plan_type || null, sub.membership_type || null, sub.package_id || null,
             existingAcc.id]
          );
        } else {
          const { v4: uuidv4 } = require('uuid');
          await pool.query(
            `INSERT INTO member_accounts
               (uuid, submission_id, email, full_name, phone, membership_id,
                plan_type, membership_type, expiry_date, package_id, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
            [uuidv4(), req.params.id, sub.applicant_email, sub.applicant_name,
             sub.applicant_phone || null, finalMembershipId,
             sub.plan_type || null, sub.membership_type || null, expiryDate,
             sub.package_id || null]
          );
        }
      } catch (e) { console.error('[activate member_account]', e.message); }

      // Send activation email
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/login`;
      sendMembershipConfirmed({ to: sub.applicant_email, name: sub.applicant_name, membershipId: finalMembershipId, loginUrl })
        .catch(e => console.error('[activation email]', e.message));

      // Trigger certificate + card generation in background
      setImmediate(async () => {
        try {
          const path = require('path');
          const fs   = require('fs');
          const { generateCertPDF, generateCardPDF } = require('./certificates');
          const [[memberData]] = await pool.query('SELECT * FROM fb_submissions WHERE id=?', [req.params.id]);
          if (!memberData?.membership_id) return;
          const mid = memberData.membership_id;
          const certDir = path.join(__dirname, '../../storage/certificates');
          const cardDir = path.join(__dirname, '../../storage/cards');
          if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
          if (!fs.existsSync(cardDir)) fs.mkdirSync(cardDir, { recursive: true });
          if (typeof generateCertPDF === 'function')
            await generateCertPDF(memberData, path.join(certDir, `cert_${mid}.pdf`));
          if (typeof generateCardPDF === 'function')
            await generateCardPDF(memberData, path.join(cardDir, `card_${mid}.pdf`));
          await pool.query(
            'UPDATE fb_submissions SET cert_generated=1, certificate_pdf=?, card_generated=1, id_card_pdf=? WHERE id=?',
            [`storage/certificates/cert_${mid}.pdf`, `storage/cards/card_${mid}.pdf`, req.params.id]
          );
        } catch (e) { console.error('[cert gen on activation]', e.message); }
      });

      createAuditLog(req.user.id, 'ACTIVATE_MEMBERSHIP', 'submissions', req.params.id, req.ip);
      await logApplicationActivity(req.params.id, 'membership_activated', req.user.id, notes || null);
      return ok(res, { id: Number(req.params.id), status: 'active' }, 'Membership activated successfully');
    }


    // Always update status as requested (except for legacy 'approved'→'active' path)
    await pool.query(
      'UPDATE fb_submissions SET status=?, reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?',
      [status, req.user.id, notes || null, req.params.id]
    );

    const eventMap = {
      under_review: 'marked_under_review',
      payment_verified: 'payment_verified',
      approved: 'application_approved',
      rejected: 'application_rejected',
      payment_pending: 'payment_pending',
      pending_info: 'info_requested',
    };
    await logApplicationActivity(req.params.id, eventMap[status] || `status_${status}`, req.user.id, notes || null);

    createAuditLog(req.user.id, `STATUS_CHANGE_${status.toUpperCase()}`, 'submissions', req.params.id, req.ip);

    // ── Send status-update email to applicant ──
    if (status === 'under_review') {
      sendApplicationUnderReview({ to: sub.applicant_email, name: sub.applicant_name, membershipId: sub.membership_id || sub.uuid })
        .catch(e => console.error('[under_review email]', e.message));
    }
    if (status === 'rejected') {
      sendApplicationRejected({ to: sub.applicant_email, name: sub.applicant_name, membershipId: sub.membership_id, reason: notes })
        .catch(e => console.error('[rejection email]', e.message));
    }
    if (status === 'payment_verified') {
      const [[pmtDetails]] = await pool.query('SELECT amount, currency, transaction_id FROM portal_payments WHERE submission_id=? ORDER BY id DESC LIMIT 1', [req.params.id]).catch(() => [[null]]);
      const amount = pmtDetails?.amount || 0;
      const currency = pmtDetails?.currency || 'INR';
      const txnId = pmtDetails?.transaction_id || '';
      sendPaymentConfirmed({ 
        to: sub.applicant_email, 
        name: sub.applicant_name, 
        membershipId: sub.membership_id || sub.uuid,
        amount, currency, transactionId: txnId
      }).catch(e => console.error('[payment verified email]', e.message));
    }
    if (status === 'approved') {
      sendApplicationApproved({ 
        to: sub.applicant_email, 
        name: sub.applicant_name, 
        membershipId: finalMembershipId || sub.membership_id || sub.uuid 
      }).catch(e => console.error('[approval email]', e.message));
    }

    return ok(res, { id: Number(req.params.id), status }, (
      {
        under_review: 'Marked Under Review',
        payment_verified: 'Payment verified successfully',
        approved: 'Application approved',
        rejected: 'Application rejected',
      }[status] || 'Status updated'
    ));
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/approvals/pending  Submissions pending action by current user's role
router.get('/pending', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  const { page = 1, per_page = 20 } = req.query;
  const { paginate } = require('../utils/helpers');
  const stateClause = ((req.user.role === 'branch_manager' || req.user.role === 'office_staff') && req.user.assigned_branch_id)
    ? ' AND s.branch_id=?' : '';
  const stateParams = ((req.user.role === 'branch_manager' || req.user.role === 'office_staff') && req.user.assigned_branch_id)
    ? [req.user.assigned_branch_id] : [];
  try {
    const result = await paginate(
      pool,
      `SELECT s.*, f.name AS form_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       WHERE s.status IN ('submitted','under_review')${stateClause}
       ORDER BY s.submitted_at ASC`,
      stateParams, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/approvals/all  All submissions with optional status filter
router.get('/all', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  const { page = 1, per_page = 20, status, q } = req.query;
  const { paginate } = require('../utils/helpers');
  const params = [];
  let where = '1=1';

  // Restrict branch manager / office staff to their assigned branch
  if ((req.user.role === 'branch_manager' || req.user.role === 'office_staff') && req.user.assigned_branch_id) {
    where += ' AND s.branch_id=?'; params.push(req.user.assigned_branch_id);
  }

  if (status && status !== 'all') {
    // Support grouped tab keys from the UI
    const GROUPED = {
      pending:  ['submitted', 'under_review', 'payment_pending', 'payment_submitted', 'pending_info'],
      verified: ['payment_verified', 'approved'],
    }
    if (GROUPED[status]) {
      where += ` AND s.status IN (${GROUPED[status].map(() => '?').join(',')})`;
      params.push(...GROUPED[status]);
    } else {
      where += ' AND s.status=?'; params.push(status);
    }
  }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  try {
    const result = await paginate(
      pool,
      `SELECT s.*,
              f.name AS form_name,
              u.full_name AS reviewed_by_name,
              pp.name AS package_name, pp.price AS package_price, pp.currency AS package_currency,
              pp.total_amount AS package_total,
              pmt.status AS pmt_status, pmt.transaction_id AS pmt_transaction_id,
              pmt.amount AS payment_amount,
              pmt.screenshot_path, pmt.id AS payment_id,
              pm.name AS payment_method_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       LEFT JOIN portal_admin_users u ON u.id=s.reviewed_by
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN portal_payments pmt ON pmt.submission_id=s.id AND pmt.id=(
         SELECT MAX(pp2.id) FROM portal_payments pp2 WHERE pp2.submission_id=s.id
       )
       LEFT JOIN portal_payment_methods pm ON pm.id=pmt.method_id
       WHERE ${where}
       ORDER BY s.submitted_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/approvals/counts  Status counts for tabs
router.get('/counts', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    let sql = 'SELECT status, COUNT(*) AS cnt FROM fb_submissions';
    const params = [];
    // Region Scope for Branch Staff
    if ((req.user.role === 'branch_manager' || req.user.role === 'office_staff') && req.user.assigned_branch_id) {
      sql += ' WHERE branch_id=?';
      params.push(req.user.assigned_branch_id);
    }
    sql += ' GROUP BY status';
    const [rows] = await pool.query(sql, params);
    const counts = { all: 0 };
    rows.forEach(r => { counts[r.status] = Number(r.cnt); counts.all += Number(r.cnt); });
    return ok(res, counts);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── Notes (internal comments) — accessible to staff, manager, admin ───────────

// GET /api/approvals/:id/activity — unified activity timeline
router.get('/:id/activity', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    const [[sub]] = await pool.query(
      'SELECT id, status, submitted_at, created_at, applicant_name FROM fb_submissions WHERE id=?',
      [req.params.id]
    );
    if (!sub) return fail(res, 'Not found', 404);

    let rows = [];
    try {
      const [activity] = await pool.query(
        `SELECT a.id, a.event_type, a.notes, a.acted_by, a.created_at,
                u.full_name AS acted_by_name
         FROM application_activity a
         LEFT JOIN portal_admin_users u ON u.id = a.acted_by
         WHERE a.submission_id = ?
         ORDER BY a.created_at ASC, a.id ASC`,
        [req.params.id]
      );
      rows = activity;
    } catch (e) {
      console.error('[activity table]', e.message);
    }

    const timeline = [{
      event_type: 'application_submitted',
      notes: null,
      acted_by_name: sub.applicant_name || 'Applicant',
      created_at: sub.submitted_at || sub.created_at,
    }, ...rows];
    return ok(res, timeline);
  } catch (err) {
    console.error('[GET /approvals/:id/activity]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// GET /api/approvals/:id/notes
router.get('/:id/notes', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    const [notes] = await pool.query(
      `SELECT an.id, an.note, an.created_at, an.updated_at,
              u.full_name AS author_name, u.role AS author_role
       FROM application_notes an
       JOIN portal_admin_users u ON u.id=an.created_by
       WHERE an.submission_id=?
       ORDER BY an.created_at ASC`,
      [req.params.id]
    );
    return ok(res, notes);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/approvals/:id/notes
router.post('/:id/notes', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return fail(res, 'Note text is required', 422);
  try {
    const [[sub]] = await pool.query('SELECT id FROM fb_submissions WHERE id=? LIMIT 1', [req.params.id]);
    if (!sub) return fail(res, 'Application not found', 404);

    const [r] = await pool.query(
      'INSERT INTO application_notes (submission_id, created_by, note) VALUES (?,?,?)',
      [req.params.id, req.user.id, note.trim()]
    );
    createAuditLog(req.user.id, 'ADD_NOTE', 'submissions', String(req.params.id), req.ip);

    const [[created]] = await pool.query(
      `SELECT an.id, an.note, an.created_at, u.full_name AS author_name, u.role AS author_role
       FROM application_notes an JOIN portal_admin_users u ON u.id=an.created_by
       WHERE an.id=?`, [r.insertId]
    );
    return ok(res, created, 'Note added', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/approvals/:id/notes/:noteId  — own notes only (super_admin can delete any)
router.delete('/:id/notes/:noteId', requireRole('super_admin', 'admin', 'branch_manager', 'office_staff'), async (req, res) => {
  try {
    const [[note]] = await pool.query(
      'SELECT * FROM application_notes WHERE id=? AND submission_id=? LIMIT 1',
      [req.params.noteId, req.params.id]
    );
    if (!note) return fail(res, 'Note not found', 404);
    if (req.user.role !== 'super_admin' && note.created_by !== req.user.id)
      return fail(res, 'Cannot delete another user\'s note', 403);

    await pool.query('DELETE FROM application_notes WHERE id=?', [note.id]);
    createAuditLog(req.user.id, 'DELETE_NOTE', 'submissions', String(req.params.id), req.ip);
    return ok(res, null, 'Note deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;

