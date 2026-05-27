const { pool } = require('./src/config/database');

async function run() {
  const [cols] = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'portal_packages' 
     ORDER BY ordinal_position`
  );
  console.log('--- portal_packages columns ---');
  console.log(cols);
  await pool.end();
}

run().catch(console.error);
