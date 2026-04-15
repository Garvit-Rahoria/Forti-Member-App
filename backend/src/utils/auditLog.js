const { pool } = require('../config/database');

/**
 * createAuditLog – insert one row into audit_logs (non-throwing, fire-and-forget)
 * @param {number|null} userId     – portal_admin_users.id (null for system actions)
 * @param {string}      action     – e.g. 'LOGIN', 'CREATE_PACKAGE', 'APPROVE_MEMBER'
 * @param {string}      module     – e.g. 'auth', 'packages', 'members', 'payments'
 * @param {string|null} recordId   – related DB record id (stringified)
 * @param {string|null} ipAddress  – client IP from req.ip
 */
async function createAuditLog(userId, action, module, recordId = null, ipAddress = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, module, record_id, ip_address)
       VALUES (?,?,?,?,?)`,
      [userId || null, action, module, recordId ? String(recordId) : null, ipAddress || null]
    );
  } catch (err) {
    // Never crash the main request because audit failed
    console.error('[AuditLog]', err.message);
  }
}

module.exports = { createAuditLog };
