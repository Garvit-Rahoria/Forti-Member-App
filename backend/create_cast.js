const { pool } = require('./src/config/database');

async function run() {
  try {
    // 1. Create conversion function
    await pool.query(`
      CREATE OR REPLACE FUNCTION pg_catalog.int_to_bool(integer) 
      RETURNS boolean AS $$ 
        SELECT $1 <> 0; 
      $$ LANGUAGE SQL IMMUTABLE;
    `);
    console.log('Function created');

    // 2. Create cast
    await pool.query(`
      DROP CAST IF EXISTS (integer AS boolean);
    `);
    await pool.query(`
      CREATE CAST (integer AS boolean) 
      WITH FUNCTION pg_catalog.int_to_bool(integer) 
      AS IMPLICIT;
    `);
    console.log('Implicit cast integer AS boolean created successfully!');
  } catch (err) {
    console.error('Failed to create implicit cast:', err.message);
  }
  await pool.end();
}

run().catch(console.error);
