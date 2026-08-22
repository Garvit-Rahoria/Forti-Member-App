const templates = [
  {
    event_key: 'otp_verification',
    subject: 'Your FORTI Membership Portal — OTP Verification',
    body: `
<p class="greeting">Hello {{name}},</p>
<p>Use the verification code below to verify your identity on the FORTI Membership Portal.</p>
<div class="otp-box">
  <div class="otp">{{otp}}</div>
  <p class="otp-hint">Valid for <strong>{{expiryTime}} minutes</strong> &bull; One-time use only</p>
</div>
<div class="warning-box">
  <strong>Security tip:</strong> Never share this OTP with anyone. FORTI staff will never ask for your OTP.
</div>
<p style="font-size:13px;color:#6b7280">If you did not request this OTP, you can safely ignore this email or contact support.</p>
    `.trim()
  },
  {
    event_key: 'application_submitted',
    subject: 'Application Received — FORTI Membership',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>Thank you for applying for FORTI Membership. We have successfully received your application. Our team is now reviewing your submission.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-review">Under Review</span></span></div>
  <div class="info-row"><span class="info-label">Processing Time</span><span class="info-value">2–3 Business Days</span></div>
</div>
<p>You will receive an email notification once your application is processed. Please keep your reference ID safe for future correspondence.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">If you have questions about your application, contact our support team with your reference ID.</p>
    `.trim()
  },
  {
    event_key: 'admin_new_application',
    subject: 'New Membership Application — FORTI Portal',
    body: `
<p class="greeting">New Membership Application</p>
<p>A new membership application has been submitted and is awaiting review.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Applicant</span><span class="info-value">{{name}}</span></div>
  <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{email}}</span></div>
  <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
</div>
<p>Please log in to the admin portal to review and process this application.</p>
    `.trim()
  },
  {
    event_key: 'application_under_review',
    subject: 'Your FORTI Membership Application is Under Review',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>We wanted to keep you updated — your FORTI Membership application is currently <strong>under review</strong> by our team.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-review">Under Review</span></span></div>
  <div class="info-row"><span class="info-label">Processing Time</span><span class="info-value">2–3 Business Days</span></div>
</div>
<p>Our team is verifying your documents and details. You will receive another email once a decision has been made. No action is needed from you at this time.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">You can track your application status at any time using your reference ID. If you have questions, contact our support team.</p>
    `.trim()
  },
  {
    event_key: 'application_approved',
    subject: 'Congratulations! Your FORTI Membership is Approved',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>We are thrilled to inform you that your FORTI Membership application has been <strong>approved</strong>. Welcome to the FORTI community!</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6">{{membershipId}}</span></div>
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
<p style="font-size:12px;color:#6b7280">Please retain your Membership ID <strong>{{membershipId}}</strong> for all future correspondence with FORTI.</p>
    `.trim()
  },
  {
    event_key: 'application_rejected',
    subject: 'Update on Your FORTI Membership Application',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>We regret to inform you that your FORTI Membership application (Reference: <strong>{{membershipId}}</strong>) could not be approved at this time after review by our team.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Reason</span><span class="info-value">{{reason}}</span></div>
</div>
<p>If you believe this decision was made in error, or if you have additional supporting documents to provide, we encourage you to contact our office. We will be happy to assist you through the process.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">You may reapply after addressing the reason mentioned above. Please quote your reference ID <strong>{{membershipId}}</strong> in all communications.</p>
    `.trim()
  },
  {
    event_key: 'payment_submitted',
    subject: 'Payment Submitted — FORTI Membership',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>Thank you! We have received your payment details and they are currently <strong>under verification</strong> by our team.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Amount</span><span class="info-value">{{currency}} {{amount}}</span></div>
  <div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">{{transactionId}}</span></div>
  <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-pending">Under Verification</span></span></div>
</div>
<p>Our team will verify your payment within <strong>1–2 business days</strong>. You will receive a membership activation email once verified.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">Contact our support team with your Reference ID if you have any queries regarding your payment submission.</p>
    `.trim()
  },
  {
    event_key: 'admin_payment_submitted',
    subject: 'Payment Pending Verification — FORTI Portal',
    body: `
<p class="greeting">Payment Pending Verification</p>
<p>A member has submitted payment proof and is awaiting verification.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Applicant</span><span class="info-value">{{name}}</span></div>
  <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{email}}</span></div>
  <div class="info-row"><span class="info-label">Reference ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Amount</span><span class="info-value">{{currency}} {{amount}}</span></div>
  <div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">{{transactionId}}</span></div>
</div>
<p>Please log in to the admin portal to verify this payment and process the application.</p>
    `.trim()
  },
  {
    event_key: 'payment_confirmed',
    subject: 'Payment Verified — FORTI Membership Activation in Progress',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>Great news! Your payment for FORTI Membership has been <strong>verified and confirmed</strong> by our team.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Amount Paid</span><span class="info-value">{{currency}} {{amount}}</span></div>
  <div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">{{transactionId}}</span></div>
  <div class="info-row"><span class="info-label">Payment Status</span><span class="info-value"><span class="badge badge-active">Verified</span></span></div>
  <div class="info-row"><span class="info-label">Next Step</span><span class="info-value">Membership Activation</span></div>
</div>
<p>Our team is now reviewing your application for final activation. You will receive a separate email with your <strong>Membership Certificate</strong> and <strong>Digital ID Card</strong> once your membership is fully activated.</p>
<div class="warning-box" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">
  &#10003; Payment received &mdash; Activation typically takes <strong>1 business day</strong>.
</div>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">For any queries, please contact our office quoting your Reference ID <strong>{{membershipId}}</strong>.</p>
    `.trim()
  },
  {
    event_key: 'membership_confirmed',
    subject: 'Welcome to FORTI, {{name}}! Your Membership is Now Active',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>We are delighted to welcome you to the <strong>FORTI Family</strong>! Your membership is now fully active and ready to use.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6;font-size:16px">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-active">Active Member</span></span></div>
</div>
<p>Access your exclusive Member Dashboard to:</p>
<ul class="feature-list">
  <li>Download your official Membership Certificate</li>
  <li>Download your Digital Membership ID Card</li>
  <li>View &amp; download payment invoices</li>
  <li>Manage your membership renewal</li>
</ul>
<center><a href="{{loginUrl}}" class="btn">Access Member Dashboard &rarr;</a></center>
<p>To log in, enter your registered email address and we will send you a secure OTP. No password required.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">Please keep your Membership ID <strong>{{membershipId}}</strong> safe for all official correspondence with FORTI.</p>
    `.trim()
  },
  {
    event_key: 'invoice_generated',
    subject: 'Tax Invoice {{invoiceNumber}} — FORTI Membership',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>Your official tax invoice has been generated for your FORTI Membership payment.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Invoice Number</span><span class="info-value" style="font-family:monospace">{{invoiceNumber}}</span></div>
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Amount</span><span class="info-value">{{currency}} {{amount}}</span></div>
</div>
<center><a href="{{invoiceUrl}}" class="btn">Download Invoice (PDF) &rarr;</a></center>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">Please keep this invoice for your records. Contact us for any queries regarding this invoice.</p>
    `.trim()
  },
  {
    event_key: 'certificate_generated',
    subject: 'Your FORTI Membership Certificate & ID Card Are Ready',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>Your FORTI Membership Certificate and Digital ID Card have been successfully generated and are ready for download.</p>
<div class="info-box">
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace;color:#5b21b6">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Documents Ready</span><span class="info-value">Certificate &amp; ID Card</span></div>
</div>
<ul class="feature-list">
  <li>Official Membership Certificate (PDF)</li>
  <li>Digital Membership ID Card (PDF)</li>
  <li>Tax Invoice</li>
</ul>
<center><a href="{{dashboardUrl}}" class="btn">Download Documents &rarr;</a></center>
    `.trim()
  },
  {
    event_key: 'renewal_reminder',
    subject: 'Action Required: FORTI Membership Expiring',
    body: `
<p class="greeting">Dear <strong>{{name}}</strong>,</p>
<p>This is a reminder that your FORTI Membership is expiring soon. Please renew before the expiry date to continue enjoying uninterrupted benefits.</p>
<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin:18px 0;text-align:center">
  <p style="margin:0;font-size:13px;color:#9a3412;font-weight:600">Your membership expires on</p>
  <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#9a3412">{{formattedDate}}</p>
  <p style="margin:4px 0 0;font-size:12px;color:#9a3412">{{daysLeft}} days remaining</p>
</div>
<div class="info-box">
  <div class="info-row"><span class="info-label">Membership ID</span><span class="info-value" style="font-family:monospace">{{membershipId}}</span></div>
  <div class="info-row"><span class="info-label">Expiry Date</span><span class="info-value">{{formattedDate}}</span></div>
</div>
<p>Log in to your Member Dashboard and apply for renewal before the expiry date.</p>
<hr class="divider">
<p style="font-size:12px;color:#6b7280">If you have already renewed your membership, please disregard this email. For any queries, contact our office quoting your Membership ID.</p>
    `.trim()
  }
];

module.exports = templates;
