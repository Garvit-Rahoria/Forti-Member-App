/**
 * Creates test accounts for branch_manager and office_staff roles.
 * Run: node create_role_accounts.js
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'forti',
    password: 'forti@2026',
    database: 'forti_membership',
  });

  // Show available states
  const [states] = await c.query('SELECT id, name FROM states ORDER BY name LIMIT 20');
  console.log('\nAvailable states:');
  states.forEach(s => console.log(`  id=${s.id}  ${s.name}`));

  // Pick the first state for both accounts
  const stateId = states.length > 0 ? states[0].id : null;
  console.log(`\nUsing state_id=${stateId} for both accounts`);

  const accounts = [
    {
      full_name: 'Branch Manager',
      email: 'branchmanager@forti.in',
      password: 'Manager@123',
      role: 'branch_manager',
      assigned_state_id: stateId,
    },
    {
      full_name: 'Office Staff',
      email: 'officestaff@forti.in',
      password: 'Staff@1234',
      role: 'office_staff',
      assigned_state_id: stateId,
    },
  ];

  for (const acc of accounts) {
    // Check if already exists
    const [existing] = await c.query(
      'SELECT id FROM portal_admin_users WHERE email = ?',
      [acc.email]
    );

    const hash = await bcrypt.hash(acc.password, 10);

    if (existing.length > 0) {
      await c.query(
        'UPDATE portal_admin_users SET password_hash=?, role=?, assigned_state_id=?, is_active=1 WHERE email=?',
        [hash, acc.role, acc.assigned_state_id, acc.email]
      );
      console.log(`\nUpdated: ${acc.email}`);
    } else {
      await c.query(
        `INSERT INTO portal_admin_users (uuid, full_name, email, password_hash, role, assigned_state_id, is_active)
         VALUES (UUID(), ?, ?, ?, ?, ?, 1)`,
        [acc.full_name, acc.email, hash, acc.role, acc.assigned_state_id]
      );
      console.log(`\nCreated: ${acc.email}`);
    }

    // Verify login
    const [rows] = await c.query(
      'SELECT password_hash FROM portal_admin_users WHERE email=?',
      [acc.email]
    );
    const ok = await bcrypt.compare(acc.password, rows[0].password_hash);
    console.log(`  Role     : ${acc.role}`);
    console.log(`  State ID : ${acc.assigned_state_id}`);
    console.log(`  Password : ${acc.password}`);
    console.log(`  Login OK : ${ok ? 'YES ✓' : 'FAIL ✗'}`);
  }

  await c.end();
  console.log('\nDone. Log in at /login with the credentials above.');
}

run().catch(console.error);
