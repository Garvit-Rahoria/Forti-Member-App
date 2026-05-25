const { pool } = require('../config/database');

const COUNTRIES = [
  { name: 'India',                iso: 'IN', phone: '+91',  currency: 'INR' },
  { name: 'United States',        iso: 'US', phone: '+1',   currency: 'USD' },
  { name: 'United Kingdom',       iso: 'GB', phone: '+44',  currency: 'GBP' },
  { name: 'United Arab Emirates', iso: 'AE', phone: '+971', currency: 'AED' },
  { name: 'Australia',            iso: 'AU', phone: '+61',  currency: 'AUD' },
  { name: 'Canada',               iso: 'CA', phone: '+1',   currency: 'CAD' },
  { name: 'Singapore',            iso: 'SG', phone: '+65',  currency: 'SGD' },
  { name: 'Germany',              iso: 'DE', phone: '+49',  currency: 'EUR' },
  { name: 'France',               iso: 'FR', phone: '+33',  currency: 'EUR' },
  { name: 'Netherlands',          iso: 'NL', phone: '+31',  currency: 'EUR' },
  { name: 'New Zealand',          iso: 'NZ', phone: '+64',  currency: 'NZD' },
  { name: 'South Africa',         iso: 'ZA', phone: '+27',  currency: 'ZAR' },
  { name: 'Malaysia',             iso: 'MY', phone: '+60',  currency: 'MYR' },
  { name: 'Bahrain',              iso: 'BH', phone: '+973', currency: 'BHD' },
  { name: 'Qatar',                iso: 'QA', phone: '+974', currency: 'QAR' },
  { name: 'Kuwait',               iso: 'KW', phone: '+965', currency: 'KWD' },
  { name: 'Oman',                 iso: 'OM', phone: '+968', currency: 'OMR' },
  { name: 'Saudi Arabia',         iso: 'SA', phone: '+966', currency: 'SAR' },
  { name: 'Japan',                iso: 'JP', phone: '+81',  currency: 'JPY' },
  { name: 'China',                iso: 'CN', phone: '+86',  currency: 'CNY' },
  { name: 'Sri Lanka',            iso: 'LK', phone: '+94',  currency: 'LKR' },
  { name: 'Nepal',                iso: 'NP', phone: '+977', currency: 'NPR' },
  { name: 'Bangladesh',           iso: 'BD', phone: '+880', currency: 'BDT' },
  { name: 'Pakistan',             iso: 'PK', phone: '+92',  currency: 'PKR' },
  { name: 'Nigeria',              iso: 'NG', phone: '+234', currency: 'NGN' },
  { name: 'Kenya',                iso: 'KE', phone: '+254', currency: 'KES' },
  { name: 'Ghana',                iso: 'GH', phone: '+233', currency: 'GHS' },
  { name: 'Ireland',              iso: 'IE', phone: '+353', currency: 'EUR' },
  { name: 'Sweden',               iso: 'SE', phone: '+46',  currency: 'SEK' },
  { name: 'Switzerland',          iso: 'CH', phone: '+41',  currency: 'CHF' },
  { name: 'Italy',                iso: 'IT', phone: '+39',  currency: 'EUR' },
  { name: 'Spain',                iso: 'ES', phone: '+34',  currency: 'EUR' },
  { name: 'Brazil',               iso: 'BR', phone: '+55',  currency: 'BRL' },
  { name: 'Mexico',               iso: 'MX', phone: '+52',  currency: 'MXN' },
  { name: 'Indonesia',            iso: 'ID', phone: '+62',  currency: 'IDR' },
];

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

async function seedLocationsIfEmpty() {
  try {
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS n FROM countries WHERE is_active IS TRUE'
    );
    const n = Number(countRows[0]?.n ?? countRows?.n ?? 0);
    if (n > 0) return;

    console.log('[SEED] Seeding countries and India states…');
    for (const country of COUNTRIES) {
      await pool.query(
        'INSERT INTO countries (name, iso_code, phone_prefix, currency, is_active) VALUES (?, ?, ?, ?, TRUE)',
        [country.name, country.iso, country.phone, country.currency]
      );
    }

    const [indiaRows] = await pool.query(
      'SELECT id FROM countries WHERE iso_code = ? LIMIT 1',
      ['IN']
    );
    const indiaId = indiaRows[0]?.id;
    if (indiaId) {
      for (const name of INDIA_STATES) {
        await pool.query(
          'INSERT INTO states (country_id, name) VALUES (?, ?)',
          [indiaId, name]
        );
      }
    }

    console.log(`[SEED] Locations seeded ✓ (${COUNTRIES.length} countries, ${INDIA_STATES.length} India states)`);
  } catch (err) {
    console.error('[SEED] Location seed failed (non-fatal):', err.message);
  }
}

module.exports = { seedLocationsIfEmpty };
