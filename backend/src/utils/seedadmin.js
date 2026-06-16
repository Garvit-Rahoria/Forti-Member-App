const { pool } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function ensureAdminUser() {
  try {
    const email = 'admin@example.com';
    const password = 'Welcome5%';

    // Check if the admin user exists
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM portal_admin_users WHERE email = ?', [email]);
    if (Number(cnt) > 0) {
      console.log(`[SEED] Admin user ${email} already exists.`);
      return;
    }

    // Insert admin user if not exists
    console.log(`[SEED] Seeding admin user ${email}...`);
    const passwordHash = await bcrypt.hash(password, 10);
    const uuid = crypto.randomUUID();

    await pool.query(
      `INSERT INTO portal_admin_users
         (uuid, full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [uuid, 'System Admin', email, passwordHash, 'super_admin']
    );

    console.log('[SEED] Admin user seeded successfully ✓');
  } catch (err) {
    console.error('[SEED] Admin user seed failed (non-fatal):', err.message);
  }
}

module.exports = { ensureAdminUser };
