require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'forti',
    password: process.env.DB_PASS || 'forti@2026',
    database: process.env.DB_NAME || 'forti_membership',
  });

  // 1. Create table
  await c.query(`
    CREATE TABLE IF NOT EXISTS application_fields (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      step TINYINT NOT NULL DEFAULT 1,
      field_key VARCHAR(120) NOT NULL,
      label VARCHAR(200) NOT NULL,
      field_type VARCHAR(50) NOT NULL DEFAULT 'text',
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      field_order SMALLINT NOT NULL DEFAULT 0,
      placeholder VARCHAR(255) DEFAULT NULL,
      options JSON DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_field_key (field_key)
    )
  `);
  console.log('✓ application_fields table created');

  // 2. Seed fields
  const fields = [
    // Step 1 — Basic Details
    { step: 1, field_key: 'profile_photo', label: 'Profile Photo', field_type: 'image', is_required: 0, field_order: 0 },
    { step: 1, field_key: 'full_name', label: 'Full Name', field_type: 'text', is_required: 1, field_order: 1, placeholder: 'Enter your full name' },
    { step: 1, field_key: 'email', label: 'Email Address', field_type: 'email', is_required: 1, field_order: 2, placeholder: 'your@email.com' },
    { step: 1, field_key: 'phone', label: 'Phone Number', field_type: 'phone', is_required: 1, field_order: 3, placeholder: '+91 XXXXX XXXXX' },
    { step: 1, field_key: 'gender', label: 'Gender', field_type: 'dropdown', is_required: 0, field_order: 4, options: ['Male', 'Female', 'Other'] },
    { step: 1, field_key: 'date_of_birth', label: 'Date of Birth', field_type: 'date', is_required: 0, field_order: 5 },
    { step: 1, field_key: 'aadhaar_number', label: 'Aadhaar Number', field_type: 'text', is_required: 0, field_order: 6, placeholder: '12-digit Aadhaar number' },
    { step: 1, field_key: 'pan_number', label: 'PAN Number', field_type: 'text', is_required: 0, field_order: 7, placeholder: 'e.g. ABCDE1234F' },
    { step: 1, field_key: 'pin_code', label: 'PIN Code', field_type: 'text', is_required: 0, field_order: 8, placeholder: '6-digit PIN code' },
    { step: 1, field_key: 'address', label: 'Address', field_type: 'textarea', is_required: 0, field_order: 9, placeholder: 'Enter your full address' },
    { step: 1, field_key: 'organisation_name', label: 'Organisation / Company Name', field_type: 'text', is_required: 0, field_order: 10, placeholder: 'Company or organisation name' },
    { step: 1, field_key: 'designation', label: 'Designation', field_type: 'text', is_required: 0, field_order: 11, placeholder: 'Your role or title' },
    { step: 1, field_key: 'social_links', label: 'Social Media Links', field_type: 'textarea', is_required: 0, field_order: 12, placeholder: 'LinkedIn, Facebook, etc.' },

    // Step 2 — Location
    {
      step: 2, field_key: 'is_overseas', label: 'Are you based overseas?', field_type: 'card_select', is_required: 0, field_order: 0,
      options: [
        { value: 'no', label: 'No, I am in India', description: 'Domestic member', icon: '🇮🇳' },
        { value: 'yes', label: 'Yes, I am overseas', description: 'International member', icon: '🌍' },
      ],
    },
    { step: 2, field_key: 'country_id', label: 'Country', field_type: 'country_select', is_required: 1, field_order: 1 },
    { step: 2, field_key: 'state_id', label: 'State / Province', field_type: 'dropdown', is_required: 1, field_order: 2 },
    { step: 2, field_key: 'city_id', label: 'City / District', field_type: 'dropdown', is_required: 0, field_order: 3 },

    // Step 3 — Membership Type
    {
      step: 3, field_key: 'membership_type', label: 'Membership Type', field_type: 'card_select', is_required: 1, field_order: 0,
      options: [
        { value: 'individual', label: 'Individual', description: 'For individual professionals', icon: '👤' },
        { value: 'corporate', label: 'Corporate / Organisation', description: 'For companies and organisations', icon: '🏢' },
      ],
    },

    // Step 4 — Plan & Package
    { step: 4, field_key: 'plan_type', label: 'Membership Plan', field_type: 'card_select', is_required: 1, field_order: 0 },

    // Step 5 — Payment
    { step: 5, field_key: 'payment_method_id', label: 'Payment Method', field_type: 'payment_method', is_required: 1, field_order: 0 },
    { step: 5, field_key: 'transaction_id', label: 'Transaction / Reference ID', field_type: 'text', is_required: 1, field_order: 1, placeholder: 'Enter your transaction reference' },
    { step: 5, field_key: 'payment_screenshot', label: 'Payment Screenshot', field_type: 'image', is_required: 1, field_order: 2 },
    { step: 5, field_key: 'terms_accepted', label: 'I agree to the Terms & Conditions and Declaration', field_type: 'checkbox', is_required: 1, field_order: 3 },
  ];

  let inserted = 0;
  for (const f of fields) {
    try {
      await c.query(
        `INSERT INTO application_fields (step, field_key, label, field_type, is_required, field_order, placeholder, options)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.step, f.field_key, f.label, f.field_type, f.is_required, f.field_order, f.placeholder || null, f.options ? JSON.stringify(f.options) : null]
      );
      inserted++;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log(`  ⇢ "${f.field_key}" already exists, skipping`);
      } else {
        console.error(`  ✗ ${f.field_key}: ${e.message}`);
      }
    }
  }

  const [[{ cnt }]] = await c.query('SELECT COUNT(*) AS cnt FROM application_fields');
  console.log(`✓ ${inserted} fields inserted (${cnt} total in table)`);

  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });
