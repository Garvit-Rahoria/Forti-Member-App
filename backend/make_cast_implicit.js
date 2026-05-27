const { pool } = require('./src/config/database');

async function run() {
  try {
    const [res] = await pool.query(`
      UPDATE pg_cast 
      SET castcontext = 'i' 
      WHERE castsource = 'integer'::regtype 
        AND casttarget = 'boolean'::regtype
    `);
    console.log('Catalog updated successfully!', res);
  } catch (err) {
    console.error('Failed to update catalog:', err.message);
  }
  await pool.end();
}

run().catch(console.error);
