const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail, paginate } = require('../utils/helpers');

const router = express.Router();

function toBool(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const INDIA_SQL = `(upper(COALESCE(c.iso_code, '')) = 'IN' OR lower(COALESCE(c.name, '')) = 'india')`;

const BRANCH_FROM = `
  FROM portal_branches b
  LEFT JOIN countries c ON c.id = b.country_id
  LEFT JOIN states s ON s.id = b.state_id
  LEFT JOIN cities ci ON ci.id = b.city_id
`;

const BRANCH_SELECT = `
  SELECT
    b.id,
    b.name,
    b.country_id,
    b.state_id,
    b.city_id,
    b.is_active,
    b.created_at,
    c.name  AS country_name,
    s.name  AS state_name,
    ci.name AS city_name
  ${BRANCH_FROM}
`;

async function resolveGeoIds({ country_id, state_id, city_id }) {
  let countryId = toNullableInt(country_id);
  let stateId = toNullableInt(state_id);
  let cityId = toNullableInt(city_id);

  if (cityId) {
    const [[city]] = await pool.query(
      'SELECT id, state_id, country_id FROM cities WHERE id = ? LIMIT 1',
      [cityId]
    );
    if (!city) throw Object.assign(new Error('Invalid city_id'), { status: 422 });
    if (!stateId && city.state_id) stateId = city.state_id;
    if (!countryId && city.country_id) countryId = city.country_id;
  }

  if (stateId) {
    const [[state]] = await pool.query(
      'SELECT id, country_id FROM states WHERE id = ? LIMIT 1',
      [stateId]
    );
    if (!state) throw Object.assign(new Error('Invalid state_id'), { status: 422 });
    if (!countryId) countryId = state.country_id;
  }

  if (countryId) {
    const [[country]] = await pool.query(
      'SELECT id FROM countries WHERE id = ? LIMIT 1',
      [countryId]
    );
    if (!country) throw Object.assign(new Error('Invalid country_id'), { status: 422 });
  }

  return { countryId, stateId, cityId };
}

async function isIndiaCountry(countryId) {
  if (!countryId) return false;
  const [[row]] = await pool.query(
    `SELECT id FROM countries
     WHERE id = ?
       AND (upper(COALESCE(iso_code, '')) = 'IN' OR lower(name) = 'india')
     LIMIT 1`,
    [countryId]
  );
  return !!row;
}

async function getIndiaCountryId() {
  const [[row]] = await pool.query(
    `SELECT id FROM countries
     WHERE upper(COALESCE(iso_code, '')) = 'IN' OR lower(name) = 'india'
     ORDER BY id LIMIT 1`
  );
  return row?.id || null;
}

function buildBranchFilters(query, { publicActiveOnly = false } = {}) {
  const where = [];
  const params = [];

  const scope = String(query.scope || '').toLowerCase();
  const status = String(query.status || '').toLowerCase();
  const q = String(query.q || query.search || '').trim();
  const countryId = toNullableInt(query.country_id);
  const stateId = toNullableInt(query.state_id);
  const cityId = toNullableInt(query.city_id);
  const includeInactive = String(query.include_inactive || '') === '1';

  if (publicActiveOnly || (!includeInactive && status !== 'inactive' && status !== 'all' && !status)) {
    where.push('(b.is_active IS TRUE OR b.is_active IS NULL)');
  } else if (status === 'active') {
    where.push('(b.is_active IS TRUE OR b.is_active IS NULL)');
  } else if (status === 'inactive') {
    where.push('(b.is_active IS FALSE)');
  }
  // status === 'all' or include_inactive with no status → no status clause

  if (scope === 'indian' || scope === 'india') {
    where.push(`(
      ${INDIA_SQL}
      OR (b.country_id IS NULL AND b.state_id IS NOT NULL)
    )`);
  } else if (scope === 'overseas') {
    where.push(`b.country_id IS NOT NULL AND NOT ${INDIA_SQL}`);
  }

  if (countryId) {
    where.push('b.country_id = ?');
    params.push(countryId);
  }
  if (stateId) {
    where.push('b.state_id = ?');
    params.push(stateId);
  }
  if (cityId) {
    // Admin filter: exact city match only
    if (String(query.city_mode || '') === 'membership') {
      where.push('(b.city_id = ? OR (b.city_id IS NULL AND b.state_id = (SELECT state_id FROM cities WHERE id = ? LIMIT 1)))');
      params.push(cityId, cityId);
    } else {
      where.push('b.city_id = ?');
      params.push(cityId);
    }
  }

  if (q) {
    where.push(`(
      b.name ILIKE ?
      OR COALESCE(c.name, '') ILIKE ?
      OR COALESCE(s.name, '') ILIKE ?
      OR COALESCE(ci.name, '') ILIKE ?
    )`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
}

// GET /api/branches
// - No page: legacy public list (active only) for membership form
// - With page / scope / admin filters: paginated admin list
router.get('/', async (req, res) => {
  try {
    const page = req.query.page !== undefined ? Math.max(1, Number(req.query.page) || 1) : null;
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 20));
    const isAdminList = page !== null || req.query.scope || req.query.status || req.query.include_inactive === '1';

    if (!isAdminList) {
      // Membership / public: active only; optional geo filters with membership city fallback
      const { whereSql, params } = buildBranchFilters(
        { ...req.query, city_mode: 'membership', include_inactive: '0', status: 'active' },
        { publicActiveOnly: true }
      );
      const sql = `${BRANCH_SELECT}
        ${whereSql}
        ORDER BY c.name NULLS LAST, s.name NULLS LAST, ci.name NULLS LAST, b.name`;
      const [rows] = await pool.query(sql, params);
      return ok(res, rows);
    }

    const { whereSql, params } = buildBranchFilters({
      ...req.query,
      include_inactive: req.query.include_inactive || '1',
      status: req.query.status || 'all',
    });

    const listSql = `${BRANCH_SELECT}
      ${whereSql}
      ORDER BY c.name NULLS LAST, s.name NULLS LAST, ci.name NULLS LAST, b.name`;

    const result = await paginate(pool, listSql, params, page || 1, perPage);
    return ok(res, result);
  } catch (err) {
    console.error('[GET /api/branches]', err.message);
    return fail(res, 'Server error', 500);
  }
});

router.use(authMiddleware);
router.use(requireRole('super_admin', 'admin'));

// POST /api/branches
router.post('/', async (req, res) => {
  const { name, country_id, state_id, city_id, is_active, scope } = req.body;
  if (!name || !String(name).trim()) return fail(res, 'Branch name is required', 422);

  try {
    let geo = await resolveGeoIds({ country_id, state_id, city_id });

    // Indian tab: force India country when missing
    if (String(scope || '').toLowerCase() === 'indian' && !geo.countryId) {
      geo.countryId = await getIndiaCountryId();
    }

    if (!geo.countryId) return fail(res, 'Country is required', 422);

    const india = await isIndiaCountry(geo.countryId);
    if (india && !geo.stateId) return fail(res, 'State is required for India', 422);
    if (!india) {
      // Overseas: clear state unless explicitly provided
      if (String(scope || '').toLowerCase() === 'overseas') {
        geo.stateId = geo.stateId || null;
      }
    }

    const [r] = await pool.query(
      `INSERT INTO portal_branches (name, country_id, state_id, city_id, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        geo.countryId,
        geo.stateId,
        geo.cityId,
        toBool(is_active, true),
      ]
    );
    return ok(res, { id: r.insertId }, 'Branch created successfully', 201);
  } catch (err) {
    if (err.status === 422) return fail(res, err.message, 422);
    console.error('[POST /api/branches]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/branches/:id
router.put('/:id', async (req, res) => {
  const { name, country_id, state_id, city_id, is_active, scope } = req.body;
  if (!name || !String(name).trim()) return fail(res, 'Branch name is required', 422);

  try {
    let geo = await resolveGeoIds({ country_id, state_id, city_id });

    if (String(scope || '').toLowerCase() === 'indian' && !geo.countryId) {
      geo.countryId = await getIndiaCountryId();
    }

    if (!geo.countryId) return fail(res, 'Country is required', 422);

    const india = await isIndiaCountry(geo.countryId);
    if (india && !geo.stateId) return fail(res, 'State is required for India', 422);

    await pool.query(
      `UPDATE portal_branches
       SET name=?, country_id=?, state_id=?, city_id=?, is_active=?, updated_at=NOW()
       WHERE id=?`,
      [
        String(name).trim(),
        geo.countryId,
        geo.stateId,
        geo.cityId,
        toBool(is_active, true),
        req.params.id,
      ]
    );
    return ok(res, null, 'Branch updated successfully');
  } catch (err) {
    if (err.status === 422) return fail(res, err.message, 422);
    console.error('[PUT /api/branches/:id]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// DELETE /api/branches/:id
// Default: soft-delete (deactivate). ?permanent=1 hard-deletes.
router.delete('/:id', async (req, res) => {
  try {
    const permanent = String(req.query.permanent || '') === '1';
    if (permanent) {
      await pool.query('DELETE FROM portal_branches WHERE id=?', [req.params.id]);
      return ok(res, null, 'Branch permanently deleted');
    }
    await pool.query(
      'UPDATE portal_branches SET is_active=FALSE, updated_at=NOW() WHERE id=?',
      [req.params.id]
    );
    return ok(res, null, 'Branch deactivated successfully');
  } catch (err) {
    console.error('[DELETE /api/branches/:id]', err.message);
    return fail(res, 'Server error', 500);
  }
});

module.exports = router;
