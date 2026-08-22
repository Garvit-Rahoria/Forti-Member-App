const { pool } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function ensureAdminUser() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Welcome5%';
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if the admin user exists
    const [[existing]] = await pool.query(
      'SELECT id, password_hash FROM portal_admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing) {
      // Keep local/dev credentials in sync with .env ADMIN_PASSWORD
      if (process.env.NODE_ENV === 'development' || process.env.SYNC_ADMIN_PASSWORD === '1') {
        const matches = await bcrypt.compare(password, existing.password_hash);
        if (!matches) {
          await pool.query(
            'UPDATE portal_admin_users SET password_hash = ?, is_active = TRUE WHERE id = ?',
            [passwordHash, existing.id]
          );
          console.log(`[SEED] Synced admin password for ${email} from .env`);
        } else {
          console.log(`[SEED] Admin user ${email} already exists.`);
        }
      } else {
        console.log(`[SEED] Admin user ${email} already exists.`);
      }
      return;
    }

    // Insert admin user if not exists
    console.log(`[SEED] Seeding admin user ${email}...`);
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
