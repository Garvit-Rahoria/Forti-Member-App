const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { testConnection, pool } = require('./config/database');
const { apiLimiter, otpLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const { seedLocationsIfEmpty } = require('./utils/seedLocations');
const { ensureCitiesAndBranchesSeeded } = require('./utils/seedCitiesBranches');
const { ensureAdminUser } = require('./utils/seedAdmin');
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
app.use('/api/branches',     require('./routes/branches'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/settings',     require('./routes/settings'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/audit',        require('./routes/audit'));
app.use('/api/membership',   require('./routes/membership'));
app.use('/api/renewals',         require('./routes/renewals'));
app.use('/api/invoices',         require('./routes/invoices'));
app.use('/api/otp',              require('./routes/otp'));
app.use('/api/member/business-profile', require('./routes/business-profile'));
app.use('/api/business-profile', require('./routes/business-profile'));
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
      { iso: 'US', code: 'USD', sym: '$',     name: 'US Dollar',          rate: 83.33,   def: 0 },
      { iso: 'GB', code: 'GBP', sym: '£',     name: 'British Pound',      rate: 106.0,   def: 0 },
      { iso: 'AE', code: 'AED', sym: 'د.إ',  name: 'UAE Dirham',         rate: 22.70,   def: 0 },
      { iso: 'JP', code: 'JPY', sym: '¥',     name: 'Japanese Yen',       rate: 0.56,    def: 0 },
      { iso: 'AU', code: 'AUD', sym: 'A$',    name: 'Australian Dollar',  rate: 55.50,   def: 0 },
      { iso: 'CA', code: 'CAD', sym: 'C$',    name: 'Canadian Dollar',    rate: 62.50,   def: 0 },
      { iso: 'SG', code: 'SGD', sym: 'S$',    name: 'Singapore Dollar',   rate: 62.50,   def: 0 },
      { iso: 'DE', code: 'EUR', sym: '€',     name: 'Euro',               rate: 90.90,   def: 0 },
      { iso: 'FR', code: 'EUR', sym: '€',     name: 'Euro',               rate: 90.90,   def: 0 },
      { iso: 'SA', code: 'SAR', sym: '﷼',    name: 'Saudi Riyal',        rate: 22.20,   def: 0 },
      { iso: 'QA', code: 'QAR', sym: '﷼',    name: 'Qatari Riyal',       rate: 22.70,   def: 0 },
      { iso: 'KW', code: 'KWD', sym: 'KD',   name: 'Kuwaiti Dinar',      rate: 270.0,   def: 0 },
      { iso: 'BH', code: 'BHD', sym: 'BD',   name: 'Bahraini Dinar',     rate: 222.0,   def: 0 },
      { iso: 'OM', code: 'OMR', sym: 'OMR',  name: 'Omani Rial',         rate: 217.0,   def: 0 },
      { iso: 'MY', code: 'MYR', sym: 'RM',   name: 'Malaysian Ringgit',  rate: 17.85,   def: 0 },
      { iso: 'NZ', code: 'NZD', sym: 'NZ$',  name: 'New Zealand Dollar', rate: 50.0,    def: 0 },
      { iso: 'ZA', code: 'ZAR', sym: 'R',    name: 'South African Rand', rate: 4.55,    def: 0 },
      { iso: 'CN', code: 'CNY', sym: '¥',    name: 'Chinese Yuan',       rate: 11.60,   def: 0 },
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

async function ensureBranchesHierarchySchema() {
  try {
    await pool.query('ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS country_id INTEGER');
    await pool.query('ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS city_id INTEGER');
    try {
      await pool.query('ALTER TABLE portal_branches ALTER COLUMN state_id DROP NOT NULL');
    } catch (_) { /* already nullable */ }
    await pool.query('CREATE INDEX IF NOT EXISTS idx_portal_branches_country ON portal_branches(country_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_portal_branches_city ON portal_branches(city_id)');

    await pool.query('ALTER TABLE cities ADD COLUMN IF NOT EXISTS country_id INTEGER');
    try {
      await pool.query('ALTER TABLE cities ALTER COLUMN state_id DROP NOT NULL');
    } catch (_) { /* already nullable */ }
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id)');

    // Backfill country from state
    await pool.query(`
      UPDATE portal_branches b
      SET country_id = s.country_id
      FROM states s
      WHERE b.state_id = s.id
        AND (b.country_id IS NULL OR b.country_id <> s.country_id)
    `);

    // Map city-named branches (e.g. "Jaipur HQ", "Kota Branch") to cities
    await pool.query(`
      UPDATE portal_branches b
      SET city_id = c.id
      FROM cities c
      WHERE b.city_id IS NULL
        AND b.state_id IS NOT NULL
        AND c.state_id = b.state_id
        AND (
          lower(b.name) = lower(c.name)
          OR lower(b.name) = lower(c.name || ' Branch')
          OR lower(b.name) = lower(c.name || ' HQ')
          OR lower(regexp_replace(b.name, '\\s+(Branch|HQ)$', '', 'i')) = lower(c.name)
        )
    `);

    // Remaining state-linked rows → India if possible
    await pool.query(`
      UPDATE portal_branches b
      SET country_id = (
        SELECT id FROM countries WHERE upper(COALESCE(iso_code, '')) = 'IN' ORDER BY id LIMIT 1
      )
      WHERE b.country_id IS NULL AND b.state_id IS NOT NULL
    `);

    console.log('[SCHEMA] Checked portal_branches country/state/city hierarchy');
  } catch (err) {
    console.error('[SCHEMA] portal_branches hierarchy check failed (non-fatal):', err.message);
  }
}

async function ensureSubmissionsSchema() {
  try {
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS position VARCHAR(120)');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS branch_id INTEGER');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS wing_id INTEGER');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS package_id INTEGER');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50)');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS membership_type VARCHAR(50)');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS country_id INTEGER');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS state_id INTEGER');
    await pool.query('ALTER TABLE fb_submissions ADD COLUMN IF NOT EXISTS city_id INTEGER');
    // Optional FK-style indexes (non-fatal if already exist)
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_fb_submissions_branch_id ON fb_submissions(branch_id)');
    } catch (_) { /* ignore */ }
    console.log('[SCHEMA] Checked fb_submissions location/membership columns');
  } catch (err) {
    console.error('[SCHEMA] fb_submissions schema check failed (non-fatal):', err.message);
  }
}

async function ensureMemberPublicProfilesSchema() {
  try {
    await pool.query(`ALTER TABLE member_public_profiles ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT '#000000'`);
    await pool.query(`ALTER TABLE member_public_profiles ADD COLUMN IF NOT EXISTS background_style VARCHAR(30) DEFAULT 'solid'`);
    await pool.query(`ALTER TABLE member_public_profiles ADD COLUMN IF NOT EXISTS button_style VARCHAR(30) DEFAULT 'rounded'`);
    console.log('[SCHEMA] Checked member_public_profiles theme columns');
  } catch (err) {
    console.error('[SCHEMA] member_public_profiles schema check failed (non-fatal):', err.message);
  }
}

async function ensurePaymentMethodsSchema() {
  try {
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS upi_id VARCHAR(200)`);
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS account_name VARCHAR(200)`);
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20)`);
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS account_type VARCHAR(50)`);
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS routing_number VARCHAR(50)`);
    await pool.query(`ALTER TABLE portal_payment_methods ADD COLUMN IF NOT EXISTS currency VARCHAR(10)`);
    // Allow extended payment lifecycle statuses (submitted, superseded, reset, …)
    try {
      await pool.query(`ALTER TABLE portal_payments ALTER COLUMN status TYPE VARCHAR(30)`);
    } catch (_) { /* ignore */ }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS application_activity (
        id            SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL,
        event_type    VARCHAR(80) NOT NULL,
        notes         TEXT,
        acted_by      INTEGER,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_application_activity_sub ON application_activity(submission_id)');
    // Backfill UPI ID from common seed instruction text when column was missing
    await pool.query(`
      UPDATE portal_payment_methods
      SET upi_id = 'forti@upi'
      WHERE type = 'upi'
        AND (upi_id IS NULL OR TRIM(upi_id) = '')
        AND instructions ILIKE '%forti@upi%'
    `);
    // Backfill bank transfer structured fields from seed instruction text
    await pool.query(`
      UPDATE portal_payment_methods
      SET
        account_name = COALESCE(NULLIF(TRIM(account_name), ''), 'FORTI'),
        bank_name = COALESCE(NULLIF(TRIM(bank_name), ''), 'FORTI Bank'),
        account_number = COALESCE(NULLIF(TRIM(account_number), ''), '1234567890'),
        ifsc_code = COALESCE(NULLIF(TRIM(ifsc_code), ''), 'FORT0000001'),
        branch_name = COALESCE(NULLIF(TRIM(branch_name), ''), 'Head Office'),
        account_type = COALESCE(NULLIF(TRIM(account_type), ''), 'Current')
      WHERE type = 'bank_transfer'
        AND (
          account_number IS NULL OR TRIM(account_number) = ''
          OR ifsc_code IS NULL OR TRIM(ifsc_code) = ''
          OR bank_name IS NULL OR TRIM(bank_name) = ''
        )
        AND instructions ILIKE '%FORTI Bank%'
    `);
    // Backfill international wire placeholder details when empty
    await pool.query(`
      UPDATE portal_payment_methods
      SET
        account_name = COALESCE(NULLIF(TRIM(account_name), ''), 'Federation of Rajasthan Trade & Industry'),
        bank_name = COALESCE(NULLIF(TRIM(bank_name), ''), 'FORTI International Bank'),
        bank_address = COALESCE(NULLIF(TRIM(bank_address), ''), 'Jaipur, Rajasthan, India'),
        account_number = COALESCE(NULLIF(TRIM(account_number), ''), '123456789012'),
        iban = COALESCE(NULLIF(TRIM(iban), ''), 'IN00FORTI000123456789012'),
        swift_code = COALESCE(NULLIF(TRIM(swift_code), ''), 'FORTINBBXXX'),
        routing_number = COALESCE(NULLIF(TRIM(routing_number), ''), ''),
        currency = COALESCE(NULLIF(TRIM(currency), ''), 'USD'),
        instructions = COALESCE(
          NULLIF(TRIM(instructions), ''),
          'Transfer via SWIFT/International Wire. Bank charges borne by sender. Share confirmation screenshot.'
        )
      WHERE type = 'international_wire'
        AND (
          swift_code IS NULL OR TRIM(swift_code) = ''
          OR account_number IS NULL OR TRIM(account_number) = ''
          OR bank_name IS NULL OR TRIM(bank_name) = ''
        )
    `);
    console.log('[SCHEMA] Checked portal_payment_methods UPI/bank detail columns');
  } catch (err) {
    console.error('[SCHEMA] portal_payment_methods schema check failed (non-fatal):', err.message);
  }
}

async function ensurePackagesSchema() {
  try {
    await pool.query(`
      ALTER TABLE portal_packages
        ADD COLUMN IF NOT EXISTS wing_id INTEGER REFERENCES portal_wings(id)
    `);
    await pool.query(`
      UPDATE portal_packages
      SET duration_months = CASE
        WHEN duration = 'lifetime' THEN 999
        WHEN duration = '3years' THEN 36
        WHEN duration IN ('1year', 'yearly') THEN 12
        ELSE duration_months
      END
      WHERE duration_months IS NULL AND duration IS NOT NULL
    `);
    console.log('[SCHEMA] Checked portal_packages.wing_id column');
  } catch (err) {
    console.error('[SCHEMA] portal_packages schema check failed (non-fatal):', err.message);
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
        state_id INTEGER,
        state_name VARCHAR(120),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('ALTER TABLE portal_contact_messages ADD COLUMN IF NOT EXISTS state_id INTEGER');
    await pool.query('ALTER TABLE portal_contact_messages ADD COLUMN IF NOT EXISTS state_name VARCHAR(120)');
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
  await ensureSubmissionsSchema();
  await ensureBranchesHierarchySchema();
  await ensureMemberPublicProfilesSchema();
  await ensurePackagesSchema();
  await ensurePaymentMethodsSchema();
  await ensureMemberAccountsSchema();
  await ensureContactMessagesSchema();
  try {
    const { ensureBusinessProfileTables } = require('./routes/business-profile');
    await ensureBusinessProfileTables();
    console.log('[SCHEMA] Checked business profile tables');
  } catch (err) {
    console.error('[SCHEMA] business profile schema failed (non-fatal):', err.message);
  }
  await seedLocationsIfEmpty();
  await ensureCitiesAndBranchesSeeded();
  await seedCurrencyData();
  await backfillSubmissionsLocations();
  await ensureAdminUser();
  startRenewalReminderCron();
  const server = app.listen(PORT, () => {
    console.log(`✅ FORTI Portal API running on http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} is already in use. Stop the other backend process and retry.`);
      process.exit(1);
    }
    console.error('[UNCAUGHT EXCEPTION] listen', err);
    process.exit(1);
  });
}

start();
