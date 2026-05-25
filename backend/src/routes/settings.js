const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { ok, fail } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLog');
const { clearSmtpCache, getSmtpConfig, clearOrgCache } = require('../utils/email');
const { upload } = require('../middleware/upload');

const router = express.Router();

const DEFAULT_ORG_TYPES = [
  'Individual / Student',
  'Freelancer / Self-employed',
  'Startup',
  'Private Company',
  'Government Organization',
  'NGO / Non-profit',
  'Corporate / Enterprise',
  'Other',
];

// GET /api/settings/branding  PUBLIC — logo, president photo for marketing pages
router.get('/branding', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM system_settings
       WHERE setting_key IN ('site_logo', 'president_photo')`
    );
    const settings = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
    return ok(res, {
      site_logo: settings.site_logo || '/images/brand/logo.png',
      president_photo: settings.president_photo || '/images/president/suresh-agarwal.jpg',
    });
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/settings/org-types  PUBLIC — used by member application form
router.get('/org-types', async (req, res) => {
  try {
    try {
      const [rows] = await pool.query(
        'SELECT name FROM portal_organization_types WHERE is_active=1 ORDER BY sort_order ASC, name ASC'
      );
      if (rows.length) return ok(res, rows.map(row => row.name));
    } catch (tableErr) {
      if (tableErr.code !== 'ER_NO_SUCH_TABLE') throw tableErr;
    }

    const [[row]] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key='org_types' LIMIT 1");
    if (row?.setting_value) {
      try { return ok(res, JSON.parse(row.setting_value)); } catch {}
    }

    return ok(res, DEFAULT_ORG_TYPES);
  } catch (err) { return fail(res, 'Server error', 500); }
});

router.use(authMiddleware);

// GET /api/settings  All settings key-value
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM system_settings ORDER BY setting_key');
    const settings = {};
    for (const r of rows) settings[r.setting_key] = r.setting_value;
    return ok(res, settings);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/settings  Upsert multiple settings
router.put('/', requireRole('super_admin'), async (req, res) => {
  const entries = Object.entries(req.body);
  if (!entries.length) return fail(res, 'No settings provided', 422);
  try {
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON CONFLICT (setting_key) DO UPDATE
           SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, String(value)]
      );
    }
    // Clear SMTP cache so next email uses new settings
    clearSmtpCache();
    // Clear org branding cache so logo/name changes take effect immediately
    clearOrgCache();
    // Also push SMTP keys into process.env so test-email & transporter pick up immediately
    const SMTP_KEYS = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM', 'ADMIN_EMAIL'];
    for (const [key, value] of entries) {
      if (SMTP_KEYS.includes(key) && value) process.env[key] = String(value);
    }
    createAuditLog(req.user.id, 'UPDATE_SETTINGS', 'settings', null, req.ip);
    return ok(res, null, 'Settings saved');
  } catch (err) { return fail(res, 'Server error', 500); }
});


// GET /api/settings/email-templates  List email templates
router.get('/email-templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM email_templates ORDER BY event_key');
    return ok(res, rows);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/settings/email-templates  Create new template
router.post('/email-templates', requireRole('super_admin', 'admin'), async (req, res) => {
  const { event_key, subject, body, is_active } = req.body;
  if (!event_key || !subject || !body) return fail(res, 'All fields required', 422);
  try {
    await pool.query(
      'INSERT INTO email_templates (event_key, subject, body, is_active) VALUES (?, ?, ?, ?)',
      [event_key, subject, body, is_active ? 1 : 0]
    );
    return ok(res, null, 'Template created');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// PUT /api/settings/email-templates/:id  Update template
router.put('/email-templates/:id', requireRole('super_admin', 'admin'), async (req, res) => {
  const { subject, body, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE email_templates SET subject=?, body=?, is_active=?, updated_at=NOW() WHERE id=?',
      [subject, body, is_active ? 1 : 0, req.params.id]
    );
    return ok(res, null, 'Template updated');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// GET /api/settings/email-templates/:id  Get single template
router.get('/email-templates/:id', async (req, res) => {
  try {
    const [[tpl]] = await pool.query('SELECT * FROM email_templates WHERE id=?', [req.params.id]);
    if (!tpl) return fail(res, 'Not found', 404);
    return ok(res, tpl);
  } catch (err) { return fail(res, 'Server error', 500); }
});

// DELETE /api/settings/email-templates/:id  Delete template
router.delete('/email-templates/:id', requireRole('super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM email_templates WHERE id=?', [req.params.id]);
    return ok(res, null, 'Template deleted');
  } catch (err) { return fail(res, 'Server error', 500); }
});

// POST /api/settings/test-email  Send test email
router.post('/test-email', requireRole('super_admin'), async (req, res) => {
  const { to } = req.body;
  if (!to) return fail(res, 'to required', 422);
  try {
    const nodemailer = require('nodemailer');
    const cfg = await getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: cfg.from,
      to,
      subject: 'FORTI Portal – Test Email',
      html: '<p>This is a test email from FORTI Portal. SMTP is configured correctly! ✅</p>',
    });
    return ok(res, null, 'Test email sent');
  } catch (err) { return fail(res, `Failed: ${err.message}`, 500); }
});

// PUT /api/settings/org-types  Save custom org types list
router.put('/org-types', requireRole('super_admin'), async (req, res) => {
  const { types } = req.body;
  if (!Array.isArray(types) || !types.length) return fail(res, 'types must be a non-empty array', 422);
  const cleanedTypes = [...new Set(types.map(type => String(type || '').trim()).filter(Boolean))];
  if (!cleanedTypes.length) return fail(res, 'types must contain valid values', 422);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE portal_organization_types SET is_active=0, updated_at=NOW()');
    for (let index = 0; index < cleanedTypes.length; index += 1) {
      const type = cleanedTypes[index];
      await conn.query(
        `INSERT INTO portal_organization_types (name, slug, sort_order, is_active)
         VALUES (?, LOWER(REPLACE(REPLACE(?, ' / ', '-'), ' ', '-')), ?, TRUE)
         ON CONFLICT (name) DO UPDATE
           SET slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW()`,
        [type, type, index + 1]
      );
    }
    await conn.query(
      `INSERT INTO system_settings (setting_key, setting_value) VALUES ('org_types', ?)
       ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [JSON.stringify(cleanedTypes)]
    );
    await conn.commit();
    return ok(res, null, 'Org types saved');
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return fail(res, 'Server error', 500);
  } finally {
    conn.release();
  }
});

// POST /api/settings/upload-logo  Upload org logo image
router.post('/upload-logo', requireRole('super_admin', 'admin'), upload.single('logo'), async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded', 422);
  const relativePath = `/uploads/logos/${req.file.filename}`;
  try {
    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('site_logo', ?)
       ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [relativePath]
    );
    clearOrgCache();
    return ok(res, { url: relativePath }, 'Logo uploaded');
  } catch (err) { return fail(res, 'Server error', 500); }
});

module.exports = router;
