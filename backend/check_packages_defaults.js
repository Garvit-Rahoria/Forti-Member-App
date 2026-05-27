const { pool } = require('./src/config/database');

async function run() {
  const [cols] = await pool.query(
    `SELECT column_name, column_default, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'portal_packages' 
       AND column_name IN ('tax_rate', 'tax_amount', 'total_amount')`
  );
  console.log(cols);
  await pool.end();
}

run().catch(console.error);
