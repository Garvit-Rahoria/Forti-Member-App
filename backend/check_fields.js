require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`SELECT id, applicant_name, membership_type, package_id, LEFT(data, 500) as data_preview FROM fb_submissions WHERE status IN ('active','approved') LIMIT 3`);
    rows.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
})();
