/**
 * Wings, positions, public profiles — submission_id is member identity.
 */
const { pool } = require('../config/database');

async function getCurrentWing(submissionId) {
  const [[row]] = await pool.query(
    `SELECT w.id, w.name, w.slug, mwa.effective_from
     FROM member_wing_assignments mwa
     JOIN portal_wings w ON w.id = mwa.wing_id
     WHERE mwa.submission_id = ? AND mwa.effective_to IS NULL
     ORDER BY mwa.id DESC LIMIT 1`,
    [submissionId]
  );
  return row || null;
}

async function getCurrentPositions(submissionId) {
  const [rows] = await pool.query(
    `SELECT mpa.*, p.title, p.slug AS position_slug, p.level,
            w.name AS wing_name, w.slug AS wing_slug
     FROM member_position_assignments mpa
     JOIN portal_positions p ON p.id = mpa.position_id
     LEFT JOIN portal_wings w ON w.id = mpa.wing_id
     WHERE mpa.submission_id = ? AND mpa.is_current = TRUE AND mpa.end_date IS NULL
     ORDER BY p.level DESC, p.sort_order`,
    [submissionId]
  );
  return rows;
}

async function getPositionHistory(submissionId) {
  const [rows] = await pool.query(
    `SELECT mpa.*, p.title, p.slug AS position_slug,
            w.name AS wing_name
     FROM member_position_assignments mpa
     JOIN portal_positions p ON p.id = mpa.position_id
     LEFT JOIN portal_wings w ON w.id = mpa.wing_id
     WHERE mpa.submission_id = ?
     ORDER BY mpa.start_date DESC, p.level DESC`,
    [submissionId]
  );
  return rows;
}

async function syncSubmissionWingId(submissionId, wingId) {
  await pool.query('UPDATE fb_submissions SET wing_id = ? WHERE id = ?', [wingId, submissionId]);
}

async function closeCurrentWing(submissionId, endDate = new Date()) {
  const d = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : endDate;
  await pool.query(
    `UPDATE member_wing_assignments SET effective_to = ?
     WHERE submission_id = ? AND effective_to IS NULL`,
    [d, submissionId]
  );
}

async function assignWing({ submissionId, wingId, assignedBy, notes, effectiveFrom }) {
  await closeCurrentWing(submissionId, effectiveFrom || new Date());
  const [r] = await pool.query(
    `INSERT INTO member_wing_assignments (submission_id, wing_id, effective_from, assigned_by, notes)
     VALUES (?, ?, COALESCE(?, CURRENT_DATE), ?, ?)`,
    [submissionId, wingId, effectiveFrom || null, assignedBy || null, notes || null]
  );
  await syncSubmissionWingId(submissionId, wingId);
  return r.insertId;
}

/** One active President per wing at a time */
async function assertPresidentSlot(wingId, positionId, excludeSubmissionId = null) {
  const [[pos]] = await pool.query('SELECT slug FROM portal_positions WHERE id = ?', [positionId]);
  if (!pos || pos.slug !== 'president') return;

  let sql = `
    SELECT mpa.id, mpa.submission_id, s.applicant_name
    FROM member_position_assignments mpa
    JOIN portal_positions p ON p.id = mpa.position_id
    JOIN fb_submissions s ON s.id = mpa.submission_id
    WHERE p.slug = 'president' AND mpa.wing_id = ? AND mpa.is_current = TRUE AND mpa.end_date IS NULL`;
  const params = [wingId];
  if (excludeSubmissionId) {
    sql += ' AND mpa.submission_id != ?';
    params.push(excludeSubmissionId);
  }
  sql += ' LIMIT 1';
  const [[existing]] = await pool.query(sql, params);
  if (existing) {
    const err = new Error(`This wing already has an active President (${existing.applicant_name || 'member #' + existing.submission_id}). End that term first.`);
    err.statusCode = 409;
    throw err;
  }
}

async function endPositionsOnMembershipExpiry(submissionId) {
  const today = new Date().toISOString().slice(0, 10);
  await pool.query(
    `UPDATE member_position_assignments
     SET is_current = FALSE, end_date = COALESCE(end_date, ?), updated_at = NOW()
     WHERE submission_id = ? AND is_current = TRUE AND end_date IS NULL`,
    [today, submissionId]
  );
}

function slugify(text, suffix = '') {
  const base = String(text || 'member')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return suffix ? `${base}-${suffix}` : base;
}

async function ensurePublicSlug(submissionId) {
  const [[sub]] = await pool.query(
    'SELECT id, membership_id, applicant_name, applicant_email FROM fb_submissions WHERE id = ?',
    [submissionId]
  );
  if (!sub) return null;

  const [[prof]] = await pool.query(
    'SELECT public_slug FROM member_public_profiles WHERE submission_id = ?',
    [submissionId]
  );
  if (prof?.public_slug) return prof.public_slug;

  const base = slugify(sub.applicant_name || sub.applicant_email?.split('@')[0], sub.id);
  let slug = base;
  let n = 0;
  while (true) {
    const [[dup]] = await pool.query(
      'SELECT submission_id FROM member_public_profiles WHERE public_slug = ? AND submission_id != ?',
      [slug, submissionId]
    );
    if (!dup) break;
    n += 1;
    slug = `${base}-${n}`;
  }

  await pool.query(
    `INSERT INTO member_public_profiles (submission_id, public_slug)
     VALUES (?, ?)
     ON CONFLICT (submission_id) DO UPDATE SET public_slug = EXCLUDED.public_slug`,
    [submissionId, slug]
  );
  return slug;
}

module.exports = {
  getCurrentWing,
  getCurrentPositions,
  getPositionHistory,
  assignWing,
  closeCurrentWing,
  syncSubmissionWingId,
  assertPresidentSlot,
  endPositionsOnMembershipExpiry,
  ensurePublicSlug,
  slugify,
};
