const express = require('express');
const path = require('path');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { upload } = require('../middleware/upload');
const { createAuditLog } = require('../utils/auditLog');
const {
  getCurrentWing,
  getCurrentPositions,
  getPositionHistory,
  assignWing,
  assertPresidentSlot,
  endPositionsOnMembershipExpiry,
  ensurePublicSlug,
} = require('../utils/memberOrg');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

const CAN_ASSIGN = ['super_admin', 'admin', 'branch_manager'];

function canManageMember(req, submissionId) {
  if (['super_admin', 'admin'].includes(req.user.role)) return true;
  return ['branch_manager', 'office_staff'].includes(req.user.role);
}

// GET /api/members/:id/org — wing, positions, profile summary
router.get('/', async (req, res) => {
  const sid = req.params.id;
  try {
    const wing = await getCurrentWing(sid);
    const positions = await getCurrentPositions(sid);
    const history = await getPositionHistory(sid);
    const [[profile]] = await pool.query('SELECT * FROM member_public_profiles WHERE submission_id = ?', [sid]);
    const [links] = await pool.query(
      'SELECT * FROM member_profile_links WHERE submission_id = ? ORDER BY sort_order, id',
      [sid]
    );
    const [wingHistory] = await pool.query(
      `SELECT mwa.*, w.name AS wing_name FROM member_wing_assignments mwa
       JOIN portal_wings w ON w.id = mwa.wing_id WHERE mwa.submission_id = ? ORDER BY mwa.effective_from DESC`,
      [sid]
    );
    return ok(res, { wing, positions, position_history: history, wing_history: wingHistory, profile: profile || null, links });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// POST /api/members/:id/wing-transfer
router.post('/wing-transfer', requireRole(...CAN_ASSIGN), async (req, res) => {
  const sid = Number(req.params.id);
  const { wing_id, notes, effective_from } = req.body;
  if (!wing_id) return fail(res, 'wing_id required', 422);
  try {
    await assignWing({
      submissionId: sid,
      wingId: wing_id,
      assignedBy: req.user.id,
      notes,
      effectiveFrom: effective_from,
    });
    createAuditLog(req.user.id, 'WING_TRANSFER', 'members', String(sid), req.ip);
    const wing = await getCurrentWing(sid);
    return ok(res, wing, 'Wing updated');
  } catch (err) {
    return fail(res, err.message || 'Server error', err.statusCode || 500);
  }
});

// POST /api/members/:id/positions
router.post('/positions', requireRole(...CAN_ASSIGN), async (req, res) => {
  const sid = Number(req.params.id);
  const { position_id, wing_id, start_date, end_date, appointment_type, notes, is_current } = req.body;
  if (!position_id || !start_date) return fail(res, 'position_id and start_date required', 422);

  try {
    const wingId = wing_id || (await getCurrentWing(sid))?.id;
    if (!wingId) return fail(res, 'Member has no wing; assign a wing first', 422);

    const makeCurrent = is_current !== false && !end_date;
    if (makeCurrent) {
      await assertPresidentSlot(wingId, position_id, sid);
    }

    if (makeCurrent) {
      await pool.query(
        `UPDATE member_position_assignments SET is_current = FALSE, end_date = COALESCE(end_date, CURRENT_DATE)
         WHERE submission_id = ? AND position_id = ? AND wing_id = ? AND is_current = TRUE`,
        [sid, position_id, wingId]
      );
    }

    const [r] = await pool.query(
      `INSERT INTO member_position_assignments
         (submission_id, position_id, wing_id, start_date, end_date, appointment_type, appointed_by, notes, is_current)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sid, position_id, wingId, start_date, end_date || null,
        appointment_type || 'appointed', req.user.id, notes || null, makeCurrent,
      ]
    );
    createAuditLog(req.user.id, 'ASSIGN_POSITION', 'members', String(sid), req.ip);
    const positions = await getCurrentPositions(sid);
    return ok(res, positions, 'Position assigned', 201);
  } catch (err) {
    return fail(res, err.message || 'Server error', err.statusCode || 500);
  }
});

// PUT /api/members/:id/positions/:assignmentId
router.put('/positions/:assignmentId', requireRole(...CAN_ASSIGN), async (req, res) => {
  const { start_date, end_date, notes, is_current, position_id, wing_id } = req.body;
  try {
    const [[row]] = await pool.query(
      'SELECT * FROM member_position_assignments WHERE id = ? AND submission_id = ?',
      [req.params.assignmentId, req.params.id]
    );
    if (!row) return fail(res, 'Not found', 404);

    const wingId = wing_id ?? row.wing_id;
    const posId = position_id ?? row.position_id;
    if (is_current && !end_date) {
      await assertPresidentSlot(wingId, posId, req.params.id);
    }

    await pool.query(
      `UPDATE member_position_assignments SET
         start_date=COALESCE(?,start_date), end_date=?,
         notes=COALESCE(?,notes), is_current=COALESCE(?,is_current),
         position_id=COALESCE(?,position_id), wing_id=COALESCE(?,wing_id),
         updated_at=NOW()
       WHERE id=?`,
      [start_date, end_date ?? row.end_date, notes, is_current, position_id, wing_id, req.params.assignmentId]
    );
    return ok(res, await getPositionHistory(req.params.id));
  } catch (err) {
    return fail(res, err.message || 'Server error', err.statusCode || 500);
  }
});

// DELETE /api/members/:id/positions/:assignmentId
router.delete('/positions/:assignmentId', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM member_position_assignments WHERE id = ? AND submission_id = ?',
      [req.params.assignmentId, req.params.id]
    );
    return ok(res, null, 'Removed');
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/members/:id/public-profile (admin)
router.put('/public-profile', requireRole(...CAN_ASSIGN), async (req, res) => {
  const sid = Number(req.params.id);
  const {
    is_public, headline, about_me, my_org, org_history,
    show_email, show_phone, show_positions, show_past_positions, theme_color, public_slug,
  } = req.body;
  try {
    await ensurePublicSlug(sid);
    await pool.query(
      `INSERT INTO member_public_profiles (submission_id, is_public, headline, about_me, my_org, org_history,
         show_email, show_phone, show_positions, show_past_positions, theme_color, public_slug, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (submission_id) DO UPDATE SET
         is_public=EXCLUDED.is_public, headline=EXCLUDED.headline, about_me=EXCLUDED.about_me,
         my_org=EXCLUDED.my_org, org_history=EXCLUDED.org_history,
         show_email=EXCLUDED.show_email, show_phone=EXCLUDED.show_phone,
         show_positions=EXCLUDED.show_positions, show_past_positions=EXCLUDED.show_past_positions,
         theme_color=EXCLUDED.theme_color,
         public_slug=COALESCE(EXCLUDED.public_slug, member_public_profiles.public_slug),
         updated_at=NOW()
       RETURNING submission_id`,
      [
        sid, !!is_public, headline || null, about_me || null, my_org || null, org_history || null,
        !!show_email, !!show_phone, show_positions !== false, show_past_positions !== false,
        theme_color || '#6C3EAB', public_slug || null,
      ]
    );
    const [[profile]] = await pool.query('SELECT * FROM member_public_profiles WHERE submission_id = ?', [sid]);
    return ok(res, profile);
  } catch (err) {
    console.error('[PUT /api/members/:id/public-profile] Error:', err);
    if (err.code === '23505') return fail(res, 'Public URL slug already taken', 409);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
