const {pool} = require('./src/config/database');
async function run() {
  const [c1] = await pool.query("SHOW COLUMNS FROM portal_packages");
  console.log("portal_packages:");
  c1.forEach(x => console.log("  " + x.Field + " " + x.Type));
  const [c2] = await pool.query("SHOW COLUMNS FROM portal_admin_users");
  console.log("portal_admin_users:");  
  c2.forEach(x => console.log("  " + x.Field));
  // test the problematic count query
  try {
    const [[r]] = await pool.query("SELECT COUNT(*) AS total FROM (SELECT s.id FROM fb_submissions s WHERE s.status='approved' ORDER BY s.submitted_at DESC) AS sub");
    console.log("count query OK:", r.total);
  } catch(e) {
    console.log("count query ERROR:", e.message);
  }
  // test simple query
  const [rows] = await pool.query("SELECT id, status, applicant_name FROM fb_submissions WHERE status='approved' LIMIT 5");
  console.log("approved submissions:", rows.length, rows.map(r=>r.applicant_name).join(", "));
  await pool.end();
}
run().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
