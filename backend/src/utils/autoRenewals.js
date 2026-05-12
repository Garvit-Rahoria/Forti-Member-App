const crypto = require('crypto');
const { pool } = require('../config/database');

let lastRunAt = 0;
let inFlight = null;

function normalizeDurationYears(duration, planType) {
  const raw = String(duration || planType || '').trim().toLowerCase();
  if (!raw || raw === 'lifetime') return null;
  const match = raw.match(/^(\d+)years?$/);
  if (match) return Number(match[1]);
  if (raw === 'yearly') return 1;
  if (raw === '3years') return 3;
  if (raw === '2years') return 2;
  return null;
}

function calculateRenewalExpiry(expiryDate, duration, planType) {
  const years = normalizeDurationYears(duration, planType);
  if (!expiryDate || !years) return null;
  const base = new Date(expiryDate);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setFullYear(next.getFullYear() + years);
  return next.toISOString().slice(0, 10);
}

async function runAutoRenewals() {
  const [eligibleRows] = await pool.query(
    `SELECT s.id, s.uuid, s.package_id, s.plan_type, s.expiry_date,
            pp.duration, pp.price, pp.currency
     FROM fb_submissions s
     LEFT JOIN portal_packages pp ON pp.id = s.package_id
     WHERE s.status IN ('active','approved')
       AND s.member_status IN ('active','expired')
       AND s.expiry_date IS NOT NULL
       AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND NOT EXISTS (
         SELECT 1
         FROM portal_renewals r
         WHERE r.submission_id = s.id
           AND r.old_expiry_date = s.expiry_date
       )`
  );

  let created = 0;

  for (const row of eligibleRows) {
    const newExpiryDate = calculateRenewalExpiry(row.expiry_date, row.duration, row.plan_type);
    if (!newExpiryDate) continue;

    await pool.query(
      `INSERT INTO portal_renewals
         (uuid, submission_id, package_id, amount, currency, old_expiry_date, new_expiry_date, status)
       VALUES (?,?,?,?,?,?,?,'pending')`,
      [
        crypto.randomUUID(),
        row.id,
        row.package_id || null,
        Number(row.price || 0),
        row.currency || 'INR',
        row.expiry_date,
        newExpiryDate,
      ]
    );
    created += 1;
  }

  return created;
}

async function ensureAutoRenewals(options = {}) {
  const { force = false, minIntervalMs = 15 * 60 * 1000 } = options;
  const now = Date.now();
  if (!force && now - lastRunAt < minIntervalMs) return 0;
  if (inFlight) return inFlight;

  inFlight = runAutoRenewals()
    .then(created => {
      lastRunAt = Date.now();
      inFlight = null;
      return created;
    })
    .catch(err => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

module.exports = { ensureAutoRenewals, calculateRenewalExpiry };