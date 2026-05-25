/**
 * Translates common MySQL SQL syntax to PostgreSQL.
 */

function toPgPlaceholders(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return { sql: pgSql, params };
}

function adaptSql(sql) {
  let s = sql;

  // MySQL null-safe equality
  s = s.replace(/(\w+(?:\.\w+)?)\s*<=\>\s*/gi, '$1 IS NOT DISTINCT FROM ');

  // DATE_FORMAT(col, '%Y-%m') and similar
  s = s.replace(
    /DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi,
    (_, col, fmt) => {
      const pgFmt = fmt
        .replace(/%Y/g, 'YYYY')
        .replace(/%m/g, 'MM')
        .replace(/%d/g, 'DD')
        .replace(/%H/g, 'HH24')
        .replace(/%i/g, 'MI')
        .replace(/%s/g, 'SS');
      return `TO_CHAR(${col}, '${pgFmt}')`;
    }
  );

  // DATE_SUB(NOW(), INTERVAL n UNIT)
  s = s.replace(
    /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+MINUTE\s*\)/gi,
    "NOW() - INTERVAL '$1 minutes'"
  );
  s = s.replace(
    /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    "NOW() - INTERVAL '$1 days'"
  );
  s = s.replace(
    /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi,
    "NOW() - INTERVAL '$1 months'"
  );
  s = s.replace(
    /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+YEAR\s*\)/gi,
    "NOW() - INTERVAL '$1 years'"
  );

  // MONTH(col) = MONTH(NOW()) AND YEAR(col) = YEAR(NOW())
  s = s.replace(
    /MONTH\(([^)]+)\)\s*=\s*MONTH\s*\(\s*NOW\s*\(\s*\)\s*\)\s+AND\s+YEAR\(([^)]+)\)\s*=\s*YEAR\s*\(\s*NOW\s*\(\s*\)\s*\)/gi,
    'EXTRACT(MONTH FROM $1) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM $2) = EXTRACT(YEAR FROM NOW())'
  );

  // JSON path extraction
  s = s.replace(
    /NULLIF\s*\(\s*JSON_UNQUOTE\s*\(\s*JSON_EXTRACT\s*\(([^,]+),\s*'\$\.([^']+)'\)\s*\)\s*,\s*''\s*\)/gi,
    "NULLIF($1->>'$2', '')"
  );

  // information_schema column names (MySQL → PostgreSQL)
  s = s.replace(/\bINDEX_NAME\b/g, 'indexname');
  s = s.replace(/\bNON_UNIQUE\b/g, 'indisunique');
  s = s.replace(/\bSEQ_IN_INDEX\b/g, 'ordinal_position');
  s = s.replace(/\bCOLUMN_NAME\b/g, 'column_name');
  s = s.replace(/\btable_schema\s*=\s*DATABASE\s*\(\s*\)/gi, "table_schema = 'public'");
  s = s.replace(/\bTABLE_SCHEMA\s*=\s*DATABASE\s*\(\s*\)/gi, "table_schema = 'public'");

  // MySQL TINYINT(1) booleans → PostgreSQL boolean literals
  const BOOL_COLS =
    'verified|is_active|is_default|cert_generated|card_generated|edited_by_staff|auto_generated|is_overseas|is_required|has_condition|is_final|allow_draft|is_multi_step';
  s = s.replace(new RegExp(`\\b(${BOOL_COLS})\\s*=\\s*0\\b`, 'gi'), '$1 = FALSE');
  s = s.replace(new RegExp(`\\b(${BOOL_COLS})\\s*=\\s*1\\b`, 'gi'), '$1 = TRUE');

  s = s.replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');
  s = s.replace(
    /DATEDIFF\s*\(\s*([^,]+)\s*,\s*CURDATE\s*\(\s*\)\s*\)/gi,
    '($1 - CURRENT_DATE)'
  );
  s = s.replace(
    /DATEDIFF\s*\(\s*([^,]+)\s*,\s*CURRENT_DATE\s*\)/gi,
    '($1 - CURRENT_DATE)'
  );

  // UUID() → gen_random_uuid() (PostgreSQL, requires pgcrypto)
  s = s.replace(/\bUUID\s*\(\s*\)/gi, 'gen_random_uuid()::text');

  // DROP INDEX name → DROP INDEX IF EXISTS name (PostgreSQL)
  s = s.replace(
    /ALTER TABLE\s+(\w+)\s+DROP INDEX\s+(\w+)/gi,
    'DROP INDEX IF EXISTS $2'
  );

  return s;
}

function isInsert(sql) {
  return /^\s*INSERT\s+/i.test(sql);
}

function isModify(sql) {
  return /^\s*(UPDATE|DELETE)\s+/i.test(sql);
}

function isSelect(sql) {
  return /^\s*(SELECT|WITH)\s+/i.test(sql);
}

function appendReturningId(sql) {
  if (!isInsert(sql) || /\bRETURNING\b/i.test(sql)) return sql;
  return sql.replace(/;\s*$/, '').trimEnd() + ' RETURNING id';
}

function buildQueryResult(pgResult, sql) {
  if (isSelect(sql)) {
    return pgResult.rows;
  }
  const header = {
    affectedRows: pgResult.rowCount ?? 0,
    insertId: 0,
  };
  if (isInsert(sql) && pgResult.rows?.[0]?.id != null) {
    header.insertId = Number(pgResult.rows[0].id);
  }
  return header;
}

module.exports = {
  toPgPlaceholders,
  adaptSql,
  appendReturningId,
  buildQueryResult,
  isInsert,
  isModify,
  isSelect,
};
