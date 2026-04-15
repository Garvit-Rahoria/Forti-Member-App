/**
 * FORTI Portal - Direct DB Migration Runner
 * Runs all v2-v5 migration logic directly (no DELIMITER workaround needed)
 */
const mysql = require('mysql2/promise');

const cfg = {
  host: '127.0.0.1', port: 3306,
  user: 'root', password: 'lifepulse123',
  database: 'forti_membership'
};

async function columnExists(c, table, col) {
  const [r] = await c.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE table_schema=? AND table_name=? AND column_name=?',
    ['forti_membership', table, col]
  );
  return r.length > 0;
}

async function tableExists(c, table) {
  const [r] = await c.query(
    'SELECT 1 FROM information_schema.TABLES WHERE table_schema=? AND table_name=?',
    ['forti_membership', table]
  );
  return r.length > 0;
}

async function addCol(c, table, col, def) {
  if (!(await columnExists(c, table, col))) {
    await c.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
    console.log(`  + Added column ${table}.${col}`);
  }
}

async function run() {
  const c = await mysql.createConnection(cfg);
  console.log('Connected. Running migrations...\n');

  // ── V2: Extra columns on fb_submissions ─────────────────────────────────
  console.log('[v2] Adding submission columns...');
  await addCol(c, 'fb_submissions', 'applicant_name',   'VARCHAR(200) NULL');
  await addCol(c, 'fb_submissions', 'applicant_email',  'VARCHAR(200) NULL');
  await addCol(c, 'fb_submissions', 'applicant_phone',  'VARCHAR(30) NULL');
  await addCol(c, 'fb_submissions', 'applicant_uuid',   'VARCHAR(36) NULL');
  await addCol(c, 'fb_submissions', 'membership_id',    'VARCHAR(80) NULL');
  await addCol(c, 'fb_submissions', 'approval_stage',   'INT UNSIGNED NULL');
  await addCol(c, 'fb_submissions', 'rejection_reason', 'TEXT NULL');
  await addCol(c, 'fb_submissions', 'cert_generated',   'TINYINT(1) NOT NULL DEFAULT 0');
  await addCol(c, 'fb_submissions', 'card_generated',   'TINYINT(1) NOT NULL DEFAULT 0');

  // ── V3: More columns ─────────────────────────────────────────────────────
  console.log('[v3] Adding v3 columns...');
  await addCol(c, 'fb_submissions',       'data',            'JSON NULL');
  await addCol(c, 'portal_packages',      'membership_type', "ENUM('individual','corporate','both') NOT NULL DEFAULT 'both'");
  await addCol(c, 'portal_packages',      'plan_type',       "ENUM('yearly','lifetime','both') NOT NULL DEFAULT 'both'");
  await addCol(c, 'portal_packages',      'country_id',      'SMALLINT UNSIGNED NULL');
  await addCol(c, 'portal_packages',      'state_id',        'SMALLINT UNSIGNED NULL');
  await addCol(c, 'portal_payment_methods','country_id',     'SMALLINT UNSIGNED NULL');

  // V3 seed updates
  await c.query(`UPDATE portal_packages SET membership_type='individual', plan_type='yearly'   WHERE code='IND-1YR'`);
  await c.query(`UPDATE portal_packages SET membership_type='corporate',  plan_type='yearly'   WHERE code='CORP-1YR'`);
  await c.query(`UPDATE portal_packages SET membership_type='individual', plan_type='yearly'   WHERE code='STU-1YR'`);
  await c.query(`UPDATE portal_packages SET membership_type='individual', plan_type='lifetime' WHERE code='LFT'`);
  console.log('  + Package types seeded');

  // ── V4: More submission columns + new tables ─────────────────────────────
  console.log('[v4] Adding v4 columns + tables...');
  await addCol(c, 'fb_submissions', 'expiry_date',   'DATE NULL');
  await addCol(c, 'fb_submissions', 'member_status', "ENUM('active','expired','suspended','inactive') NOT NULL DEFAULT 'active'");
  await addCol(c, 'fb_submissions', 'package_id',    'INT UNSIGNED NULL');

  if (!(await tableExists(c, 'portal_renewals'))) {
    await c.query(`CREATE TABLE portal_renewals (
      id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid              VARCHAR(36) UNIQUE NOT NULL,
      submission_id     INT UNSIGNED NOT NULL,
      package_id        INT UNSIGNED NULL,
      amount            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency          VARCHAR(10) NOT NULL DEFAULT 'INR',
      old_expiry_date   DATE NULL,
      new_expiry_date   DATE NULL,
      payment_method_id INT UNSIGNED NULL,
      transaction_id    VARCHAR(200),
      screenshot_path   VARCHAR(500),
      status            ENUM('pending','payment_submitted','verified','rejected') NOT NULL DEFAULT 'pending',
      notes             TEXT,
      processed_by      INT UNSIGNED NULL,
      processed_at      TIMESTAMP NULL,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
    )`);
    console.log('  + Created portal_renewals');
  }

  if (!(await tableExists(c, 'invoices'))) {
    await c.query(`CREATE TABLE invoices (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      invoice_number  VARCHAR(40) UNIQUE NOT NULL,
      submission_id   INT UNSIGNED NOT NULL,
      renewal_id      INT UNSIGNED NULL,
      payment_id      INT UNSIGNED NULL,
      invoice_type    ENUM('membership','renewal','upgrade') NOT NULL DEFAULT 'membership',
      member_name     VARCHAR(200),
      member_email    VARCHAR(200),
      member_id_str   VARCHAR(80),
      package_name    VARCHAR(200),
      amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
      notes           TEXT,
      pdf_path        VARCHAR(500),
      issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
    )`);
    console.log('  + Created invoices');
  }

  if (!(await tableExists(c, 'portal_renewal_reminders'))) {
    await c.query(`CREATE TABLE portal_renewal_reminders (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      submission_id INT UNSIGNED NOT NULL,
      remind_days   SMALLINT NOT NULL DEFAULT 30,
      sent_at       DATETIME NULL,
      status        ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
    )`);
    console.log('  + Created portal_renewal_reminders');
  }

  // ── V5: OTP + member accounts + email log ────────────────────────────────
  console.log('[v5] Adding OTP/member tables...');

  if (!(await tableExists(c, 'member_otps'))) {
    await c.query(`CREATE TABLE member_otps (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email       VARCHAR(200) NOT NULL,
      phone       VARCHAR(30) NULL,
      full_name   VARCHAR(200) NULL,
      otp_code    VARCHAR(10) NOT NULL,
      purpose     ENUM('apply','login') NOT NULL DEFAULT 'apply',
      verified    TINYINT(1) NOT NULL DEFAULT 0,
      attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at  DATETIME NOT NULL,
      verified_at DATETIME NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_purpose (email, purpose),
      INDEX idx_expires (expires_at)
    )`);
    console.log('  + Created member_otps');
  }

  if (!(await tableExists(c, 'member_accounts'))) {
    await c.query(`CREATE TABLE member_accounts (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid          VARCHAR(36) UNIQUE NOT NULL,
      submission_id INT UNSIGNED NOT NULL,
      email         VARCHAR(200) UNIQUE NOT NULL,
      full_name     VARCHAR(200) NULL,
      phone         VARCHAR(30) NULL,
      membership_id VARCHAR(80) NULL,
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      last_login    DATETIME NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES fb_submissions(id)
    )`);
    console.log('  + Created member_accounts');
  }

  if (!(await tableExists(c, 'email_log'))) {
    await c.query(`CREATE TABLE email_log (
      id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      to_email  VARCHAR(200) NOT NULL,
      subject   VARCHAR(500) NOT NULL,
      template  VARCHAR(100) NULL,
      ref_id    VARCHAR(80) NULL,
      status    ENUM('sent','failed') NOT NULL DEFAULT 'sent',
      error_msg TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_to_email (to_email),
      INDEX idx_ref (ref_id)
    )`);
    console.log('  + Created email_log');
  }

  // ── V6: Package rich media + payment methods ────────────────────────────
  console.log('[v6] Adding package region_logo, qr_code, bank_details, payment_methods...');
  await addCol(c, 'portal_packages', 'region_logo',    'VARCHAR(500) NULL');
  await addCol(c, 'portal_packages', 'qr_code',        'VARCHAR(500) NULL');
  await addCol(c, 'portal_packages', 'bank_details',   'JSON NULL');
  await addCol(c, 'portal_packages', 'payment_methods','JSON NULL');

  // Final check
  const [tables] = await c.query('SHOW TABLES');
  const names = tables.map(x => Object.values(x)[0]);
  console.log(`\nAll tables (${names.length}): ${names.join(', ')}`);

  await c.end();
  console.log('\nMigration complete!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
