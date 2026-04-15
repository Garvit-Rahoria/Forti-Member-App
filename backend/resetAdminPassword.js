const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
async function run() {
  const c = await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'lifepulse123',database:'forti_membership'});
  const hash = await bcrypt.hash('Admin@12345', 10);
  await c.query('UPDATE portal_admin_users SET password_hash=? WHERE email=?', [hash, 'admin@forti.org']);
  console.log('Password reset to Admin@12345, hash:', hash);
  // verify it works
  const [rows] = await c.query('SELECT password_hash FROM portal_admin_users WHERE email=?', ['admin@forti.org']);
  const ok = await bcrypt.compare('Admin@12345', rows[0].password_hash);
  console.log('Verify login:', ok ? 'SUCCESS' : 'FAIL');
  await c.end();
}
run().catch(console.error);
