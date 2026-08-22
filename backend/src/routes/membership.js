const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { ok, fail } = require('../utils/helpers');
const { sendApplicationSubmitted, sendPaymentSubmitted, sendMembershipConfirmed } = require('../utils/email');
const { getCurrencyCodeByCountry } = require('../utils/membershipCurrency');

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_OK_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const RECEIPT_OK_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf']);

function unlinkQuiet(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
}

function normalizePaymentClientStatus(raw) {
  const value = String(raw || 'awaiting_verification').toLowerCase().trim();
  // Never accept client-side "verified" — admin verifies only
  if (value === 'verified' || value === 'approved') return 'awaiting_verification';
  if (value === 'proof_submitted') return 'awaiting_verification';
  if (['pending', 'submitted', 'awaiting_verification'].includes(value)) return value;
  return 'awaiting_verification';
}

const router = express.Router();

// ──────── All membership routes are PUBLIC (no authMiddleware) ────────────────

// Helper: parse JSON fields and resolve payment_methods to full objects
async function enrichPackage(pkg, pool, currencyOverride) {
  ['benefits', 'bank_details', 'payment_methods'].forEach(f => {
    if (pkg[f] && typeof pkg[f] === 'string') {
      try { pkg[f] = JSON.parse(pkg[f]); } catch {}
    }
  });
  // Apply currency override (e.g. Japan → JPY instead of stored USD)
  if (currencyOverride) pkg.currency = currencyOverride;
  // swift_details stays as plain string

  // Resolve payment_methods IDs → full method objects
  if (Array.isArray(pkg.payment_methods) && pkg.payment_methods.length) {
    const ids = pkg.payment_methods.map(Number).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [methods] = await pool.query(
        `SELECT * FROM portal_payment_methods WHERE id IN (${placeholders}) AND is_active=1 ORDER BY sort_order, id`,
        ids
      );
      pkg.payment_methods = methods;
    }
  }

  return pkg;
}

async function sendPackages(res, pkgs, pool, currencyOverride) {
  const enriched = await Promise.all(pkgs.map(p => enrichPackage(p, pool, currencyOverride)));
  return ok(res, enriched);
}

// GET /api/membership/packages/match
// Lookup: location_type + membership_type + duration
// For overseas: tries country-specific package first, then falls back to base overseas package
router.get('/packages/match', async (req, res) => {
  const { membership_type, plan_type, duration, location_type, country_id } = req.query;

  // Normalize all inputs: lowercase + trim
  const loc   = (location_type || '').toLowerCase().trim();
  const mtype = (membership_type || '').toLowerCase().trim();
  let   dur   = ((plan_type || duration || '')).toLowerCase().trim();

  // Map frontend values → DB column values
  if (dur === 'yearly')              dur = '1year';
  if (dur === '3_years')             dur = '3years';
  // '3years' and 'lifetime' stay as-is

  console.log(`[PKG MATCH] incoming: location_type=${location_type} membership_type=${membership_type} plan_type=${plan_type} → normalized: loc=${loc} mtype=${mtype} dur=${dur} country_id=${country_id}`);

  if (!mtype || !dur || !loc) {
    return fail(res, 'location_type, membership_type, and plan_type are required', 422);
  }

  const VALID_LOCATIONS = ['rajasthan', 'other_states', 'overseas'];
  if (!VALID_LOCATIONS.includes(loc)) {
    console.log(`[PKG MATCH] invalid location_type: ${loc}`);
    return fail(res, 'Invalid location_type', 422);
  }

  const CURRENCY_MAP = {
    rajasthan: 'INR',
    other_states: 'INR',
    overseas: 'USD',
  };

  // Default base prices (used when auto-generating a plan)
  const DEFAULT_PRICE_MAP = {
    'rajasthan-individual-1year':    2500,
    'rajasthan-individual-3years':   6000,
    'rajasthan-individual-lifetime': 25000,
    'rajasthan-corporate-1year':     5000,
    'rajasthan-corporate-3years':    12000,
    'rajasthan-corporate-lifetime':  50000,
    'other_states-individual-1year':    3000,
    'other_states-individual-3years':   7500,
    'other_states-individual-lifetime': 30000,
    'other_states-corporate-1year':     6000,
    'other_states-corporate-3years':    15000,
    'other_states-corporate-lifetime':  60000,
    'overseas-individual-1year':    100,
    'overseas-individual-3years':   250,
    'overseas-individual-lifetime': 1000,
    'overseas-corporate-1year':     200,
    'overseas-corporate-3years':    500,
    'overseas-corporate-lifetime':  2000,
  };

  try {
    // Resolve country currency for overseas display
    let countryCurrency = null;
    let resolvedCountryId = country_id;
    if (loc === 'overseas' && country_id) {
      try {
        const isNumeric = /^\d+$/.test(String(country_id).trim());
        let countryQuery = 'SELECT id, name FROM countries WHERE id = ? AND is_active = 1 LIMIT 1';
        if (!isNumeric) {
          countryQuery = 'SELECT id, name FROM countries WHERE LOWER(iso_code) = LOWER(?) AND is_active = 1 LIMIT 1';
        }
        const [[countryRow]] = await pool.query(countryQuery, [country_id]);
        if (countryRow) {
          resolvedCountryId = countryRow.id;
          if (countryRow.name) countryCurrency = getCurrencyCodeByCountry(countryRow.name);
        }
      } catch (e) { /* ignore, fallback to USD */ }
    }

    // For overseas with a specific country, try country-specific package first
    if (loc === 'overseas' && resolvedCountryId && /^\d+$/.test(String(resolvedCountryId))) {
      const [countryRows] = await pool.query(
        `SELECT * FROM portal_packages
         WHERE is_active = 1
           AND location = 'overseas'
           AND membership_type = ?
           AND duration = ?
           AND country_id = ?
         ORDER BY auto_generated ASC, sort_order ASC, id ASC`,
        [mtype, dur, Number(resolvedCountryId)]
      );
      console.log(`[PKG MATCH] country-specific search → found ${countryRows.length} rows`);
      if (countryRows.length) return sendPackages(res, countryRows, pool, countryCurrency);
    }

    // Base package lookup (country_id IS NULL for base packages)
    // Prefer manually created packages (auto_generated=0) over auto-generated ones
    // Also accept empty-string country_id from older rows
    const [rows] = await pool.query(
      `SELECT * FROM portal_packages
       WHERE is_active = 1
         AND location = ?
         AND membership_type = ?
         AND duration = ?
         AND (country_id IS NULL OR country_id = 0)
       ORDER BY auto_generated ASC, sort_order ASC, id ASC`,
      [loc, mtype, dur]
    );
    console.log(`[PKG MATCH] base lookup (loc=${loc} mtype=${mtype} dur=${dur}) → found ${rows.length} rows${rows[0] ? ` id=${rows[0].id} price=${rows[0].price}` : ''}`);

    if (rows.length) return sendPackages(res, rows, pool, countryCurrency);

    // ── AUTO-CREATE DEFAULT PLAN (per spec: if plan does NOT exist, auto-generate) ──
    const currency = countryCurrency || CURRENCY_MAP[loc] || 'INR';
    const priceKey = `${loc}-${mtype}-${dur}`;

    // Try to get price from pricing rules in DB first
    let basePrice = DEFAULT_PRICE_MAP[priceKey] || (currency === 'USD' ? 100 : 2500);
    console.log(`[PKG MATCH] no existing plan found — priceKey=${priceKey} basePrice=${basePrice} → auto-creating`);
    try {
      const [[rule]] = await pool.query(
        'SELECT yearly_price, lifetime_multiplier, currency AS rule_currency FROM package_pricing_rules WHERE location = ? AND membership_type = ? AND is_active = 1 LIMIT 1',
        [loc, mtype]
      );
      if (rule) {
        if (dur === '1year' || dur === 'yearly') {
          basePrice = Number(rule.yearly_price) || basePrice;
        } else if (dur === '3years') {
          basePrice = (Number(rule.yearly_price) || basePrice) * 3 * 0.85; // 15% discount for 3-year
        } else if (dur === 'lifetime') {
          basePrice = (Number(rule.yearly_price) || basePrice) * (Number(rule.lifetime_multiplier) || 10);
        }
        console.log(`[PKG MATCH] pricing rule found → adjusted basePrice=${basePrice}`);
      }
    } catch (priceErr) {
      console.error('[AUTO-PLAN] Pricing rules lookup failed, using defaults:', priceErr.message);
    }

    const durationLabel = dur === '1year' ? 'Yearly'
      : dur === '3years' ? '3 Years'
      : dur === 'lifetime' ? 'Lifetime' : dur;
    const typeLabel = mtype.charAt(0).toUpperCase() + mtype.slice(1);
    const locLabel  = loc === 'rajasthan' ? 'Rajasthan'
      : loc === 'other_states' ? 'India'
      : 'International';

    const autoName = `${locLabel} – ${typeLabel} (${durationLabel})`;
    const autoCode = `AUTO-${loc.toUpperCase().slice(0,3)}-${mtype.toUpperCase().slice(0,3)}-${dur.toUpperCase()}`;
    const autoBenefits = JSON.stringify([]);

    // Duration in months for expiry calculation
    const DURATION_MONTHS_MAP = {
      '1year': 12,
      'yearly': 12,
      '3years': 36,
      'lifetime': 999,
    };
    const durationMonths = DURATION_MONTHS_MAP[dur] || 12;

    try {
      const [ins] = await pool.query(
        `INSERT INTO portal_packages
           (name, code, price, currency, location, membership_type, duration, duration_months, country_id,
            description, benefits, is_active, auto_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, TRUE, TRUE)`,
        [
          autoName, autoCode, basePrice, currency,
          loc, mtype, dur, durationMonths,
          `Default auto-generated plan for ${autoName}`,
          autoBenefits,
        ]
      );
      const [[newPkg]] = await pool.query('SELECT * FROM portal_packages WHERE id = ?', [ins.insertId]);
      console.log(`[AUTO-PLAN] Created: "${autoName}" (${autoCode}) @ ${currency} ${basePrice}`);
      return sendPackages(res, [newPkg], pool, countryCurrency);
    } catch (autoErr) {
      // If auto-creation fails (e.g. duplicate code), try fetching the existing one
      console.error('[AUTO-PLAN] Insert failed:', autoErr.message, '— retrying fetch by code:', autoCode);
      const [retry] = await pool.query(
        `SELECT * FROM portal_packages WHERE code = ? LIMIT 1`, [autoCode]
      );
      if (retry.length) return sendPackages(res, retry, pool, countryCurrency);
      console.error('[AUTO-PLAN] Retry fetch also failed for code:', autoCode);
      return fail(res, 'Plan not configured. Please contact admin.', 404);
    }
  } catch (err) { console.error('[PKG MATCH] unexpected error:', err); return fail(res, 'Server error', 500); }
});

// GET /api/membership/payment-methods?location=&country_code=
// Returns location-specific methods if configured, otherwise falls back to default methods.
// For overseas: first try country_code match, then location='overseas', then global.
// Incomplete UPI methods (no upi_id and no qr_image) are excluded so applicants can still pay via other methods.
router.get('/payment-methods', async (req, res) => {
  const { location, country_code } = req.query;
  try {
    let rows = [];

    // For overseas with a specific country, try country-specific methods first
    if (location === 'overseas' && country_code) {
      const [countryMethods] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 AND country_code=? ORDER BY sort_order, id',
        [country_code]
      );
      if (countryMethods.length > 0) rows = countryMethods;
    }

    // Then try location-specific methods
    if (!rows.length && location) {
      const [specific] = await pool.query(
        'SELECT * FROM portal_payment_methods WHERE is_active=1 AND location=? AND (country_code IS NULL OR country_code=\'\') ORDER BY sort_order, id',
        [location]
      );
      if (specific.length > 0) rows = specific;
    }

    if (!rows.length) {
      // Fallback: default methods (location IS NULL)
      const [fallback] = await pool.query(
        "SELECT * FROM portal_payment_methods WHERE is_active=1 AND (location IS NULL OR location='') ORDER BY sort_order, id"
      );
      rows = fallback;
    }

    // Enrich empty payment details from system_settings when present
    const [settingRows] = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('upi_id','bank_account_number','bank_ifsc','bank_name','bank_account_name','bank_branch','bank_account_type')`
    );
    const settings = {};
    for (const r of settingRows) settings[r.setting_key] = (r.setting_value || '').trim();

    rows = rows.map((m) => {
      if (m.type === 'upi') {
        return { ...m, upi_id: (m.upi_id || '').trim() || settings.upi_id || null };
      }
      if (m.type === 'bank_transfer') {
        return {
          ...m,
          account_name: (m.account_name || '').trim() || settings.bank_account_name || null,
          bank_name: (m.bank_name || '').trim() || settings.bank_name || null,
          account_number: (m.account_number || '').trim() || settings.bank_account_number || null,
          ifsc_code: (m.ifsc_code || '').trim() || settings.bank_ifsc || null,
          branch_name: (m.branch_name || '').trim() || settings.bank_branch || null,
          account_type: (m.account_type || '').trim() || settings.bank_account_type || null,
        };
      }
      return m;
    }).filter((m) => {
      if (m.type === 'upi') {
        const hasUpi = !!(m.upi_id && String(m.upi_id).trim());
        const hasQr = !!(m.qr_image && String(m.qr_image).trim());
        return hasUpi || hasQr;
      }
      if (m.type === 'bank_transfer') {
        return !!(
          (m.account_number && String(m.account_number).trim()) ||
          (m.ifsc_code && String(m.ifsc_code).trim()) ||
          (m.bank_name && String(m.bank_name).trim())
        );
      }
      if (m.type === 'international_wire') {
        return !!(
          (m.swift_code && String(m.swift_code).trim()) ||
          (m.iban && String(m.iban).trim()) ||
          (m.account_number && String(m.account_number).trim()) ||
          (m.bank_name && String(m.bank_name).trim())
        );
      }
      return true;
    });

    return ok(res, rows);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

// POST /api/membership/apply
// Full membership application submission (multipart/form-data)
// Files: profile_photo (optional), organisation_logo (optional), payment_screenshot (required)
router.post(
  '/apply',
  upload.fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'organisation_logo', maxCount: 1 },
    { name: 'payment_screenshot', maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      full_name, email, phone, gender,
      phone_country_code, phone_country_iso2, country_name,
      id_type, aadhaar_number, passport_number, national_id_number, pin_code, organisation_name, organisation_type, organisation_type_other, social_links,
      location_type, state_id, city_id, branch_id, country_id,
      state_other, city_other, overseas_city,
      membership_type, plan_type, package_id, wing_id,
      payment_method, payment_reference, currency,
      payable_amount, exchange_rate, base_amount_inr,
      payment_attempts, payment_client_status,
    } = req.body;
    // Basic validation
    if (!full_name || !email)        return fail(res, 'Full name and email are required', 422);
    if (!wing_id)                    return fail(res, 'Wing selection is required', 422);
    if (!membership_type)            return fail(res, 'Membership type is required', 422);
    if (!plan_type)                  return fail(res, 'Plan type is required', 422);
    if (!payment_method)             return fail(res, 'Payment method is required', 422);
    if (!req.files?.payment_screenshot?.[0]) return fail(res, 'Payment receipt is required (JPG, PNG, or PDF, max 5 MB)', 422);

    const receiptFile = req.files.payment_screenshot[0];
    const receiptExt = path.extname(receiptFile.originalname || '').toLowerCase();
    const receiptMimeOk = RECEIPT_OK_MIME.has(String(receiptFile.mimetype || '').toLowerCase());
    const receiptExtOk = RECEIPT_OK_EXT.has(receiptExt);
    if (!receiptMimeOk && !receiptExtOk) {
      unlinkQuiet(receiptFile.path);
      return fail(res, 'Payment receipt must be JPG, PNG, or PDF', 422);
    }
    if (Number(receiptFile.size || 0) > RECEIPT_MAX_BYTES) {
      unlinkQuiet(receiptFile.path);
      return fail(res, 'Payment receipt must be 5 MB or smaller', 422);
    }

    const safePaymentClientStatus = normalizePaymentClientStatus(payment_client_status);

    try {
      // Check if email already belongs to an existing member account
      const [[existingMember]] = await pool.query(
        'SELECT id FROM member_accounts WHERE LOWER(email) = ? LIMIT 1',
        [email.trim().toLowerCase()]
      );
      if (existingMember) {
        return fail(res, 'An account with this email address already exists. Please log in or use a different email.', 409);
      }

      // Check if email already has any non-draft submission
      const [[existingSubmission]] = await pool.query(
        "SELECT id FROM fb_submissions WHERE LOWER(applicant_email) = ? AND status != 'draft' LIMIT 1",
        [email.trim().toLowerCase()]
      );
      if (existingSubmission) {
        return fail(res, 'A membership application with this email already exists. Please log in or use a different email.', 409);
      }

      // Check if phone number is already registered
      if (phone && phone.trim()) {
        const normalizedPhone = phone.trim().replace(/\s+/g, '');
        const [[existingPhone]] = await pool.query(
          "SELECT id FROM fb_submissions WHERE REPLACE(applicant_phone, ' ', '') = ? AND status != 'draft' LIMIT 1",
          [normalizedPhone]
        );
        if (existingPhone) {
          return fail(res, 'This mobile number is already registered with another membership application.', 409);
        }
      }
    } catch (err) {
      console.error('[Duplicate Check Error]', err);
    }

    const resolvedCountryName = country_name || (location_type === 'overseas' ? 'Other' : 'India');
    const isIndianApplicant = String(resolvedCountryName || '').trim().toLowerCase() === 'india';
    const resolvedIdType = String(id_type || (isIndianApplicant ? 'aadhaar' : 'passport')).trim().toLowerCase();

    if (isIndianApplicant) {
      if (!['aadhaar', 'passport'].includes(resolvedIdType)) {
        return fail(res, 'Indian members must provide either Aadhaar or Passport details', 422);
      }
      if (resolvedIdType === 'aadhaar' && !/^\d{12}$/.test(String(aadhaar_number || ''))) {
        return fail(res, 'Aadhaar number must be exactly 12 digits for Indian members', 422);
      }
      if (resolvedIdType === 'passport' && !/^[A-Za-z0-9]{6,9}$/.test(String(passport_number || ''))) {
        return fail(res, 'Passport number must be 6 to 9 alphanumeric characters', 422);
      }
    } else {
      if (!['passport', 'national_id', 'aadhaar'].includes(resolvedIdType)) {
        return fail(res, 'International members must provide either Passport, National ID, or Aadhaar details', 422);
      }
      if (resolvedIdType === 'aadhaar' && !/^\d{12}$/.test(String(aadhaar_number || ''))) {
        return fail(res, 'Aadhaar number must be exactly 12 digits', 422);
      }
      if (resolvedIdType === 'passport' && !/^[A-Za-z0-9]{6,9}$/.test(String(passport_number || ''))) {
        return fail(res, 'Passport number must be 6 to 9 alphanumeric characters for international members', 422);
      }
      if (resolvedIdType === 'national_id' && !/^[A-Za-z0-9][A-Za-z0-9 -]{4,19}$/.test(String(national_id_number || '').trim())) {
        return fail(res, 'National ID number must be 5 to 20 characters', 422);
      }
    }

    const resolvedAadhaarNumber = resolvedIdType === 'aadhaar' ? String(aadhaar_number || '').trim() : null;
    const resolvedPassportNumber = resolvedIdType === 'passport' ? String(passport_number || '').trim().toUpperCase() : null;
    const resolvedNationalIdNumber = resolvedIdType === 'national_id' ? String(national_id_number || '').trim().toUpperCase() : null;

    const fixedCurrency = currency || getCurrencyCodeByCountry(resolvedCountryName);
    const paymentReferenceForStorage = payment_reference || `PAY-${Date.now()}`;

    const profilePhotoPath = req.files?.profile_photo?.[0]?.filename
      ? `/uploads/photos/${req.files.profile_photo[0].filename}` : null;
    const orgLogoPath = req.files?.organisation_logo?.[0]?.filename
      ? `/uploads/logos/${req.files.organisation_logo[0].filename}` : null;
    const screenshotPath = `/uploads/payments/${req.files.payment_screenshot[0].filename}`;

    // Fetch form_id for "membership-application" slug
    const [[formRow]] = await pool.query(
      "SELECT id FROM fb_forms WHERE slug='membership-application' LIMIT 1"
    );
    const formId = formRow ? formRow.id : 1;

    // Build JSON payload to store in fb_submissions.data
    const formData = {
      profile_photo:      profilePhotoPath,
      organisation_logo:  orgLogoPath,
      gender,
      country_name:       resolvedCountryName,
      phone_country_code: phone_country_code || null,
      phone_country_iso2: phone_country_iso2 || null,
      id_type: resolvedIdType,
      aadhaar_number: resolvedAadhaarNumber,
      passport_number: resolvedPassportNumber,
      national_id_number: resolvedNationalIdNumber,
      pin_code,
      organisation_name,
      organisation_type:  organisation_type || null,
      organisation_type_other: organisation_type_other || null,
      social_links: (() => {
        try { return JSON.parse(social_links); } catch { return social_links || ''; }
      })(),
      location_type:      location_type || null,
      state_id:           state_id && !isNaN(Number(state_id)) ? Number(state_id) : (state_id || null),
      city_id:            city_id && !isNaN(Number(city_id)) ? Number(city_id) : (city_id || null),
      branch_id:          branch_id && !isNaN(Number(branch_id)) ? Number(branch_id) : null,
      country_id:         country_id && !isNaN(Number(country_id)) ? Number(country_id) : (country_id || null),
      state_other:        state_other || null,
      city_other:         city_other || null,
      overseas_city:      overseas_city || null,
      membership_type,
      plan_type,
      package_id:         package_id  ? Number(package_id)  : null,
      payment_method,
      payment_reference: paymentReferenceForStorage,
      currency: fixedCurrency,
      payable_amount: payable_amount ? Number(payable_amount) : null,
      exchange_rate: exchange_rate ? Number(exchange_rate) : null,
      base_amount_inr: base_amount_inr ? Number(base_amount_inr) : null,
      payment_screenshot: screenshotPath,
    };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const submUuid     = require('crypto').randomUUID();
      const membershipId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;

      // Resolve payment_method → method_id FK
      // Frontend sends the method ID directly now
      let resolvedMethodId = null;
      if (payment_method) {
        const numericId = Number(payment_method);
        if (numericId) {
          const [[mRow]] = await conn.query(
            'SELECT id FROM portal_payment_methods WHERE id=? AND is_active=1 LIMIT 1',
            [numericId]
          );
          resolvedMethodId = mRow ? mRow.id : null;
        }
        if (!resolvedMethodId) {
          // Fallback: try by type string
          const [[mRow]] = await conn.query(
            'SELECT id FROM portal_payment_methods WHERE type=? AND is_active=1 LIMIT 1',
            [payment_method]
          );
          resolvedMethodId = mRow ? mRow.id : null;
        }
      }

      const resolvedWingId = Number(wing_id) || null;
      if (resolvedWingId) {
        const [[wingRow]] = await conn.query(
          'SELECT id FROM portal_wings WHERE id = ? AND is_active = TRUE LIMIT 1',
          [resolvedWingId]
        );
        if (!wingRow) {
          await conn.rollback();
          return fail(res, 'Invalid wing selected', 422);
        }
      }

      // ── Auto-resolve country_id, state_id & branch_id ────────────────────────────────────
      let resolvedCountryId = null;
      if (country_id) {
        if (!isNaN(Number(country_id))) {
          resolvedCountryId = Number(country_id);
        } else {
          try {
            const [[countryRow]] = await conn.query(
              'SELECT id FROM countries WHERE LOWER(iso_code) = LOWER(?) LIMIT 1',
              [country_id]
            );
            if (countryRow) resolvedCountryId = countryRow.id;
          } catch (e) { console.error('[country iso resolve]', e.message); }
        }
      }

      let resolvedStateId = null;
      if (state_id) {
        if (!isNaN(Number(state_id))) {
          resolvedStateId = Number(state_id);
        } else {
          try {
            const [[stateRow]] = await conn.query(
              'SELECT id FROM states WHERE LOWER(name) = LOWER(?) LIMIT 1',
              [state_id]
            );
            if (stateRow) resolvedStateId = stateRow.id;
          } catch (e) { console.error('[state name resolve]', e.message); }
        }
      }
      let resolvedCityId = null;
      if (city_id) {
        if (!isNaN(Number(city_id))) {
          resolvedCityId = Number(city_id);
        } else {
          try {
            const cityParams = [String(city_id).trim().toLowerCase()];
            let citySql = 'SELECT id FROM cities WHERE LOWER(name) = LOWER(?)';
            if (resolvedStateId) {
              citySql += ' AND state_id = ?';
              cityParams.push(resolvedStateId);
            }
            citySql += ' LIMIT 1';
            const [[cityRow]] = await conn.query(citySql, cityParams);
            if (cityRow) resolvedCityId = cityRow.id;
          } catch (e) { console.error('[city name resolve]', e.message); }
        }
      }
      let resolvedBranchId = null;

      // Rajasthan applicants: form only sends city_id, not state_id → auto-assign Rajasthan
      if (!resolvedStateId && location_type === 'rajasthan') {
        try {
          const [[rajState]] = await conn.query(
            "SELECT id FROM states WHERE LOWER(name) = 'rajasthan' LIMIT 1"
          );
          if (rajState) resolvedStateId = rajState.id;
        } catch (e) { console.error('[state auto-resolve]', e.message); }
      }

      // If city was a name and state was resolved late (Rajasthan), retry city lookup
      if (!resolvedCityId && city_id && isNaN(Number(city_id)) && resolvedStateId) {
        try {
          const [[cityRow]] = await conn.query(
            'SELECT id FROM cities WHERE LOWER(name) = LOWER(?) AND state_id = ? LIMIT 1',
            [String(city_id).trim(), resolvedStateId]
          );
          if (cityRow) resolvedCityId = cityRow.id;
        } catch (e) { console.error('[city name resolve retry]', e.message); }
      }

      // If we have an explicitly provided branch_id, use it. Otherwise, lookup via city_id.
      if (formData.branch_id && !isNaN(Number(formData.branch_id))) {
        resolvedBranchId = Number(formData.branch_id);
      } else if (resolvedCityId) {
        try {
          const [[branchRow]] = await conn.query(
            `SELECT id FROM portal_branches
             WHERE city_id = ? AND (is_active IS TRUE OR is_active IS NULL)
             ORDER BY id LIMIT 1`,
            [resolvedCityId]
          );
          if (branchRow?.id) resolvedBranchId = branchRow.id;
        } catch (e) { console.error('[branch auto-resolve]', e.message); }
      }

      // Overseas: No state, No branch. Just leave both null so only Super Admin handles them.
      // Keep stored JSON payload consistent with the resolved IDs
      if (resolvedCountryId) formData.country_id = resolvedCountryId;
      if (resolvedStateId) formData.state_id = resolvedStateId;
      if (resolvedCityId) formData.city_id = resolvedCityId;
      if (resolvedBranchId) formData.branch_id = resolvedBranchId;

      // Receipt is required on apply → Payment Submitted / Awaiting Verification (never auto-verified)
      const [r] = await conn.query(
        `INSERT INTO fb_submissions
           (uuid, form_id, user_id, status, current_step, submitted_at,
            applicant_name, applicant_email, applicant_phone, membership_id, ip_address, data,
            plan_type, membership_type, package_id, wing_id, country_id, state_id, city_id, branch_id, payment_status)
         VALUES (?,?,0,'payment_submitted',5,NOW(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,'submitted')`,
        [submUuid, formId, full_name, email, phone || null,
         membershipId, req.ip, JSON.stringify(formData),
         plan_type || null, membership_type || null, package_id ? Number(package_id) : null,
         resolvedWingId,
         resolvedCountryId,
         resolvedStateId,
         resolvedCityId,
         resolvedBranchId]
      );
      const submissionId = r.insertId;

      // Resolve price from package (INR base). For international wire, prefer converted payable_amount.
      let amount = 0;
      if (payable_amount && Number(payable_amount) > 0) {
        amount = Number(payable_amount);
      } else if (package_id) {
        const [[pkg]] = await conn.query(
          'SELECT price FROM portal_packages WHERE id=? LIMIT 1', [package_id]
        );
        if (pkg) amount = pkg.price;
      }

      const payUuid = require('crypto').randomUUID();
      await conn.query(
        `INSERT INTO portal_payments
           (uuid, submission_id, method_id, transaction_id, screenshot_path, status, amount, currency, exchange_rate, notes)
         VALUES (?,?,?,?,?,'submitted',?,?,?,?)`,
        [payUuid, submissionId,
         resolvedMethodId,
         paymentReferenceForStorage, screenshotPath, amount, fixedCurrency,
         exchange_rate ? Number(exchange_rate) : null,
         `client_status=${safePaymentClientStatus}`]
      );

      // Preserve superseded/reset payment attempts from the application form (audit history)
      let attempts = [];
      try {
        if (payment_attempts) {
          attempts = typeof payment_attempts === 'string'
            ? JSON.parse(payment_attempts)
            : payment_attempts;
        }
      } catch (_) { attempts = []; }
      if (Array.isArray(attempts) && attempts.length) {
        for (const attempt of attempts) {
          const attemptStatus = ['superseded', 'reset'].includes(String(attempt?.status || '').toLowerCase())
            ? String(attempt.status).toLowerCase()
            : 'superseded';
          const attemptUuid = require('crypto').randomUUID();
          const attemptMethodId = attempt?.method_id && !isNaN(Number(attempt.method_id))
            ? Number(attempt.method_id)
            : resolvedMethodId;
          await conn.query(
            `INSERT INTO portal_payments
               (uuid, submission_id, method_id, transaction_id, screenshot_path, status, amount, currency, notes)
             VALUES (?,?,?,?,NULL,?,?,?,?)`,
            [
              attemptUuid,
              submissionId,
              attemptMethodId,
              attempt?.reference_id || null,
              attemptStatus,
              amount,
              fixedCurrency,
              `Archived client attempt (${attemptStatus}) at ${attempt?.archived_at || 'n/a'}`,
            ]
          );
        }
      }

      // ── Lifetime plan: auto-verify payment and activate immediately ──
      let finalMembershipId = membershipId;
      let autoActivated = false;
      // VULNERABILITY FIX: Lifetime plan auto-activation has been removed.
      // All lifetime memberships will now go through standard admin verification.

      // Create / find member_accounts for auto-login
      let memberAccountId = null;
      const [[existingAcc]] = await conn.query(
        'SELECT id FROM member_accounts WHERE submission_id = ? LIMIT 1',
        [submissionId]
      );
      if (existingAcc) {
        memberAccountId = existingAcc.id;
      } else {
        const memberUuid = require('crypto').randomUUID();
        try {
          const [mResult] = await conn.query(
            `INSERT INTO member_accounts (uuid, submission_id, email, full_name, phone, membership_id, plan_type, membership_type, package_id, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
            [memberUuid, submissionId, email.toLowerCase().trim(), full_name, phone || null, finalMembershipId,
             plan_type || null, membership_type || null, package_id ? Number(package_id) : null]
          );
          memberAccountId = mResult.insertId;
        } catch (memberErr) {
          // Older databases may still have UNIQUE(email) on member_accounts.
          // Fall back to an existing account id so submission succeeds; dashboard reads are pinned by submission_id.
          if (memberErr.code === 'ER_DUP_ENTRY') {
            const [[emailAcc]] = await conn.query(
              'SELECT id FROM member_accounts WHERE email = ? LIMIT 1',
              [email.toLowerCase().trim()]
            );
            if (emailAcc) memberAccountId = emailAcc.id;
            else throw memberErr;
          } else {
            throw memberErr;
          }
        }
      }

      const memberToken = jwt.sign(
        {
          id: memberAccountId,
          email: email.toLowerCase().trim(),
          submission_id: submissionId,
          role: autoActivated ? 'member' : 'applicant',
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await conn.commit();

      // Activity timeline: application + payment submitted (never auto-verified)
      try {
        await pool.query(
          `INSERT INTO application_activity (submission_id, event_type, notes, acted_by)
           VALUES (?, 'application_submitted', ?, NULL)`,
          [submissionId, `Application submitted with payment receipt (${safePaymentClientStatus})`]
        );
        await pool.query(
          `INSERT INTO application_activity (submission_id, event_type, notes, acted_by)
           VALUES (?, 'payment_submitted', ?, NULL)`,
          [submissionId, `Payment reference ${paymentReferenceForStorage}`]
        );
      } catch (actErr) {
        console.error('[apply activity]', actErr.message);
      }

      if (resolvedWingId) {
        const { assignWing } = require('../utils/memberOrg');
        await assignWing({
          submissionId,
          wingId: resolvedWingId,
          assignedBy: null,
          notes: 'Selected at application',
        }).catch(e => console.error('[wing assign on apply]', e.message));
      }

      // Send email notifications (non-blocking)
      if (autoActivated) {
        // Lifetime: send membership confirmed email directly
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/member/login`;
        sendMembershipConfirmed({
          to:           email,
          name:         full_name,
          membershipId: finalMembershipId,
          loginUrl,
        }).catch(e => console.error('[lifetime confirmed email]', e.message));
      } else {
        sendApplicationSubmitted({
          to:             email,
          name:           full_name,
          membershipId:   finalMembershipId,
          submissionUuid: submUuid,
        }).catch(e => console.error('[apply email]', e.message));

        sendPaymentSubmitted({
          to:           email,
          name:         full_name,
          membershipId: finalMembershipId,
          amount,
          currency: fixedCurrency,
          transactionId: paymentReferenceForStorage,
        }).catch(e => console.error('[payment submitted email]', e.message));
      }

      return ok(res,
        {
          submission_uuid: submUuid,
          email: email.toLowerCase().trim(),
          applicationId: finalMembershipId,
          membership_id: finalMembershipId,
          membershipStatus: autoActivated ? 'active' : 'payment_submitted',
          payment_status: 'submitted',
          payment_client_status: safePaymentClientStatus,
        },
        autoActivated ? 'Membership activated successfully' : 'Application submitted — payment awaiting verification',
        201
      );
    } catch (err) {
      await conn.rollback();
      console.error('[membership/apply]', err);
      return fail(res, 'Server error during submission', 500);
    } finally {
      conn.release();
    }
  }
);

// ──────── Admin-only: view submissions via this route ─────────────────────────
router.use(authMiddleware);

// GET /api/membership/submissions — paginated list for admin
router.get('/submissions', async (req, res) => {
  const { page = 1, per_page = 20, status, q } = req.query;
  let where = "s.status NOT IN ('draft')";
  const params = [];
  if (status) { where += ' AND s.status=?'; params.push(status); }
  if (q) {
    where += ' AND (s.applicant_name LIKE ? OR s.applicant_email LIKE ? OR s.membership_id LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  try {
    const { paginate } = require('../utils/helpers');
    const result = await paginate(
      pool,
      `SELECT s.id, s.uuid, s.membership_id, s.applicant_name, s.applicant_email,
              s.applicant_phone, s.status, s.submitted_at, s.created_at,
              p.transaction_id, p.status AS payment_status, p.amount,
              pm.name AS payment_method_name
       FROM fb_submissions s
       LEFT JOIN portal_payments p ON p.submission_id = s.id
       LEFT JOIN portal_payment_methods pm ON pm.id = p.method_id
       WHERE ${where}
       ORDER BY s.created_at DESC`,
      params, Number(page), Number(per_page)
    );
    return ok(res, result);
  } catch (err) { console.error(err); return fail(res, 'Server error', 500); }
});

module.exports = router;
