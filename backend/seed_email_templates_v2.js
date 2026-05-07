/**
 * seed_email_templates_v2.js
 * Updates all email template bodies to professional, detailed content.
 * Run: node seed_email_templates_v2.js
 */
require('dotenv').config({ path: './.env' })
const mysql = require('mysql2/promise')

const DB = {
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'forti_membership',
  user:     process.env.DB_USER     || 'forti',
  password: process.env.DB_PASS     || 'forti@2026',
}

const TEMPLATES = [
  {
    event_key: 'application_submitted',
    subject: 'Your FORTI Membership Application Has Been Received — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We hope you are doing well. We are delighted to inform you that your membership application has been successfully received and registered in our system.

--------------------------------------------------
📌 Application Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Application Submitted
- Submitted On: {{date}}
--------------------------------------------------

📢 What Happens Next?

Your application is now in our queue and will be reviewed by our membership team shortly. Please allow 1–3 business days for the initial review process to be completed.

✨ What This Means for You:

Your journey with FORTI has officially begun! Upon successful review and payment verification, you will gain access to:
- FORTI Membership Certificate
- Industry networking opportunities
- Access to exclusive member events
- Directory listing and business visibility
- Support from FORTI's state and national offices

🔍 Next Steps:

1. Wait for a review notification email from our team.
2. If additional information is required, we will contact you.
3. Once reviewed, you will receive payment instructions.
4. Complete payment to proceed with activation.

You can track your application status by logging into the FORTI Member Portal at any time.

--------------------------------------------------
📞 Need Assistance?

If you have any questions about your application or our membership process, please feel free to reach out:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Our team is available Monday–Saturday, 10:00 AM – 6:00 PM IST.
--------------------------------------------------

Thank you for choosing FORTI. We look forward to welcoming you to our growing community of trade and industry professionals.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'under_review',
    subject: 'Your FORTI Application is Under Review — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are writing to update you on the progress of your membership application.

--------------------------------------------------
📌 Application Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Under Review
--------------------------------------------------

📢 Detailed Update:

Our membership review team has begun evaluating your application. This stage involves verifying the information provided, assessing eligibility, and ensuring all documentation is in order.

✨ What This Means for You:

Your application is actively being processed. Our team is working diligently to complete the review in a timely manner. This is a standard step in our membership verification process and indicates your application is progressing well.

🔍 Next Steps:

1. No immediate action is required from your side at this point.
2. If our team requires any clarification or additional documents, you will receive a separate email with specific instructions.
3. Once the review is complete, you will be notified about the next step — typically, payment instructions.
4. Please ensure your registered email remains active and accessible.

Typical review turnaround: 1–3 business days.

--------------------------------------------------
📞 Need Assistance?

If you have any urgent queries or wish to provide additional information proactively, please contact us:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Our support team is always ready to help.
--------------------------------------------------

Thank you for your patience. We appreciate your interest in FORTI and look forward to having you as a valued member.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'payment_pending',
    subject: 'Action Required: Complete Your FORTI Membership Payment — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are pleased to inform you that your FORTI membership application has been reviewed and approved for the payment stage. Your membership activation is just one step away!

--------------------------------------------------
📌 Application Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Payment Pending
- Amount Due: {{amount}}
--------------------------------------------------

📢 Detailed Update:

Your application has successfully cleared the initial review process. To proceed with activating your FORTI membership, you are now required to complete the membership fee payment.

✨ What This Means for You:

Once your payment is received and verified, your FORTI membership will be activated and you will receive:
- Official FORTI Membership Certificate
- Digital Membership ID Card
- Access to the FORTI Member Portal
- Industry networking benefits
- Access to exclusive events and resources

🔍 Next Steps:

1. Log in to the FORTI Member Portal.
2. Navigate to your dashboard and select "Complete Payment."
3. Choose your preferred payment method (UPI, Bank Transfer, etc.).
4. Complete the payment of the membership fee.
5. Upload your payment confirmation screenshot/receipt.
6. Submit your payment proof for verification.

⚠️ Important: Please complete the payment at the earliest to avoid delays in your membership activation. Incomplete applications may be subject to cancellation after 30 days.

--------------------------------------------------
📞 Need Assistance?

If you face any difficulty with the payment process or have questions about payment methods, please contact us:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

We will be happy to guide you through the payment process.
--------------------------------------------------

Thank you for your continued interest in FORTI. We look forward to activating your membership soon.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'payment_verified',
    subject: 'Payment Verified — Your FORTI Membership is Being Activated — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are pleased to inform you that your payment for the FORTI membership has been successfully verified by our team.

--------------------------------------------------
📌 Membership Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Payment Verified
- Amount Received: {{amount}}
--------------------------------------------------

📢 Detailed Update:

Your membership fee payment has been confirmed and verified. Our team is now processing the final activation of your FORTI membership. You can expect your membership to be fully activated within 1 business day.

✨ What This Means for You:

Payment verification is the final step before your full membership activation. Once activated, you will receive:
- Official FORTI Membership Certificate (digital & printable)
- Digital FORTI Membership ID Card
- Full access to the FORTI Member Portal
- Welcome email with login credentials
- Access to networking events, resources, and member directory

🔍 Next Steps:

1. No action is required from your side at this moment.
2. Our team is processing your membership activation.
3. You will receive a Welcome Email once your membership is officially active.
4. You can then log in to the FORTI Member Portal using your registered email.

--------------------------------------------------
📞 Need Assistance?

For any queries regarding your payment or membership status, please reach out:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Our team is happy to assist you Monday–Saturday, 10:00 AM – 6:00 PM IST.
--------------------------------------------------

Thank you for completing your payment. We are excited to welcome you officially to the FORTI family!

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'application_approved',
    subject: 'Congratulations! Your FORTI Membership is Approved — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are thrilled to share some wonderful news with you — your FORTI Membership Application has been officially APPROVED!

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Approved & Active
--------------------------------------------------

📢 What This Means for You:

Your membership with FORTI — the Federation of Rajasthan Trade & Industry — is now fully active. As a FORTI member, you are now part of a prestigious network of businesses, entrepreneurs, and trade professionals across Rajasthan and beyond.

✨ Benefits You Now Have Access To:

- ✅ Official FORTI Membership Certificate
- ✅ Digital FORTI Membership ID Card
- ✅ Industry networking with top professionals
- ✅ Access to member-only events, seminars, and workshops
- ✅ Directory listing for enhanced business visibility
- ✅ Support from FORTI state and national offices
- ✅ Access to trade delegations and government liaisons
- ✅ Eligibility for FORTI awards and recognitions

🔍 Next Steps:

1. Log in to the FORTI Member Portal using your registered email.
2. Complete your member profile for full directory listing.
3. Download your Membership Certificate and ID Card from your dashboard.
4. Explore upcoming events and networking opportunities.
5. Connect with fellow FORTI members in your industry.

Member Portal: {{portal_url}}

--------------------------------------------------
📞 Need Assistance?

For any queries, suggestions, or support, please contact us:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Our dedicated membership support team is always ready to assist you.
--------------------------------------------------

Once again, congratulations and a very warm welcome to the FORTI family! We look forward to supporting your professional and business growth.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'approved',
    subject: 'Congratulations! Your FORTI Membership is Approved — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are delighted to inform you that your FORTI membership application has been reviewed and officially APPROVED.

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Status: Approved
--------------------------------------------------

📢 Detailed Update:

After careful review of your application and payment verification, our membership committee has approved your FORTI membership. This is an important milestone — you are now an official member of the Federation of Rajasthan Trade & Industry.

✨ What This Means for You:

As a FORTI member, you will enjoy:
- Access to the FORTI Member Portal
- Membership Certificate and digital ID card
- Networking opportunities with industry leaders
- Invitations to exclusive FORTI events and trade fairs
- Business support and advocacy services

🔍 Next Steps:

1. Log in to your FORTI Member Portal account.
2. Complete your member profile if not already done.
3. Download your certificate and membership card.
4. Join our member community and start networking.

--------------------------------------------------
📞 Need Assistance?

📧 Email: info@forti.in
📞 Phone: +91-9000000000
--------------------------------------------------

Thank you for joining FORTI. We are committed to supporting your business journey.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'rejected',
    subject: 'Update on Your FORTI Membership Application — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We sincerely appreciate your interest in becoming a member of FORTI and the time you invested in submitting your application.

--------------------------------------------------
📌 Application Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Current Status: Application Reviewed — Not Approved
--------------------------------------------------

📢 Detailed Update:

After a thorough review of your membership application, we regret to inform you that your application could not be approved at this time.

Reason for Non-Approval: {{reason}}

We understand this may be disappointing, and we want to assure you that this decision was made after careful consideration.

✨ What This Means for You:

This decision does not permanently bar you from FORTI membership. You are encouraged to re-apply after addressing the reason mentioned above.

🔍 Next Steps:

1. Review the reason provided above carefully.
2. Gather any additional documents or information required.
3. Ensure all provided information is accurate and up to date.
4. Re-submit your application through the FORTI Membership Portal after making the necessary corrections.
5. If you believe this decision was made in error, please contact our membership team with supporting documentation.

We encourage you to reach out to us if you need guidance on re-applying or if you have any questions about the requirements.

--------------------------------------------------
📞 Need Assistance?

Our membership team is available to help you understand the requirements and guide you through the re-application process:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

We are here to help — Monday to Saturday, 10:00 AM – 6:00 PM IST.
--------------------------------------------------

Thank you for your interest in FORTI. We hope to welcome you as a member in the future.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'application_rejected',
    subject: 'Update on Your FORTI Membership Application — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

Thank you for your interest in FORTI membership and for taking the time to submit your application.

--------------------------------------------------
📌 Application Details:
- Applicant Name: {{name}}
- Membership ID: {{membership_id}}
- Status: Not Approved at This Time
--------------------------------------------------

📢 Detailed Update:

After careful review of your application, we regret to inform you that we are unable to approve your membership at this time.

Reason: {{reason}}

We want to be transparent with you and provide you with the information needed to understand this decision.

✨ What You Can Do:

This is not a permanent decision. You are welcome to:
- Review and address the concerns raised
- Gather additional supporting documents
- Re-apply with updated and accurate information

🔍 Next Steps:

1. Carefully review the reason for non-approval above.
2. Contact our membership team for detailed guidance.
3. Prepare the necessary corrections or additional documents.
4. Submit a fresh application through the portal.

--------------------------------------------------
📞 Need Assistance?

📧 Email: info@forti.in
📞 Phone: +91-9000000000
--------------------------------------------------

We appreciate your interest in FORTI and hope to see a successful application from you in the near future.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'otp_verification',
    subject: 'Your FORTI Member Portal Verification Code',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

You are receiving this email because a login or verification request was initiated for your FORTI Member Portal account.

--------------------------------------------------
📌 Account Details:
- Registered Name: {{name}}
- Registered Email: {{email}}
- Request Type: One-Time Password (OTP) Verification
--------------------------------------------------

🔐 Your One-Time Password (OTP):

    ┌─────────────────────────┐
    │                         │
    │      {{otp}}            │
    │                         │
    └─────────────────────────┘

⚠️ Important Security Information:
- This OTP is valid for {{otp_expiry}} minutes only.
- Do NOT share this OTP with anyone, including FORTI staff.
- FORTI will never ask you for your OTP over phone or email.
- If you did not initiate this request, please ignore this email and your account will remain secure.

✨ What This Means for You:

This OTP is your secure access key to the FORTI Member Portal. Once verified, you will be able to access your member dashboard, track your application status, download certificates, and manage your membership.

🔍 Next Steps:

1. Enter the OTP above in the verification screen.
2. Complete the login process.
3. Access your FORTI Member Dashboard.
4. If the OTP has expired, request a new one from the portal.

--------------------------------------------------
📞 Need Assistance?

If you did not request this OTP or suspect unauthorized access, please contact us immediately:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Our security team will help secure your account promptly.
--------------------------------------------------

Thank you for using the FORTI Member Portal securely.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'member_activated',
    subject: 'Welcome to FORTI! Your Membership is Now Active — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

🎉 Congratulations! Your FORTI membership is now officially ACTIVE. We are absolutely delighted to welcome you to the FORTI family!

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Membership Status: Active
- Valid Until: {{expiry_date}}
--------------------------------------------------

📢 Your Membership is Live!

As of today, you are an official member of the Federation of Rajasthan Trade & Industry — a premier body representing businesses, entrepreneurs, and trade professionals across the region.

✨ Your FORTI Membership Benefits:

- ✅ Official FORTI Membership Certificate (downloadable from portal)
- ✅ Digital FORTI Membership ID Card
- ✅ Full access to the FORTI Member Portal
- ✅ Priority invitations to FORTI events, trade fairs, and seminars
- ✅ Business directory listing for enhanced visibility
- ✅ Industry networking with 1000+ members
- ✅ Access to government liaison services
- ✅ Eligibility for FORTI awards and recognition programs
- ✅ Business support, mentoring, and advisory services

🔍 Getting Started — Next Steps:

1. 🔑 Log in to the FORTI Member Portal: {{portal_url}}
   (Use your registered email and OTP to log in)
2. 📋 Complete your member profile for full directory listing visibility.
3. 📜 Download your Membership Certificate and ID Card from your dashboard.
4. 📅 Check the Events section for upcoming networking opportunities.
5. 🤝 Connect with fellow FORTI members in your industry.

--------------------------------------------------
📞 Need Assistance?

Our dedicated member support team is here to help you make the most of your FORTI membership:
📧 Email: info@forti.in
📞 Phone: +91-9000000000

Available Monday–Saturday, 10:00 AM – 6:00 PM IST.
--------------------------------------------------

Once again, a very warm welcome to the FORTI community. We are committed to supporting your professional growth and business success.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'payment_verified_activation',
    subject: 'Payment Confirmed & Membership Activated — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

We are delighted to confirm that your payment has been successfully verified and your FORTI membership is now ACTIVE!

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Status: Active
- Payment Status: Verified & Confirmed
--------------------------------------------------

📢 Detailed Update:

Your membership fee payment has been confirmed by our finance team, and your FORTI membership account has been activated immediately. You now have full access to all member benefits and resources.

✨ What You Can Access Now:

- Official Membership Certificate
- Digital Membership Card
- Member Portal Dashboard
- Event registrations and networking
- Business directory listing

🔍 Next Steps:

1. Log in to the FORTI Member Portal: {{portal_url}}
2. Download your certificate and ID card.
3. Update your profile for directory listing.
4. Explore upcoming events and opportunities.

--------------------------------------------------
📞 Need Assistance?

📧 Email: info@forti.in
📞 Phone: +91-9000000000
--------------------------------------------------

Welcome to FORTI! We look forward to a long and fruitful association with you.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'membership_expiry_30',
    subject: 'Your FORTI Membership Expires in 30 Days — Renew Now — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

This is a friendly reminder that your FORTI membership is approaching its renewal date.

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Expiry Date: {{expiry_date}}
- Days Until Expiry: 30 Days
--------------------------------------------------

📢 Renewal Reminder:

Your FORTI membership will expire in approximately 30 days. To ensure uninterrupted access to all membership benefits and to maintain your active status in the FORTI community, we strongly encourage you to renew your membership before the expiry date.

✨ What Happens If You Don't Renew:

- Loss of access to the FORTI Member Portal
- Removal from the FORTI member directory
- Ineligibility for member-exclusive events
- Your Membership Certificate validity expires

🔍 How to Renew:

1. Log in to the FORTI Member Portal: {{portal_url}}
2. Navigate to "Renew Membership" on your dashboard.
3. Select your preferred membership duration.
4. Complete the renewal payment.
5. Your membership will be extended immediately upon payment verification.

Early renewal ensures continuity of your membership number and benefits without interruption.

--------------------------------------------------
📞 Need Assistance with Renewal?

📧 Email: info@forti.in
📞 Phone: +91-9000000000
--------------------------------------------------

We value your continued association with FORTI and look forward to your membership renewal.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
  {
    event_key: 'membership_expiry_7',
    subject: 'URGENT: Your FORTI Membership Expires in 7 Days — {{membership_id}}',
    body: `Dear {{name}},

Greetings from FORTI (Federation of Rajasthan Trade & Industry)!

⚠️ URGENT: Your FORTI membership is expiring in just 7 days. Immediate action is required to avoid a lapse in your membership.

--------------------------------------------------
📌 Membership Details:
- Member Name: {{name}}
- Membership ID: {{membership_id}}
- Expiry Date: {{expiry_date}}
- Days Until Expiry: 7 Days
--------------------------------------------------

📢 Final Renewal Reminder:

Your FORTI membership is about to expire. After the expiry date, your account will be deactivated and you will lose access to all member benefits until you renew.

🔍 Renew Now — It Takes Just Minutes:

1. Log in to the FORTI Member Portal: {{portal_url}}
2. Click "Renew Membership" on your dashboard.
3. Choose your renewal duration.
4. Make the payment and upload confirmation.
5. Done — your membership continues seamlessly!

--------------------------------------------------
📞 Need Help? Contact Us Immediately:

📧 Email: info@forti.in
📞 Phone: +91-9000000000
--------------------------------------------------

Please do not let your hard-earned FORTI membership lapse. Renew today and continue enjoying all the benefits.

Warm Regards,
FORTI Team
Federation of Rajasthan Trade & Industry`,
  },
]

async function run() {
  const conn = await mysql.createConnection(DB)
  console.log('Connected to database.')

  let updated = 0
  let inserted = 0

  for (const tpl of TEMPLATES) {
    // Check if template exists
    const [existing] = await conn.query(
      'SELECT id FROM email_templates WHERE event_key = ? LIMIT 1',
      [tpl.event_key]
    )

    if (existing.length > 0) {
      await conn.query(
        'UPDATE email_templates SET subject = ?, body = ?, is_active = 1 WHERE event_key = ?',
        [tpl.subject, tpl.body, tpl.event_key]
      )
      console.log(`✅ Updated: ${tpl.event_key}`)
      updated++
    } else {
      await conn.query(
        'INSERT INTO email_templates (event_key, subject, body, is_active) VALUES (?, ?, ?, 1)',
        [tpl.event_key, tpl.subject, tpl.body]
      )
      console.log(`➕ Inserted: ${tpl.event_key}`)
      inserted++
    }
  }

  await conn.end()
  console.log(`\nDone! Updated: ${updated}, Inserted: ${inserted}`)
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })
