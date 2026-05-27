const { pool } = require('./src/config/database');

async function run() {
  const tables = [
    'portal_admin_users',
    'fb_submissions',
    'portal_packages',
    'countries',
    'states',
    'cities',
    'portal_payment_methods',
    'currency_settings',
    'portal_wings',
    'portal_positions',
    'portal_blogs',
  ];
  
  console.log('--- Database Row Counts ---');
  for (const table of tables) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      console.log(`Table ${table.padEnd(25)}: ${rows[0].cnt} rows`);
    } catch (err) {
      console.log(`Table ${table.padEnd(25)}: ERROR - ${err.message}`);
    }
  }
  await pool.end();
}

run().catch(console.error);
