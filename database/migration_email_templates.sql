CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_key VARCHAR(64) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed with required events
INSERT IGNORE INTO email_templates (event_key, subject, body, is_active) VALUES
('application_submitted', 'Application Submitted', 'Dear {{name}},\n\nYour application has been submitted successfully.\n\nMembership ID: {{membership_id}}', 1),
('under_review', 'Application Under Review', 'Dear {{name}},\n\nYour application is under review. We will notify you once a decision is made.', 1),
('approved', 'Application Approved', 'Congratulations {{name}},\n\nYour application has been approved!\nMembership ID: {{membership_id}}', 1),
('rejected', 'Application Rejected', 'Dear {{name}},\n\nWe regret to inform you that your application was rejected. Reason: {{reason}}', 1),
('payment_pending', 'Payment Pending', 'Dear {{name}},\n\nYour payment is pending. Please complete the payment to proceed.', 1),
('payment_submitted', 'Payment Submitted', 'Dear {{name}},\n\nYour payment has been submitted and is under review.', 1),
('payment_verified', 'Payment Verified', 'Dear {{name}},\n\nYour payment has been verified. Membership ID: {{membership_id}}', 1),
('member_activated', 'Membership Activated', 'Dear {{name}},\n\nYour membership is now active! Membership ID: {{membership_id}}', 1);
