const { pool } = require('./src/config/database');

async function run() {
  const autoName = 'Rajasthan – Individual (Yearly)';
  const autoCode = 'AUTO-RAJ-IND-1YEAR';
  const basePrice = 2500;
  const currency = 'INR';
  const loc = 'rajasthan';
  const mtype = 'individual';
  const dur = '1year';
  const durationMonths = 12;
  const autoBenefits = JSON.stringify([]);

  try {
    const [ins] = await pool.query(
      `INSERT INTO portal_packages
         (name, code, price, currency, location, membership_type, duration, duration_months, country_id,
          description, benefits, is_active, auto_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, 1)`,
      [
        autoName, autoCode, basePrice, currency,
        loc, mtype, dur, durationMonths,
        `Default auto-generated plan for ${autoName}`,
        autoBenefits,
      ]
    );
    console.log('Success, insertId:', ins.insertId);
  } catch (err) {
    console.error('Insert failed with error:');
    console.error(err);
  }
  await pool.end();
}

run().catch(console.error);
