const { pool } = require('./src/config/database');

async function createTable() {
  try {
    console.log('Creating token_blacklist table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        token VARCHAR(500) PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    console.log('Table created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    process.exit(0);
  }
}

createTable();
