const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');

const router = express.Router();

// All staff routes require JWT + office_staff role
router.use(authMiddleware);
router.use(requireRole('office_staff'));

// ── GET /api/staff/applications ───────────────────────────────────────────────
// Paginated list of applications assigned for review
router.get('/applications', async (req, res) => {
  const { page = 1, per_page = 20, status, q } = req.query;
  const params = [];
  let where = "s.status != 'draft'";

  if (status && status !== 'all') { where += ' AND s.status=?'; params.push(status); }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.applicant_name, s.applicant_email, s.membership_id,
              s.status, s.membership_type, s.submitted_at, s.created_at,
              pp.name AS package_name,
              pmt.status AS pmt_status, pmt.amount AS payment_amount,
              (SELECT COUNT(*) FROM application_notes an WHERE an.submission_id=s.id) AS notes_count
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

// ── GET /api/staff/applications/:id ──────────────────────────────────────────
// Full application detail including documents and payment
router.get('/applications/:id', async (req, res) => {
  try {
    const [[sub]] = await pool.query(`SELECT s.* FROM fb_submissions s WHERE s.id=? LIMIT 1`, [req.params.id]);
    if (!sub) return fail(res, 'Application not found', 404);

    const [fields] = await pool.query(
      `SELECT sd.field_key, sd.value, sd.file_path, sd.edited_by_staff, sd.original_value,
              fld.label, fld.field_type
       FROM fb_submission_data sd LEFT JOIN fb_fields fld ON fld.id=sd.field_id
       WHERE sd.submission_id=?`, [req.params.id]
    );

    const [[payment]] = await pool.query(
      `SELECT p.*, pm.name AS method_name
       FROM portal_payments p LEFT JOIN portal_payment_methods pm ON pm.id=p.method_id
       WHERE p.submission_id=? ORDER BY p.id DESC LIMIT 1`,
      [req.params.id]
    );

    sub.fields = fields;
    sub.payment = payment || null;

    return ok(res, sub);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PATCH /api/staff/applications/:id/under-review ───────────────────────────
// Mark an application as Under Review
router.patch('/applications/:id/under-review', async (req, res) => {
  const { notes } = req.body;
  try {
    const [[sub]] = await pool.query('SELECT id, status FROM fb_submissions WHERE id=? LIMIT 1', [req.params.id]);
    if (!sub) return fail(res, 'Application not found', 404);

    await pool.query(
      `UPDATE fb_submissions SET status='under_review', reviewed_by=?, reviewed_at=NOW(), review_notes=? WHERE id=?`,
      [req.user.id, notes || null, req.params.id]
    );

    createAuditLog(req.user.id, 'STAFF_MARK_UNDER_REVIEW', 'submissions', String(req.params.id), req.ip);
    return ok(res, { id: Number(req.params.id), status: 'under_review' }, 'Marked as Under Review');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── GET /api/staff/applications/:id/notes ────────────────────────────────────
// List all internal notes on an application
router.get('/applications/:id/notes', async (req, res) => {
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

// ── POST /api/staff/applications/:id/notes ───────────────────────────────────
// Add an internal note (not visible to the applicant)
router.post('/applications/:id/notes', async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return fail(res, 'Note text is required', 422);
  try {
    const [[sub]] = await pool.query('SELECT id FROM fb_submissions WHERE id=? LIMIT 1', [req.params.id]);
    if (!sub) return fail(res, 'Application not found', 404);

    const [r] = await pool.query(
      'INSERT INTO application_notes (submission_id, created_by, note) VALUES (?,?,?)',
      [req.params.id, req.user.id, note.trim()]
    );

    createAuditLog(req.user.id, 'STAFF_ADD_NOTE', 'submissions', String(req.params.id), req.ip);

    const [[created]] = await pool.query(
      `SELECT an.id, an.note, an.created_at, u.full_name AS author_name
       FROM application_notes an JOIN portal_admin_users u ON u.id=an.created_by
       WHERE an.id=?`, [r.insertId]
    );
    return ok(res, created, 'Note added', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── DELETE /api/staff/applications/:id/notes/:noteId ─────────────────────────
// Staff can delete only their own notes
router.delete('/applications/:id/notes/:noteId', async (req, res) => {
  try {
    const [[note]] = await pool.query(
      'SELECT * FROM application_notes WHERE id=? AND submission_id=? LIMIT 1',
      [req.params.noteId, req.params.id]
    );
    if (!note) return fail(res, 'Note not found', 404);
    if (note.created_by !== req.user.id) return fail(res, 'Cannot delete another user\'s note', 403);

    await pool.query('DELETE FROM application_notes WHERE id=?', [note.id]);
    createAuditLog(req.user.id, 'STAFF_DELETE_NOTE', 'submissions', String(req.params.id), req.ip);
    return ok(res, null, 'Note deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// ── PATCH /api/staff/applications/:id/fields ─────────────────────────────────
// Edit minor field values (spelling corrections, missing data) — all edits audited
router.patch('/applications/:id/fields', async (req, res) => {
  const { fields } = req.body; // [{ field_key, value }]
  if (!Array.isArray(fields) || !fields.length) return fail(res, 'fields array required', 422);

  // Prevent editing sensitive/payment fields
  const FORBIDDEN_KEYS = ['payment_method', 'transaction_id', 'upi_id', 'bank_details', 'qr_upload', 'amount'];

  try {
    const [[sub]] = await pool.query('SELECT id FROM fb_submissions WHERE id=? LIMIT 1', [req.params.id]);
    if (!sub) return fail(res, 'Application not found', 404);

    for (const { field_key, value } of fields) {
      if (FORBIDDEN_KEYS.includes(field_key)) continue; // silently skip sensitive fields

      // Preserve original value before overwriting
      const [[existing]] = await pool.query(
        'SELECT value FROM fb_submission_data WHERE submission_id=? AND field_key=? LIMIT 1',
        [req.params.id, field_key]
      );

      await pool.query(
        `UPDATE fb_submission_data
         SET value=?, edited_by_staff=1,
             original_value=COALESCE(original_value, ?),
             updated_at=NOW()
         WHERE submission_id=? AND field_key=?`,
        [value, existing?.value ?? null, req.params.id, field_key]
      );

      createAuditLog(
        req.user.id,
        `STAFF_EDIT_FIELD:${field_key}`,
        'submissions',
        String(req.params.id),
        req.ip
      );
    }

    return ok(res, null, 'Field(s) updated');
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// ── GET /api/staff/dashboard ──────────────────────────────────────────────────
// Stats for office staff: pending/under-review counts
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ pending }]]      = await pool.query("SELECT COUNT(*) AS pending FROM fb_submissions WHERE status='submitted'");
    const [[{ under_review }]] = await pool.query("SELECT COUNT(*) AS under_review FROM fb_submissions WHERE status='under_review'");
    const [[{ notes_today }]]  = await pool.query(
      "SELECT COUNT(*) AS notes_today FROM application_notes WHERE created_by=? AND DATE(created_at)=CURDATE()",
      [req.user.id]
    );
    const [[{ my_edits }]] = await pool.query(
      `SELECT COUNT(DISTINCT submission_id) AS my_edits
       FROM fb_submission_data WHERE edited_by_staff=1`
    );

    const [recent] = await pool.query(
      `SELECT s.id, s.applicant_name, s.status, s.submitted_at
       FROM fb_submissions s
       WHERE s.status IN ('submitted','under_review')
       ORDER BY s.submitted_at ASC LIMIT 10`
    );

    return ok(res, { pending, under_review, notes_today, my_edits, recent });
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;

