const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

const COLUMNS = [
  { name: 'location',       sql: "ALTER TABLE portal_payment_methods ADD COLUMN location VARCHAR(50) DEFAULT NULL AFTER country_id" },
  { name: 'country_code',   sql: "ALTER TABLE portal_payment_methods ADD COLUMN country_code VARCHAR(10) DEFAULT NULL AFTER location" },
  { name: 'country_name',   sql: "ALTER TABLE portal_payment_methods ADD COLUMN country_name VARCHAR(120) DEFAULT NULL AFTER country_code" },
  { name: 'account_name',   sql: "ALTER TABLE portal_payment_methods ADD COLUMN account_name VARCHAR(200) DEFAULT NULL AFTER type" },
  { name: 'bank_name',      sql: "ALTER TABLE portal_payment_methods ADD COLUMN bank_name VARCHAR(200) DEFAULT NULL AFTER account_name" },
  { name: 'account_number', sql: "ALTER TABLE portal_payment_methods ADD COLUMN account_number VARCHAR(50) DEFAULT NULL AFTER bank_name" },
  { name: 'ifsc_code',      sql: "ALTER TABLE portal_payment_methods ADD COLUMN ifsc_code VARCHAR(20) DEFAULT NULL AFTER account_number" },
  { name: 'upi_id',         sql: "ALTER TABLE portal_payment_methods ADD COLUMN upi_id VARCHAR(100) DEFAULT NULL AFTER ifsc_code" },
  { name: 'swift_code',     sql: "ALTER TABLE portal_payment_methods ADD COLUMN swift_code VARCHAR(20) DEFAULT NULL AFTER upi_id" },
];

(async () => {
  try {
    for (const col of COLUMNS) {
      try {
        await pool.query(col.sql);
        console.log(`  + Added column: ${col.name}`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`  = Column already exists: ${col.name}`);
        } else {
          throw e;
        }
      }
    }

    // Update existing methods: set location = NULL (general) for rows without location
    // They're already NULL so no change needed, but let's set the type enum on existing rows
    // Update UPI method
    await pool.query(`
      UPDATE portal_payment_methods 
      SET upi_id = 'forti@upi', location = NULL
      WHERE id = 1 AND upi_id IS NULL
    `);

    // Update Bank Transfer method  
    await pool.query(`
      UPDATE portal_payment_methods 
      SET bank_name = 'FORTI Bank', account_number = '1234567890', ifsc_code = 'FORT0000001', location = NULL
      WHERE id = 2 AND bank_name IS NULL
    `);

    // Update International Wire method
    await pool.query(`
      UPDATE portal_payment_methods 
      SET bank_name = 'FORTI Bank', swift_code = 'FORTINUS', location = NULL
      WHERE id = 3 AND swift_code IS NULL
    `);

    // Verify final schema
    const [cols] = await pool.query('SHOW COLUMNS FROM portal_payment_methods');
    console.log('\nFinal columns:', cols.map(c => c.Field).join(', '));
    
    const [rows] = await pool.query('SELECT id, name, type, location, country_code, upi_id, bank_name, is_active FROM portal_payment_methods');
    console.table(rows);

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
