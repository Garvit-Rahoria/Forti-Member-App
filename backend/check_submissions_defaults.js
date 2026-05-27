const { pool } = require('./src/config/database');

async function run() {
  const [cols] = await pool.query(
    `SELECT column_name, column_default, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'fb_submissions' 
       AND column_name IN ('payment_status', 'cert_generated', 'card_generated', 'member_status')`
  );
  console.log(cols);
  await pool.end();
}

run().catch(console.error);
