require('dotenv').config();
const { pool } = require('./src/config/database');

const TEMPLATES = [
  { slug: 'otp_verification', name: 'OTP Verification', subject: 'Your FORTI Verification Code', variables: '["otp","name"]' },
  { slug: 'application_submitted', name: 'Application Submitted', subject: 'Application Received — {{application_id}}', variables: '["name","application_id","form_name"]' },
  { slug: 'application_approved', name: 'Application Approved', subject: 'Congratulations! Your FORTI Membership is Approved — {{membership_id}}', variables: '["name","membership_id","package_name","expiry_date"]' },
  { slug: 'application_rejected', name: 'Application Rejected', subject: 'FORTI Membership Application Update — {{application_id}}', variables: '["name","application_id","reason"]' },
  { slug: 'payment_submitted', name: 'Payment Submitted', subject: 'Payment Under Review — {{membership_id}}', variables: '["name","membership_id","amount"]' },
  { slug: 'payment_verified', name: 'Payment Verified', subject: 'Payment Confirmed — {{membership_id}}', variables: '["name","membership_id","amount"]' },
  { slug: 'membership_confirmed', name: 'Membership Confirmed', subject: 'Welcome to FORTI — {{membership_id}}', variables: '["name","membership_id","package_name","expiry_date"]' },
  { slug: 'membership_expiry_90', name: 'Membership Expiry 90', subject: 'Your FORTI Membership Expires in 90 Days', variables: '["name","membership_id","expiry_date"]' },
  { slug: 'membership_expiry_30', name: 'Membership Expiry 30', subject: 'Your FORTI Membership Expires in 30 Days — Action Required', variables: '["name","membership_id","expiry_date"]' },
  { slug: 'membership_expiry_7', name: 'Membership Expiry 7', subject: 'Your FORTI Membership Expires in 7 Days', variables: '["name","membership_id","expiry_date"]' },
  { slug: 'membership_expired', name: 'Membership Expired', subject: 'Your FORTI Membership Has Expired', variables: '["name","membership_id"]' },
  { slug: 'renewal_confirmation', name: 'Renewal Confirmation', subject: 'FORTI Membership Renewed Successfully', variables: '["name","membership_id","new_expiry_date"]' },
  { slug: 'request_more_info', name: 'Request More Info', subject: 'Additional Information Required — {{application_id}}', variables: '["name","application_id","message"]' },
  { slug: 'password_set', name: 'Password Set', subject: 'Set Your FORTI Member Portal Password', variables: '["name","reset_link"]' },
];

(async () => {
  let inserted = 0;
  for (const t of TEMPLATES) {
    try {
      const [[existing]] = await pool.query('SELECT id FROM portal_email_templates WHERE slug=?', [t.slug]);
      if (!existing) {
        await pool.query(
          'INSERT INTO portal_email_templates (slug, name, subject, body_html, variables) VALUES (?, ?, ?, ?, ?)',
          [t.slug, t.name, t.subject, '', t.variables]
        );
        inserted++;
        console.log('Inserted:', t.slug);
      } else {
        console.log('Exists:', t.slug);
      }
    } catch (e) {
      console.error('Error:', t.slug, e.message);
    }
  }
  console.log(`Done. ${inserted} new templates inserted.`);
  process.exit(0);
})();
