const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { upload } = require('../middleware/upload');

const router = express.Router();

function memberAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return fail(res, 'Authentication required', 401);
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'member' && decoded.role !== 'applicant') {
      return fail(res, 'Access denied', 403);
    }
    if (!decoded.submission_id) {
      return fail(res, 'Invalid member token', 401);
    }
    req.member = decoded;
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

function sid(req) {
  return Number(req.member.submission_id);
}

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

/** Coerce empty / invalid / zero IDs to null (Number(null) === 0 breaks FKs). */
function toNullablePositiveInt(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function parseSubmissionData(raw) {
  return parseJson(raw, {});
}

async function getOrCreateProfile(submissionId) {
  const [[existing]] = await pool.query(
    'SELECT * FROM business_profiles WHERE submission_id = ? LIMIT 1',
    [submissionId]
  );
  if (existing) return existing;

  const [ins] = await pool.query(
    `INSERT INTO business_profiles (submission_id, status, completion_percent)
     VALUES (?, 'draft', 0)`,
    [submissionId]
  );
  const newId = ins.insertId;
  if (newId) {
    const [[row]] = await pool.query('SELECT * FROM business_profiles WHERE id = ?', [newId]);
    if (row) return row;
  }
  const [[row]] = await pool.query(
    'SELECT * FROM business_profiles WHERE submission_id = ? LIMIT 1',
    [submissionId]
  );
  return row;
}

async function loadRelated(profileId) {
  const [keywords] = await pool.query(
    'SELECT id, keyword FROM business_keywords WHERE profile_id = ? ORDER BY id',
    [profileId]
  );
  const [products] = await pool.query(
    'SELECT * FROM business_products_services WHERE profile_id = ? ORDER BY sort_order, id',
    [profileId]
  );
  const [socialLinks] = await pool.query(
    'SELECT * FROM business_social_links WHERE profile_id = ? ORDER BY sort_order, id',
    [profileId]
  );
  const [gallery] = await pool.query(
    'SELECT * FROM business_gallery WHERE profile_id = ? ORDER BY sort_order, id',
    [profileId]
  );
  const [achievements] = await pool.query(
    'SELECT * FROM business_achievements WHERE profile_id = ? ORDER BY sort_order, id',
    [profileId]
  );
  const [offers] = await pool.query(
    'SELECT * FROM business_offers WHERE profile_id = ? ORDER BY sort_order, id',
    [profileId]
  );
  return { keywords, products, social_links: socialLinks, gallery, achievements, offers };
}

function calcCompletion(profile, related) {
  let score = 0;
  const total = 10;
  if (profile.description?.trim()) score += 1;
  if (profile.primary_category_id) score += 1;
  if ((related.keywords || []).length > 0) score += 1;
  if ((related.products || []).length > 0) score += 1;
  if ((related.social_links || []).length > 0 || profile.website) score += 1;
  if (profile.cover_image || profile.logo_path || (related.gallery || []).length > 0) score += 1;
  if ((related.achievements || []).length > 0) score += 1;
  if ((parseJson(profile.looking_for, []) || []).length > 0) score += 1;
  if ((related.offers || []).length > 0 || (parseJson(profile.offering, []) || []).length > 0) score += 1;
  if (profile.city || profile.state || profile.address) score += 1;
  return Math.round((score / total) * 100);
}

async function hydrateProfile(profile, submissionRow) {
  const related = await loadRelated(profile.id);
  const data = parseSubmissionData(submissionRow?.data);
  const [[primaryCat]] = profile.primary_category_id
    ? await pool.query('SELECT id, name, slug FROM business_categories WHERE id = ?', [profile.primary_category_id])
    : [[null]];
  const [[subCat]] = profile.sub_category_id
    ? await pool.query('SELECT id, name, slug FROM business_categories WHERE id = ?', [profile.sub_category_id])
    : [[null]];

  const completion = calcCompletion(profile, related);
  if (completion !== profile.completion_percent) {
    await pool.query('UPDATE business_profiles SET completion_percent = ?, updated_at = NOW() WHERE id = ?', [
      completion, profile.id,
    ]);
    profile.completion_percent = completion;
  }

  return {
    ...profile,
    looking_for: parseJson(profile.looking_for, []),
    offering: parseJson(profile.offering, []),
    primary_category: primaryCat || null,
    sub_category: subCat || null,
    organisation_name: data.organisation_name || data.organization_name || data.company_name || submissionRow?.applicant_name || '',
    organisation_type: data.organisation_type || '',
    organisation_type_other: data.organisation_type_other || '',
    organisation_logo: data.organisation_logo || null,
    membership_social_links: parseJson(data.social_links, []),
    member_name: submissionRow?.applicant_name || '',
    membership_id: submissionRow?.membership_id || '',
    member_status: submissionRow?.member_status || '',
    ...related,
  };
}

async function seedCategoriesIfEmpty() {
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*)::int AS cnt FROM business_categories');
  if (Number(cnt) > 0) return;

  const TREE = [
    ['IT & Software', ['Web Development', 'Mobile App Development', 'SaaS', 'IT Consulting', 'Cybersecurity', 'Cloud Services', 'Software Development']],
    ['Manufacturing', ['Industrial Equipment', 'Automotive', 'Textiles', 'Electronics Manufacturing', 'Other Manufacturing']],
    ['Trading', ['Import/Export', 'Wholesale', 'Distribution', 'Commodity Trading']],
    ['Finance & Banking', ['Banking', 'Insurance', 'Fintech', 'Accounting', 'Investment']],
    ['Healthcare', ['Hospitals & Clinics', 'Pharma', 'Medical Devices', 'Wellness']],
    ['Education', ['Schools', 'Colleges', 'EdTech', 'Training & Coaching']],
    ['Real Estate', ['Residential', 'Commercial', 'Property Management', 'Construction Real Estate']],
    ['Hospitality', ['Hotels', 'Restaurants', 'Catering', 'Travel Services']],
    ['Retail', ['Fashion', 'Grocery', 'E-commerce Retail', 'Specialty Stores']],
    ['Logistics & Transportation', ['Freight', 'Courier', 'Fleet Services', 'Warehousing']],
    ['Professional Services', ['Consulting', 'HR Services', 'Marketing Agency', 'Design Studio']],
    ['Construction', ['Civil', 'Interior', 'Infrastructure', 'Contracting']],
    ['Agriculture', ['Farming', 'Agri Inputs', 'AgriTech', 'Dairy']],
    ['Food & Beverage', ['Food Processing', 'Beverages', 'Cloud Kitchen', 'Packaged Foods']],
    ['Media & Advertising', ['Digital Marketing', 'Advertising', 'Content Creation', 'PR']],
    ['Tourism', ['Travel Agency', 'Tour Operators', 'Experiences']],
    ['Legal Services', ['Corporate Law', 'Litigation', 'IP & Compliance']],
    ['Other', ['General Business', 'Miscellaneous']],
  ];

  let order = 0;
  for (const [parentName, children] of TREE) {
    order += 1;
    const slug = parentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [pIns] = await pool.query(
      `INSERT INTO business_categories (name, slug, parent_id, sort_order)
       VALUES (?, ?, NULL, ?) RETURNING id`,
      [parentName, slug, order]
    );
    let parentId = pIns?.rows?.[0]?.id || pIns?.insertId;
    if (!parentId) {
      const [[row]] = await pool.query('SELECT id FROM business_categories WHERE slug = ?', [slug]);
      parentId = row?.id;
    }
    let cOrder = 0;
    for (const child of children) {
      cOrder += 1;
      const cSlug = `${slug}-${child.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      await pool.query(
        `INSERT INTO business_categories (name, slug, parent_id, sort_order)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (slug) DO NOTHING`,
        [child, cSlug, parentId, cOrder]
      );
    }
  }
}

// ── PUBLIC: categories ─────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    await seedCategoriesIfEmpty();
    const [rows] = await pool.query(
      `SELECT id, name, slug, parent_id, sort_order
       FROM business_categories WHERE is_active = TRUE
       ORDER BY sort_order, name`
    );
    const parents = rows.filter(r => !r.parent_id);
    const tree = parents.map(p => ({
      ...p,
      children: rows.filter(c => Number(c.parent_id) === Number(p.id)),
    }));
    return ok(res, tree);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC directory facets (states/cities from published businesses) ──────
router.get('/directory/facets', async (req, res) => {
  try {
    const published = `bp.status = 'published' AND COALESCE(s.member_status, '') = 'active'`;
    const [states] = await pool.query(
      `SELECT DISTINCT TRIM(bp.state) AS value, COUNT(*)::int AS count
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE ${published} AND bp.state IS NOT NULL AND TRIM(bp.state) <> ''
       GROUP BY TRIM(bp.state)
       ORDER BY TRIM(bp.state)`
    );
    const [cities] = await pool.query(
      `SELECT DISTINCT TRIM(bp.city) AS value, TRIM(bp.state) AS state, COUNT(*)::int AS count
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE ${published} AND bp.city IS NOT NULL AND TRIM(bp.city) <> ''
       GROUP BY TRIM(bp.city), TRIM(bp.state)
       ORDER BY TRIM(bp.city)`
    );
    const [countries] = await pool.query(
      `SELECT DISTINCT TRIM(bp.country) AS value, COUNT(*)::int AS count
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE ${published} AND bp.country IS NOT NULL AND TRIM(bp.country) <> ''
       GROUP BY TRIM(bp.country)
       ORDER BY TRIM(bp.country)`
    );
    return ok(res, { states, cities, countries });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── PUBLIC directory (searchable marketplace cards) ────────────────────────
router.get('/directory', async (req, res) => {
  try {
    const {
      q, category_id, sub_category_id, city, state, country, keyword, offering_deals,
      page = 1, per_page = 12,
    } = req.query;
    const params = [];
    // Only fully published profiles of active members
    let where = `WHERE bp.status = 'published'
      AND COALESCE(s.member_status, '') = 'active'`;

    if (q) {
      const like = `%${String(q).trim()}%`;
      where += ` AND (
        COALESCE(s.data->>'organisation_name','') ILIKE ?
        OR COALESCE(s.data->>'organization_name','') ILIKE ?
        OR COALESCE(s.data->>'company_name','') ILIKE ?
        OR COALESCE(s.applicant_name,'') ILIKE ?
        OR COALESCE(bp.description,'') ILIKE ?
        OR COALESCE(bc.name,'') ILIKE ?
        OR COALESCE(sc.name,'') ILIKE ?
        OR EXISTS (
          SELECT 1 FROM business_keywords bk0
          WHERE bk0.profile_id = bp.id AND bk0.keyword ILIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM business_products_services bps0
          WHERE bps0.profile_id = bp.id
            AND (bps0.name ILIKE ? OR COALESCE(bps0.description,'') ILIKE ?)
        )
      )`;
      params.push(like, like, like, like, like, like, like, like, like, like);
    }
    if (category_id) {
      where += ' AND bp.primary_category_id = ?';
      params.push(Number(category_id));
    }
    if (sub_category_id) {
      where += ' AND bp.sub_category_id = ?';
      params.push(Number(sub_category_id));
    }
    if (city) {
      where += ' AND bp.city ILIKE ?';
      params.push(`%${String(city).trim()}%`);
    }
    if (state) {
      where += ' AND bp.state ILIKE ?';
      params.push(`%${String(state).trim()}%`);
    }
    if (country) {
      where += ' AND bp.country ILIKE ?';
      params.push(`%${String(country).trim()}%`);
    }
    if (keyword) {
      where += ` AND (
        EXISTS (
          SELECT 1 FROM business_keywords bk
          WHERE bk.profile_id = bp.id AND bk.keyword ILIKE ?
        )
        OR EXISTS (
          SELECT 1 FROM business_products_services bps
          WHERE bps.profile_id = bp.id
            AND (bps.name ILIKE ? OR COALESCE(bps.description,'') ILIKE ?)
        )
        OR COALESCE(bc.name,'') ILIKE ?
        OR COALESCE(sc.name,'') ILIKE ?
      )`;
      const kw = `%${String(keyword).trim()}%`;
      params.push(kw, kw, kw, kw, kw);
    }
    if (String(offering_deals) === '1') {
      where += ` AND EXISTS (
        SELECT 1 FROM business_offers bo
        WHERE bo.profile_id = bp.id
          AND bo.status = 'active'
          AND (bo.valid_until IS NULL OR bo.valid_until >= CURRENT_DATE)
      )`;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(48, Math.max(1, parseInt(per_page, 10) || 12));
    const offset = (pageNum - 1) * perPage;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       LEFT JOIN business_categories bc ON bc.id = bp.primary_category_id
       LEFT JOIN business_categories sc ON sc.id = bp.sub_category_id
       ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT bp.id, bp.submission_id, bp.description, bp.city, bp.state, bp.country,
              bp.logo_path, bp.cover_image, bp.status, bp.website,
              bp.primary_category_id, bp.sub_category_id,
              s.membership_id, s.member_status, s.applicant_name, s.data,
              bc.name AS primary_category_name,
              sc.name AS sub_category_name
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       LEFT JOIN business_categories bc ON bc.id = bp.primary_category_id
       LEFT JOIN business_categories sc ON sc.id = bp.sub_category_id
       ${where}
       ORDER BY bp.published_at DESC NULLS LAST, bp.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    );

    const ids = rows.map(r => r.id);
    let productsBy = {};
    let offersBy = {};
    let keywordsBy = {};
    let socialBy = {};

    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      const [products] = await pool.query(
        `SELECT profile_id, id, name, item_type, description
         FROM business_products_services
         WHERE profile_id IN (${ph})
         ORDER BY sort_order, id`,
        ids
      );
      const [offers] = await pool.query(
        `SELECT profile_id, id, title, offer_type, discount_value, description, valid_until, status, terms
         FROM business_offers
         WHERE profile_id IN (${ph})
           AND status = 'active'
           AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
         ORDER BY sort_order, id`,
        ids
      );
      const [keywords] = await pool.query(
        `SELECT profile_id, keyword FROM business_keywords WHERE profile_id IN (${ph}) ORDER BY id`,
        ids
      );
      const [social] = await pool.query(
        `SELECT profile_id, platform, url FROM business_social_links WHERE profile_id IN (${ph}) ORDER BY sort_order, id`,
        ids
      );

      for (const p of products) {
        (productsBy[p.profile_id] ||= []).push(p);
      }
      for (const o of offers) {
        (offersBy[o.profile_id] ||= []).push(o);
      }
      for (const k of keywords) {
        (keywordsBy[k.profile_id] ||= []).push(k.keyword);
      }
      for (const s of social) {
        (socialBy[s.profile_id] ||= []).push({ platform: s.platform, url: s.url });
      }
    }

    const data = rows.map(r => {
      const d = parseSubmissionData(r.data);
      const desc = r.description || '';
      const offers = offersBy[r.id] || [];
      return {
        id: r.id,
        organisation_name: d.organisation_name || d.organization_name || d.company_name || '',
        member_name: r.applicant_name || '',
        organisation_logo: r.logo_path || d.organisation_logo || null,
        logo_path: r.logo_path || d.organisation_logo || null,
        cover_image: r.cover_image,
        description: desc,
        short_description: desc.length > 140 ? `${desc.slice(0, 137)}…` : desc,
        city: r.city,
        state: r.state,
        country: r.country,
        website: r.website,
        primary_category: r.primary_category_name,
        sub_category: r.sub_category_name,
        primary_category_id: r.primary_category_id,
        sub_category_id: r.sub_category_id,
        membership_id: r.membership_id,
        member_status: r.member_status,
        keywords: keywordsBy[r.id] || [],
        products: (productsBy[r.id] || []).slice(0, 4),
        offers: offers.slice(0, 2),
        social_links: (socialBy[r.id] || []).filter(l => l?.url?.trim()),
        has_offers: offers.length > 0,
      };
    });

    return ok(res, {
      items: data,
      total: Number(total) || 0,
      page: pageNum,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil((Number(total) || 0) / perPage)),
    });
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Auth: get my profile ───────────────────────────────────────────────────
router.get('/', memberAuth, async (req, res) => {
  try {
    const submissionId = sid(req);
    const [[sub]] = await pool.query(
      `SELECT id, applicant_name, membership_id, member_status, data
       FROM fb_submissions WHERE id = ? LIMIT 1`,
      [submissionId]
    );
    if (!sub) return fail(res, 'Member submission not found', 404);

    const profile = await getOrCreateProfile(submissionId);
    const hydrated = await hydrateProfile(profile, sub);
    return ok(res, hydrated);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Auth: save / update profile core fields ────────────────────────────────
router.put('/', memberAuth, async (req, res) => {
  try {
    const submissionId = sid(req);
    const profile = await getOrCreateProfile(submissionId);
    const b = req.body || {};

    const lookingFor = Array.isArray(b.looking_for) ? b.looking_for : parseJson(b.looking_for, []);
    const offering = Array.isArray(b.offering) ? b.offering : parseJson(b.offering, []);

    await pool.query(
      `UPDATE business_profiles SET
         description = COALESCE(?, description),
         established_year = COALESCE(?, established_year),
         employee_count = COALESCE(?, employee_count),
         website = COALESCE(?, website),
         business_email = COALESCE(?, business_email),
         business_phone = COALESCE(?, business_phone),
         primary_category_id = COALESCE(?, primary_category_id),
         sub_category_id = COALESCE(?, sub_category_id),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         district = COALESCE(?, district),
         state = COALESCE(?, state),
         country = COALESCE(?, country),
         pin_code = COALESCE(?, pin_code),
         show_address_publicly = COALESCE(?, show_address_publicly),
         looking_for = COALESCE(?::jsonb, looking_for),
         offering = COALESCE(?::jsonb, offering),
         updated_at = NOW()
       WHERE id = ?`,
      [
        b.description !== undefined ? b.description : null,
        b.established_year !== undefined && b.established_year !== ''
          ? toNullablePositiveInt(b.established_year)
          : null,
        b.employee_count !== undefined ? b.employee_count : null,
        b.website !== undefined ? b.website : null,
        b.business_email !== undefined ? b.business_email : null,
        b.business_phone !== undefined ? b.business_phone : null,
        b.primary_category_id !== undefined ? toNullablePositiveInt(b.primary_category_id) : null,
        b.sub_category_id !== undefined ? toNullablePositiveInt(b.sub_category_id) : null,
        b.address !== undefined ? b.address : null,
        b.city !== undefined ? b.city : null,
        b.district !== undefined ? b.district : null,
        b.state !== undefined ? b.state : null,
        b.country !== undefined ? b.country : null,
        b.pin_code !== undefined ? b.pin_code : null,
        b.show_address_publicly !== undefined ? !!b.show_address_publicly : null,
        JSON.stringify(lookingFor),
        JSON.stringify(offering),
        profile.id,
      ]
    );

    // Keywords replace when provided
    if (Array.isArray(b.keywords)) {
      await pool.query('DELETE FROM business_keywords WHERE profile_id = ?', [profile.id]);
      for (const kw of b.keywords) {
        const keyword = String(kw || '').trim();
        if (!keyword) continue;
        await pool.query(
          `INSERT INTO business_keywords (profile_id, keyword) VALUES (?, ?)
           ON CONFLICT (profile_id, keyword) DO NOTHING`,
          [profile.id, keyword.slice(0, 100)]
        );
      }
    }

    // Social links replace when provided
    if (Array.isArray(b.social_links)) {
      await pool.query('DELETE FROM business_social_links WHERE profile_id = ?', [profile.id]);
      let i = 0;
      for (const link of b.social_links) {
        const platform = String(link.platform || '').trim();
        const url = String(link.url || '').trim();
        if (!platform || !url) continue;
        i += 1;
        await pool.query(
          `INSERT INTO business_social_links (profile_id, platform, url, sort_order) VALUES (?,?,?,?)`,
          [profile.id, platform, url, i]
        );
      }
    }

    const [[sub]] = await pool.query(
      `SELECT id, applicant_name, membership_id, member_status, data FROM fb_submissions WHERE id = ?`,
      [submissionId]
    );
    const [[updated]] = await pool.query('SELECT * FROM business_profiles WHERE id = ?', [profile.id]);
    return ok(res, await hydrateProfile(updated, sub), 'Business profile saved');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Submit profile ─────────────────────────────────────────────────────────
router.post('/submit', memberAuth, async (req, res) => {
  try {
    const submissionId = sid(req);
    const profile = await getOrCreateProfile(submissionId);
    const related = await loadRelated(profile.id);

    if (!profile.description?.trim()) {
      return fail(res, 'Business description is required', 422);
    }
    if (!profile.primary_category_id) {
      return fail(res, 'Primary business category is required', 422);
    }

    const completion = calcCompletion(profile, related);
    await pool.query(
      `UPDATE business_profiles SET
         status = 'published',
         completion_percent = ?,
         submitted_at = COALESCE(submitted_at, NOW()),
         published_at = NOW(),
         updated_at = NOW()
       WHERE id = ?`,
      [completion, profile.id]
    );

    const [[sub]] = await pool.query(
      `SELECT id, applicant_name, membership_id, member_status, data FROM fb_submissions WHERE id = ?`,
      [submissionId]
    );
    const [[updated]] = await pool.query('SELECT * FROM business_profiles WHERE id = ?', [profile.id]);
    return ok(res, await hydrateProfile(updated, sub), 'Business profile submitted');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Products & services ────────────────────────────────────────────────────
router.put('/products', memberAuth, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(sid(req));
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await pool.query('DELETE FROM business_products_services WHERE profile_id = ?', [profile.id]);
    let i = 0;
    for (const item of items) {
      const name = String(item.name || '').trim();
      if (!name) continue;
      i += 1;
      await pool.query(
        `INSERT INTO business_products_services (profile_id, name, item_type, description, sort_order)
         VALUES (?,?,?,?,?)`,
        [profile.id, name, item.item_type === 'product' ? 'product' : 'service', item.description || null, i]
      );
    }
    const [rows] = await pool.query(
      'SELECT * FROM business_products_services WHERE profile_id = ? ORDER BY sort_order, id',
      [profile.id]
    );
    return ok(res, rows, 'Products & services updated');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Achievements ───────────────────────────────────────────────────────────
router.put('/achievements', memberAuth, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(sid(req));
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    // Keep existing image paths when id matches — simpler: replace all text fields, preserve images from payload
    await pool.query('DELETE FROM business_achievements WHERE profile_id = ?', [profile.id]);
    let i = 0;
    for (const item of items) {
      const title = String(item.title || '').trim();
      if (!title) continue;
      i += 1;
      await pool.query(
        `INSERT INTO business_achievements
           (profile_id, title, year, issued_by, description, image_path, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          profile.id, title,
          (() => {
            const y = toNullablePositiveInt(item.year);
            const maxY = new Date().getFullYear();
            if (!y || y < 1900 || y > maxY) return null;
            return y;
          })(),
          item.issued_by || null,
          item.description || null,
          item.image_path || null,
          i,
        ]
      );
    }
    const [rows] = await pool.query(
      'SELECT * FROM business_achievements WHERE profile_id = ? ORDER BY sort_order, id',
      [profile.id]
    );
    return ok(res, rows, 'Achievements updated');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Offers ─────────────────────────────────────────────────────────────────
router.put('/offers', memberAuth, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(sid(req));
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await pool.query('DELETE FROM business_offers WHERE profile_id = ?', [profile.id]);
    let i = 0;
    for (const item of items) {
      const title = String(item.title || '').trim();
      if (!title) continue;
      i += 1;
      await pool.query(
        `INSERT INTO business_offers
           (profile_id, title, offer_type, discount_value, description, valid_until, terms, status, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          profile.id, title,
          item.offer_type || 'percentage',
          item.discount_value || null,
          item.description || null,
          item.valid_until || null,
          item.terms || null,
          item.status === 'inactive' ? 'inactive' : 'active',
          i,
        ]
      );
    }
    const [rows] = await pool.query(
      'SELECT * FROM business_offers WHERE profile_id = ? ORDER BY sort_order, id',
      [profile.id]
    );
    return ok(res, rows, 'Offers updated');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Uploads ────────────────────────────────────────────────────────────────
router.post('/upload/logo', memberAuth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return fail(res, 'Logo file required', 422);
    const profile = await getOrCreateProfile(sid(req));
    const logoPath = `/uploads/logos/${req.file.filename}`;
    await pool.query(
      'UPDATE business_profiles SET logo_path = ?, updated_at = NOW() WHERE id = ?',
      [logoPath, profile.id]
    );
    return ok(res, { logo_path: logoPath }, 'Logo uploaded');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.post('/upload/cover', memberAuth, upload.single('cover_image'), async (req, res) => {
  try {
    if (!req.file) return fail(res, 'Cover image required', 422);
    const profile = await getOrCreateProfile(sid(req));
    const coverPath = `/uploads/org/${req.file.filename}`;
    // multer may put cover in photos if field routing differs — normalize
    const stored = req.file.path?.includes(`${path.sep}org${path.sep}`)
      ? coverPath
      : `/uploads/${req.file.destination?.split(/[/\\]/).pop() || 'photos'}/${req.file.filename}`;
    const finalPath = stored.includes('/uploads/') ? stored : coverPath;
    // Prefer explicit org path if file was moved there by multer fieldname cover_image
    const diskOrg = path.join(__dirname, '../../uploads/org', req.file.filename);
    const diskPhotos = path.join(__dirname, '../../uploads/photos', req.file.filename);
    let imagePath = `/uploads/photos/${req.file.filename}`;
    if (fs.existsSync(diskOrg)) imagePath = `/uploads/org/${req.file.filename}`;
    else if (fs.existsSync(diskPhotos)) imagePath = `/uploads/photos/${req.file.filename}`;
    else imagePath = finalPath;

    await pool.query(
      'UPDATE business_profiles SET cover_image = ?, updated_at = NOW() WHERE id = ?',
      [imagePath, profile.id]
    );
    return ok(res, { cover_image: imagePath }, 'Cover uploaded');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.post('/upload/gallery', memberAuth, upload.array('gallery', 12), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return fail(res, 'At least one image required', 422);
    const profile = await getOrCreateProfile(sid(req));
    const [[agg]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order),0) AS m FROM business_gallery WHERE profile_id = ?',
      [profile.id]
    );
    let order = Number(agg?.m || 0);
    const created = [];
    for (const file of files) {
      order += 1;
      const imagePath = `/uploads/photos/${file.filename}`;
      const [ins] = await pool.query(
        `INSERT INTO business_gallery (profile_id, image_path, sort_order)
         VALUES (?,?,?) RETURNING *`,
        [profile.id, imagePath, order]
      );
      const row = ins?.rows?.[0];
      if (row) created.push(row);
      else {
        const [[r]] = await pool.query(
          'SELECT * FROM business_gallery WHERE profile_id = ? ORDER BY id DESC LIMIT 1',
          [profile.id]
        );
        if (r) created.push(r);
      }
    }
    return ok(res, created, 'Gallery images uploaded');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.delete('/gallery/:id', memberAuth, async (req, res) => {
  try {
    const profile = await getOrCreateProfile(sid(req));
    await pool.query(
      'DELETE FROM business_gallery WHERE id = ? AND profile_id = ?',
      [req.params.id, profile.id]
    );
    return ok(res, null, 'Gallery image removed');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.post('/upload/achievement', memberAuth, upload.single('achievement_image'), async (req, res) => {
  try {
    if (!req.file) return fail(res, 'Image required', 422);
    return ok(res, { image_path: `/uploads/photos/${req.file.filename}` }, 'Achievement image uploaded');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// Public single profile by id (directory detail)
router.get('/public/:id', async (req, res) => {
  try {
    const [[profile]] = await pool.query(
      `SELECT bp.* FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE bp.id = ?
         AND bp.status = 'published'
         AND COALESCE(s.member_status, '') = 'active'
       LIMIT 1`,
      [req.params.id]
    );
    if (!profile) return fail(res, 'Not found', 404);
    const [[sub]] = await pool.query(
      `SELECT id, applicant_name, membership_id, member_status, data FROM fb_submissions WHERE id = ?`,
      [profile.submission_id]
    );
    const hydrated = await hydrateProfile(profile, sub);
    // Privacy: exact address / PIN only when member opted in
    if (!hydrated.show_address_publicly) {
      hydrated.address = null;
      hydrated.pin_code = null;
    }
    // Active + non-expired offers only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hydrated.offers = (hydrated.offers || []).filter((o) => {
      if (String(o.status || '').toLowerCase() !== 'active') return false;
      if (!o.valid_until) return true;
      const until = new Date(o.valid_until);
      if (Number.isNaN(until.getTime())) return true;
      until.setHours(0, 0, 0, 0);
      return until >= today;
    });
    return ok(res, hydrated);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

// ── Quote requests (active members only) ───────────────────────────────────
router.post('/quotes', memberAuth, async (req, res) => {
  try {
    const requesterId = sid(req);
    const [[requester]] = await pool.query(
      `SELECT id, applicant_name, applicant_email, applicant_phone, membership_id, member_status, data
       FROM fb_submissions WHERE id = ? LIMIT 1`,
      [requesterId]
    );
    if (!requester || requester.member_status !== 'active') {
      return fail(res, 'Only active FORTI members can request a quote', 403);
    }

    const b = req.body || {};
    const businessProfileId = Number(b.business_profile_id);
    if (!businessProfileId) return fail(res, 'business_profile_id is required', 422);
    const requirement = String(b.requirement || '').trim();
    if (!requirement) return fail(res, 'Requirement is required', 422);

    const [[biz]] = await pool.query(
      `SELECT bp.id, bp.submission_id, bp.status
       FROM business_profiles bp
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE bp.id = ?
         AND bp.status = 'published'
         AND COALESCE(s.member_status,'') = 'active'
       LIMIT 1`,
      [businessProfileId]
    );
    if (!biz) return fail(res, 'Business not found or not published', 404);
    if (Number(biz.submission_id) === requesterId) {
      return fail(res, 'You cannot send a quote request to your own business', 422);
    }

    let productName = b.product_service_name ? String(b.product_service_name).trim() : null;
    let productId = b.product_service_id ? Number(b.product_service_id) : null;
    if (productId) {
      const [[prod]] = await pool.query(
        `SELECT id, name FROM business_products_services WHERE id = ? AND profile_id = ?`,
        [productId, businessProfileId]
      );
      if (!prod) return fail(res, 'Selected product/service not found', 422);
      productName = prod.name;
    }

    const [ins] = await pool.query(
      `INSERT INTO business_quote_requests
         (business_profile_id, requester_submission_id, product_service_id, product_service_name,
          requirement, budget, quantity, timeline, message, status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [
        businessProfileId,
        requesterId,
        productId,
        productName,
        requirement,
        b.budget ? String(b.budget).trim() : null,
        b.quantity ? String(b.quantity).trim() : null,
        b.timeline ? String(b.timeline).trim() : null,
        b.message ? String(b.message).trim() : null,
      ]
    );

    const [[row]] = await pool.query('SELECT * FROM business_quote_requests WHERE id = ?', [ins.insertId]);
    return ok(res, row, 'Quote request sent');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.get('/quotes/received', memberAuth, async (req, res) => {
  try {
    const ownerId = sid(req);
    const [[profile]] = await pool.query(
      'SELECT id FROM business_profiles WHERE submission_id = ? LIMIT 1',
      [ownerId]
    );
    if (!profile) return ok(res, []);

    const [rows] = await pool.query(
      `SELECT q.*,
              s.applicant_name AS requester_name,
              s.applicant_email AS requester_email,
              s.applicant_phone AS requester_phone,
              s.membership_id AS requester_membership_id,
              s.member_status AS requester_member_status
       FROM business_quote_requests q
       JOIN fb_submissions s ON s.id = q.requester_submission_id
       WHERE q.business_profile_id = ?
       ORDER BY q.created_at DESC
       LIMIT 200`,
      [profile.id]
    );
    return ok(res, rows);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.get('/quotes/sent', memberAuth, async (req, res) => {
  try {
    const requesterId = sid(req);
    const [rows] = await pool.query(
      `SELECT q.*,
              bp.id AS business_id,
              COALESCE(s.data->>'organisation_name', s.data->>'company_name', s.applicant_name) AS business_name,
              bp.logo_path
       FROM business_quote_requests q
       JOIN business_profiles bp ON bp.id = q.business_profile_id
       JOIN fb_submissions s ON s.id = bp.submission_id
       WHERE q.requester_submission_id = ?
       ORDER BY q.created_at DESC
       LIMIT 200`,
      [requesterId]
    );
    return ok(res, rows);
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

router.patch('/quotes/:id/status', memberAuth, async (req, res) => {
  try {
    const ownerId = sid(req);
    const quoteId = Number(req.params.id);
    let nextStatus = String(req.body?.status || '').trim().toLowerCase();
    // Normalize legacy aliases
    if (nextStatus === 'new') nextStatus = 'pending';
    if (nextStatus === 'closed') nextStatus = 'completed';
    const allowed = ['pending', 'contacted', 'accepted', 'rejected', 'completed'];
    if (!allowed.includes(nextStatus)) {
      return fail(res, 'Invalid status. Use pending, contacted, accepted, rejected, or completed.', 422);
    }

    const [[profile]] = await pool.query(
      'SELECT id FROM business_profiles WHERE submission_id = ? LIMIT 1',
      [ownerId]
    );
    if (!profile) return fail(res, 'Business profile not found', 404);

    const [upd] = await pool.query(
      `UPDATE business_quote_requests
       SET status = ?, updated_at = NOW()
       WHERE id = ? AND business_profile_id = ?`,
      [nextStatus, quoteId, profile.id]
    );
    if (!upd.affectedRows) return fail(res, 'Quote request not found', 404);

    const [[row]] = await pool.query('SELECT * FROM business_quote_requests WHERE id = ?', [quoteId]);
    return ok(res, row, 'Status updated');
  } catch (err) {
    console.error(err);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
module.exports.seedBusinessCategoriesIfEmpty = seedCategoriesIfEmpty;
module.exports.ensureBusinessProfileTables = async function ensureBusinessProfileTables() {
  const migrationPath = path.join(__dirname, '../../../database/migrations/05-business-profiles.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
  await seedCategoriesIfEmpty();
};
