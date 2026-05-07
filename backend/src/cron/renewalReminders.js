const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendRenewalReminder } = require('../utils/email');
const { ensureAutoRenewals } = require('../utils/autoRenewals');

/**
 * Scheduled job: Check for expiring memberships and send reminder emails.
 * Runs daily at 9:00 AM.
 * Sends reminders at 30 days, 15 days, 7 days, 3 days, and 1 day before expiry.
 */
function startRenewalReminderCron() {
  // Run daily at 9:00 AM server time
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running renewal reminder check...');
    try {
      const created = await ensureAutoRenewals({ force: true });
      if (created > 0) {
        console.log(`[CRON] Auto-created ${created} renewal record(s)`);
      }

      const REMINDER_DAYS = [30, 15, 7, 3, 1];

      for (const days of REMINDER_DAYS) {
        const [expiring] = await pool.query(
          `SELECT s.id, s.applicant_name, s.applicant_email, s.membership_id, s.expiry_date,
                  ma.email AS member_email
           FROM fb_submissions s
           LEFT JOIN member_accounts ma ON ma.submission_id = s.id
           WHERE s.status = 'active'
             AND s.member_status = 'active'
             AND s.expiry_date IS NOT NULL
             AND DATE(s.expiry_date) = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
          [days]
        );

        for (const member of expiring) {
          const email = member.member_email || member.applicant_email;
          if (!email) continue;

          try {
            await sendRenewalReminder({
              to: email,
              name: member.applicant_name,
              membershipId: member.membership_id,
              expiryDate: member.expiry_date,
              daysLeft: days,
            });

            // Log the reminder sent
            await pool.query(
              `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, details)
               VALUES (0, 'RENEWAL_REMINDER_SENT', 'submissions', ?, 'system', ?)`,
              [String(member.id), JSON.stringify({ days_left: days, email })]
            ).catch(() => {}); // Non-critical if audit table doesn't have details column

            console.log(`[CRON] Reminder sent: ${email} (${days} days left)`);
          } catch (emailErr) {
            console.error(`[CRON] Failed to send reminder to ${email}:`, emailErr.message);
          }
        }

        if (expiring.length > 0) {
          console.log(`[CRON] Sent ${expiring.length} renewal reminder(s) for ${days}-day expiry`);
        }
      }

      // Also mark expired memberships
      const [expired] = await pool.query(
        `UPDATE fb_submissions
         SET member_status = 'expired'
         WHERE status = 'active'
           AND member_status = 'active'
           AND expiry_date IS NOT NULL
           AND expiry_date < CURDATE()`
      );

      if (expired.affectedRows > 0) {
        console.log(`[CRON] Marked ${expired.affectedRows} membership(s) as expired`);
      }

      console.log('[CRON] Renewal reminder check complete');
    } catch (err) {
      console.error('[CRON] Renewal reminder error:', err.message);
    }
  });

  console.log('📅 Renewal reminder cron job scheduled (daily at 9:00 AM)');

  ensureAutoRenewals({ force: true })
    .then(created => {
      if (created > 0) console.log(`[CRON] Initial auto-renewal sync created ${created} record(s)`);
    })
    .catch(err => console.error('[CRON] Initial auto-renewal sync error:', err.message));
}

module.exports = { startRenewalReminderCron };
