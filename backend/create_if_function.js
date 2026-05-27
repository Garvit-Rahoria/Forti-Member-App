const { pool } = require('./src/config/database');

async function run() {
  try {
    // In PostgreSQL, "if" is a reserved word in PL/pgSQL, but we can define a function named "if" 
    // and try to see if PostgreSQL's parser can resolve it.
    await pool.query(`
      CREATE OR REPLACE FUNCTION "if"(cond boolean, true_val text, false_val text) 
      RETURNS text AS $$ 
        SELECT CASE WHEN cond THEN true_val ELSE false_val END; 
      $$ LANGUAGE SQL IMMUTABLE;
    `);
    console.log('Emulated "if" function created successfully in PostgreSQL!');
  } catch (err) {
    console.error('Failed to create "if" function:', err.message);
  }
  await pool.end();
}

run().catch(console.error);
