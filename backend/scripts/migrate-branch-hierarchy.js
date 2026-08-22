require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function main() {
  await pool.query('ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS country_id INTEGER');
  await pool.query('ALTER TABLE portal_branches ADD COLUMN IF NOT EXISTS city_id INTEGER');
  try {
    await pool.query('ALTER TABLE portal_branches ALTER COLUMN state_id DROP NOT NULL');
  } catch (e) {
    console.log('state_id nullable:', e.message);
  }
  await pool.query('ALTER TABLE cities ADD COLUMN IF NOT EXISTS country_id INTEGER');
  try {
    await pool.query('ALTER TABLE cities ALTER COLUMN state_id DROP NOT NULL');
  } catch (e) {
    console.log('cities.state_id nullable:', e.message);
  }
  await pool.query('CREATE INDEX IF NOT EXISTS idx_portal_branches_country ON portal_branches(country_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_portal_branches_city ON portal_branches(city_id)');

  await pool.query(`
    UPDATE portal_branches b
    SET country_id = s.country_id
    FROM states s
    WHERE b.state_id = s.id AND b.country_id IS NULL
  `);

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

  const [rows] = await pool.query(`
    SELECT b.name, b.country_id, b.state_id, b.city_id, s.name AS state_name, ci.name AS city_name
    FROM portal_branches b
    LEFT JOIN states s ON s.id = b.state_id
    LEFT JOIN cities ci ON ci.id = b.city_id
    ORDER BY b.name
    LIMIT 15
  `);
  console.log(rows);
  console.log('Migration OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
