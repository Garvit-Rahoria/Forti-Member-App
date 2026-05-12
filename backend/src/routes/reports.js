const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const XLSX = require('xlsx');

const router = express.Router();
router.use(authMiddleware);

// Helper: build a state_id WHERE clause for state_manager scoping
function stateClause(user, alias = 's') {
  if (user && user.role === 'branch_manager' && user.assigned_state_id) {
    return { clause: ` AND ${alias}.state_id=?`, params: [user.assigned_state_id] };
  }
  return { clause: '', params: [] };
}

// Helper: state clause for portal_payments (needs JOIN to fb_submissions)
function stateClauseViaJoin(user) {
  if (user && user.role === 'branch_manager' && user.assigned_state_id) {
    return { clause: ' AND s.state_id=?', params: [user.assigned_state_id] };
  }
  return { clause: '', params: [] };
}

function stripLeadingAnd(clause = '') {
  return clause.replace(/^\s*AND\s+/i, '').trim();
}

function buildDateClause(column, query = {}) {
  const { from, to, period = '12m' } = query;

  if (from && to) {
    return { clause: `${column} >= ? AND ${column} <= ?`, params: [from, to] };
  }

  if (period === 'today') {
    return { clause: `DATE(${column}) = CURDATE()`, params: [] };
  }
  if (period === '7d') {
    return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, params: [] };
  }
  if (period === '30d') {
    return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, params: [] };
  }
  if (period === '90d') {
    return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`, params: [] };
  }
  if (period === '12m') {
    return { clause: `${column} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`, params: [] };
  }

  return { clause: '', params: [] };
}

function buildSubmissionFilters(user, query = {}, options = {}) {
  const alias = options.alias || 's';
  const packageAlias = options.packageAlias || 'pp';
  const dateColumn = options.dateColumn || `${alias}.created_at`;
  const includeDate = options.includeDate !== false;
  const { location, membership_type, duration } = query;

  const filters = [];
  const params = [];
  const scoped = stateClause(user, alias);

  if (scoped.clause) {
    filters.push(stripLeadingAnd(scoped.clause));
    params.push(...scoped.params);
  }

  if (location && packageAlias) {
    filters.push(`${packageAlias}.location = ?`);
    params.push(location);
  }

  if (membership_type) {
    filters.push(`COALESCE(${alias}.membership_type, ${packageAlias}.membership_type) = ?`);
    params.push(membership_type);
  }

  if (duration && packageAlias) {
    filters.push(`${packageAlias}.duration = ?`);
    params.push(duration);
  }

  if (includeDate) {
    const dateFilter = buildDateClause(dateColumn, query);
    if (dateFilter.clause) {
      filters.push(dateFilter.clause);
      params.push(...dateFilter.params);
    }
  }

  return {
    clause: filters.length ? ` AND ${filters.join(' AND ')}` : '',
    params,
  };
}

function buildPaymentFilters(user, query = {}, options = {}) {
  const submissionAlias = options.submissionAlias || 's';
  const packageAlias = options.packageAlias || 'pp';
  const dateColumn = options.dateColumn || 'p.created_at';
  const includeDate = options.includeDate !== false;
  const { location, membership_type, duration } = query;

  const filters = [];
  const params = [];
  const scoped = stateClauseViaJoin(user);

  if (scoped.clause) {
    filters.push(stripLeadingAnd(scoped.clause));
    params.push(...scoped.params);
  }

  if (location && packageAlias) {
    filters.push(`${packageAlias}.location = ?`);
    params.push(location);
  }

  if (membership_type) {
    filters.push(`COALESCE(${submissionAlias}.membership_type, ${packageAlias}.membership_type) = ?`);
    params.push(membership_type);
  }

  if (duration && packageAlias) {
    filters.push(`${packageAlias}.duration = ?`);
    params.push(duration);
  }

  if (includeDate) {
    const dateFilter = buildDateClause(dateColumn, query);
    if (dateFilter.clause) {
      filters.push(dateFilter.clause);
      params.push(...dateFilter.params);
    }
  }

  return {
    clause: filters.length ? ` AND ${filters.join(' AND ')}` : '',
    params,
  };
}

function getRegistrationLabelFormat(query = {}) {
  const { from, to, period = '12m' } = query;

  if (period === 'today') {
    return '%H:00';
  }

  if (period === '7d' || period === '30d') {
    return '%Y-%m-%d';
  }

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Number.isFinite(fromDate.getTime()) && Number.isFinite(toDate.getTime())
      ? Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return diffDays > 31 ? '%Y-%m' : '%Y-%m-%d';
  }

  return '%Y-%m';
}

// GET /api/reports/dashboard  Summary stats
router.get('/dashboard', async (req, res) => {
  try {
    const sc = stateClause(req.user);
    const scj = stateClauseViaJoin(req.user);

    // Total members = submissions with status active OR approved
    const [[{ total_members }]] = await pool.query(
      `SELECT COUNT(*) AS total_members FROM fb_submissions s WHERE s.status IN ('active','approved')${sc.clause}`,
      sc.params);

    // Active members = status active with member_status active
    const [[{ active_members }]] = await pool.query(
      `SELECT COUNT(*) AS active_members FROM fb_submissions s WHERE s.status='active' AND s.member_status='active'${sc.clause}`,
      sc.params);

    // Total submissions (all non-draft)
    const [[{ total_submissions }]] = await pool.query(
      `SELECT COUNT(*) AS total_submissions FROM fb_submissions s WHERE s.status != 'draft'${sc.clause}`,
      sc.params);

    // Pending = submitted + under_review
    const [[{ pending_submissions }]] = await pool.query(
      `SELECT COUNT(*) AS pending_submissions FROM fb_submissions s WHERE s.status IN ('submitted','under_review')${sc.clause}`,
      sc.params);

    // Revenue from verified payments
    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total_revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified'${scj.clause}`,
      scj.params);

    const [[{ this_month_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS this_month_revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified' AND MONTH(p.created_at)=MONTH(NOW()) AND YEAR(p.created_at)=YEAR(NOW())${scj.clause}`,
      scj.params);

    // Monthly registrations (active/approved members)
    const [monthly_registrations] = await pool.query(
      `SELECT DATE_FORMAT(s.created_at,'%Y-%m') AS month, COUNT(*) AS count
       FROM fb_submissions s
       WHERE s.status IN ('active','approved') AND s.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       ${sc.clause ? sc.clause.replace(' AND ', 'AND ') : ''}
       GROUP BY month ORDER BY month`,
      sc.params);

    // Package distribution
    const [package_distribution] = await pool.query(
      `SELECT pp.name AS package_name, COUNT(s.id) AS member_count
       FROM portal_packages pp
       LEFT JOIN fb_submissions s ON s.package_id=pp.id AND s.status IN ('active','approved')
         ${sc.params.length ? 'AND s.state_id=?' : ''}
       GROUP BY pp.id, pp.name ORDER BY member_count DESC LIMIT 10`,
      sc.params);

    // Status breakdown
    const [status_breakdown] = await pool.query(
      `SELECT s.status, COUNT(*) AS cnt FROM fb_submissions s
       WHERE s.status != 'draft'${sc.clause}
       GROUP BY s.status ORDER BY cnt DESC`,
      sc.params);

    // Monthly revenue trend (last 6 months)
    const [monthly_revenue] = await pool.query(
      `SELECT DATE_FORMAT(p.created_at,'%Y-%m') AS month, COALESCE(SUM(p.amount),0) AS revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)${scj.clause}
       GROUP BY month ORDER BY month`,
      scj.params);

    // Recent 5 applications
    const [recent_applications] = await pool.query(
      `SELECT s.id, s.applicant_name, s.applicant_email, s.status, s.membership_type,
              s.created_at, pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status != 'draft'${sc.clause}
       ORDER BY s.created_at DESC LIMIT 5`,
      sc.params);

    // Recent 5 payments
    const [recent_payments] = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.status, p.created_at,
              s.applicant_name, s.membership_id
       FROM portal_payments p
       LEFT JOIN fb_submissions s ON s.id=p.submission_id
       WHERE 1=1${scj.clause}
       ORDER BY p.created_at DESC LIMIT 5`,
      scj.params);

    // Expiring memberships (next 30 days)
    const [[{ expiring_soon }]] = await pool.query(
      `SELECT COUNT(*) AS expiring_soon FROM fb_submissions s
       WHERE s.status IN ('active','approved') AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= 30${sc.clause}`,
      sc.params);

    // Membership type breakdown
    const [type_breakdown] = await pool.query(
      `SELECT s.membership_type, COUNT(*) AS cnt FROM fb_submissions s
       WHERE s.status IN ('active','approved')${sc.clause}
       GROUP BY s.membership_type ORDER BY cnt DESC`,
      sc.params);

    return ok(res, {
      total_members, active_members, total_submissions, pending_submissions,
      total_revenue, this_month_revenue,
      monthly_registrations, package_distribution, status_breakdown,
      monthly_revenue, recent_applications, recent_payments,
      expiring_soon, type_breakdown
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/submissions?form_id=&status=&from=&to=
router.get('/submissions', async (req, res) => {
  const { form_id, status, from, to } = req.query;
  const params = [];
  let where = 's.status != \'draft\'';
  if (form_id) { where += ' AND s.form_id=?'; params.push(form_id); }
  if (status)  { where += ' AND s.status=?';  params.push(status); }
  if (from)    { where += ' AND s.created_at>=?'; params.push(from); }
  if (to)      { where += ' AND s.created_at<=?'; params.push(to); }
  // State manager: scope to their state
  if (req.user.role === 'branch_manager' && req.user.assigned_state_id) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }
  try {
    const [rows] = await pool.query(
      `SELECT s.*, f.name AS form_name, pp.name AS package_name,
              st.name AS state_name
       FROM fb_submissions s
       LEFT JOIN fb_forms f ON f.id=s.form_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN states st ON st.id=s.state_id
       WHERE ${where} ORDER BY s.created_at DESC`,
      params
    );
    return ok(res, { total: rows.length, data: rows });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/payments?from=&to=&status=
router.get('/payments', async (req, res) => {
  const { status, from, to } = req.query;
  const params = [];
  let where = '1=1';
  if (status) { where += ' AND p.status=?'; params.push(status); }
  if (from)   { where += ' AND p.created_at>=?'; params.push(from); }
  if (to)     { where += ' AND p.created_at<=?'; params.push(to); }
  // State manager scoping via joined submission
  if (req.user.role === 'branch_manager' && req.user.assigned_state_id) {
    where += ' AND s.state_id=?'; params.push(req.user.assigned_state_id);
  }
  try {
    const [rows] = await pool.query(
      `SELECT p.*, s.applicant_name AS full_name, s.applicant_email AS email,
              s.membership_id, s.membership_type, s.plan_type,
              pp.name AS package_name, pm.name AS payment_method_name
       FROM portal_payments p
       LEFT JOIN fb_submissions s ON s.id=p.submission_id
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN portal_payment_methods pm ON pm.id=p.method_id
       WHERE ${where} ORDER BY p.created_at DESC`,
      params
    );
    const total = rows.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
    return ok(res, { count: rows.length, total_amount: total, data: rows });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/export/members  CSV export
router.get('/export/members', async (req, res) => {
  const sc = stateClause(req.user);
  try {
    const [rows] = await pool.query(
      `SELECT s.membership_id, s.applicant_name AS full_name, s.applicant_email AS email,
              s.applicant_phone AS phone, s.membership_type, s.plan_type,
              s.status, s.member_status, s.expiry_date,
              pp.name AS package_name, st.name AS state_name,
              s.submitted_at AS joined_date
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN states st ON st.id=s.state_id
       WHERE s.status IN ('active','approved')${sc.clause}
       ORDER BY s.submitted_at DESC`,
      sc.params
    );

    if (!rows.length) { res.setHeader('Content-Type','text/csv'); return res.send('No data'); }
    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map(r =>
      Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    return res.send(csv);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/export/members/excel  – Excel export
router.get('/export/members/excel', async (req, res) => {
  try {
    const sc2 = stateClause(req.user);
    const [rows] = await pool.query(
      `SELECT s.membership_id AS 'Member ID', s.applicant_name AS 'Full Name',
              s.applicant_email AS 'Email', s.applicant_phone AS 'Phone',
              s.membership_type AS 'Type', s.plan_type AS 'Plan',
              s.status AS 'Status', s.member_status AS 'Member Status',
              s.expiry_date AS 'Expiry Date',
              pp.name AS 'Package', st.name AS 'State',
              s.submitted_at AS 'Applied Date'
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       LEFT JOIN states st ON st.id=s.state_id
       WHERE s.status IN ('active','approved')${sc2.clause}
       ORDER BY s.submitted_at DESC`,
      sc2.params
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
    return res.send(buf);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/export/payments/excel  – Payments Excel export
router.get('/export/payments/excel', async (req, res) => {
  const { status, from, to } = req.query;
  let where = '1=1';
  const params = [];
  if (status) { where += ' AND p.status=?'; params.push(status); }
  if (from)   { where += ' AND p.created_at>=?'; params.push(from); }
  if (to)     { where += ' AND p.created_at<=?'; params.push(to); }
  try {
    const [rows] = await pool.query(
      `SELECT s.membership_id AS 'Member ID', s.applicant_name AS 'Member Name',
              s.applicant_email AS 'Email', p.amount AS 'Amount', p.currency AS 'Currency',
              p.status AS 'Status', p.transaction_id AS 'Transaction ID',
              pm.name AS 'Payment Method', p.created_at AS 'Date'
       FROM portal_payments p
       LEFT JOIN fb_submissions s ON s.id=p.submission_id
       LEFT JOIN portal_payment_methods pm ON pm.id=p.method_id
       WHERE ${where} ORDER BY p.created_at DESC`,
      params
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payments.xlsx"');
    return res.send(buf);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/expiring?days=30
router.get('/expiring', async (req, res) => {
  const { days = 30 } = req.query;
  const sc = stateClause(req.user);
  try {
    const [rows] = await pool.query(
      `SELECT s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date, s.member_status, pp.name AS package_name,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_left
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status IN ('active','approved') AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE()
         AND DATEDIFF(s.expiry_date, CURDATE()) <= ?${sc.clause}
       ORDER BY s.expiry_date ASC`,
      [Number(days), ...sc.params]
    );
    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/revenue-by-location
router.get('/revenue-by-location', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT loc.name AS location, COUNT(p.id) AS payment_count,
              COALESCE(SUM(p.amount), 0) AS total_revenue
       FROM portal_payments p
       LEFT JOIN fb_submissions s ON s.id=p.submission_id
       LEFT JOIN portal_locations loc ON loc.id=s.country_id
       WHERE p.status='verified'
       GROUP BY loc.id, loc.name
       ORDER BY total_revenue DESC`
    );
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/reports/advanced  — comprehensive reports data with filters
router.get('/advanced', async (req, res) => {
  try {
    const submissionFilters = buildSubmissionFilters(req.user, req.query, { alias: 's', packageAlias: 'pp' });
    const paymentFilters = buildPaymentFilters(req.user, req.query, { submissionAlias: 's', packageAlias: 'pp', dateColumn: 'p.created_at' });
    const packageFilters = [];
    const packageParams = [];

    if (req.query.location) {
      packageFilters.push('pp.location = ?');
      packageParams.push(req.query.location);
    }
    if (req.query.membership_type) {
      packageFilters.push('pp.membership_type = ?');
      packageParams.push(req.query.membership_type);
    }
    if (req.query.duration) {
      packageFilters.push('pp.duration = ?');
      packageParams.push(req.query.duration);
    }

    const packageWhere = packageFilters.length ? `WHERE ${packageFilters.join(' AND ')}` : '';
    const regFormat = getRegistrationLabelFormat(req.query);

    const [registrations] = await pool.query(
      `SELECT DATE_FORMAT(s.created_at,'${regFormat}') AS label, COUNT(*) AS count
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status IN ('active','approved')${submissionFilters.clause}
       GROUP BY label
       ORDER BY label`,
      submissionFilters.params
    );

    const [statusSummary] = await pool.query(
      `SELECT s.status, COUNT(*) AS cnt
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status != 'draft'${submissionFilters.clause}
       GROUP BY s.status
       ORDER BY cnt DESC`,
      submissionFilters.params
    );

    const [packagePerformance] = await pool.query(
      `SELECT
          pp.id,
          pp.name,
          pp.location,
          pp.membership_type,
          pp.duration,
          pp.price,
          pp.is_active,
          COALESCE(member_counts.total_members, 0) AS total_members,
          COALESCE(revenue_counts.total_revenue, 0) AS total_revenue
       FROM portal_packages pp
       LEFT JOIN (
         SELECT s.package_id, COUNT(*) AS total_members
         FROM fb_submissions s
         LEFT JOIN portal_packages ppf ON ppf.id = s.package_id
         WHERE s.status IN ('active','approved')${buildSubmissionFilters(req.user, req.query, { alias: 's', packageAlias: 'ppf' }).clause}
         GROUP BY s.package_id
       ) AS member_counts ON member_counts.package_id = pp.id
       LEFT JOIN (
         SELECT s.package_id, COALESCE(SUM(p.amount), 0) AS total_revenue
         FROM portal_payments p
         JOIN fb_submissions s ON s.id = p.submission_id
         LEFT JOIN portal_packages ppf ON ppf.id = s.package_id
         WHERE p.status = 'verified'${buildPaymentFilters(req.user, req.query, { submissionAlias: 's', packageAlias: 'ppf', dateColumn: 'p.created_at' }).clause}
         GROUP BY s.package_id
       ) AS revenue_counts ON revenue_counts.package_id = pp.id
       ${packageWhere}
       ORDER BY total_members DESC, pp.name ASC`,
      [
        ...buildSubmissionFilters(req.user, req.query, { alias: 's', packageAlias: 'ppf' }).params,
        ...buildPaymentFilters(req.user, req.query, { submissionAlias: 's', packageAlias: 'ppf', dateColumn: 'p.created_at' }).params,
        ...packageParams,
      ]
    );

    const topPackages = [...packagePerformance].sort((a, b) => b.total_members - a.total_members).slice(0, 5);
    const leastPackages = [...packagePerformance].filter((pkg) => pkg.is_active).sort((a, b) => a.total_members - b.total_members).slice(0, 5);

    const [recentApps] = await pool.query(
      `SELECT s.id, s.applicant_name, s.status, s.membership_type, s.created_at,
              pp.name AS package_name
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status != 'draft'${submissionFilters.clause}
       ORDER BY s.created_at DESC
       LIMIT 8`,
      submissionFilters.params
    );

    const [recentPayments] = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.status, p.created_at, s.applicant_name, s.membership_id
       FROM portal_payments p
       LEFT JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE 1 = 1${paymentFilters.clause}
       ORDER BY p.created_at DESC
       LIMIT 8`,
      paymentFilters.params
    );

    const [expiring] = await pool.query(
      `SELECT s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date, s.member_status, pp.name AS package_name,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_left
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status IN ('active','approved')
         AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE()
         AND DATEDIFF(s.expiry_date, CURDATE()) <= 60${submissionFilters.clause}
       ORDER BY s.expiry_date ASC`,
      submissionFilters.params
    );

    const [revenueTrend] = await pool.query(
      `SELECT DATE_FORMAT(p.created_at,'%Y-%m') AS month, COALESCE(SUM(p.amount),0) AS revenue
       FROM portal_payments p
       JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE p.status = 'verified'${paymentFilters.clause}
       GROUP BY month
       ORDER BY month`,
      paymentFilters.params
    );

    const [[{ total_members }]] = await pool.query(
      `SELECT COUNT(*) AS total_members
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status IN ('active','approved')${submissionFilters.clause}`,
      submissionFilters.params
    );

    const [[{ active_members }]] = await pool.query(
      `SELECT COUNT(*) AS active_members
       FROM fb_submissions s
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE s.status = 'active' AND s.member_status = 'active'${submissionFilters.clause}`,
      submissionFilters.params
    );

    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total_revenue
       FROM portal_payments p
       JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE p.status = 'verified'${paymentFilters.clause}`,
      paymentFilters.params
    );

    const thisMonthFilters = buildPaymentFilters(req.user, req.query, {
      submissionAlias: 's',
      packageAlias: 'pp',
      dateColumn: 'p.created_at',
    });
    const [[{ this_month_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS this_month_revenue
       FROM portal_payments p
       JOIN fb_submissions s ON s.id = p.submission_id
       LEFT JOIN portal_packages pp ON pp.id = s.package_id
       WHERE p.status = 'verified'
         AND MONTH(p.created_at) = MONTH(NOW())
         AND YEAR(p.created_at) = YEAR(NOW())${thisMonthFilters.clause}`,
      thisMonthFilters.params
    );

    const [locations] = await pool.query(`SELECT DISTINCT location FROM portal_packages WHERE location IS NOT NULL ORDER BY location`);
    const [durations] = await pool.query(`SELECT DISTINCT duration FROM portal_packages WHERE duration IS NOT NULL ORDER BY duration`);

    const noData =
      Number(total_members || 0) === 0 &&
      Number(active_members || 0) === 0 &&
      Number(total_revenue || 0) === 0 &&
      Number(this_month_revenue || 0) === 0 &&
      statusSummary.length === 0 &&
      registrations.length === 0 &&
      expiring.length === 0;

    return ok(res, {
      summary: { total_members, active_members, total_revenue, this_month_revenue },
      registrations,
      statusSummary,
      packagePerformance,
      topPackages,
      leastPackages,
      recentApps,
      recentPayments,
      expiring,
      revenueTrend,
      noData,
      filterOptions: {
        locations: locations.map(r => r.location),
        durations: durations.map(r => r.duration),
      }
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// GET /api/reports/full-report-data  Section-wise structured report for UI
router.get('/full-report-data', async (req, res) => {
  try {
    const fullReportFilters = buildSubmissionFilters(req.user, req.query, { alias: 's', packageAlias: 'pp' });

    const baseQuery = `
      SELECT
        s.id,
        s.membership_id,
        s.applicant_name,
        s.applicant_email,
        s.applicant_phone,
        s.membership_type,
        s.status,
        s.created_at,
        pp.name AS plan_name,
        pp.price AS plan_amount,
        COALESCE(pay.status,'—') AS payment_status,
        COALESCE(pay.amount, pp.price, 0) AS amount
      FROM fb_submissions s
      LEFT JOIN portal_packages pp ON pp.id = s.package_id
      LEFT JOIN (
        SELECT submission_id, status, amount
        FROM portal_payments
        WHERE id IN (
          SELECT MAX(id) FROM portal_payments GROUP BY submission_id
        )
      ) pay ON pay.submission_id = s.id
      WHERE s.status != 'draft'
        ${fullReportFilters.clause}
      ORDER BY s.created_at DESC
    `;

    const [rows] = await pool.query(baseQuery, fullReportFilters.params);

    const grouped = {
      new_applications: rows.filter(r => r.status === 'submitted'),
      under_review: rows.filter(r => r.status === 'under_review'),
      approved: rows.filter(r => r.status === 'approved'),
      payment_pending: rows.filter(r => r.status === 'payment_pending'),
      payment_submitted: rows.filter(r => r.status === 'payment_submitted'),
      active: rows.filter(r => r.status === 'active'),
      rejected: rows.filter(r => r.status === 'rejected'),
    };

    return ok(res, { sections: grouped, total: rows.length });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;

