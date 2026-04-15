/**
 * Migration v17 — 3-Year plan duration support
 * - Adds three_year_multiplier to package_pricing_rules
 * - Fixes duration_months = 36 for existing '3years' packages
 * - Backfills 3-year packages for all location × type combinations
 * Run: node run_migration_v17.js
 */
'use strict';
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });
const { pool } = require('./backend/src/config/database');

(async () => {
  const conn = await pool.getConnection();
  try {
    console.log('Running Migration v17: 3-Year plan support...\n');

    // ── Step 1: Create or alter package_pricing_rules table ────────────────────
    const [tableExists] = await conn.query(`
      SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'package_pricing_rules'
    `);

    if (!tableExists.length) {
      // Table doesn't exist — create with all columns including three_year_multiplier
      await conn.query(`
        CREATE TABLE package_pricing_rules (
          id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          location             VARCHAR(50)   NOT NULL,
          membership_type      VARCHAR(20)   NOT NULL,
          yearly_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
          three_year_multiplier DECIMAL(5,2) NOT NULL DEFAULT 3.00,
          lifetime_multiplier  DECIMAL(5,2)  NOT NULL DEFAULT 10,
          currency             VARCHAR(10)   NOT NULL DEFAULT 'INR',
          is_active            TINYINT(1)    NOT NULL DEFAULT 1,
          created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_pricing_loc_type (location, membership_type)
        )
      `);
      console.log('  + Created table: package_pricing_rules');

      // Seed default values
      await conn.query(`
        INSERT IGNORE INTO package_pricing_rules
          (location, membership_type, yearly_price, three_year_multiplier, lifetime_multiplier, currency)
        VALUES
          ('rajasthan',    'individual',  2500,  3, 10, 'INR'),
          ('rajasthan',    'corporate',  15000,  3, 10, 'INR'),
          ('other_states', 'individual',  3000,  3, 10, 'INR'),
          ('other_states', 'corporate',  18000,  3, 10, 'INR'),
          ('overseas',     'individual',   100,  3, 10, 'USD'),
          ('overseas',     'corporate',    500,  3, 10, 'USD')
      `);
      console.log('  + Seeded default pricing rules');
    } else {
      // Table exists — add three_year_multiplier column if missing
      const [cols] = await conn.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'package_pricing_rules'
          AND COLUMN_NAME  = 'three_year_multiplier'
      `);
      if (!cols.length) {
        await conn.query(`
          ALTER TABLE package_pricing_rules
            ADD COLUMN three_year_multiplier DECIMAL(5,2) NOT NULL DEFAULT 3.00
            AFTER lifetime_multiplier
        `);
        console.log('  + Added column: package_pricing_rules.three_year_multiplier (default 3.00)');
      } else {
        console.log('  = Column already exists: package_pricing_rules.three_year_multiplier');
      }
    }

    // ── Step 2: Fix duration_months for existing 3years packages ─────────────
    const [fixResult] = await conn.query(`
      UPDATE portal_packages
        SET duration_months = 36
      WHERE duration = '3years'
        AND (duration_months IS NULL OR duration_months != 36)
    `);
    console.log(`  ~ Fixed duration_months=36 for ${fixResult.affectedRows} existing '3years' package(s)`);

    // ── Step 3: Backfill 3-year packages ─────────────────────────────────────
    const [rules] = await conn.query(`
      SELECT location, membership_type, yearly_price, three_year_multiplier, currency
      FROM package_pricing_rules
      WHERE is_active = 1
    `);

    const LOC_LABELS  = { rajasthan: 'Rajasthan', other_states: 'Other States', overseas: 'Overseas' };
    const TYPE_LABELS = { individual: 'Individual', corporate: 'Corporate' };
    const LOC_CODES   = { rajasthan: 'RAJ', other_states: 'OTH', overseas: 'OVSEA' };
    const TYPE_CODES  = { individual: 'IND', corporate: 'CORP' };

    let created = 0;
    let skipped = 0;

    for (const rule of rules) {
      const { location, membership_type, yearly_price, three_year_multiplier, currency } = rule;

      // Check if 3-year package already exists
      const [[existing]] = await conn.query(`
        SELECT id FROM portal_packages
        WHERE location = ? AND membership_type = ? AND duration = '3years'
          AND country_id IS NULL AND is_active = 1
        LIMIT 1
      `, [location, membership_type]);

      if (existing) {
        skipped++;
        continue;
      }

      const locLabel  = LOC_LABELS[location]        || location;
      const typeLabel = TYPE_LABELS[membership_type] || membership_type;
      const locCode   = LOC_CODES[location]         || location.substring(0, 3).toUpperCase();
      const typeCode  = TYPE_CODES[membership_type] || membership_type.substring(0, 4).toUpperCase();

      const name     = `${locLabel} ${typeLabel} - 3 Years`;
      const code     = `${locCode}-${typeCode}-3Y`;
      const price    = Math.round(Number(yearly_price) * Number(three_year_multiplier) * 100) / 100;
      const benefits = JSON.stringify([
        'FORTI Membership Certificate',
        'Digital ID Card with QR Code',
        'Member Dashboard Access',
        'Access to all events',
        '3-year coverage',
      ]);

      try {
        await conn.query(`
          INSERT IGNORE INTO portal_packages
            (name, code, price, currency, location, membership_type, duration, duration_months,
             country_id, description, benefits, is_active, auto_generated)
          VALUES (?, ?, ?, ?, ?, ?, '3years', 36, NULL, ?, ?, 1, 1)
        `, [
          name, code, price, currency,
          location, membership_type,
          `3-year membership plan for ${locLabel} ${typeLabel}`,
          benefits,
        ]);
        console.log(`  + Created: ${name} (${code}) = ${currency} ${price}`);
        created++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  = Already exists (code conflict): ${code}`);
          skipped++;
        } else {
          throw err;
        }
      }
    }

    console.log(`\n  Summary: ${created} created, ${skipped} skipped`);

    // ── Show final state ──────────────────────────────────────────────────────
    const [rows] = await conn.query(`
      SELECT id, name, code, price, currency, location, membership_type, duration, duration_months, is_active
      FROM portal_packages
      WHERE duration = '3years'
      ORDER BY location, membership_type
    `);
    console.log('\n  3-Year packages after migration:');
    console.table(rows);

    console.log('\n✅ Migration v17 complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration v17 failed:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
})();
