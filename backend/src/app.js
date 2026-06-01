const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection, pool } = require('./config/database');
const { apiLimiter, otpLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { seedLocationsIfEmpty } = require('./utils/seedLocations');
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
app.use(morgan('dev'));

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
app.use('/api/wings',               require('./routes/wings'));
app.use('/api/positions',           require('./routes/positions'));
app.use('/api/member/public-profile', require('./routes/member-profile'));
app.use('/api/public/profile',      require('./routes/public-profile'));
app.use('/api/blog',                require('./routes/blog'));
app.use('/api/contact',             require('./routes/contact'));

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

// Root – API has no HTML UI; use the frontend app
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FORTI Portal API',
    health: '/api/health',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
  });
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
        'UPDATE countries SET currency = ? WHERE iso_code = ? AND (currency IS NULL OR currency = \'\')',
        [s.code, s.iso]
      );
    }

    // 2. Check if currency_settings is already seeded
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM currency_settings');
    if (Number(cnt) > 0) return; // already has data

    console.log('[SEED] Seeding default currency_settings…');

    // 3. Global default (INR)
    await pool.query(
      `INSERT INTO currency_settings
         (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
       VALUES (NULL, 'INR', '₹', 'Indian Rupee', 1.000000, TRUE, TRUE)
       ON CONFLICT (country_id, currency_code) DO NOTHING`
    );

    // 4. Per-country currencies
    for (const s of COUNTRY_SEEDS) {
      const [[row]] = await pool.query(
        'SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [s.iso]
      );
      if (!row) continue;
      await pool.query(
        `INSERT INTO currency_settings
           (country_id, currency_code, currency_symbol, currency_name, exchange_rate, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, FALSE, TRUE)
         ON CONFLICT (country_id, currency_code) DO NOTHING`,
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
      `SELECT i.relname AS index_name, ix.indisunique AS is_unique, a.attname AS column_name
       FROM pg_class t
       JOIN pg_index ix ON t.oid = ix.indrelid
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
       WHERE t.relname = 'member_accounts'
       ORDER BY index_name, a.attnum`
    );

    const byIndex = new Map();
    for (const row of indexes) {
      const current = byIndex.get(row.index_name) || [];
      current.push(row);
      byIndex.set(row.index_name, current);
    }

    for (const [indexName, rows] of byIndex.entries()) {
      if (indexName.endsWith('_pkey')) continue;
      const isUnique = rows[0].is_unique === true;
      const cols = rows.map(r => r.column_name);
      if (isUnique && cols.length === 1 && cols[0] === 'email') {
        await pool.query(`DROP INDEX IF EXISTS ${indexName}`);
        console.log(`[SCHEMA] Dropped UNIQUE email index on member_accounts: ${indexName}`);
      }
    }
  } catch (err) {
    console.error('[SCHEMA] member_accounts schema check failed (non-fatal):', err.message);
  }
}

async function ensureContactMessagesSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portal_contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(250) NOT NULL,
        email VARCHAR(250) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(250),
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[SCHEMA] Checked/created portal_contact_messages table');
  } catch (err) {
    console.error('[SCHEMA] portal_contact_messages table check failed:', err.message);
  }
}

async function runBlogMigration() {
  const fs = require('fs');
  const migrationPath = path.join(__dirname, '../../database/migrations/05-blog-content.sql');
  try {
    const [[{ exists }]] = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portal_blog_menus'
       ) AS exists`
    );
    if (exists) return;
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.replace(/--[^\n]*/g, '').trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('[SCHEMA] Applied blog/content migration');
  } catch (err) {
    console.error('[SCHEMA] Blog migration failed (non-fatal):', err.message);
  }
}

async function runWingsMigration() {
  const fs = require('fs');
  const migrationPath = path.join(__dirname, '../../database/migrations/03-wings-positions-profiles.sql');
  try {
    const [[{ exists }]] = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portal_wings'
       ) AS exists`
    );
    if (exists) return;
    if (!fs.existsSync(migrationPath)) {
      console.warn('[SCHEMA] Wings migration file not found');
      return;
    }
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.replace(/--[^\n]*/g, '').trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('[SCHEMA] Applied wings/positions/profiles migration');
  } catch (err) {
    console.error('[SCHEMA] Wings migration failed (non-fatal):', err.message);
  }
}

async function backfillSubmissionsLocations() {
  try {
    const [rows] = await pool.query(
      `SELECT id, data FROM fb_submissions 
       WHERE state_id IS NULL OR country_id IS NULL OR city_id IS NULL`
    );
    console.log(`[BACKFILL] Found ${rows.length} submissions needing location backfill`);
    
    for (const sub of rows) {
      let parsedData = null;
      if (sub.data) {
        try {
          parsedData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        } catch (e) {
          console.error(`[BACKFILL] Failed to parse JSON for submission ${sub.id}`);
        }
      }
      
      // Also fetch from fb_submission_data as a fallback/reinforcement
      const [dbData] = await pool.query(
        'SELECT field_key, value FROM fb_submission_data WHERE submission_id = ?',
        [sub.id]
      );
      const dataMap = {};
      for (const r of dbData) {
        dataMap[r.field_key] = r.value;
      }
      
      const state_id = (parsedData && parsedData.state_id) || dataMap.state_id || null;
      const city_id = (parsedData && parsedData.city_id) || dataMap.city_id || null;
      const country_id = (parsedData && parsedData.country_id) || dataMap.country_id || null;
      
      if (state_id || city_id || country_id) {
        await pool.query(
          `UPDATE fb_submissions 
           SET state_id = COALESCE(state_id, ?),
               city_id = COALESCE(city_id, ?),
               country_id = COALESCE(country_id, ?)
           WHERE id = ?`,
          [
            state_id ? Number(state_id) : null,
            city_id ? Number(city_id) : null,
            country_id ? Number(country_id) : null,
            sub.id
          ]
        );
        console.log(`[BACKFILL] Updated submission ${sub.id}: state_id=${state_id}, city_id=${city_id}, country_id=${country_id}`);
      }
    }
    console.log('[BACKFILL] Location backfill complete ✓');
  } catch (err) {
    console.error('[BACKFILL] Location backfill failed:', err.message);
  }
}

async function start() {
  await testConnection();
  await runWingsMigration();
  await runBlogMigration();
  await ensureMemberAccountsSchema();
  await ensureContactMessagesSchema();
  await seedLocationsIfEmpty();
  await seedCurrencyData();
  await backfillSubmissionsLocations();
  startRenewalReminderCron();
  app.listen(PORT, () => {
    console.log(`✅ FORTI Portal API running on http://localhost:${PORT}`);
  });
}

start();
