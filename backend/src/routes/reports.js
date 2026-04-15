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
  const { location, membership_type, duration, from, to, period } = req.query;
  const sc = stateClause(req.user);
  const scj = stateClauseViaJoin(req.user);

  try {
    // --- Build date range based on period or from/to ---
    let dateFilter = '';
    const dateParams = [];
    if (from && to) {
      dateFilter = ' AND s.created_at >= ? AND s.created_at <= ?';
      dateParams.push(from, to);
    } else if (period === '7d') {
      dateFilter = ' AND s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === '30d') {
      dateFilter = ' AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === '90d') {
      dateFilter = ' AND s.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    }
    // period=12m or default: no date filter on registrations chart

    // --- 1. Registration trend ---
    let regInterval = 'INTERVAL 12 MONTH';
    let regFormat = '%Y-%m';
    if (period === '7d') { regInterval = 'INTERVAL 7 DAY'; regFormat = '%Y-%m-%d'; }
    else if (period === '30d') { regInterval = 'INTERVAL 30 DAY'; regFormat = '%Y-%m-%d'; }
    else if (period === '90d') { regInterval = 'INTERVAL 90 DAY'; regFormat = '%Y-%m'; }

    const [registrations] = await pool.query(
      `SELECT DATE_FORMAT(s.created_at,'${regFormat}') AS label, COUNT(*) AS count
       FROM fb_submissions s
       WHERE s.status IN ('active','approved') AND s.created_at >= DATE_SUB(NOW(), ${regInterval})
       ${sc.clause}
       GROUP BY label ORDER BY label`,
      sc.params
    );

    // --- 2. Application status summary ---
    const [statusSummary] = await pool.query(
      `SELECT s.status, COUNT(*) AS cnt FROM fb_submissions s
       WHERE s.status != 'draft'${sc.clause}${dateFilter}
       GROUP BY s.status ORDER BY cnt DESC`,
      [...sc.params, ...dateParams]
    );

    // --- 3. Package performance table ---
    let pkgWhere = '1=1';
    const pkgParams = [];
    if (location) { pkgWhere += ' AND pp.location=?'; pkgParams.push(location); }
    if (membership_type) { pkgWhere += ' AND pp.membership_type=?'; pkgParams.push(membership_type); }
    if (duration) { pkgWhere += ' AND pp.duration=?'; pkgParams.push(duration); }

    const [packagePerformance] = await pool.query(
      `SELECT pp.id, pp.name, pp.location, pp.membership_type, pp.duration, pp.price,
              pp.is_active,
              COUNT(DISTINCT s.id) AS total_members,
              COALESCE(SUM(CASE WHEN pay.status='verified' THEN pay.amount ELSE 0 END),0) AS total_revenue
       FROM portal_packages pp
       LEFT JOIN fb_submissions s ON s.package_id=pp.id AND s.status IN ('active','approved')
         ${sc.params.length ? 'AND s.state_id=?' : ''}
       LEFT JOIN portal_payments pay ON pay.submission_id=s.id
       WHERE ${pkgWhere}
       GROUP BY pp.id
       ORDER BY total_members DESC`,
      [...(sc.params.length ? sc.params : []), ...pkgParams]
    );

    // --- 4. Top performing (most selected) ---
    const topPackages = [...packagePerformance].sort((a, b) => b.total_members - a.total_members).slice(0, 5);
    const leastPackages = [...packagePerformance].filter(p => p.is_active).sort((a, b) => a.total_members - b.total_members).slice(0, 5);

    // --- 5. Recent activity ---
    const [recentApps] = await pool.query(
      `SELECT s.id, s.applicant_name, s.status, s.membership_type, s.created_at,
              pp.name AS package_name
       FROM fb_submissions s LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status != 'draft'${sc.clause}
       ORDER BY s.created_at DESC LIMIT 8`,
      sc.params
    );

    const [recentPayments] = await pool.query(
      `SELECT p.id, p.amount, p.status, p.created_at, s.applicant_name, s.membership_id
       FROM portal_payments p LEFT JOIN fb_submissions s ON s.id=p.submission_id
       WHERE 1=1${scj.clause}
       ORDER BY p.created_at DESC LIMIT 8`,
      scj.params
    );

    // --- 6. Expiring memberships (60 days) ---
    const [expiring] = await pool.query(
      `SELECT s.membership_id, s.applicant_name, s.applicant_email,
              s.expiry_date, s.member_status, pp.name AS package_name,
              DATEDIFF(s.expiry_date, CURDATE()) AS days_left
       FROM fb_submissions s LEFT JOIN portal_packages pp ON pp.id=s.package_id
       WHERE s.status IN ('active','approved') AND s.expiry_date IS NOT NULL
         AND s.expiry_date >= CURDATE() AND DATEDIFF(s.expiry_date, CURDATE()) <= 60${sc.clause}
       ORDER BY s.expiry_date ASC`,
      sc.params
    );

    // --- 7. Revenue trend (monthly, last 6 months) ---
    const [revenueTrend] = await pool.query(
      `SELECT DATE_FORMAT(p.created_at,'%Y-%m') AS month, COALESCE(SUM(p.amount),0) AS revenue
       FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id
       WHERE p.status='verified' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)${scj.clause}
       GROUP BY month ORDER BY month`,
      scj.params
    );

    // --- 8. Summary stats ---
    const [[{ total_members }]] = await pool.query(
      `SELECT COUNT(*) AS total_members FROM fb_submissions s WHERE s.status IN ('active','approved')${sc.clause}`, sc.params);
    const [[{ active_members }]] = await pool.query(
      `SELECT COUNT(*) AS active_members FROM fb_submissions s WHERE s.status='active' AND s.member_status='active'${sc.clause}`, sc.params);
    const [[{ total_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS total_revenue FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id WHERE p.status='verified'${scj.clause}`, scj.params);
    const [[{ this_month_revenue }]] = await pool.query(
      `SELECT COALESCE(SUM(p.amount),0) AS this_month_revenue FROM portal_payments p JOIN fb_submissions s ON s.id=p.submission_id WHERE p.status='verified' AND MONTH(p.created_at)=MONTH(NOW()) AND YEAR(p.created_at)=YEAR(NOW())${scj.clause}`, scj.params);

    // --- 9. Distinct filter options ---
    const [locations] = await pool.query(`SELECT DISTINCT location FROM portal_packages WHERE location IS NOT NULL ORDER BY location`);
    const [durations] = await pool.query(`SELECT DISTINCT duration FROM portal_packages WHERE duration IS NOT NULL ORDER BY duration`);

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
      filterOptions: {
        locations: locations.map(r => r.location),
        durations: durations.map(r => r.duration),
      }
    });
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;

