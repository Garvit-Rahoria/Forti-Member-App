const { pool } = require('../config/database');
const { baseTemplate } = require('./email');

/**
 * Fetches an email template by event key.
 * Returns null if not found or inactive.
 */
async function getEmailTemplate(eventKey) {
  const [rows] = await pool.query(
    'SELECT * FROM email_templates WHERE event_key=? AND is_active=1 LIMIT 1',
    [eventKey]
  );
  return rows[0] || null;
}

/**
 * Renders a template string with variables (e.g., {{name}})
 */
function renderTemplate(str, vars = {}) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, k) => (vars[k] ?? ''));
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

/**
 * Sends an email using the template for the given event key.
 * Automatically wraps the rendered body in the FORTI global email layout.
 * Skips if template is missing or inactive.
 */
async function sendTemplatedEmail(eventKey, to, vars, sendEmailFn) {
  const tpl = await getEmailTemplate(eventKey);
  if (!tpl) return false;
  const subject    = renderTemplate(tpl.subject, vars);
  const rawBody    = stripHtmlWrapper(renderTemplate(tpl.body, vars));
  // Wrap in FORTI branded layout so all DB templates get consistent header/footer
  const wrappedBody = await baseTemplate(rawBody);
  return sendEmailFn(to, subject, wrappedBody);
}

module.exports = {
  getEmailTemplate,
  renderTemplate,
  sendTemplatedEmail,
};
