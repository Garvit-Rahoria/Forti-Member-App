const { pool } = require('./src/config/database');
async function test() {
  try {
    const key = 'test_key';
    const value = 'test_val';
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [key, value]
    );
    console.log("Success with ON CONFLICT!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
