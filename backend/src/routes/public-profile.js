const express = require('express');
const { pool } = require('../config/database');
const { ok, fail } = require('../utils/helpers');
const { getCurrentWing, getCurrentPositions, getPositionHistory } = require('../utils/memberOrg');

const router = express.Router();

function youtubeEmbed(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// GET /api/public/profile — directory (must be before /:slug)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.public_slug, p.headline, p.profile_photo_path, s.applicant_name, s.membership_id,
              w.name AS wing_name
       FROM member_public_profiles p
       JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_wings w ON w.id = s.wing_id
       WHERE p.is_public = TRUE AND s.member_status = 'active'
       ORDER BY s.applicant_name LIMIT 200`
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Server error', 500);
  }
});

// GET /api/public/profile/:slug
router.get('/:slug', async (req, res) => {
  try {
    const [[profile]] = await pool.query(
      `SELECT p.*, s.applicant_name, s.applicant_email, s.applicant_phone, s.membership_id,
              s.member_status, s.status, s.data AS application_data, s.approved_at,
              pk.name AS package_name
       FROM member_public_profiles p
       JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_packages pk ON pk.id = s.package_id
       WHERE p.public_slug = ? AND p.is_public = TRUE
         AND s.status IN ('active','approved')
         AND s.member_status = 'active'`,
      [req.params.slug]
    );
    if (!profile) return fail(res, 'Profile not found or not public', 404);

    await pool.query(
      'UPDATE member_public_profiles SET view_count = view_count + 1 WHERE submission_id = ?',
      [profile.submission_id]
    );

    const wing = await getCurrentWing(profile.submission_id);
    const positions = profile.show_positions ? await getCurrentPositions(profile.submission_id) : [];
    const pastPositions = profile.show_past_positions
      ? (await getPositionHistory(profile.submission_id)).filter(p => !p.is_current || p.end_date)
      : [];

    const [links] = await pool.query(
      `SELECT * FROM member_profile_links
       WHERE submission_id = ? AND is_active = TRUE ORDER BY sort_order, id`,
      [profile.submission_id]
    );

    const enrichedLinks = links.map(l => ({
      ...l,
      youtube_embed: l.link_type === 'youtube' ? youtubeEmbed(l.url) : null,
    }));

    const blocks = [];
    if (profile.about_me) blocks.push({ type: 'about_me', title: 'About Me', content: profile.about_me });
    if (profile.my_org) blocks.push({ type: 'my_org', title: 'My Organisation', content: profile.my_org });
    if (profile.org_history) blocks.push({ type: 'org_history', title: 'History', content: profile.org_history });

    return ok(res, {
      name: profile.applicant_name,
      membership_id: profile.membership_id,
      package_name: profile.package_name,
      approved_at: profile.approved_at,
      application_data: profile.application_data,
      email: profile.show_email ? profile.applicant_email : null,
      phone: profile.show_phone ? profile.applicant_phone : null,
      headline: profile.headline,
      about_me: profile.about_me,
      my_org: profile.my_org,
      org_history: profile.org_history,
      photo: profile.profile_photo_path,
      cover: profile.cover_image_path,
      theme_color: profile.theme_color || '#6C3EAB',
      text_color: profile.text_color || '#000000',
      background_style: profile.background_style || 'solid',
      button_style: profile.button_style || 'rounded',
      wing,
      positions,
      past_positions: pastPositions,
      blocks,
      links: enrichedLinks,
    });
  } catch (err) {
    console.error('[public profile]', err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
