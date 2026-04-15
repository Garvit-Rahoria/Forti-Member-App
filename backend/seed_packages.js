const { pool } = require('./src/config/database');

const LOCATIONS = [
  { value: 'rajasthan',    label: 'Rajasthan',     code: 'RAJ' },
  { value: 'other_states', label: 'Other States',  code: 'OTH' },
  { value: 'overseas',     label: 'Overseas',       code: 'OVSEA' },
];

const TYPES = [
  { value: 'individual', label: 'Individual', code: 'IND' },
  { value: 'corporate',  label: 'Corporate',  code: 'CORP' },
];

const DURATIONS = [
  { value: '1year',    label: '1 Year',   code: '1Y',  months: 12  },
  { value: '3years',   label: '3 Years',  code: '3Y',  months: 36  },
  { value: 'lifetime', label: 'Lifetime', code: 'LFT', months: 999 },
];

// Default prices: [rajasthan, other_states, overseas] × [individual, corporate] × [1year, 3years, lifetime]
const PRICES = {
  'rajasthan_individual_1year':        2500,
  'rajasthan_individual_3years':       7500,
  'rajasthan_individual_lifetime':    25000,
  'rajasthan_corporate_1year':        15000,
  'rajasthan_corporate_3years':       45000,
  'rajasthan_corporate_lifetime':    100000,
  'other_states_individual_1year':     3000,
  'other_states_individual_3years':    9000,
  'other_states_individual_lifetime': 30000,
  'other_states_corporate_1year':     18000,
  'other_states_corporate_3years':    54000,
  'other_states_corporate_lifetime': 120000,
  'overseas_individual_1year':          100, // USD
  'overseas_individual_3years':         300,
  'overseas_individual_lifetime':      1000,
  'overseas_corporate_1year':           500,
  'overseas_corporate_3years':         1500,
  'overseas_corporate_lifetime':       3000,
};

const CURRENCIES = {
  rajasthan: 'INR',
  other_states: 'INR',
  overseas: 'USD',
};

(async () => {
  try {
    // First deactivate all existing packages
    await pool.query('UPDATE portal_packages SET is_active = 0');
    console.log('Deactivated existing packages');

    let count = 0;
    for (const loc of LOCATIONS) {
      for (const type of TYPES) {
        for (const dur of DURATIONS) {
          const name = `${loc.label} ${type.label} - ${dur.label}`;
          const code = `${loc.code}-${type.code}-${dur.code}`;
          const priceKey = `${loc.value}_${type.value}_${dur.value}`;
          const price = PRICES[priceKey] || 0;
          const currency = CURRENCIES[loc.value];

          // Check if this combo already exists (active or not)
          const [[existing]] = await pool.query(
            'SELECT id FROM portal_packages WHERE location = ? AND membership_type = ? AND duration = ? AND country_id IS NULL LIMIT 1',
            [loc.value, type.value, dur.value]
          );

          if (existing) {
            // Reactivate and update
            await pool.query(
              `UPDATE portal_packages 
               SET name = ?, code = ?, price = ?, currency = ?, is_active = 1, 
                   duration_months = ?, sort_order = ?, auto_generated = 1
               WHERE id = ?`,
              [name, code, price, currency, dur.months, count + 1, existing.id]
            );
            console.log(`  Updated: ${name} (${code}) = ${currency} ${price}`);
          } else {
            // Insert new
            await pool.query(
              `INSERT INTO portal_packages 
                 (name, code, price, currency, location, membership_type, duration, duration_months,
                  country_id, is_active, auto_generated, sort_order, description)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 1, ?, ?)`,
              [name, code, price, currency, loc.value, type.value, dur.value, dur.months,
               count + 1, `${type.label} membership for ${loc.label} - ${dur.label}`]
            );
            console.log(`  Created: ${name} (${code}) = ${currency} ${price}`);
          }
          count++;
        }
      }
    }

    console.log(`\n${count} base packages seeded.`);

    // Show final state
    const [rows] = await pool.query(
      'SELECT id, name, code, price, currency, location, duration, country_id, is_active FROM portal_packages WHERE is_active = 1 ORDER BY sort_order'
    );
    console.table(rows);

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
