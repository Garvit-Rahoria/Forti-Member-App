/**
 * normalize_roles.js
 * Run once: node backend/normalize_roles.js
 *
 * Converts legacy role values to the 3 canonical roles:
 *   state_manager  → branch_manager
 *   admin          → super_admin
 *   Staff / staff  → office_staff
 *   Branch Manager → branch_manager  (display name accidentally stored as value)
 *   Super Admin    → super_admin
 */

require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'forti',
    password: process.env.DB_PASSWORD || 'forti@2026',
    database: process.env.DB_NAME     || 'forti_membership',
  });

  const conn = await pool.getConnection();

  console.log('\n── Current role distribution ─────────────────────');
  const [before] = await conn.query(
    'SELECT role, COUNT(*) AS cnt FROM portal_admin_users GROUP BY role ORDER BY cnt DESC'
  );
  before.forEach(r => console.log(`  ${r.role.padEnd(25)} → ${r.cnt} user(s)`));

  const migrations = [
    { from: 'admin',          to: 'super_admin'    },
    { from: 'state_manager',  to: 'branch_manager' },
    { from: 'Staff',          to: 'office_staff'   },
    { from: 'staff',          to: 'office_staff'   },
    { from: 'Super Admin',    to: 'super_admin'    },
    { from: 'Branch Manager', to: 'branch_manager' },
    { from: 'Office Staff',   to: 'office_staff'   },
  ];

  let totalUpdated = 0;
  for (const { from, to } of migrations) {
    const [result] = await conn.query(
      'UPDATE portal_admin_users SET role = ? WHERE role = ?',
      [to, from]
    );
    if (result.affectedRows > 0) {
      console.log(`  ✓ "${from}" → "${to}"  (${result.affectedRows} row(s))`);
      totalUpdated += result.affectedRows;
    }
  }

  console.log('\n── Role distribution after normalization ──────────');
  const [after] = await conn.query(
    'SELECT role, COUNT(*) AS cnt FROM portal_admin_users GROUP BY role ORDER BY cnt DESC'
  );
  after.forEach(r => console.log(`  ${r.role.padEnd(25)} → ${r.cnt} user(s)`));

  console.log(`\n✅ Done. ${totalUpdated} row(s) updated.\n`);
  conn.release();
  await pool.end();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
