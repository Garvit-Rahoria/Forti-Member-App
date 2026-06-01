const { pool } = require('./backend/src/config/database.js');
async function run() {
  try {
    await pool.query("ALTER TABLE member_public_profiles ADD COLUMN text_color VARCHAR(20) DEFAULT '#000000'");
    console.log("Column added");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column already exists");
    else console.error(e);
  }
  process.exit();
}
run();
