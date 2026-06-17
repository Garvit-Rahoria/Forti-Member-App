import re
import os

filepath = '/Users/manoj/Desktop/FORTI/forti-member-app/backend/src/utils/email.js'

with open(filepath, 'r') as f:
    content = f.read()

# Add dynamic template helpers
helpers = """
// ── Dynamic DB Templates ───────────────────────────────────────────────────
async function getEmailTemplate(eventKey) {
  const [rows] = await pool.query('SELECT * FROM email_templates WHERE event_key=? AND is_active=1 LIMIT 1', [eventKey]);
  return rows[0] || null;
}

function renderTemplate(str, vars = {}) {
  if (!str) return '';
  return str.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (_, k) => (vars[k] ?? ''));
}

function stripHtmlWrapper(body = '') {
  let content = String(body || '').trim();
  if (!content) return '';
  const hasHtmlWrapper = /^<!doctype\\s+html/i.test(content) || /<html[\\s>]/i.test(content);
  if (!hasHtmlWrapper) return content;
  const bodyMatch = content.match(/<body[^>]*>([\\s\\S]*?)<\\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();
  content = content
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\\/html>/gi, '')
    .replace(/<head[^>]*>[\\s\\S]*?<\\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\\/body>/gi, '')
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
"""

if "async function getEmailTemplate(" not in content:
    content = content.replace("// ── OTP email", helpers + "\n// ── OTP email")

replacements = [
    (
        r"async function sendOTP\(\{ to, name, otp, purpose = 'apply' \}\) \{",
        r"""async function sendOTP({ to, name, otp, purpose = 'apply' }) {
  const [[setting]] = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'otp_expiry_time'");
  const expiryTime = setting?.setting_value || '10';
  if (await sendTemplatedEmail('otp_verification', to, { name, otp, purpose, expiryTime }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'otp_verification', refId: to }))) return;
"""
    ),
    (
        r"async function sendApplicationSubmitted\(\{ to, name, membershipId, submissionUuid \}\) \{",
        r"""async function sendApplicationSubmitted({ to, name, membershipId, submissionUuid }) {
  if (!(await sendTemplatedEmail('application_submitted', to, { name, membershipId, submissionUuid }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_submitted', refId: membershipId })))) {
"""
    ),
    (
        r"  // Notify admin\s+const \{ adminEmail: adminAddr \} = await getSmtpConfig\(\);",
        r"""  } // End of application_submitted fallback
  
  // Notify admin
  const { adminEmail: adminAddr } = await getSmtpConfig();
"""
    ),
    (
        r"    const adminHtml = await baseTemplate\(`\s+<p class=\"greeting\">New Membership Application</p>([\s\S]*?)`\);\s+await sendMail\(\{ to: adminAddr, subject: `New Application: \$\{name\} — FORTI Portal`, html: adminHtml, template: 'admin_new_application', refId: membershipId \}\);\s+\}",
        r"""    if (!(await sendTemplatedEmail('admin_new_application', adminAddr, { name, email: to, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'admin_new_application', refId: membershipId })))) {
      const adminHtml = await baseTemplate(`
      <p class="greeting">New Membership Application</p>\g<1>`);
      await sendMail({ to: adminAddr, subject: `New Application: ${name} — FORTI Portal`, html: adminHtml, template: 'admin_new_application', refId: membershipId });
    }
  }"""
    ),
    (
        r"async function sendApplicationUnderReview\(\{ to, name, membershipId \}\) \{",
        r"""async function sendApplicationUnderReview({ to, name, membershipId }) {
  if (await sendTemplatedEmail('application_under_review', to, { name, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_under_review', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendApplicationApproved\(\{ to, name, membershipId \}\) \{",
        r"""async function sendApplicationApproved({ to, name, membershipId }) {
  if (await sendTemplatedEmail('application_approved', to, { name, membershipId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_approved', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendApplicationRejected\(\{ to, name, membershipId, reason \}\) \{",
        r"""async function sendApplicationRejected({ to, name, membershipId, reason }) {
  if (await sendTemplatedEmail('application_rejected', to, { name, membershipId, reason }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'application_rejected', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendPaymentConfirmed\(\{ to, name, membershipId, amount, currency = 'INR', transactionId \}\) \{",
        r"""async function sendPaymentConfirmed({ to, name, membershipId, amount, currency = 'INR', transactionId }) {
  if (await sendTemplatedEmail('payment_confirmed', to, { name, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'payment_confirmed', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendMembershipConfirmed\(\{ to, name, membershipId, loginUrl \}\) \{",
        r"""async function sendMembershipConfirmed({ to, name, membershipId, loginUrl }) {
  if (await sendTemplatedEmail('membership_confirmed', to, { name, membershipId, loginUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'membership_confirmed', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendPaymentSubmitted\(\{ to, name, membershipId, amount, currency = 'INR', transactionId, adminEmail \}\) \{",
        r"""async function sendPaymentSubmitted({ to, name, membershipId, amount, currency = 'INR', transactionId, adminEmail }) {
  if (!(await sendTemplatedEmail('payment_submitted', to, { name, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'payment_submitted', refId: membershipId })))) {
"""
    ),
    (
        r"  const \{ adminEmail: adminAddr2 \} = await getSmtpConfig\(\);",
        r"""  } // End of payment_submitted fallback
  const { adminEmail: adminAddr2 } = await getSmtpConfig();"""
    ),
    (
        r"    const adminHtml = await baseTemplate\(`\s+<p class=\"greeting\">Payment Pending Verification</p>([\s\S]*?)`\);\s+await sendMail\(\{ to: notifyTo, subject: `Payment Pending: \$\{name\} — FORTI Portal`, html: adminHtml, template: 'admin_payment_submitted', refId: membershipId \}\);\s+\}",
        r"""    if (!(await sendTemplatedEmail('admin_payment_submitted', notifyTo, { name, email: to, membershipId, amount, currency, transactionId }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'admin_payment_submitted', refId: membershipId })))) {
      const adminHtml = await baseTemplate(`
      <p class="greeting">Payment Pending Verification</p>\g<1>`);
      await sendMail({ to: notifyTo, subject: `Payment Pending: ${name} — FORTI Portal`, html: adminHtml, template: 'admin_payment_submitted', refId: membershipId });
    }
  }"""
    ),
    (
        r"async function sendInvoiceGenerated\(\{ to, name, membershipId, invoiceNumber, amount, currency = 'INR', invoiceUrl \}\) \{",
        r"""async function sendInvoiceGenerated({ to, name, membershipId, invoiceNumber, amount, currency = 'INR', invoiceUrl }) {
  if (await sendTemplatedEmail('invoice_generated', to, { name, membershipId, invoiceNumber, amount, currency, invoiceUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'invoice_generated', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendCertificateGenerated\(\{ to, name, membershipId, dashboardUrl \}\) \{",
        r"""async function sendCertificateGenerated({ to, name, membershipId, dashboardUrl }) {
  if (await sendTemplatedEmail('certificate_generated', to, { name, membershipId, dashboardUrl }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'certificate_generated', refId: membershipId }))) return;
"""
    ),
    (
        r"async function sendRenewalReminder\(\{ to, name, membershipId, expiryDate, daysLeft \}\) \{",
        r"""async function sendRenewalReminder({ to, name, membershipId, expiryDate, daysLeft }) {
  const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  if (await sendTemplatedEmail('renewal_reminder', to, { name, membershipId, expiryDate, daysLeft, formattedDate }, async (t, s, b) => sendMail({ to: t, subject: s, html: b, template: 'renewal_reminder', refId: membershipId }))) return;
"""
    )
]

for pat, rep in replacements:
    content = re.sub(pat, rep, content)

# Remove the duplicated queries in sendOTP and sendRenewalReminder
# sendOTP:
content = re.sub(r'  const \[\[setting\]\] = await pool\.query\("SELECT setting_value FROM system_settings WHERE setting_key = \'otp_expiry_time\'"\);\s+const expiryTime = setting\?\.setting_value \|\| \'10\';\n\n  const html = await baseTemplate', r'  const html = await baseTemplate', content)

# sendRenewalReminder:
content = re.sub(r"  const formattedDate = new Date\(expiryDate\)\.toLocaleDateString\('en-IN', \{ day: '2-digit', month: 'long', year: 'numeric' \}\);\s+const urgencyColor", r"  const urgencyColor", content)

with open(filepath, 'w') as f:
    f.write(content)

print("Refactored email.js successfully")
