const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { upload } = require('../middleware/upload');
const {
  getCurrentWing,
  getCurrentPositions,
  getPositionHistory,
  ensurePublicSlug,
} = require('../utils/memberOrg');

const router = express.Router();

function memberAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (!decoded.submission_id) {
      return res.status(401).json({ success: false, message: 'Invalid member token' });
    }
    req.member = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function submissionId(req) {
  return req.member.submission_id;
}

// GET /api/member/profile
router.get('/', memberAuth, async (req, res) => {
  const sid = submissionId(req);
  try {
    const [[sub]] = await pool.query(
      `SELECT id, applicant_name, applicant_email, applicant_phone, membership_id, member_status, status
       FROM fb_submissions WHERE id = ?`,
      [sid]
    );
    const wing = await getCurrentWing(sid);
    const positions = await getCurrentPositions(sid);
    const history = await getPositionHistory(sid);
    let [[profile]] = await pool.query('SELECT * FROM member_public_profiles WHERE submission_id = ?', [sid]);
    if (!profile) {
      const slug = await ensurePublicSlug(sid);
      [[profile]] = await pool.query('SELECT * FROM member_public_profiles WHERE submission_id = ?', [sid]);
    }
    const [links] = await pool.query(
      'SELECT * FROM member_profile_links WHERE submission_id = ? ORDER BY sort_order, id',
      [sid]
    );
    return ok(res, {
      member: sub,
      wing,
      positions,
      position_history: history,
      profile,
      links,
      public_url: profile?.public_slug ? `/m/${profile.public_slug}` : null,
    });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/member/profile
router.put('/', memberAuth, async (req, res) => {
  const sid = submissionId(req);
  const body = req.body;
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
        sid,
        !!body.is_public,
        body.headline || null,
        body.about_me || null,
        body.my_org || null,
        body.org_history || null,
        !!body.show_email,
        !!body.show_phone,
        body.show_positions !== false,
        body.show_past_positions !== false,
        body.theme_color || '#6C3EAB',
        body.public_slug || null,
      ]
    );
    const [[profile]] = await pool.query('SELECT * FROM member_public_profiles WHERE submission_id = ?', [sid]);
    return ok(res, profile);
  } catch (err) {
    console.error('[PUT /api/member/profile] Error:', err);
    if (err.code === '23505') return fail(res, 'That profile URL is already taken', 409);
    return fail(res, 'Server error', 500);
  }
});

// PATCH /api/member/profile/visibility
router.patch('/visibility', memberAuth, async (req, res) => {
  const sid = submissionId(req);
  try {
    await ensurePublicSlug(sid);
    await pool.query(
      `INSERT INTO member_public_profiles (submission_id, is_public) VALUES (?, ?)
       ON CONFLICT (submission_id) DO UPDATE SET is_public=EXCLUDED.is_public, updated_at=NOW()
       RETURNING submission_id`,
      [sid, !!req.body.is_public]
    );
    return ok(res, { is_public: !!req.body.is_public });
  } catch (err) {
    console.error('[PATCH /api/member/profile/visibility] Error:', err);
    return fail(res, 'Server error', 500);
  }
});

// POST /api/member/profile/photo
router.post('/photo', memberAuth, upload.single('photo'), async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded', 422);
  const sid = submissionId(req);
  const photoPath = `/uploads/photos/${req.file.filename}`;
  try {
    await ensurePublicSlug(sid);
    await pool.query(
      `INSERT INTO member_public_profiles (submission_id, profile_photo_path) VALUES (?, ?)
       ON CONFLICT (submission_id) DO UPDATE SET profile_photo_path=EXCLUDED.profile_photo_path, updated_at=NOW()
       RETURNING submission_id`,
      [sid, photoPath]
    );
    return ok(res, { profile_photo_path: photoPath });
  } catch (err) {
    console.error('[POST /api/member/profile/photo] Error:', err);
    return fail(res, 'Server error', 500);
  }
});

// CRUD links
router.post('/links', memberAuth, async (req, res) => {
  const sid = submissionId(req);
  const { link_type, title, url, content, sort_order, is_active } = req.body;
  if (!title) return fail(res, 'title required', 422);
  try {
    const [r] = await pool.query(
      `INSERT INTO member_profile_links (submission_id, link_type, title, url, content, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sid, link_type || 'custom', title, url || null, content || null, sort_order ?? 0, is_active !== false]
    );
    const [[row]] = await pool.query('SELECT * FROM member_profile_links WHERE id = ?', [r.insertId]);
    return ok(res, row, 'Added', 201);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.put('/links/:linkId', memberAuth, async (req, res) => {
  const { title, url, content, link_type, sort_order, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE member_profile_links SET title=COALESCE(?,title), url=?, content=?, link_type=COALESCE(?,link_type),
       sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active), updated_at=NOW()
       WHERE id=? AND submission_id=?`,
      [title, url, content, link_type, sort_order, is_active, req.params.linkId, submissionId(req)]
    );
    const [[row]] = await pool.query('SELECT * FROM member_profile_links WHERE id = ?', [req.params.linkId]);
    return ok(res, row);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.delete('/links/:linkId', memberAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM member_profile_links WHERE id = ? AND submission_id = ?',
      [req.params.linkId, submissionId(req)]
    );
    return ok(res, null, 'Deleted');
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.post('/links/reorder', memberAuth, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return fail(res, 'order array required', 422);
  const sid = submissionId(req);
  try {
    for (let i = 0; i < order.length; i++) {
      await pool.query(
        'UPDATE member_profile_links SET sort_order = ? WHERE id = ? AND submission_id = ?',
        [i, order[i], sid]
      );
    }
    return ok(res, null, 'Reordered');
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

router.post('/links/:linkId/media', memberAuth, upload.single('media'), async (req, res) => {
  if (!req.file) return fail(res, 'No file', 422);
  const mediaPath = `/uploads/photos/${req.file.filename}`;
  try {
    await pool.query(
      'UPDATE member_profile_links SET media_path = ?, link_type = COALESCE(link_type, \'photo\') WHERE id = ? AND submission_id = ?',
      [mediaPath, req.params.linkId, submissionId(req)]
    );
    return ok(res, { media_path: mediaPath });
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
