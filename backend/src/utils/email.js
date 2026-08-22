const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

const DEFAULT_SUPPORT_EMAIL = 'info@forti.in';
const DEFAULT_SOCIAL = [
  { label: 'Facebook', url: 'https://forti.in' },
  { label: 'Instagram', url: 'https://forti.in' },
  { label: 'LinkedIn', url: 'https://forti.in' },
  { label: 'X', url: 'https://forti.in' },
];

// ── Dynamic SMTP settings (DB-first, env fallback, 60s cache) ────────────────
let _smtpCache = null;
let _cacheTs   = 0;
let _smtpVerifyTs = 0;
const DEFAULT_ORG = {
  name: 'FORTI',
  shortName: 'FORTI',
  subtitle: 'Federation of Rajasthan Trade & Industry',
  website: 'https://forti.in',
  logoUrl: '',
};
let _orgCache = { ...DEFAULT_ORG };
let _orgTs = 0;

function clearOrgCache() { _orgTs = 0; }

async function getSmtpConfig() {
  const now = Date.now();
  if (_smtpCache && now - _cacheTs < 60_000) return _smtpCache;
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('MAIL_HOST','MAIL_PORT','MAIL_USER','MAIL_PASS','MAIL_FROM','ADMIN_EMAIL')"
    );
    const db = {};
    rows.forEach(r => { if (r.setting_value) db[r.setting_key] = r.setting_value; });
    _smtpCache = {
      host:       db.MAIL_HOST   || process.env.MAIL_HOST   || 'smtp.gmail.com',
      port:       Number(db.MAIL_PORT || process.env.MAIL_PORT || 587),
      secure:    (db.MAIL_PORT   || process.env.MAIL_PORT)  === '465',
      user:       db.MAIL_USER   || process.env.MAIL_USER,
      pass:       db.MAIL_PASS   || process.env.MAIL_PASS,
      from:       db.MAIL_FROM   || process.env.MAIL_FROM   || '"FORTI Portal" <noreply@forti.org>',
      adminEmail: db.ADMIN_EMAIL || process.env.ADMIN_EMAIL || db.MAIL_USER || process.env.MAIL_USER,
    };
  } catch {
    _smtpCache = {
      host:       process.env.MAIL_HOST   || 'smtp.gmail.com',
      port:       Number(process.env.MAIL_PORT || 587),
      secure:     process.env.MAIL_PORT   === '465',
      user:       process.env.MAIL_USER,
      pass:       process.env.MAIL_PASS,
      from:       process.env.MAIL_FROM   || '"FORTI Portal" <noreply@forti.org>',
      adminEmail: process.env.ADMIN_EMAIL || process.env.MAIL_USER,
    };
  }
  _cacheTs = Date.now();
  return _smtpCache;
}

function clearSmtpCache() {
  _smtpCache = null;
  _smtpVerifyTs = 0;
  _orgCache = { ...DEFAULT_ORG, logoUrl: defaultBrandLogoUrl() };
  _orgTs = 0;
}

function makeEmailServiceError(message, { code = 'EMAIL_SERVICE_ERROR', publicMessage = null, statusCode = 503, cause = null } = {}) {
  const err = new Error(message);
  err.code = code;
  err.publicMessage = publicMessage || message;
  err.statusCode = statusCode;
  if (cause) err.cause = cause;
  return err;
}

function validateSmtpConfig(cfg) {
  if (!cfg.host) {
    throw makeEmailServiceError('SMTP host is not configured', {
      code: 'SMTP_HOST_MISSING',
      publicMessage: 'Email service unavailable. SMTP host is not configured.',
    });
  }

  if (!cfg.port || Number.isNaN(Number(cfg.port))) {
    throw makeEmailServiceError('SMTP port is not configured correctly', {
      code: 'SMTP_PORT_INVALID',
      publicMessage: 'Email service unavailable. SMTP port is invalid.',
    });
  }

  if (!cfg.user || !cfg.pass) {
    throw makeEmailServiceError('SMTP credentials not configured (MAIL_USER / MAIL_PASS missing)', {
      code: 'SMTP_CREDENTIALS_MISSING',
      publicMessage: 'Email service unavailable. SMTP credentials are missing.',
    });
  }

  if (!cfg.from) {
    throw makeEmailServiceError('MAIL_FROM is not configured', {
      code: 'SMTP_FROM_MISSING',
      publicMessage: 'Email service unavailable. Sender address is not configured.',
    });
  }
}

function buildTransportOptions(cfg) {
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    ...(cfg.port === 587 ? { requireTLS: true } : {}),
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  };
}

function classifyEmailError(err) {
  const message = String(err?.message || '').trim();
  const code = String(err?.code || '').trim().toUpperCase();
  const responseCode = Number(err?.responseCode || 0);

  if (err?.publicMessage && err?.statusCode) return err;

  if (code === 'EAUTH' || responseCode === 535 || /invalid login|authentication|auth/i.test(message)) {
    return makeEmailServiceError(message || 'SMTP authentication failed', {
      code: 'SMTP_AUTH_FAILED',
      publicMessage: 'Email service unavailable. SMTP authentication failed.',
      statusCode: 502,
      cause: err,
    });
  }

  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code) || /timeout|connect|dns|refused|socket/i.test(message)) {
    return makeEmailServiceError(message || 'Unable to connect to SMTP server', {
      code: 'SMTP_CONNECTION_FAILED',
      publicMessage: 'Email service unavailable. Unable to connect to the email server.',
      statusCode: 502,
      cause: err,
    });
  }

  return makeEmailServiceError(message || 'Failed to send email', {
    code: 'EMAIL_DELIVERY_FAILED',
    publicMessage: 'Failed to send reset email.',
    statusCode: 502,
    cause: err,
  });
}

async function verifyEmailService() {
  const cfg = await getSmtpConfig();
  validateSmtpConfig(cfg);

  const now = Date.now();
  if (_smtpVerifyTs && now - _smtpVerifyTs < 60_000) return cfg;

  const transporter = nodemailer.createTransport(buildTransportOptions(cfg));
  try {
    await transporter.verify();
    _smtpVerifyTs = now;
    return cfg;
  } catch (err) {
    throw classifyEmailError(err);
  }
}

function pickSetting(map, keys) {
  for (const key of keys) {
    const value = map[key];
    if (value) return String(value).trim();
  }
  return '';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeAbsoluteUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const base = (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/+$/, '');

  if (value.startsWith('/')) return `${base}${value}`;
  return `${base}/${value.replace(/^\/+/, '')}`;
}

function frontendBaseUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.PUBLIC_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
}

function defaultBrandLogoUrl() {
  return `${frontendBaseUrl()}/images/brand/logo.png`;
}

function normalizeWebsiteUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return DEFAULT_ORG.website;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return normalizeAbsoluteUrl(value);
  return `https://${value.replace(/^\/+/, '')}`;
}

async function getOrgBranding() {
  const now = Date.now();
  if (now - _orgTs < 60_000) return _orgCache;

  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const kv = {};
    rows.forEach((row) => {
      if (!row?.setting_key || row.setting_value == null) return;
      kv[String(row.setting_key).toLowerCase()] = String(row.setting_value).trim();
    });

    const name = pickSetting(kv, [
      'org_name',
      'organization_name',
      'organisation_name',
      'portal_name',
      'company_name',
    ]) || DEFAULT_ORG.name;

    const shortName = pickSetting(kv, [
      'org_short_name',
      'organization_short_name',
      'organisation_short_name',
      'portal_short_name',
    ]) || name;

    const logoRaw = pickSetting(kv, [
      'org_logo_url',
      'organization_logo_url',
      'organisation_logo_url',
      'portal_logo_url',
      'mail_logo_url',
      'email_logo_url',
      'site_logo',
      'logo_url',
      'org_logo',
      'portal_logo',
    ]);

    const subtitle = pickSetting(kv, [
      'org_tagline',
      'organization_tagline',
      'organisation_tagline',
      'portal_tagline',
    ]) || DEFAULT_ORG.subtitle;

    const website = normalizeWebsiteUrl(
      pickSetting(kv, ['website_url', 'portal_url', 'site_url']) || DEFAULT_ORG.website
    );

    _orgCache = {
      name,
      shortName,
      subtitle,
      website,
      logoUrl: normalizeAbsoluteUrl(logoRaw) || defaultBrandLogoUrl(),
    };
  } catch {
    _orgCache = { ...DEFAULT_ORG, logoUrl: defaultBrandLogoUrl() };
  }

  _orgTs = Date.now();
  return _orgCache;
}

// ── Log email to DB ────────────────────────────────────────────────────────
async function logEmail(to, subject, template, refId, status, errorMsg = null) {
  try {
    await pool.query(
      'INSERT INTO email_log (to_email, subject, template, ref_id, status, error_msg) VALUES (?,?,?,?,?,?)',
      [to, subject, template || null, refId || null, status, errorMsg]
    );
  } catch (_) {}
}

// ── Core send helper ───────────────────────────────────────────────────────
async function sendMail({ to, subject, html, template = null, refId = null, attachments = null }) {
  const cfg = await getSmtpConfig();
  try {
    validateSmtpConfig(cfg);
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    await logEmail(to, subject, template, refId, 'failed', err.message);
    throw err;
  }

  const transporter = nodemailer.createTransport(buildTransportOptions(cfg));
  try {
    const mailOptions = { from: cfg.from, to, subject, html };
    if (Array.isArray(attachments) && attachments.length) {
      mailOptions.attachments = attachments;
    }
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] to=${to} messageId=${info.messageId}`);
    await logEmail(to, subject, template, refId, 'sent');
  } catch (err) {
    const mapped = classifyEmailError(err);
    console.error('[EMAIL ERROR]', mapped.message);
    await logEmail(to, subject, template, refId, 'failed', mapped.message);
    throw mapped;
  }
}

// ── Email templates ────────────────────────────────────────────────────────
async function baseTemplate(content) {
  const org = await getOrgBranding();
  const orgName = escapeHtml(org.name || DEFAULT_ORG.name);
  const orgShortName = escapeHtml(org.shortName || org.name || DEFAULT_ORG.shortName);
  const orgSubtitle = escapeHtml(org.subtitle || DEFAULT_ORG.subtitle);
  const websiteUrlRaw = org.website || DEFAULT_ORG.website;
  const websiteUrl = escapeHtml(websiteUrlRaw);
  const privacyUrl = escapeHtml(`${websiteUrlRaw.replace(/\/+$/, '')}/privacy`);
  const contactUrl = escapeHtml(`${websiteUrlRaw.replace(/\/+$/, '')}/contact`);
  const logoUrl = escapeHtml(org.logoUrl || defaultBrandLogoUrl());
  const logoHtml = `<img src="${logoUrl}" alt="FORTI — Federation of Rajasthan Trade &amp; Industry" width="520" style="display:block;max-width:520px;width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none">`;
  const year = new Date().getFullYear();

  return `
  <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;margin:0;padding:0}
    .wrap{max-width:620px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .header{background:linear-gradient(135deg,#4c1d95 0%,#6d28d9 55%,#7c3aed 100%);padding:28px 24px 24px;text-align:center}
    .header-logo-wrap{display:inline-block;background:#fff;border-radius:12px;padding:10px 14px;margin:0 auto 16px;max-width:92%}
    .header h1{color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:.2px;opacity:.95}
    .body{padding:36px}
    .greeting{font-size:16px;color:#1f2937;font-weight:600;margin-bottom:8px}
    .body p{color:#4b5563;line-height:1.75;font-size:14px;margin:0 0 14px}
    .otp-box{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #7c3aed;border-radius:12px;text-align:center;padding:24px 20px;margin:24px 0}
    .otp-box .otp{font-size:40px;font-weight:800;color:#5b21b6;letter-spacing:12px;font-family:monospace}
    .otp-box .otp-hint{color:#7c3aed;font-size:12px;margin:10px 0 0;font-weight:500}
    .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:18px 0;display:table;width:100%;border-collapse:collapse;box-sizing:border-box}
    .info-box .info-row{display:table-row;font-size:13px}
    .info-box .info-row:last-child .info-label,.info-box .info-row:last-child .info-value{border-bottom:none;padding-bottom:0}
    .info-box .info-label{display:table-cell;color:#6b7280;font-weight:500;padding:6px 16px 6px 0;border-bottom:1px solid #f3f4f6;white-space:nowrap;width:38%;vertical-align:middle}
    .info-box .info-value{display:table-cell;color:#111827;font-weight:600;padding:6px 0;border-bottom:1px solid #f3f4f6;vertical-align:middle}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .badge-review{background:#fef3c7;color:#92400e}
    .badge-active{background:#d1fae5;color:#065f46}
    .badge-pending{background:#ede9fe;color:#5b21b6}
    .badge-rejected{background:#fee2e2;color:#991b1b}
    .btn{display:inline-block;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff !important;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0;letter-spacing:.2px;box-shadow:0 4px 12px rgba(92,33,182,.3)}
    .divider{border:none;border-top:1px solid #f3f4f6;margin:24px 0}
    ul.feature-list{color:#4b5563;font-size:14px;line-height:2.2;padding-left:20px;margin:12px 0}
    ul.feature-list li::marker{color:#7c3aed}
    .warning-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;font-size:12px;color:#9a3412}
    .footer{text-align:center;padding:24px 28px;border-top:2px solid #f3f4f6;background:#fafafa;font-size:11px;color:#9ca3af;line-height:1.8}
    .footer a{color:#7c3aed;text-decoration:none}
    .footer-logo{display:block;max-width:160px;width:100%;height:auto;margin:0 auto 10px}
    .footer .footer-org{font-size:12px;font-weight:600;color:#4b5563;margin:0 0 2px}
    .footer .footer-address{font-size:10.5px;color:#9ca3af;margin:0 0 8px}
  </style></head><body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo-wrap">${logoHtml}</div>
      <h1>Membership Portal</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <img src="${logoUrl}" alt="${orgName}" class="footer-logo" width="160">
      <div class="footer-org">${orgSubtitle}</div>
      <div class="footer-address">Rajasthan, India</div>
      <div>
        <a href="${websiteUrl}">Website</a> &bull;
        <a href="${privacyUrl}">Privacy Policy</a> &bull;
        <a href="${contactUrl}">Contact Us</a>
      </div>
      <div style="margin-top:10px;border-top:1px solid #e9ecef;padding-top:10px">
        &copy; ${year} ${orgShortName}. All rights reserved.<br>
        This is an automated email. Please do not reply to this message.
      </div>
    </div>
  </div></body></html>`;
}


// ── Dynamic DB Templates ───────────────────────────────────────────────────
async function getEmailTemplate(eventKey) {
  const [rows] = await pool.query('SELECT * FROM email_templates WHERE event_key=? AND is_active=1 LIMIT 1', [eventKey]);
  return rows[0] || null;
}

function renderTemplate(str, vars = {}) {
  if (!str) return '';
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ''));
}

function stripHtmlWrapper(body = '') {
  let content = String(body || '').trim();
  if (!content) return '';
  const hasHtmlWrapper = /^<!doctype\s+html/i.test(content) || /<html[\s>]/i.test(content);
  if (!hasHtmlWrapper) return content;
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();
  content = content
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .trim();
  return content;
}

async function sendTemplatedEmail(eventKey, to, vars, sendEmailFn) {
  const tpl = await getEmailTemplate(eventKey);
  if (!tpl) return false;
  const subject    = renderTemplate(tpl.subject, vars);
  const rawBody    = stripHtmlWrapper(renderTemplate(tpl.body, vars));
  const wrappedBody = await baseTemplate(rawBody);
  await sendEmailFn(to, subject, wrappedBody);
  return true;
}

// ── OTP email (production FORTI branded) ───────────────────────────────────
async function buildOtpEmailHtml({ name, otp, expiryTime, purpose = 'apply' }) {
  const org = await getOrgBranding();
  const { adminEmail } = await getSmtpConfig();
  const supportEmail = adminEmail || DEFAULT_SUPPORT_EMAIL;
  const websiteUrlRaw = org.website || DEFAULT_ORG.website;
  const websiteUrl = escapeHtml(websiteUrlRaw);
  const privacyUrl = escapeHtml(`${websiteUrlRaw.replace(/\/+$/, '')}/privacy`);
  const contactUrl = escapeHtml(`${websiteUrlRaw.replace(/\/+$/, '')}/contact`);
  const orgSubtitle = escapeHtml(org.subtitle || DEFAULT_ORG.subtitle);
  const safeName = escapeHtml(String(name || '').trim());
  const safeOtp = escapeHtml(String(otp || ''));
  const safeExpiry = escapeHtml(String(expiryTime || '10'));
  const year = new Date().getFullYear();
  const isLogin = purpose === 'login';
  const intro = isLogin
    ? 'Use the verification code below to securely sign in to your FORTI Member Dashboard.'
    : 'Use the verification code below to verify your identity and continue your FORTI membership application.';

  const greeting = safeName
    ? `Hello <strong style="color:#111827">${safeName}</strong>,`
    : 'Hello,';

  const socialHtml = DEFAULT_SOCIAL.map((s, i) => {
    const sep = i < DEFAULT_SOCIAL.length - 1 ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : '';
    return `<a href="${escapeHtml(s.url)}" style="color:#7c3aed;text-decoration:none;font-weight:600">${escapeHtml(s.label)}</a>${sep}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>FORTI Verification Code</title>
  <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
    Your FORTI verification code is ${safeOtp}. Valid for ${safeExpiry} minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;margin:0;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- Purple header: text brand only (no embedded image / attachment) -->
          <tr>
            <td align="center" bgcolor="#6d28d9" style="background:linear-gradient(135deg,#4c1d95 0%,#6d28d9 55%,#7c3aed 100%);padding:28px 20px 24px">
              <p style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:1px;line-height:1.2">FORTI</p>
              <p style="margin:10px 0 0;color:#ffffff;font-size:16px;font-weight:600;letter-spacing:0.3px;line-height:1.3;opacity:0.95">Membership Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 12px;color:#4b5563;font-size:15px;line-height:1.7">
              <p style="margin:0 0 12px;font-size:16px;color:#1f2937">${greeting}</p>
              <p style="margin:0 0 20px">${intro}</p>

              <!-- OTP card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #7c3aed;border-radius:14px">
                <tr>
                  <td align="center" style="padding:28px 20px">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#7c3aed">Verification Code</p>
                    <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#5b21b6;font-family:Consolas,'Courier New',monospace;line-height:1.2">${safeOtp}</p>
                    <p style="margin:14px 0 0;font-size:13px;font-weight:600;color:#6d28d9">Valid for ${safeExpiry} minutes &bull; One-time use only</p>
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#9a3412">
                    <strong>Security tip:</strong> Never share this OTP with anyone. FORTI staff will never ask for your OTP.
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.65">
                If you did not request this OTP, you can safely ignore this email. If you believe someone else tried to access your account, please contact support at
                <a href="mailto:${escapeHtml(supportEmail)}" style="color:#7c3aed;text-decoration:none;font-weight:600">${escapeHtml(supportEmail)}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer (no logo duplicate) -->
          <tr>
            <td align="center" style="padding:24px 28px 28px;border-top:1px solid #f3f4f6;background:#fafafa">
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#374151;line-height:1.4">${orgSubtitle}</p>
              <p style="margin:0 0 12px;font-size:12px;color:#9ca3af">Rajasthan, India</p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.8">
                <a href="${websiteUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600">Website</a>
                &nbsp;&bull;&nbsp;
                <a href="${privacyUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600">Privacy Policy</a>
                &nbsp;&bull;&nbsp;
                <a href="${contactUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600">Contact Us</a>
              </p>
              <p style="margin:0 0 14px;font-size:12px;line-height:1.8">${socialHtml}</p>
              <p style="margin:0;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;line-height:1.7">
                &copy; ${year} FORTI. All rights reserved.<br>
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendOTP({ to, name, otp, purpose = 'apply' }) {
  const [[setting]] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'otp_expiry_time'");
  const expiryTime = setting?.setting_value || '10';

  const isLogin = purpose === 'login';
  const subject = isLogin
    ? 'Your FORTI Member Portal Login OTP'
    : 'Your FORTI Membership Application — OTP Verification';

  const html = await buildOtpEmailHtml({ name, otp, expiryTime, purpose });
  // No CID / inline logo — Gmail was showing the brand PNG as an attachment.
  await sendMail({ to, subject, html, template: 'otp_verification', refId: to });
}

// ── Application submitted ──────────────────────────────────────────────────
async function sendApplicationSubmitted({ to, name, membershipId, submissionUuid }) {
  if (!(await sendTemplatedEmail('application_submitted', to, { name, membershipId, submissionUuid }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_submitted', refId: membershipId })))) {

  const subject = 'Application Received — FORTI Membership';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Thank you for applying for FORTI Membership. We have successfully received your application along with the payment details. Our team is now reviewing your submission.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-review">Under Review</span></span></div>
      <div class="info-row"><span class="info-label">Processing Time</span><span class="info-value">2–3 Business Days</span></div>
    </div>
    <p>You will receive an email notification once your application is processed. Please keep your reference ID safe for future correspondence.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">If you have questions about your application, contact our support team with your reference ID.</p>
  `);

  await sendMail({ to, subject, html, template: 'application_submitted', refId: membershipId });

  } // End of application_submitted fallback
  
  // Notify admin
  const { adminEmail: adminAddr } = await getSmtpConfig();

  if (adminAddr) {
    if (!(await sendTemplatedEmail('admin_new_application', adminAddr, { name, email: to, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'admin_new_application', refId: membershipId })))) {
      const adminHtml = await baseTemplate(`
      <p class="greeting">New Membership Application</p>
      <p>A new membership application has been submitted and is awaiting review.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Applicant</span><span class="info-value">${name}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${to}</span></div>
        <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      </div>
      <p>Please log in to the admin portal to review and process this application.</p>
    `);
      await sendMail({ to: adminAddr, subject: `New Application: ${name} — FORTI Portal`, html: adminHtml, template: 'admin_new_application', refId: membershipId });
    }
  }
}

// ── Application under review ───────────────────────────────────────────────
async function sendApplicationUnderReview({ to, name, membershipId }) {
  if (await sendTemplatedEmail('application_under_review', to, { name, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_under_review', refId: membershipId }))) return;

  const subject = 'Your FORTI Membership Application is Under Review';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>We wanted to keep you updated — your FORTI Membership application is currently <strong>under review</strong> by our team.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-review">Under Review</span></span></div>
      <div class="info-row"><span class="info-label">Processing Time</span><span class="info-value">2–3 Business Days</span></div>
    </div>
    <p>Our team is verifying your documents and details. You will receive another email once a decision has been made. No action is needed from you at this time.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">You can track your application status at any time using your reference ID. If you have questions, contact our support team.</p>
  `);

  await sendMail({ to, subject, html, template: 'application_under_review', refId: membershipId });
}

// ── Application approved ───────────────────────────────────────────────────
async function sendApplicationApproved({ to, name, membershipId }) {
  if (await sendTemplatedEmail('application_approved', to, { name, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_approved', refId: membershipId }))) return;

  const subject = 'Congratulations! Your FORTI Membership is Approved';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>We are thrilled to inform you that your FORTI Membership application has been <strong>approved</strong>. Welcome to the FORTI community!</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-active">Active Member</span></span></div>
    </div>
    <p>As a FORTI Member, you now have access to:</p>
    <ul class="feature-list">
      <li>Official Membership Certificate (downloadable PDF)</li>
      <li>Digital Membership ID Card</li>
      <li>Payment Invoice &amp; Receipt</li>
      <li>Member networking events &amp; benefits</li>
    </ul>
    <p>Log in to your Member Dashboard using your registered email. An OTP will be sent for secure access.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">Please retain your Membership ID <strong>${membershipId}</strong> for all future correspondence with FORTI.</p>
  `);

  await sendMail({ to, subject, html, template: 'application_approved', refId: membershipId });
}

// ── Application rejected ───────────────────────────────────────────────────
async function sendApplicationRejected({ to, name, membershipId, reason }) {
  if (await sendTemplatedEmail('application_rejected', to, { name, membershipId, reason }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_rejected', refId: membershipId }))) return;

  const subject = 'Update on Your FORTI Membership Application';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>We regret to inform you that your FORTI Membership application (Reference: <strong>${membershipId}</strong>) could not be approved at this time after review by our team.</p>
    ${reason ? `
    <div class="info-box">
      <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${reason}</span></div>
    </div>` : ''}
    <p>If you believe this decision was made in error, or if you have additional supporting documents to provide, we encourage you to contact our office. We will be happy to assist you through the process.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">You may reapply after addressing the reason mentioned above. Please quote your reference ID <strong>${membershipId}</strong> in all communications.</p>
  `);

  await sendMail({ to, subject, html, template: 'application_rejected', refId: membershipId });
}

// ── Payment confirmed ──────────────────────────────────────────────────────
async function sendPaymentConfirmed({ to, name, membershipId, amount, currency = 'INR', transactionId }) {
  if (await sendTemplatedEmail('payment_confirmed', to, { name, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'payment_confirmed', refId: membershipId }))) return;

  const subject = 'Payment Verified — FORTI Membership Activation in Progress';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Great news! Your payment for FORTI Membership has been <strong>verified and confirmed</strong> by our team.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Amount Paid</span><span class="info-value">${currency}&nbsp;${Number(amount).toLocaleString()}</span></div>
      ${transactionId ? `<div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">${transactionId}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Payment Status</span><span class="info-value"><span class="badge badge-active">Verified</span></span></div>
      <div class="info-row"><span class="info-label">Next Step</span><span class="info-value">Membership Activation</span></div>
    </div>
    <p>Our team is now reviewing your application for final activation. You will receive a separate email with your <strong>Membership Certificate</strong> and <strong>Digital ID Card</strong> once your membership is fully activated.</p>
    <div class="warning-box" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">
      &#10003; Payment received &mdash; Activation typically takes <strong>1 business day</strong>.
    </div>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">For any queries, please contact our office quoting your Reference ID <strong>${membershipId}</strong>.</p>
  `);

  await sendMail({ to, subject, html, template: 'payment_confirmed', refId: membershipId });
}


// ── Membership confirmed (with credentials) ───────────────────────────────
async function sendMembershipConfirmed({ to, name, membershipId, loginUrl }) {
  if (await sendTemplatedEmail('membership_confirmed', to, { name, membershipId, loginUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'membership_confirmed', refId: membershipId }))) return;

  const subject = `Welcome to FORTI, ${name}! Your Membership is Now Active`;
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>We are delighted to welcome you to the <strong>FORTI Family</strong>! Your membership is now fully active and ready to use.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6;font-size:16px">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-active">Active Member</span></span></div>
      <div class="info-row"><span class="info-label">Login Email</span><span class="info-value">${to}</span></div>
    </div>
    <p>Access your exclusive Member Dashboard to:</p>
    <ul class="feature-list">
      <li>Download your official Membership Certificate</li>
      <li>Download your Digital Membership ID Card</li>
      <li>View &amp; download payment invoices</li>
      <li>Manage your membership renewal</li>
    </ul>
    ${loginUrl ? `<center><a href="${loginUrl}" class="btn">Access Member Dashboard &rarr;</a></center>` : ''}
    <p>To log in, enter your registered email address and we will send you a secure OTP. No password required.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">Please keep your Membership ID <strong>${membershipId}</strong> safe for all official correspondence with FORTI.</p>
  `);

  await sendMail({ to, subject, html, template: 'membership_confirmed', refId: membershipId });
}

// ── Payment submitted (admin notification) ─────────────────────────────────
async function sendPaymentSubmitted({ to, name, membershipId, amount, currency = 'INR', transactionId, adminEmail }) {
  if (!(await sendTemplatedEmail('payment_submitted', to, { name, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'payment_submitted', refId: membershipId })))) {

  const userHtml = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Thank you! We have received your payment details and they are currently <strong>under verification</strong> by our team.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      ${amount ? `<div class="info-row"><span class="info-label">Amount</span><span class="info-value">${currency} ${Number(amount).toLocaleString()}</span></div>` : ''}
      ${transactionId ? `<div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">${transactionId}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-pending">Under Verification</span></span></div>
    </div>
    <p>Our team will verify your payment within <strong>1–2 business days</strong>. You will receive a membership activation email once verified.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">Contact our support team with your Reference ID if you have any queries regarding your payment submission.</p>
  `);
  await sendMail({ to, subject: 'Payment Submitted — FORTI Membership', html: userHtml, template: 'payment_submitted', refId: membershipId });

  } // End of payment_submitted fallback
  const { adminEmail: adminAddr2 } = await getSmtpConfig();
  const notifyTo = adminEmail || adminAddr2;
  if (notifyTo) {
    if (!(await sendTemplatedEmail('admin_payment_submitted', notifyTo, { name, email: to, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'admin_payment_submitted', refId: membershipId })))) {
      const adminHtml = await baseTemplate(`
      <p class="greeting">Payment Pending Verification</p>
      <p>A member has submitted payment proof and is awaiting verification.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Applicant</span><span class="info-value">${name}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span class="info-value">${to}</span></div>
        <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
        ${amount ? `<div class="info-row"><span class="info-label">Amount</span><span class="info-value">${currency} ${Number(amount).toLocaleString()}</span></div>` : ''}
        ${transactionId ? `<div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">${transactionId}</span></div>` : ''}
      </div>
      <p>Please log in to the admin portal to verify this payment and process the application.</p>
    `);
      await sendMail({ to: notifyTo, subject: `Payment Pending: ${name} — FORTI Portal`, html: adminHtml, template: 'admin_payment_submitted', refId: membershipId });
    }
  }
}

// ── Invoice generated ──────────────────────────────────────────────────────
async function sendInvoiceGenerated({ to, name, membershipId, invoiceNumber, amount, currency = 'INR', invoiceUrl }) {
  if (await sendTemplatedEmail('invoice_generated', to, { name, membershipId, invoiceNumber, amount, currency, invoiceUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'invoice_generated', refId: membershipId }))) return;

  const subject = `Tax Invoice ${invoiceNumber} — FORTI Membership`;
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Your official tax invoice has been generated for your FORTI Membership payment.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Invoice Number</span><span class="info-value" style="font-family:monospace">${invoiceNumber}</span></div>
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      ${amount ? `<div class="info-row"><span class="info-label">Amount</span><span class="info-value">${currency} ${Number(amount).toLocaleString()}</span></div>` : ''}
    </div>
    ${invoiceUrl
      ? `<center><a href="${invoiceUrl}" class="btn">Download Invoice (PDF) &rarr;</a></center>`
      : '<p>Log in to your Member Dashboard to download your invoice.</p>'}
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">Please keep this invoice for your records. Contact us for any queries regarding this invoice.</p>
  `);
  await sendMail({ to, subject, html, template: 'invoice_generated', refId: membershipId });
}

// ── Certificate generated ──────────────────────────────────────────────────
async function sendCertificateGenerated({ to, name, membershipId, dashboardUrl }) {
  if (await sendTemplatedEmail('certificate_generated', to, { name, membershipId, dashboardUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'certificate_generated', refId: membershipId }))) return;

  const subject = 'Your FORTI Membership Certificate & ID Card Are Ready';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>Your FORTI Membership Certificate and Digital ID Card have been successfully generated and are ready for download.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Documents Ready</span><span class="info-value">Certificate &amp; ID Card</span></div>
    </div>
    <ul class="feature-list">
      <li>Official Membership Certificate (PDF)</li>
      <li>Digital Membership ID Card (PDF)</li>
      <li>Tax Invoice</li>
    </ul>
    ${dashboardUrl ? `<center><a href="${dashboardUrl}" class="btn">Download Documents &rarr;</a></center>` : ''}
  `);
  await sendMail({ to, subject, html, template: 'certificate_generated', refId: membershipId });
}

// ── Renewal reminder ───────────────────────────────────────────────────────
async function sendRenewalReminder({ to, name, membershipId, expiryDate, daysLeft }) {
  const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  if (await sendTemplatedEmail('renewal_reminder', to, { name, membershipId, expiryDate, daysLeft, formattedDate }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'renewal_reminder', refId: membershipId }))) return;

  const subject = `Action Required: FORTI Membership Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`;
  const urgencyColor = daysLeft <= 7 ? '#fee2e2' : daysLeft <= 30 ? '#fff7ed' : '#f0fdf4';
  const urgencyBorderColor = daysLeft <= 7 ? '#fca5a5' : daysLeft <= 30 ? '#fed7aa' : '#86efac';
  const urgencyTextColor = daysLeft <= 7 ? '#991b1b' : daysLeft <= 30 ? '#9a3412' : '#166534';
  const html = await baseTemplate(`
    <p class="greeting">Dear <strong>${name}</strong>,</p>
    <p>This is a reminder that your FORTI Membership is expiring soon. Please renew before the expiry date to continue enjoying uninterrupted benefits.</p>
    <div style="background:${urgencyColor};border:1px solid ${urgencyBorderColor};border-radius:10px;padding:16px 20px;margin:18px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:${urgencyTextColor};font-weight:600">Your membership expires on</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:${urgencyTextColor}">${formattedDate}</p>
      <p style="margin:4px 0 0;font-size:12px;color:${urgencyTextColor}">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">${membershipId}</span></div>
      <div class="info-row"><span class="info-label">Expiry Date</span><span class="info-value">${formattedDate}</span></div>
    </div>
    <p>Log in to your Member Dashboard using <strong>${to}</strong> and apply for renewal before the expiry date.</p>
    <hr class="divider">
    <p style="font-size:12px;color:#6b7280">If you have already renewed your membership, please disregard this email. For any queries, contact our office quoting your Membership ID.</p>
  `);

  await sendMail({ to, subject, html, template: 'renewal_reminder', refId: membershipId });
}

module.exports = {
  sendOTP,
  sendApplicationSubmitted,
  sendApplicationUnderReview,
  sendApplicationApproved,
  sendApplicationRejected,
  sendPaymentSubmitted,
  sendPaymentConfirmed,
  sendMembershipConfirmed,
  sendInvoiceGenerated,
  sendCertificateGenerated,
  sendRenewalReminder,
  sendMail,
  baseTemplate,
  getSmtpConfig,
  verifyEmailService,
  classifyEmailError,
  clearSmtpCache,
  clearOrgCache,
};
