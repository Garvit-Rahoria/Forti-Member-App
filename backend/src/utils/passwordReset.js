const { pool } = require('../config/database');

let ensuredSchema = false;
let ensurePromise = null;

async function queryExistingColumns(connection) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'portal_admin_users'
        AND COLUMN_NAME IN ('reset_token', 'reset_token_expires')`
  );

  return new Set(rows.map((row) => String(row.COLUMN_NAME || '').toLowerCase()));
}

async function ensurePasswordResetSchema() {
  if (ensuredSchema) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const connection = await pool.getConnection();

    try {
      const existingColumns = await queryExistingColumns(connection);
      const alterStatements = [];

      if (!existingColumns.has('reset_token')) {
        alterStatements.push("ADD COLUMN reset_token VARCHAR(64) NULL DEFAULT NULL");
      }

      if (!existingColumns.has('reset_token_expires')) {
        alterStatements.push("ADD COLUMN reset_token_expires DATETIME NULL DEFAULT NULL");
      }

      if (alterStatements.length) {
        await connection.query(`ALTER TABLE portal_admin_users ${alterStatements.join(', ')}`);
        console.warn(`[password-reset] Added missing schema columns: ${alterStatements.join('; ')}`);
      }

      ensuredSchema = true;
    } finally {
      connection.release();
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

module.exports = { ensurePasswordResetSchema };