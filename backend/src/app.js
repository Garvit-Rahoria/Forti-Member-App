const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { testConnection, pool } = require('./config/database');
const { apiLimiter, otpLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { startRenewalReminderCron } = require('./cron/renewalReminders');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/otp', otpLimiter);
app.use('/api/membership/apply', uploadLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/forms',        require('./routes/forms'));
app.use('/api/sections',     require('./routes/sections'));
app.use('/api/fields',       require('./routes/fields'));
app.use('/api/dropdowns',    require('./routes/dropdowns'));
app.use('/api/submissions',  require('./routes/submissions'));
app.use('/api/approvals',    require('./routes/approvals'));
app.use('/api/members',      require('./routes/members'));
app.use('/api/packages',     require('./routes/packages'));
app.use('/api/durations',    require('./routes/durations'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/locations',    require('./routes/locations'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/audit',        require('./routes/audit'));
app.use('/api/membership',   require('./routes/membership'));
app.use('/api/renewals',         require('./routes/renewals'));
app.use('/api/invoices',         require('./routes/invoices'));
app.use('/api/otp',              require('./routes/otp'));
app.use('/api/member',           require('./routes/member-portal'));
app.use('/api/currency-settings',require('./routes/currency-settings'));
app.use('/api/pricing-rules',       require('./routes/pricing-rules'));
app.use('/api/application-fields',  require('./routes/application-fields'));

// Email Templates direct API for frontend
app.use('/api/email-templates', require('./emailTemplatesRouter'));

// Staff & Manager routes
app.use('/api/staff',    require('./routes/staff'));
app.use('/api/manager',  require('./routes/manager'));

// ── Public status lookup: GET /api/status?referenceId=XXX ───────────────────
app.get('/api/status', async (req, res) => {
  const { referenceId } = req.query;
  if (!referenceId || !String(referenceId).trim()) {
    return res.status(422).json({ success: false, message: 'referenceId is required' });
  }
  try {
    const [[row]] = await pool.query(
      `SELECT s.status, s.member_status
       FROM fb_submissions s
       WHERE (s.membership_id = ? OR s.uuid = ?)
         AND s.status NOT IN ('draft')
       ORDER BY s.created_at DESC LIMIT 1`,
      [String(referenceId).trim(), String(referenceId).trim()]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Application not found' });
    return res.json({ success: true, data: { status: row.status, member_status: row.member_status } });
  } catch (err) {
    console.error('[GET /api/status]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Crash protection ──────────────────────────────────────────────────────────
process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err.message, err.stack);
  // Keep server alive — don't exit
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
  // Keep server alive — don't exit
});

// ── Start ─────────────────────────────────────────────────────────────────────

// Seed default currencies if currency_settings table is empty.
// Also back-fills countries.currency from ISO code list if it is NULL.
async function seedCurrencyData() {
  try {
    const COUNTRY_SEEDS = [
      { iso: 'IN', code: 'INR', sym: '₹',    name: 'Indian Rupee',       rate: 1,       def: 1 },
      { iso: 'US', code: 'USD', sym: '$',     name: 'US Dollar',          rate: 0.012,   def: 0 },
      { iso: 'GB', code: 'GBP', sym: '£',     name: 'British Pound',      rate: 0.0094,  def: 0 },
      { iso: 'AE', code: 'AED', sym: 'د.إ',  name: 'UAE Dirham',         rate: 0.044,   def: 0 },
      { iso: 'JP', code: 'JPY', sym: '¥',     name: 'Japanese Yen',       rate: 1.77,    def: 0 },
      { iso: 'AU', code: 'AUD', sym: 'A$',    name: 'Australian Dollar',  rate: 0.018,   def: 0 },
      { iso: 'CA', code: 'CAD', sym: 'C$',    name: 'Canadian Dollar',    rate: 0.016,   def: 0 },
      { iso: 'SG', code: 'SGD', sym: 'S$',    name: 'Singapore Dollar',   rate: 0.016,   def: 0 },
      { iso: 'DE', code: 'EUR', sym: '€',     name: 'Euro',               rate: 0.011,   def: 0 },
      { iso: 'FR', code: 'EUR', sym: '€',     name: 'Euro',               rate: 0.011,   def: 0 },
      { iso: 'SA', code: 'SAR', sym: '﷼',    name: 'Saudi Riyal',        rate: 0.045,   def: 0 },
      { iso: 'QA', code: 'QAR', sym: '﷼',    name: 'Qatari Riyal',       rate: 0.044,   def: 0 },
      { iso: 'KW', code: 'KWD', sym: 'KD',   name: 'Kuwaiti Dinar',      rate: 0.0037,  def: 0 },
      { iso: 'BH', code: 'BHD', sym: 'BD',   name: 'Bahraini Dinar',     rate: 0.0045,  def: 0 },
      { iso: 'OM', code: 'OMR', sym: 'OMR',  name: 'Omani Rial',         rate: 0.0046,  def: 0 },
      { iso: 'MY', code: 'MYR', sym: 'RM',   name: 'Malaysian Ringgit',  rate: 0.056,   def: 0 },
      { iso: 'NZ', code: 'NZD', sym: 'NZ$',  name: 'New Zealand Dollar', rate: 0.02,    def: 0 },
      { iso: 'ZA', code: 'ZAR', sym: 'R',    name: 'South African Rand', rate: 0.22,    def: 0 },
      { iso: 'CN', code: 'CNY', sym: '¥',    name: 'Chinese Yuan',       rate: 0.086,   def: 0 },
    ];

    // 1. Back-fill countries.currency where NULL
    for (const s of COUNTRY_SEEDS) {
      await pool.query(
        'UPDATE countries SET currency = ? WHERE iso_code = ? AND (currency IS NULL OR currency = "")',
        [s.code, s.iso]
      );
    }

    // 2. Check if currency_settings is already seeded
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM currency_settings');
    if (Number(cnt) > 0) return; // already has data

    console.log('[SEED] Seeding default currency_settings…');

    // 3. Global default (INR)
    await pool.query(
      `INSERT IGNORE INTO currency_settings
         (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
       VALUES (NULL, 'INR', '₹', 'Indian Rupee', 1.000000, 1, 1)`
    );

    // 4. Per-country currencies
    for (const s of COUNTRY_SEEDS) {
      const [[row]] = await pool.query(
        'SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [s.iso]
      );
      if (!row) continue;
      await pool.query(
        `INSERT IGNORE INTO currency_settings
           (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, 0, 1)`,
        [row.id, s.code, s.sym, s.name, s.rate]
      );
    }
    console.log('[SEED] Currency defaults seeded ✓');
  } catch (err) {
    console.error('[SEED] Currency seed failed (non-fatal):', err.message);
  }
}

// Older DBs created member_accounts.email as UNIQUE, which breaks multi-application flows.
// Remove that uniqueness at startup so one email can have separate accounts per submission.
async function ensureMemberAccountsSchema() {
  try {
    const [indexes] = await pool.query(
      `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
       FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'member_accounts'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );

    const byIndex = new Map();
    for (const row of indexes) {
      const current = byIndex.get(row.INDEX_NAME) || [];
      current.push(row);
      byIndex.set(row.INDEX_NAME, current);
    }

    for (const [indexName, rows] of byIndex.entries()) {
      if (indexName === 'PRIMARY') continue;
      const isUnique = Number(rows[0].NON_UNIQUE) === 0;
      const cols = rows.map(r => r.COLUMN_NAME);
      if (isUnique && cols.length === 1 && cols[0] === 'email') {
        await pool.query(`ALTER TABLE member_accounts DROP INDEX ${indexName}`);
        console.log(`[SCHEMA] Dropped UNIQUE email index on member_accounts: ${indexName}`);
      }
    }
  } catch (err) {
    console.error('[SCHEMA] member_accounts schema check failed (non-fatal):', err.message);
  }
}

async function start() {
  await testConnection();
  await ensureMemberAccountsSchema();
  await seedCurrencyData();
  startRenewalReminderCron();
  app.listen(PORT, () => {
    console.log(`✅ FORTI Portal API running on http://localhost:${PORT}`);
  });
}

start();
