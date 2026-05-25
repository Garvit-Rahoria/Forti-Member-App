const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const {
  toPgPlaceholders,
  adaptSql,
  appendReturningId,
  buildQueryResult,
} = require('./sqlCompat');

const pgPool = new Pool({
  host:     process.env.DB_HOST || '127.0.0.1',
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'forti_membership',
  user:     process.env.DB_USER || 'forti',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'forti@2026',
  max:      20,
});

async function runQuery(client, sql, params) {
  const adapted = adaptSql(sql);
  const withReturning = appendReturningId(adapted);
  const { sql: pgSql, params: pgParams } = toPgPlaceholders(withReturning, params);
  const result = await client.query(pgSql, pgParams);
  const rows = buildQueryResult(result, adapted);
  return [rows, result.fields || []];
}

function wrapClient(client) {
  return {
    query: (sql, params) => runQuery(client, sql, params),
    beginTransaction: async () => { await client.query('BEGIN'); },
    commit: async () => { await client.query('COMMIT'); },
    rollback: async () => { await client.query('ROLLBACK'); },
    release: () => client.release(),
  };
}

const pool = {
  query: (sql, params) => runQuery(pgPool, sql, params),
  getConnection: async () => wrapClient(await pgPool.connect()),
  end: () => pgPool.end(),
};

async function testConnection() {
  try {
    await pgPool.query('SELECT 1');
    console.log('✓ PostgreSQL connected');
  } catch (err) {
    console.error('✗ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
