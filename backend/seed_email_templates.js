require('dotenv').config();
const { pool } = require('./src/config/database');

const TEMPLATES = [
  { event_key: 'otp_verification', subject: 'Your FORTI Verification Code', body: 'Dear {{name}},\n\nYour OTP is: {{otp}}', is_active: 1 },
  { event_key: 'application_submitted', subject: 'Application Received — {{application_id}}', body: 'Dear {{name}},\n\nYour application (ID: {{application_id}}) has been received.', is_active: 1 },
  { event_key: 'application_approved', subject: 'Congratulations! Your FORTI Membership is Approved — {{membership_id}}', body: 'Dear {{name}},\n\nYour membership (ID: {{membership_id}}) is approved. Welcome!', is_active: 1 },
  { event_key: 'application_rejected', subject: 'FORTI Membership Application Update — {{application_id}}', body: 'Dear {{name}},\n\nYour application (ID: {{application_id}}) was rejected. Reason: {{reason}}', is_active: 1 },
  { event_key: 'membership_expiry_90', subject: 'Your FORTI Membership Expires in 90 Days', body: 'Dear {{name}},\n\nYour membership will expire in 90 days. Membership ID: {{membership_id}}', is_active: 1 },
  { event_key: 'membership_expiry_30', subject: 'Your FORTI Membership Expires in 30 Days — Action Required', body: 'Dear {{name}},\n\nYour membership will expire in 30 days. Membership ID: {{membership_id}}', is_active: 1 },
  { event_key: 'membership_expiry_7', subject: 'Your FORTI Membership Expires in 7 Days', body: 'Dear {{name}},\n\nYour membership will expire in 7 days. Membership ID: {{membership_id}}', is_active: 1 },
  { event_key: 'membership_expired', subject: 'Your FORTI Membership Has Expired', body: 'Dear {{name}},\n\nYour membership has expired. Please renew to continue benefits.', is_active: 1 },
  { event_key: 'renewal_confirmation', subject: 'FORTI Membership Renewed Successfully', body: 'Dear {{name}},\n\nYour membership has been renewed. New Expiry: {{new_expiry_date}}', is_active: 1 },
  { event_key: 'request_more_info', subject: 'Additional Information Required — {{application_id}}', body: 'Dear {{name}},\n\nWe need more information for your application (ID: {{application_id}}). {{message}}', is_active: 1 },
  { event_key: 'password_set', subject: 'Set Your FORTI Member Portal Password', body: 'Dear {{name}},\n\nSet your password using this link: {{reset_link}}', is_active: 1 },
];

(async () => {
  let inserted = 0;
  for (const t of TEMPLATES) {
    try {
      const [[existing]] = await pool.query('SELECT id FROM email_templates WHERE event_key=?', [t.event_key]);
      if (!existing) {
        await pool.query(
          'INSERT INTO email_templates (event_key, subject, body, is_active) VALUES (?, ?, ?, ?)',
          [t.event_key, t.subject, t.body, t.is_active]
        );
        inserted++;
        console.log('Inserted:', t.event_key);
      } else {
        console.log('Exists:', t.event_key);
      }
    } catch (e) {
      console.error('Error:', t.event_key, e.message);
    }
  }
  console.log(`Done. ${inserted} new templates inserted.`);
  process.exit(0);
})();
