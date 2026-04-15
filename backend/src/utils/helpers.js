// Generic paginated query helper
async function paginate(pool, query, params, page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;
  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS sub`;
  const [[{ total }]] = await pool.query(countQuery, params);
  const [data] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  return {
    data,
    total: parseInt(total),
    page: parseInt(page),
    perPage: parseInt(perPage),
    lastPage: Math.ceil(total / perPage),
  };
}

// Build WHERE clause from filter object
function buildWhere(filters, allowedFields) {
  const clauses = [];
  const params  = [];
  for (const [key, val] of Object.entries(filters)) {
    if (!val || !allowedFields[key]) continue;
    const { col, op = '=' } = allowedFields[key];
    if (op === 'LIKE') {
      clauses.push(`${col} LIKE ?`);
      params.push(`%${val}%`);
    } else {
      clauses.push(`${col} ${op} ?`);
      params.push(val);
    }
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function ok(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function fail(res, message = 'Error', statusCode = 400, errors = null) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { paginate, buildWhere, ok, fail };
