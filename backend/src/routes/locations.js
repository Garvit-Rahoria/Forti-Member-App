const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');

const router = express.Router();

// Public endpoints (used by form dropdowns)

// GET /api/locations/countries
router.get('/countries', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, iso_code AS iso2, phone_prefix AS phone_code, currency FROM countries WHERE is_active IS TRUE ORDER BY name'
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[locations/countries]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// GET /api/locations/states?country_id=
router.get('/states', async (req, res) => {
  const { country_id } = req.query;
  try {
    const [rows] = country_id
      ? await pool.query(
          'SELECT id, name, code FROM states WHERE country_id=? ORDER BY name',
          [country_id]
        )
      : await pool.query(
          'SELECT id, name, code FROM states ORDER BY name'
        );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/locations/cities?state_id=  OR  ?country_id=
router.get('/cities', async (req, res) => {
  const { state_id, country_id } = req.query;
  if (!state_id && !country_id) return fail(res, 'state_id or country_id required', 422);
  try {
    if (state_id) {
      const [rows] = await pool.query(
        'SELECT id, name, state_id, country_id FROM cities WHERE state_id=? AND (is_active IS TRUE OR is_active IS NULL) ORDER BY name',
        [state_id]
      );
      return ok(res, rows);
    }

    // Overseas / country-level cities: direct country_id OR via states
    const [rows] = await pool.query(
      `SELECT DISTINCT ci.id, ci.name, ci.state_id, COALESCE(ci.country_id, s.country_id) AS country_id
       FROM cities ci
       LEFT JOIN states s ON s.id = ci.state_id
       WHERE (ci.is_active IS TRUE OR ci.is_active IS NULL)
         AND (
           ci.country_id = ?
           OR s.country_id = ?
         )
       ORDER BY ci.name`,
      [country_id, country_id]
    );
    return ok(res, rows);
  } catch (err) {
    console.error('[locations/cities]', err.message);
    return fail(res, 'Server error', 500);
  }
});

// Admin-only: manage countries/states/cities
router.use(authMiddleware);

// POST /api/locations/countries
router.post('/countries', async (req, res) => {
  const { name, iso2, phone_code, currency } = req.body;
  if (!name) return fail(res, 'name required', 422);
  try {
    const [r] = await pool.query(
      'INSERT INTO countries (name, iso_code, phone_prefix, currency) VALUES (?,?,?,?)',
      [name, iso2, phone_code, currency]
    );
    return ok(res, { id: r.insertId }, 'Country added', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Country already exists', 409);
    return fail(res, 'Server error', 500);
  }
});

// PUT /api/locations/countries/:id
router.put('/countries/:id', async (req, res) => {
  const { name, iso2, phone_code, currency, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE countries SET name=?, iso_code=?, phone_prefix=?, currency=?, is_active=? WHERE id=?',
      [name, iso2, phone_code, currency, is_active, req.params.id]
    );
    return ok(res, null, 'Updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/locations/states
router.post('/states', async (req, res) => {
  const { country_id, name, code } = req.body;
  if (!country_id || !name) return fail(res, 'country_id and name required', 422);
  try {
    const [r] = await pool.query(
      'INSERT INTO states (country_id, name, code) VALUES (?,?,?)',
      [country_id, name, code]
    );
    return ok(res, { id: r.insertId }, 'State added', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/locations/states/:id
router.put('/states/:id', async (req, res) => {
  const { name, code, is_active } = req.body;
  try {
    await pool.query('UPDATE states SET name=?, code=?, is_active=? WHERE id=?', [name, code, is_active, req.params.id]);
    return ok(res, null, 'Updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/locations/states/:id
router.delete('/states/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM states WHERE id=?', [req.params.id]);
    return ok(res, null, 'Deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/locations/cities
router.post('/cities', async (req, res) => {
  const { state_id, name } = req.body;
  if (!state_id || !name) return fail(res, 'state_id and name required', 422);
  try {
    const [r] = await pool.query('INSERT INTO cities (state_id, name) VALUES (?,?)', [state_id, name]);
    return ok(res, { id: r.insertId }, 'City added', 201);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/locations/cities/:id
router.put('/cities/:id', async (req, res) => {
  const { name, is_active } = req.body;
  try {
    await pool.query('UPDATE cities SET name=?, is_active=? WHERE id=?', [name, is_active ?? 1, req.params.id]);
    return ok(res, null, 'Updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/locations/cities/:id
router.delete('/cities/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cities WHERE id=?', [req.params.id]);
    return ok(res, null, 'Deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
