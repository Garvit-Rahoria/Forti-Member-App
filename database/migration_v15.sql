-- Migration v15: Add branch_manager role support
-- ================================================================================

-- 1. Update role ENUM to include branch_manager alongside existing roles
ALTER TABLE portal_admin_users 
  MODIFY COLUMN role ENUM('super_admin','admin','manager','staff','state_manager','office_staff','branch_manager') 
  NOT NULL DEFAULT 'office_staff';

-- 2. Rename existing state_manager → branch_manager (they serve the same function)
UPDATE portal_admin_users SET role = 'branch_manager' WHERE role = 'state_manager';

-- 3. Add assigned_location_type column to allow filtering branch managers by region type
ALTER TABLE portal_admin_users 
  ADD COLUMN assigned_location_type VARCHAR(30) DEFAULT NULL AFTER assigned_country_id;

-- 4. Update branch managers with their location type based on assigned state
-- Rajasthan state_id = varies, but the state named 'Rajasthan' indicates rajasthan location
UPDATE portal_admin_users u
  JOIN states s ON s.id = u.assigned_state_id
SET u.assigned_location_type = CASE 
  WHEN LOWER(s.name) = 'rajasthan' THEN 'rajasthan' 
  ELSE 'other_states' 
END
WHERE u.role = 'branch_manager' AND u.assigned_state_id IS NOT NULL;

-- 5. Ensure fb_submissions has all needed status values
-- (already has: draft, submitted, under_review, payment_pending, payment_submitted, 
--  payment_verified, approved, rejected, active, expired)
-- Add 'pending_info' status for "Request Info" action
ALTER TABLE fb_submissions 
  MODIFY COLUMN status ENUM('draft','submitted','under_review','payment_pending','payment_submitted','payment_verified','approved','rejected','active','expired','pending_info') 
  DEFAULT 'draft';

-- 6. Add info_request_message column for branch manager's "Request Info" action
ALTER TABLE fb_submissions 
  ADD COLUMN info_request_message TEXT DEFAULT NULL AFTER review_notes;

-- Done
SELECT 'Migration v15 complete' AS status;
