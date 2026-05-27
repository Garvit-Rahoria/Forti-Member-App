# FORTI Member Application - Complete QA Test Workflow

## 📋 Table of Contents
1. [Application Overview](#application-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Phase 1: Authentication & Access Control](#phase-1-authentication--access-control)
4. [Phase 2: Admin Dashboard & Configuration](#phase-2-admin-dashboard--configuration)
5. [Phase 3: Forms & Application Management](#phase-3-forms--application-management)
6. [Phase 4: Membership & Member Management](#phase-4-membership--member-management)
7. [Phase 5: Payment Processing](#phase-5-payment-processing)
8. [Phase 6: Renewal Management](#phase-6-renewal-management)
9. [Phase 7: Reporting & Analytics](#phase-7-reporting--analytics)
10. [Phase 8: Member Portal](#phase-8-member-portal)
11. [Phase 9: Certificates & Documentation](#phase-9-certificates--documentation)
12. [Phase 10: Advanced Features](#phase-10-advanced-features)
13. [Phase 11: Security & Compliance](#phase-11-security--compliance)
14. [Phase 12: Performance & Load Testing](#phase-12-performance--load-testing)

---

## 🎯 Application Overview

**FORTI Member Management System** is a comprehensive platform for managing organizational memberships with features including:
- Multi-role user management (Super Admin, Admin, Manager, Staff)
- Dynamic application forms
- Member lifecycle management (Application → Approval → Active → Renewal)
- Payment processing with multiple methods
- Certificate management
- Email notifications
- Audit trails
- Reporting and analytics

---

## ⚙️ Test Environment Setup

### Prerequisites
- Application running on:
  - Frontend: `http://localhost:3000`
  - Backend API: `http://localhost:5001`
  - Database: PostgreSQL on `localhost:5435`
- Database: `forti_membership`
- User: `forti` / Password: `forti@2026`

### Database Access
```bash
docker exec -it forti_db psql -U forti -d forti_membership
```

### Reset Test Data
```bash
# If needed, reset database to clean state
docker exec forti_db psql -U forti -d forti_membership -c "TRUNCATE TABLE fb_submissions CASCADE;"
```

### Test Accounts Available
```
Admin Account:
- Email: admin@forti.org
- Password: Admin@12345
- Role: Super Admin
- URL: http://localhost:3000/admin
```

---

# 🔐 PHASE 1: AUTHENTICATION & ACCESS CONTROL

## Test Case 1.1: Admin Login
**Objective**: Verify admin user can authenticate successfully

**Steps**:
1. Navigate to `http://localhost:3000/admin`
2. Enter Email: `admin@forti.org`
3. Enter Password: `Admin@12345`
4. Click "Login"

**Expected Results**:
- ✅ Login successful
- ✅ Redirected to Admin Dashboard
- ✅ Session token received and stored in localStorage
- ✅ User details displayed (name, email, role)

**Acceptance Criteria**:
- [ ] Login page loads without errors
- [ ] Credentials accepted
- [ ] Dashboard accessible
- [ ] JWT token valid in browser DevTools → Application → LocalStorage

---

## Test Case 1.2: Login Validation
**Objective**: Verify login validation and error handling

**Steps**:
1. Go to Admin login page
2. Test with invalid email: `invalid@email.com` / Password: `Admin@12345`
3. Test with correct email but wrong password: `admin@forti.org` / `WrongPassword`
4. Test with empty fields
5. Test with invalid email format

**Expected Results**:
- ✅ Invalid credentials show error message
- ✅ Empty fields show validation error
- ✅ Invalid email format rejected
- ✅ User not logged in (no token created)
- ✅ No personal data leaked in error messages

**Acceptance Criteria**:
- [ ] Appropriate error messages displayed
- [ ] No tokens issued for failed login attempts
- [ ] Sensitive information not exposed in errors

---

## Test Case 1.3: Session Management
**Objective**: Verify session handling and timeout

**Steps**:
1. Login successfully as admin
2. Check browser console for JWT token
3. Navigate away and back to dashboard
4. Wait 30+ minutes (or monitor session expiry)
5. Try to perform an action

**Expected Results**:
- ✅ Session persists on page refresh
- ✅ Token stored securely in localStorage
- ✅ Session expires after configured timeout
- ✅ User redirected to login after session expiry
- ✅ "Session expired" message shown

**Acceptance Criteria**:
- [ ] Token persists across page refreshes
- [ ] Automatic logout after inactivity
- [ ] Clear session expiry message
- [ ] Redirect to login page on expiry

---

## Test Case 1.4: Access Control - Role-Based Permissions
**Objective**: Verify different user roles have appropriate access

**Steps**:
1. Login as Super Admin
2. Access all admin modules (Settings, Users, Forms, etc.)
3. Verify Super Admin can create/edit/delete any resource
4. Test API endpoint access with different JWT tokens (if multiple users exist)

**Expected Results**:
- ✅ Super Admin has full access to all modules
- ✅ Admin modules visible in sidebar
- ✅ Settings, Users, Forms management accessible
- ✅ Each role sees only permitted menu items

**Acceptance Criteria**:
- [ ] All admin sections accessible with Super Admin role
- [ ] Menu items match user role permissions
- [ ] API calls rejected if user lacks permission

---

## Test Case 1.5: Logout Functionality
**Objective**: Verify user can safely logout

**Steps**:
1. Login successfully
2. Click logout button (top-right user menu)
3. Verify session cleared
4. Try to access admin dashboard
5. Try to access protected API directly

**Expected Results**:
- ✅ Logout button accessible
- ✅ Token removed from localStorage
- ✅ Redirected to login page
- ✅ Cannot access protected routes
- ✅ API calls return 401 Unauthorized

**Acceptance Criteria**:
- [ ] Logout successful
- [ ] localStorage cleared
- [ ] Protected routes inaccessible
- [ ] API calls fail with 401 status

---

## Test Case 1.6: Password Reset
**Objective**: Verify password reset functionality

**Steps**:
1. Go to login page → "Forgot Password" link
2. Enter email: `admin@forti.org`
3. Check for reset email (check email inbox or logs)
4. Click reset link in email
5. Set new password
6. Login with new password

**Expected Results**:
- ✅ Password reset link sent
- ✅ Link valid and usable
- ✅ Can set new password
- ✅ Old password no longer works
- ✅ Can login with new password

**Acceptance Criteria**:
- [ ] Reset email received
- [ ] Reset link functional
- [ ] New password accepted
- [ ] Old password rejected on next login

---

# 📊 PHASE 2: ADMIN DASHBOARD & CONFIGURATION

## Test Case 2.1: Dashboard Overview
**Objective**: Verify admin dashboard loads and displays key metrics

**Steps**:
1. Login as admin
2. Observe dashboard main page
3. Check for key widgets/cards:
   - Total Members
   - Active Memberships
   - Pending Applications
   - Revenue (if applicable)
   - Recent Activity

**Expected Results**:
- ✅ Dashboard loads without errors
- ✅ All metric widgets display
- ✅ Numbers are accurate and current
- ✅ Charts render properly (if applicable)

**Acceptance Criteria**:
- [ ] Dashboard loads successfully
- [ ] All widgets visible and populated
- [ ] Data matches database records
- [ ] Charts display correctly

---

## Test Case 2.2: Settings Configuration
**Objective**: Verify admin can configure system settings

**Steps**:
1. Navigate to Admin → Settings
2. Locate different setting sections:
   - General Settings (organization name, contact info)
   - Email Settings (SMTP configuration)
   - Payment Settings (gateway configuration)
   - Currency Settings
   - Application Settings
3. Edit a non-critical setting (e.g., contact phone)
4. Save changes
5. Reload page and verify persistence

**Expected Results**:
- ✅ Settings page loads
- ✅ All setting sections visible
- ✅ Changes saved successfully
- ✅ Success message displayed
- ✅ Changes persist after page reload
- ✅ No errors on save

**Acceptance Criteria**:
- [ ] Settings page accessible
- [ ] All configurations editable
- [ ] Changes persist in database
- [ ] Success notification shown

---

## Test Case 2.3: Email Templates Management
**Objective**: Verify admin can manage email templates

**Steps**:
1. Navigate to Admin → Settings → Email Templates
2. View list of existing templates:
   - Welcome Email
   - Application Approved
   - Payment Confirmation
   - Renewal Reminder
   - etc.
3. Click on one template to edit
4. Modify template content/subject
5. Save changes
6. Send test email to verify format

**Expected Results**:
- ✅ Email templates list loads
- ✅ All templates visible and editable
- ✅ Template editor shows HTML/text options
- ✅ Changes saved successfully
- ✅ Test email sent with new template
- ✅ Email received with correct formatting

**Acceptance Criteria**:
- [ ] Templates list accessible
- [ ] Template editor functional
- [ ] Changes persist
- [ ] Test email delivery successful
- [ ] Correct template applied in email

---

## Test Case 2.4: Currency Settings
**Objective**: Verify currency configuration

**Steps**:
1. Navigate to Settings → Currency Settings
2. View configured currencies
3. Set primary/default currency
4. Add new currency (if allowed)
5. Save and verify

**Expected Results**:
- ✅ Currency list displays
- ✅ Can set default currency
- ✅ Currency symbols correct
- ✅ Exchange rates (if applicable) display
- ✅ Changes saved

**Acceptance Criteria**:
- [ ] Currency settings accessible
- [ ] Default currency can be set
- [ ] Changes persist
- [ ] Correct currency used in pricing

---

## Test Case 2.5: System Audit Logs
**Objective**: Verify audit trail functionality

**Steps**:
1. Navigate to Admin → Audit
2. View audit log entries
3. Look for entries showing:
   - User actions (create, update, delete)
   - Timestamp of actions
   - User who performed action
   - What was changed
4. Filter/search audit logs by date or user

**Expected Results**:
- ✅ Audit logs load and display
- ✅ All required fields present
- ✅ Entries chronologically ordered
- ✅ Filter/search functional
- ✅ Sensitive actions logged

**Acceptance Criteria**:
- [ ] Audit logs accessible
- [ ] Complete action history visible
- [ ] Timestamps accurate
- [ ] Filter works correctly

---

# 📋 PHASE 3: FORMS & APPLICATION MANAGEMENT

## Test Case 3.1: View Application Forms
**Objective**: Verify admin can view and manage application forms

**Steps**:
1. Navigate to Admin → Forms
2. View list of application forms
3. Check form details:
   - Form name
   - Form type (Individual, Organization, etc.)
   - Status (Active/Inactive)
   - Last modified date
   - Number of fields
4. Click on a form to view/edit

**Expected Results**:
- ✅ Forms list loads successfully
- ✅ All forms displayed with details
- ✅ Form status shows correctly
- ✅ Can view form details by clicking

**Acceptance Criteria**:
- [ ] Forms list accessible
- [ ] All required form information visible
- [ ] Form detail view functional

---

## Test Case 3.2: Create/Edit Application Form
**Objective**: Verify admin can create and modify application forms

**Steps**:
1. Navigate to Forms → Add New Form (or edit existing)
2. Fill in form details:
   - Form name: `Test Member Application`
   - Form type: Select type
   - Description: Add description
3. Add form sections (e.g., "Personal Details", "Contact Information")
4. Add fields to each section:
   - Field type (Text, Email, Phone, Dropdown, etc.)
   - Field name and label
   - Validation rules
   - Required/Optional
5. Set field order
6. Save form

**Expected Results**:
- ✅ Form creation page loads
- ✅ All input fields functional
- ✅ Can add multiple sections
- ✅ Can add fields to sections
- ✅ Field validation rules apply
- ✅ Form saves successfully
- ✅ Form appears in list after creation

**Acceptance Criteria**:
- [ ] Form creation functional
- [ ] Sections and fields added successfully
- [ ] Form saved to database
- [ ] Form visible in list

---

## Test Case 3.3: Form Fields Management
**Objective**: Verify field management within forms

**Steps**:
1. Open a form for editing
2. Add different field types:
   - Text Input
   - Email
   - Phone
   - Dropdown
   - Checkbox
   - Date
   - File Upload
3. Set field properties:
   - Label
   - Placeholder
   - Required/Optional
   - Validation rules
   - Help text
4. Reorder fields (drag & drop)
5. Delete a field
6. Save changes

**Expected Results**:
- ✅ All field types available
- ✅ Field properties configurable
- ✅ Reordering works (drag & drop)
- ✅ Field deletion works
- ✅ Changes saved
- ✅ No orphaned references after deletion

**Acceptance Criteria**:
- [ ] All field types available
- [ ] Properties editable
- [ ] Reordering functional
- [ ] Deletion safe and complete
- [ ] Changes persist

---

## Test Case 3.4: Form Sections
**Objective**: Verify form sections can be organized

**Steps**:
1. Create or edit form
2. Add sections: "Personal Details", "Address", "Documents"
3. Organize sections (reorder if possible)
4. Add fields to each section
5. View form structure
6. Edit/delete section

**Expected Results**:
- ✅ Sections created successfully
- ✅ Fields properly grouped in sections
- ✅ Section order logical
- ✅ Sections display correctly in form preview

**Acceptance Criteria**:
- [ ] Sections organized properly
- [ ] Fields grouped correctly
- [ ] Structure logical and clear

---

## Test Case 3.5: Form Dropdowns & Options
**Objective**: Verify dropdown fields can be configured with options

**Steps**:
1. Edit/create form with dropdown field
2. Add dropdown options:
   - Option 1: "Organization Type: Individual"
   - Option 2: "Organization Type: Corporate"
   - Option 3: "Organization Type: NGO"
3. Set default value (if applicable)
4. Save and test in preview

**Expected Results**:
- ✅ Dropdown options added successfully
- ✅ All options visible when opened
- ✅ Can select option
- ✅ Default value selected by default
- ✅ Value saved correctly

**Acceptance Criteria**:
- [ ] Dropdown options configurable
- [ ] All options visible
- [ ] Default value works
- [ ] Selection saves correctly

---

## Test Case 3.6: Form Preview & Testing
**Objective**: Verify form displays correctly to end users

**Steps**:
1. Create/edit application form
2. Preview form
3. Fill all fields with valid data:
   - Text fields
   - Email field (valid format)
   - Phone field (valid format)
   - Date field (valid date)
   - File upload
4. Submit form
5. Verify submission received

**Expected Results**:
- ✅ Form preview displays correctly
- ✅ All fields render properly
- ✅ Field labels clear and visible
- ✅ Validation works (e.g., email format)
- ✅ File upload functional
- ✅ Form submission successful
- ✅ Submission stored in database

**Acceptance Criteria**:
- [ ] Form displays correctly
- [ ] All fields functional
- [ ] Validation applied
- [ ] Submission successful
- [ ] Data stored in database

---

## Test Case 3.7: Form Validation Rules
**Objective**: Verify form field validation

**Steps**:
1. Open form for submission (member-facing)
2. Try to submit with invalid data:
   - Email field: `not-an-email`
   - Phone field: `abc` (invalid)
   - Required fields: Leave empty
   - Number field: Enter text
3. Verify validation errors shown
4. Correct errors and submit

**Expected Results**:
- ✅ Validation errors shown inline
- ✅ Error messages clear
- ✅ Cannot submit with invalid data
- ✅ Valid submission succeeds
- ✅ All validation rules respected

**Acceptance Criteria**:
- [ ] Validation errors displayed
- [ ] Clear error messages
- [ ] Invalid data rejected
- [ ] Valid data accepted

---

# 👥 PHASE 4: MEMBERSHIP & MEMBER MANAGEMENT

## Test Case 4.1: Submit Membership Application
**Objective**: Verify members can submit application

**Steps**:
1. Navigate to `http://localhost:3000` (Member Portal)
2. Look for "Apply for Membership" or similar button
3. Complete the application form:
   - Personal Details: Name, Email, Phone
   - Organization Details: Type, Name
   - Address Information
   - Document Upload: Certificate/Proof
4. Accept terms & conditions
5. Submit form

**Expected Results**:
- ✅ Form loads without errors
- ✅ All required fields visible
- ✅ File upload functional
- ✅ Form submission successful
- ✅ Confirmation message shown
- ✅ Submission stored in database
- ✅ Unique ID/Reference number provided

**Acceptance Criteria**:
- [ ] Form accessible and functional
- [ ] All fields work correctly
- [ ] File upload successful
- [ ] Submission confirmed
- [ ] Reference ID provided
- [ ] Data in database

---

## Test Case 4.2: View Submitted Applications
**Objective**: Verify admin can view member applications

**Steps**:
1. Login as admin
2. Navigate to Admin → Applications
3. View list of all submissions:
   - Applicant name
   - Email
   - Application date
   - Status (Pending, Approved, Rejected)
   - Reference ID
4. Click on application to view details

**Expected Results**:
- ✅ Applications list loads
- ✅ All applications displayed
- ✅ Status shows correctly
- ✅ Can view application details
- ✅ Submitted data visible

**Acceptance Criteria**:
- [ ] Applications list accessible
- [ ] All submissions visible
- [ ] Status accurate
- [ ] Detail view functional

---

## Test Case 4.3: Application Approval Workflow
**Objective**: Verify admin can approve/reject applications

**Steps**:
1. Navigate to Admin → Applications
2. Select a Pending application
3. Review all details
4. Click "Approve" button
5. Add approval notes (optional)
6. Confirm approval
7. Verify status changed to "Approved"
8. Check if welcome email sent to applicant

**Expected Results**:
- ✅ Application detail page loads
- ✅ All information displayed clearly
- ✅ Approve/Reject buttons visible and functional
- ✅ Can add approval notes
- ✅ Status updated to "Approved"
- ✅ Email sent to applicant
- ✅ Member account created

**Acceptance Criteria**:
- [ ] Approval workflow functional
- [ ] Status updated
- [ ] Email sent
- [ ] Member account created
- [ ] Audit log entry recorded

---

## Test Case 4.4: Application Rejection
**Objective**: Verify admin can reject applications

**Steps**:
1. Navigate to Admin → Applications
2. Select a Pending application
3. Click "Reject" button
4. Enter rejection reason
5. Confirm rejection
6. Verify status changed to "Rejected"
7. Check if rejection email sent

**Expected Results**:
- ✅ Rejection reason required
- ✅ Status updated to "Rejected"
- ✅ Email sent with reason
- ✅ Applicant can reapply (if allowed)

**Acceptance Criteria**:
- [ ] Rejection workflow functional
- [ ] Reason recorded
- [ ] Status updated
- [ ] Email sent with reason

---

## Test Case 4.5: View Member Directory
**Objective**: Verify admin can view all members

**Steps**:
1. Navigate to Admin → Members
2. View member list with:
   - Member name
   - Membership ID
   - Status (Active, Inactive, Expired, Suspended)
   - Membership type/package
   - Expiry date
   - Contact info
3. Search members by name/ID
4. Filter by status
5. Sort by columns

**Expected Results**:
- ✅ Member list loads
- ✅ All members displayed
- ✅ Search functional
- ✅ Filters work
- ✅ Sorting works
- ✅ Pagination works (if many members)

**Acceptance Criteria**:
- [ ] Member list accessible
- [ ] Search functional
- [ ] Filters work
- [ ] Sorting works
- [ ] Pagination works

---

## Test Case 4.6: Member Profile Management
**Objective**: Verify admin can view and edit member profiles

**Steps**:
1. Navigate to Admin → Members
2. Click on member to view profile
3. View member details:
   - Personal information
   - Organization information
   - Membership details
   - Payment history
   - Activity history
4. Edit member information (if allowed)
5. Update profile
6. Verify changes saved

**Expected Results**:
- ✅ Member profile loads
- ✅ All information displayed
- ✅ Can edit editable fields
- ✅ Changes saved successfully
- ✅ Audit log updated
- ✅ Member receives notification (if configured)

**Acceptance Criteria**:
- [ ] Profile view functional
- [ ] Edit functionality works
- [ ] Changes persist
- [ ] Audit trail updated

---

## Test Case 4.7: Member Status Management
**Objective**: Verify admin can change member status

**Steps**:
1. Select active member
2. Change status to:
   - Suspend (temporarily inactive)
   - Deactivate (inactive)
   - Reactivate (back to active)
3. Add reason for status change
4. Save
5. Verify new status applied

**Expected Results**:
- ✅ Status change options visible
- ✅ Reason can be recorded
- ✅ Status updated immediately
- ✅ Member unable to access if suspended/deactivated
- ✅ Notifications sent to member
- ✅ Audit log updated

**Acceptance Criteria**:
- [ ] Status change functional
- [ ] Changes take effect
- [ ] Notifications sent
- [ ] Audit trail recorded

---

## Test Case 4.8: Member Communication
**Objective**: Verify admin can send messages to members

**Steps**:
1. Navigate to Admin → Members
2. Select member
3. Look for "Send Message" or "Send Email" option
4. Compose message:
   - Subject
   - Body
   - Select template (optional)
5. Send message
6. Verify delivery

**Expected Results**:
- ✅ Message compose interface loads
- ✅ Templates available
- ✅ Message sent successfully
- ✅ Member receives email
- ✅ Sent message logged

**Acceptance Criteria**:
- [ ] Message compose functional
- [ ] Email sent successfully
- [ ] Member receives email
- [ ] Sent message logged

---

## Test Case 4.9: Bulk Member Operations
**Objective**: Verify admin can perform bulk operations on members

**Steps**:
1. Navigate to Admin → Members
2. Select multiple members (checkboxes)
3. Look for bulk action options:
   - Send message to all
   - Export data
   - Change status
4. Perform bulk action
5. Verify all selected members affected

**Expected Results**:
- ✅ Bulk selection works
- ✅ Bulk actions available
- ✅ All selected members processed
- ✅ Confirmation message shown
- ✅ Operation logged

**Acceptance Criteria**:
- [ ] Bulk selection functional
- [ ] Bulk actions work
- [ ] All records affected
- [ ] Operation logged

---

## Test Case 4.10: Member Import/Export
**Objective**: Verify member data import/export functionality

**Steps**:
1. Navigate to Admin → Members
2. Look for "Export" button
3. Export members to CSV/Excel
4. Verify data exported correctly:
   - All members included
   - All columns present
   - Data accurate
5. Look for "Import" option
6. Prepare import file (if available)
7. Import new members
8. Verify imported members in system

**Expected Results**:
- ✅ Export generates file
- ✅ File contains correct data
- ✅ File format correct (CSV/Excel)
- ✅ Import accepts valid file
- ✅ Imported members added to system
- ✅ Validation on import

**Acceptance Criteria**:
- [ ] Export functional
- [ ] Export data accurate
- [ ] Import functional
- [ ] Imported data correct
- [ ] Duplicate prevention

---

# 💳 PHASE 5: PAYMENT PROCESSING

## Test Case 5.1: Membership Packages
**Objective**: Verify membership packages are configured

**Steps**:
1. Navigate to Admin → Packages
2. View list of membership packages:
   - Basic Plan
   - Professional Plan
   - Enterprise Plan
   - etc.
3. View package details:
   - Name and description
   - Price/Cost
   - Duration (1 month, 1 year, etc.)
   - Features included
   - Status (Active/Inactive)
4. Click on package to edit

**Expected Results**:
- ✅ Packages list loads
- ✅ All packages displayed
- ✅ Details accurate
- ✅ Can edit packages

**Acceptance Criteria**:
- [ ] Packages list accessible
- [ ] All packages visible
- [ ] Details complete
- [ ] Edit functional

---

## Test Case 5.2: Create/Edit Package
**Objective**: Verify admin can create new membership packages

**Steps**:
1. Navigate to Admin → Packages
2. Click "Add New Package"
3. Fill in package details:
   - Package Name: `Premium Plus`
   - Description: `Enhanced membership with priority support`
   - Price: `$49.99`
   - Duration: `12 months`
   - Features: Select applicable features
   - Status: Active
4. Save package
5. Verify package appears in list

**Expected Results**:
- ✅ Package creation form loads
- ✅ All fields functional
- ✅ Price calculated correctly
- ✅ Duration options available
- ✅ Package saved successfully
- ✅ Package visible in list

**Acceptance Criteria**:
- [ ] Package creation functional
- [ ] All fields editable
- [ ] Package saved
- [ ] Visible in package list

---

## Test Case 5.3: Payment Methods Configuration
**Objective**: Verify payment methods are configured

**Steps**:
1. Navigate to Admin → Settings → Payment Methods
2. View available payment methods:
   - Credit Card
   - Debit Card
   - Bank Transfer
   - Digital Wallet (if applicable)
   - etc.
3. Check if methods are enabled/disabled
4. Verify payment gateway configuration (Stripe, PayPal, etc.)

**Expected Results**:
- ✅ Payment methods list loads
- ✅ All configured methods visible
- ✅ Enable/disable status shown
- ✅ Gateway configuration accessible

**Acceptance Criteria**:
- [ ] Payment methods list visible
- [ ] Configuration accessible
- [ ] Methods can be enabled/disabled

---

## Test Case 5.4: Payment Processing - Member Application
**Objective**: Verify payment during membership application

**Steps**:
1. Navigate to member application form
2. Complete form to final step (payment)
3. Verify payment details:
   - Amount to be paid
   - Package selected
   - Payment method options
4. Select payment method (Credit Card)
5. Process payment with test card:
   - Card Number: `4111111111111111` (test)
   - Exp: `12/25`
   - CVC: `123`
6. Submit payment

**Expected Results**:
- ✅ Payment screen loads
- ✅ Amount calculated correctly
- ✅ Payment methods available
- ✅ Payment gateway loads
- ✅ Test payment accepted
- ✅ Payment confirmation received
- ✅ Application marked as paid

**Acceptance Criteria**:
- [ ] Payment screen functional
- [ ] Amount correct
- [ ] Payment accepted
- [ ] Confirmation received
- [ ] Status updated to paid

---

## Test Case 5.5: Payment History & Invoices
**Objective**: Verify payment records and invoices

**Steps**:
1. Navigate to Admin → Payments
2. View payment list:
   - Payment ID
   - Member name
   - Amount
   - Payment method
   - Status (Completed, Pending, Failed)
   - Transaction date
3. Click on payment to view details
4. Look for invoice/receipt download option
5. Download invoice as PDF

**Expected Results**:
- ✅ Payment list loads
- ✅ All payments displayed
- ✅ Payment details accessible
- ✅ Invoice/receipt downloadable
- ✅ PDF generated correctly

**Acceptance Criteria**:
- [ ] Payment list accessible
- [ ] Payment details visible
- [ ] Invoice downloadable
- [ ] PDF correct format

---

## Test Case 5.6: Failed Payment Handling
**Objective**: Verify system handles failed payments

**Steps**:
1. Attempt payment with declined card:
   - Card Number: `4000000000000002` (test - declined)
2. Submit payment
3. Observe error message
4. Retry with valid card
5. Verify retry successful

**Expected Results**:
- ✅ Payment declined message shown
- ✅ Clear error explanation
- ✅ Can retry payment
- ✅ Retry successful with valid card
- ✅ No duplicate charges
- ✅ Transaction logged

**Acceptance Criteria**:
- [ ] Error handled gracefully
- [ ] Clear error message
- [ ] Retry functional
- [ ] No duplicate charges

---

## Test Case 5.7: Refund Processing
**Objective**: Verify refund functionality

**Steps**:
1. Navigate to Admin → Payments
2. Find completed payment
3. Look for "Refund" option
4. Click refund button
5. Enter refund amount (full or partial)
6. Add refund reason
7. Process refund
8. Verify refund status updated

**Expected Results**:
- ✅ Refund option available
- ✅ Amount calculation correct
- ✅ Refund processed successfully
- ✅ Original payment marked as refunded
- ✅ Member receives refund notification
- ✅ Refund transaction logged

**Acceptance Criteria**:
- [ ] Refund workflow functional
- [ ] Amount correct
- [ ] Status updated
- [ ] Notification sent
- [ ] Transaction logged

---

## Test Case 5.8: Payment Reports
**Objective**: Verify payment analytics and reports

**Steps**:
1. Navigate to Admin → Reports → Payments
2. View payment summary:
   - Total revenue
   - By payment method
   - By membership package
   - Date range analysis
3. Filter by date range:
   - Last 7 days
   - Last 30 days
   - Custom range
4. Export report

**Expected Results**:
- ✅ Report loads with data
- ✅ Calculations accurate
- ✅ Filters work
- ✅ Charts display (if applicable)
- ✅ Report exportable

**Acceptance Criteria**:
- [ ] Report accessible
- [ ] Data accurate
- [ ] Filters functional
- [ ] Export works

---

# 🔄 PHASE 6: RENEWAL MANAGEMENT

## Test Case 6.1: Membership Renewal Process
**Objective**: Verify members can renew expiring memberships

**Steps**:
1. Login as member with expiring membership
2. Navigate to member dashboard
3. Look for "Renew Membership" option
4. Click renew button
5. Verify renewal details:
   - Current expiry date
   - New expiry date after renewal
   - Renewal cost
   - Same package or option to change
6. Select payment method
7. Process payment
8. Confirm renewal successful

**Expected Results**:
- ✅ Renewal option visible if membership expiring
- ✅ Renewal details accurate
- ✅ Payment gateway works
- ✅ Renewal processed successfully
- ✅ New expiry date set correctly
- ✅ Status remains "Active"
- ✅ Confirmation email sent

**Acceptance Criteria**:
- [ ] Renewal option visible
- [ ] Details accurate
- [ ] Payment successful
- [ ] Status updated
- [ ] Email confirmation sent

---

## Test Case 6.2: Renewal Reminders
**Objective**: Verify automatic renewal reminder emails

**Steps**:
1. Check database for member with membership expiring soon
2. Look for membership with expiry date:
   - 30 days from today
   - 15 days from today
   - 7 days from today
   - 3 days from today
   - 1 day from today
3. Check for emails in email log/queue
4. Verify reminder email sent at correct intervals

**Expected Results**:
- ✅ Reminder emails sent automatically
- ✅ Sent at configured intervals (30, 15, 7, 3, 1 days)
- ✅ Email contains renewal link
- ✅ Email includes current expiry date
- ✅ Email includes renewal cost

**Acceptance Criteria**:
- [ ] Reminder emails sent
- [ ] Correct interval
- [ ] Email contains necessary info
- [ ] Email deliverable

---

## Test Case 6.3: Admin Renewal Management
**Objective**: Verify admin can manage renewals

**Steps**:
1. Navigate to Admin → Renewals
2. View renewal list:
   - Member name
   - Current expiry date
   - Days until expiry
   - Status (Not Started, In Progress, Completed, Expired)
3. Filter by status
4. Click on renewal to view details
5. Look for manual renewal option for overdue members

**Expected Results**:
- ✅ Renewals list accessible
- ✅ All renewals displayed
- ✅ Status accurate
- ✅ Can view renewal details
- ✅ Can process renewal manually

**Acceptance Criteria**:
- [ ] Renewal list accessible
- [ ] Status accurate
- [ ] Admin can manually renew

---

## Test Case 6.4: Auto-Renewal Feature
**Objective**: Verify automatic renewal capability (if enabled)

**Steps**:
1. Member with auto-renewal enabled (check settings)
2. Wait for membership to reach renewal date
3. Verify automatic renewal processed
4. Check payment made
5. Verify new expiry date set

**Expected Results**:
- ✅ Auto-renewal executes on expiry date
- ✅ Payment charged from stored payment method
- ✅ Member notified of auto-renewal
- ✅ New membership period active
- ✅ Transaction logged

**Acceptance Criteria**:
- [ ] Auto-renewal functional
- [ ] Payment processed
- [ ] Status updated
- [ ] Member notified

---

## Test Case 6.5: Expired Membership Handling
**Objective**: Verify expired membership status handling

**Steps**:
1. Create scenario where membership expires (past expiry date)
2. Attempt to access member portal with expired membership
3. Check for expiry notification
4. Attempt to use member benefits
5. Verify access restricted appropriately

**Expected Results**:
- ✅ Member notified of expiration
- ✅ Status changes to "Expired"
- ✅ Member benefits limited/disabled
- ✅ Renewal option prominently displayed
- ✅ Access to key features restricted

**Acceptance Criteria**:
- [ ] Status updated to expired
- [ ] Member notified
- [ ] Access restricted
- [ ] Renewal option visible

---

# 📈 PHASE 7: REPORTING & ANALYTICS

## Test Case 7.1: Member Reports
**Objective**: Verify member statistics and reports

**Steps**:
1. Navigate to Admin → Reports
2. Look for Member Reports section
3. View reports:
   - Total Members (all time)
   - Active Members (current)
   - New Members (this month)
   - By Membership Type
   - By Organization Type
   - Geographic Distribution
4. Filter by date range
5. Export report

**Expected Results**:
- ✅ Report page loads
- ✅ All metrics calculated correctly
- ✅ Charts/graphs display
- ✅ Filters work
- ✅ Export functional

**Acceptance Criteria**:
- [ ] Reports accessible
- [ ] Data accurate
- [ ] Filters work
- [ ] Export works

---

## Test Case 7.2: Revenue Reports
**Objective**: Verify revenue analytics

**Steps**:
1. Navigate to Admin → Reports → Revenue
2. View revenue summary:
   - Total Revenue
   - By Payment Method
   - By Membership Package
   - By Time Period (Weekly, Monthly, Yearly)
3. View trends (if applicable)
4. Filter and analyze data
5. Export report

**Expected Results**:
- ✅ Revenue data displayed
- ✅ Calculations accurate
- ✅ Breakdowns by category shown
- ✅ Trends visible
- ✅ Export works

**Acceptance Criteria**:
- [ ] Revenue report accessible
- [ ] Data accurate
- [ ] Trends visible
- [ ] Export functional

---

## Test Case 7.3: Application Reports
**Objective**: Verify application statistics

**Steps**:
1. Navigate to Admin → Reports → Applications
2. View application metrics:
   - Total Applications (all time)
   - Pending Applications
   - Approved Applications
   - Rejected Applications
   - Approval Rate
   - Average Processing Time
3. Filter by date range or status
4. View trend data

**Expected Results**:
- ✅ Application data loaded
- ✅ Metrics calculated
- ✅ Status breakdown visible
- ✅ Trends shown
- ✅ Filters work

**Acceptance Criteria**:
- [ ] Report accessible
- [ ] Data accurate
- [ ] Filters functional
- [ ] Trends visible

---

## Test Case 7.4: User Activity Reports
**Objective**: Verify user activity tracking

**Steps**:
1. Navigate to Admin → Reports → Activity (or Audit)
2. View activity metrics:
   - Login counts
   - Most active members
   - Feature usage
   - Download/export counts
3. View activity timeline
4. Identify trends

**Expected Results**:
- ✅ Activity data tracked
- ✅ Metrics calculated
- ✅ Timeline shows activity
- ✅ User actions logged

**Acceptance Criteria**:
- [ ] Activity tracked
- [ ] Data displayed
- [ ] Timeline visible

---

## Test Case 7.5: Export Reports
**Objective**: Verify report export functionality

**Steps**:
1. Generate any report
2. Look for export button
3. Select format:
   - CSV
   - Excel
   - PDF
4. Export report
5. Verify file generated
6. Open file and verify content

**Expected Results**:
- ✅ Export formats available
- ✅ File generated successfully
- ✅ File format correct
- ✅ Data complete and accurate
- ✅ File downloadable

**Acceptance Criteria**:
- [ ] Export formats available
- [ ] File generated
- [ ] Content accurate
- [ ] File opens correctly

---

# 📱 PHASE 8: MEMBER PORTAL

## Test Case 8.1: Member Portal Access
**Objective**: Verify member can access member portal

**Steps**:
1. Navigate to `http://localhost:3000`
2. Look for member login/registration
3. If new member:
   - Complete membership application (as per Phase 4.1)
   - Receive approval
4. Login with credentials
5. Navigate portal

**Expected Results**:
- ✅ Portal homepage loads
- ✅ Application option visible
- ✅ Login option visible
- ✅ Can login after approval
- ✅ Portal content accessible

**Acceptance Criteria**:
- [ ] Portal accessible
- [ ] Login works
- [ ] Dashboard visible

---

## Test Case 8.2: Member Dashboard
**Objective**: Verify member dashboard displays key information

**Steps**:
1. Login as member
2. View member dashboard
3. Check for key widgets:
   - Membership status
   - Expiry date
   - Next renewal date
   - Recent activity
   - Quick actions (renew, update profile, etc.)

**Expected Results**:
- ✅ Dashboard loads
- ✅ All widgets visible
- ✅ Information accurate and current
- ✅ Quick actions available

**Acceptance Criteria**:
- [ ] Dashboard functional
- [ ] Information current
- [ ] Quick actions visible

---

## Test Case 8.3: Member Profile Management
**Objective**: Verify member can update their profile

**Steps**:
1. Login as member
2. Navigate to Profile section
3. View current profile information:
   - Personal details
   - Organization information
   - Contact information
4. Edit a field (e.g., phone number)
5. Save changes
6. Verify changes saved and reflected

**Expected Results**:
- ✅ Profile view loads
- ✅ All information displayed
- ✅ Can edit allowed fields
- ✅ Changes saved successfully
- ✅ Changes reflected immediately
- ✅ Confirmation message shown

**Acceptance Criteria**:
- [ ] Profile view functional
- [ ] Edit works
- [ ] Changes persist
- [ ] Confirmation shown

---

## Test Case 8.4: Member Application History
**Objective**: Verify member can view their application history

**Steps**:
1. Login as member
2. Navigate to Applications or History section
3. View submitted applications:
   - Submission date
   - Status
   - Current membership (if approved)
4. Click to view application details
5. View submitted data and documents

**Expected Results**:
- ✅ Application history loads
- ✅ All applications listed
- ✅ Status current
- ✅ Details accessible
- ✅ Documents viewable

**Acceptance Criteria**:
- [ ] History accessible
- [ ] Status accurate
- [ ] Details visible
- [ ] Documents accessible

---

## Test Case 8.5: Member Payment History
**Objective**: Verify member can view payment records

**Steps**:
1. Login as member
2. Navigate to Payments or Invoices section
3. View payment history:
   - Payment date
   - Amount
   - Payment method
   - Status
   - Receipt
4. Click payment to view invoice
5. Download invoice/receipt

**Expected Results**:
- ✅ Payment history loads
- ✅ All payments listed
- ✅ Details accurate
- ✅ Invoice downloadable
- ✅ Receipt PDF generated

**Acceptance Criteria**:
- [ ] Payment history accessible
- [ ] Details accurate
- [ ] Invoice downloadable
- [ ] PDF correct

---

## Test Case 8.6: Member Renewal from Portal
**Objective**: Verify member can renew from portal

**Steps**:
1. Login as member with expiring membership
2. Navigate to Renewals/Membership section
3. Look for renewal option
4. Click renew button
5. Review renewal details
6. Process payment
7. Confirm renewal

**Expected Results**:
- ✅ Renewal option visible
- ✅ Details displayed
- ✅ Can proceed to payment
- ✅ Payment accepted
- ✅ Renewal confirmed
- ✅ New expiry date updated

**Acceptance Criteria**:
- [ ] Renewal accessible
- [ ] Payment works
- [ ] Status updated
- [ ] Confirmation received

---

## Test Case 8.7: Member Document Management
**Objective**: Verify member can manage their documents

**Steps**:
1. Login as member
2. Navigate to Documents section (if available)
3. View uploaded documents
4. Download document
5. Look for upload option
6. Upload new document
7. Verify document saved

**Expected Results**:
- ✅ Documents section accessible
- ✅ Can view documents
- ✅ Download functional
- ✅ Can upload new documents
- ✅ Upload validation works
- ✅ File stored

**Acceptance Criteria**:
- [ ] Documents accessible
- [ ] Download works
- [ ] Upload works
- [ ] Storage successful

---

## Test Case 8.8: Membership Status Lookup
**Objective**: Verify public membership status lookup

**Steps**:
1. Navigate to member portal home page
2. Look for "Check Membership Status" or similar
3. Enter reference ID (from application submission)
4. Click search/lookup
5. Verify status displayed without login

**Expected Results**:
- ✅ Lookup page loads
- ✅ Can search by reference ID
- ✅ Status displayed correctly
- ✅ Personal data not exposed
- ✅ Works without authentication

**Acceptance Criteria**:
- [ ] Lookup functional
- [ ] Status accurate
- [ ] Security maintained
- [ ] No auth required

---

# 📜 PHASE 9: CERTIFICATES & DOCUMENTATION

## Test Case 9.1: Certificate Generation
**Objective**: Verify certificate generation for approved members

**Steps**:
1. Navigate to Admin → Certificates
2. View certificates list:
   - Member name
   - Certificate type
   - Issue date
   - Validity period
3. Look for member with membership
4. Click to generate or view certificate

**Expected Results**:
- ✅ Certificates section loads
- ✅ Can view issued certificates
- ✅ Can generate new certificate
- ✅ Certificate generates successfully

**Acceptance Criteria**:
- [ ] Certificates accessible
- [ ] Generation functional
- [ ] Certificate valid

---

## Test Case 9.2: Certificate Download
**Objective**: Verify certificate can be downloaded

**Steps**:
1. Navigate to member certificate
2. Look for Download button
3. Click download
4. Verify PDF generated
5. Open PDF and verify content:
   - Member name
   - Certificate type
   - Issue date
   - Organization name
   - Signature/seal (if applicable)

**Expected Results**:
- ✅ PDF generated
- ✅ All content visible
- ✅ Format professional
- ✅ File downloadable

**Acceptance Criteria**:
- [ ] PDF generated
- [ ] Content complete
- [ ] Download works

---

## Test Case 9.3: Certificate Verification
**Objective**: Verify certificate can be verified publicly

**Steps**:
1. Member downloads certificate
2. Certificate contains verification code/URL
3. Navigate to verification link
4. Enter certificate details
5. Verify certificate validity shown

**Expected Results**:
- ✅ Verification page loads
- ✅ Can verify certificate
- ✅ Certificate details displayed
- ✅ Validity status shown

**Acceptance Criteria**:
- [ ] Verification functional
- [ ] Details display
- [ ] Status accurate

---

## Test Case 9.4: Certificate Templates
**Objective**: Verify certificate templates can be customized

**Steps**:
1. Navigate to Admin → Certificates → Templates
2. View available templates
3. Select template to edit
4. Customize template:
   - Organization name placement
   - Logo position
   - Text content
   - Colors
5. Save template
6. Generate certificate with new template

**Expected Results**:
- ✅ Templates list loads
- ✅ Templates editable
- ✅ Changes apply to generated certificates
- ✅ Professional appearance

**Acceptance Criteria**:
- [ ] Templates accessible
- [ ] Edit functional
- [ ] Changes apply
- [ ] Output professional

---

# 🔧 PHASE 10: ADVANCED FEATURES

## Test Case 10.1: Organizational Structure
**Objective**: Verify organizational hierarchy/wings management

**Steps**:
1. Navigate to Admin → Organization → Wings (or similar)
2. View organizational wings/departments:
   - Wing name
   - Parent wing (if applicable)
   - Members count
   - Status
3. Look for hierarchy view (tree structure)
4. Add new wing (if allowed)

**Expected Results**:
- ✅ Wings list loads
- ✅ Hierarchy displayed
- ✅ Can manage wings
- ✅ Members assigned to wings

**Acceptance Criteria**:
- [ ] Wings accessible
- [ ] Hierarchy visible
- [ ] Management functional

---

## Test Case 10.2: Positions/Roles Management
**Objective**: Verify member positions/roles

**Steps**:
1. Navigate to Admin → Organization → Positions
2. View available positions:
   - President
   - Vice President
   - Secretary
   - Treasurer
   - Member
   - etc.
3. Assign member to position
4. View member with assigned position

**Expected Results**:
- ✅ Positions list loads
- ✅ Can assign positions
- ✅ Member profile shows position
- ✅ Reports show positional data

**Acceptance Criteria**:
- [ ] Positions accessible
- [ ] Assignment functional
- [ ] Display correct

---

## Test Case 10.3: Email Template System
**Objective**: Verify dynamic email template system

**Steps**:
1. Navigate to Admin → Email Templates
2. View list of all templates
3. Select template to preview
4. Look for template variables (placeholders):
   - {member_name}
   - {membership_id}
   - {expiry_date}
   - {organization_name}
5. Send test email
6. Verify variables replaced with actual data

**Expected Results**:
- ✅ Templates list loads
- ✅ Variables documented
- ✅ Test email sent
- ✅ Variables correctly replaced
- ✅ Email formatting preserved

**Acceptance Criteria**:
- [ ] Templates accessible
- [ ] Variables work
- [ ] Test email sent
- [ ] Formatting correct

---

## Test Case 10.4: Blog/News Management
**Objective**: Verify blog/news feature

**Steps**:
1. Navigate to Admin → Blog
2. View published blog posts
3. Click "New Post"
4. Create blog post:
   - Title
   - Category
   - Content (rich text editor)
   - Featured image
   - Publish date
   - Status (Draft/Published)
5. Publish post
6. Navigate to public blog (if available)
7. Verify post visible

**Expected Results**:
- ✅ Blog section accessible
- ✅ Can create new posts
- ✅ Rich editor functional
- ✅ Posts published successfully
- ✅ Public view shows posts
- ✅ Formatting preserved

**Acceptance Criteria**:
- [ ] Blog accessible
- [ ] Post creation works
- [ ] Published correctly
- [ ] Public view functional

---

## Test Case 10.5: Notification System
**Objective**: Verify notification delivery

**Steps**:
1. Perform action that triggers notification:
   - Submit application
   - Approve application
   - Process payment
   - Renew membership
2. Check notification preferences (Admin Settings)
3. View notification log
4. Verify email/SMS sent (check email inbox)

**Expected Results**:
- ✅ Notification preferences configurable
- ✅ Notifications sent on triggers
- ✅ Member receives email
- ✅ Notification log recorded
- ✅ Can disable notifications

**Acceptance Criteria**:
- [ ] Notifications sent
- [ ] Email received
- [ ] Log recorded
- [ ] Preferences honored

---

## Test Case 10.6: Two-Factor Authentication (if available)
**Objective**: Verify 2FA security feature

**Steps**:
1. Enable 2FA in security settings
2. Choose 2FA method (Email, SMS, Authenticator app)
3. Logout and login again
4. After credentials, receive 2FA code
5. Enter code to complete login
6. Verify login successful

**Expected Results**:
- ✅ 2FA can be enabled
- ✅ Methods available
- ✅ Code sent to selected method
- ✅ Code validation works
- ✅ Login completed after 2FA

**Acceptance Criteria**:
- [ ] 2FA functional
- [ ] Code delivery works
- [ ] Code validation works
- [ ] Login successful

---

## Test Case 10.7: API Rate Limiting
**Objective**: Verify API rate limiting

**Steps**:
1. Use Postman/API client to test API
2. Make rapid requests to API endpoint
3. After limit exceeded, receive 429 error
4. Wait for rate limit reset
5. Request again successful

**Expected Results**:
- ✅ API rate limiting enforced
- ✅ 429 status code returned when limited
- ✅ Clear error message provided
- ✅ Rate limit resets after timeout
- ✅ Different endpoints have different limits

**Acceptance Criteria**:
- [ ] Rate limiting enforced
- [ ] Correct HTTP status
- [ ] Rate limit info in headers
- [ ] Reset functional

---

# 🔒 PHASE 11: SECURITY & COMPLIANCE

## Test Case 11.1: Password Security
**Objective**: Verify password security requirements

**Steps**:
1. Create new user (if available) or reset password
2. Attempt password with:
   - Too short (< 8 chars): `Pass123`
   - No uppercase: `password123!`
   - No lowercase: `PASSWORD123!`
   - No numbers: `Password!`
   - No special characters: `Password123`
3. Set valid password: `SecurePass@123`
4. Verify acceptance

**Expected Results**:
- ✅ Password requirements enforced
- ✅ Clear requirement messages
- ✅ Valid password accepted
- ✅ Password complexity required

**Acceptance Criteria**:
- [ ] Requirements enforced
- [ ] Validation clear
- [ ] Secure password required

---

## Test Case 11.2: SQL Injection Prevention
**Objective**: Verify application is protected against SQL injection

**Steps**:
1. In any search/input field, try SQL injection payload:
   - `' OR '1'='1`
   - `admin' --`
   - `'; DROP TABLE members; --`
2. Submit and observe response
3. Check database - verify no data modified

**Expected Results**:
- ✅ Injection attempt fails
- ✅ Application doesn't crash
- ✅ Error message shown (generic)
- ✅ Database unchanged
- ✅ Attempt logged

**Acceptance Criteria**:
- [ ] Injection prevented
- [ ] App stable
- [ ] DB safe
- [ ] Logged

---

## Test Case 11.3: Cross-Site Scripting (XSS) Prevention
**Objective**: Verify XSS protection

**Steps**:
1. In member name field or similar, enter:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
2. Submit form
3. Navigate back to view submitted data
4. Verify script doesn't execute

**Expected Results**:
- ✅ Script doesn't execute
- ✅ Harmful content escaped/sanitized
- ✅ Content displayed as text
- ✅ Application doesn't execute code

**Acceptance Criteria**:
- [ ] XSS prevented
- [ ] Content safe
- [ ] Script not executed

---

## Test Case 11.4: CSRF Protection
**Objective**: Verify CSRF token protection

**Steps**:
1. Open browser DevTools → Network tab
2. Perform action (e.g., submit form)
3. Look for CSRF token in request:
   - Request headers
   - Form data
4. Try to submit form without token (if possible)
5. Verify request rejected

**Expected Results**:
- ✅ CSRF token present in forms
- ✅ Token included in requests
- ✅ Invalid/missing token rejected
- ✅ Token unique per session

**Acceptance Criteria**:
- [ ] CSRF token present
- [ ] Validation works
- [ ] Invalid token rejected

---

## Test Case 11.5: Data Privacy & GDPR
**Objective**: Verify data handling and privacy compliance

**Steps**:
1. Check for privacy policy link
2. Review privacy policy
3. Look for data handling practices:
   - Data collection disclosure
   - User consent
   - Data retention policy
   - User rights (access, delete, export)
4. Request member data export
5. Request data deletion

**Expected Results**:
- ✅ Privacy policy clear and accessible
- ✅ Consent mechanisms present
- ✅ Data export functional
- ✅ Deletion functional
- ✅ Compliance features implemented

**Acceptance Criteria**:
- [ ] Policy present
- [ ] Export works
- [ ] Deletion works
- [ ] Compliant

---

## Test Case 11.6: HTTPS/SSL
**Objective**: Verify secure communication

**Steps**:
1. Navigate to application
2. Check browser address bar for HTTPS
3. Click lock icon
4. Verify SSL certificate details:
   - Valid certificate
   - Not expired
   - Correct domain
5. Check for mixed content warning

**Expected Results**:
- ✅ HTTPS enabled
- ✅ Valid SSL certificate
- ✅ Lock icon visible
- ✅ No mixed content warnings
- ✅ Secure cookies (HTTPS only)

**Acceptance Criteria**:
- [ ] HTTPS active
- [ ] Valid certificate
- [ ] No warnings

---

## Test Case 11.7: Authentication Token Security
**Objective**: Verify JWT token security

**Steps**:
1. Login successfully
2. Open DevTools → Application → LocalStorage
3. Examine JWT token
4. Try to modify token (change a character)
5. Refresh page or make API call
6. Verify modified token rejected

**Expected Results**:
- ✅ Token stored securely
- ✅ Token has expiry
- ✅ Invalid/tampered token rejected
- ✅ Token signature verified
- ✅ Automatic re-authentication on expiry

**Acceptance Criteria**:
- [ ] Token secure
- [ ] Tampering detected
- [ ] Expiry enforced

---

## Test Case 11.8: Sensitive Data Masking
**Objective**: Verify sensitive information is masked

**Steps**:
1. View member details (payment info, SSN if collected)
2. Check admin logs for sensitive data
3. Export member data
4. Look for:
   - Credit card numbers masked (****-****-****-1234)
   - Email masked in logs (a***@example.com)
   - Phone masked (***-***-1234)
5. Verify raw data not exposed

**Expected Results**:
- ✅ Sensitive data masked in UI
- ✅ Credit cards partially hidden
- ✅ Logs don't contain full sensitive data
- ✅ Only authorized users see full data

**Acceptance Criteria**:
- [ ] Data masked appropriately
- [ ] Full data hidden from logs
- [ ] Authorized access only

---

# ⚡ PHASE 12: PERFORMANCE & LOAD TESTING

## Test Case 12.1: Page Load Performance
**Objective**: Verify acceptable page load times

**Steps**:
1. Open DevTools → Performance tab
2. Navigate to main pages:
   - Admin Dashboard
   - Member list
   - Application list
   - Reports page
3. Check load time (should be < 3 seconds)
4. Check First Contentful Paint (< 1.5 seconds)
5. Check Time to Interactive (< 3 seconds)

**Expected Results**:
- ✅ Pages load in < 3 seconds
- ✅ First content visible in < 1.5 seconds
- ✅ Interactive in < 3 seconds
- ✅ No visual layout shifts (CLS < 0.1)

**Acceptance Criteria**:
- [ ] Load time acceptable
- [ ] No performance issues
- [ ] Smooth rendering

---

## Test Case 12.2: Database Query Performance
**Objective**: Verify database queries are optimized

**Steps**:
1. Enable query logging (if available)
2. Navigate through application
3. Check query execution times
4. Look for slow queries (> 1 second)
5. Check for N+1 query problems

**Expected Results**:
- ✅ Queries execute in < 100ms
- ✅ No unnecessary queries
- ✅ Proper indexing used
- ✅ No N+1 problems
- ✅ Connection pooling working

**Acceptance Criteria**:
- [ ] Queries fast
- [ ] Optimal indexes used
- [ ] No N+1 patterns

---

## Test Case 12.3: API Response Time
**Objective**: Verify API endpoints respond quickly

**Steps**:
1. Use API client (Postman, curl)
2. Test key endpoints:
   - GET /api/members (list)
   - GET /api/members/{id} (detail)
   - POST /api/payments (create)
   - GET /api/reports (generate)
3. Measure response time
4. Verify < 500ms for simple queries
5. Verify < 5 seconds for complex queries

**Expected Results**:
- ✅ Simple queries respond in < 500ms
- ✅ Complex queries respond in < 5 seconds
- ✅ No timeouts
- ✅ Consistent response times

**Acceptance Criteria**:
- [ ] Response times acceptable
- [ ] No timeouts
- [ ] Consistent performance

---

## Test Case 12.4: Concurrent User Simulation
**Objective**: Verify application handles multiple users

**Steps**:
1. Use load testing tool (Apache JMeter, k6, Locust)
2. Create test scenario:
   - 10 concurrent users
   - Each user logs in, views dashboard, submits form
   - Duration: 5 minutes
3. Monitor:
   - Response times
   - Error rates
   - Server CPU/Memory
4. Gradually increase to 50, 100 users

**Expected Results**:
- ✅ Application stable under load
- ✅ Response time < 2 seconds for 10 users
- ✅ Error rate < 1%
- ✅ CPU usage < 80%
- ✅ Memory stable (no leaks)

**Acceptance Criteria**:
- [ ] Handles 50+ concurrent users
- [ ] Response times acceptable
- [ ] Error rate low
- [ ] Resources managed

---

## Test Case 12.5: Large Data Set Handling
**Objective**: Verify application performs with large datasets

**Steps**:
1. Import or create large member dataset:
   - 10,000+ members
   - 1,000+ applications
   - 5,000+ payments
2. Navigate member list:
   - Search for member
   - Filter by status
   - Sort by column
   - Paginate through results
3. Monitor page load time
4. Verify search/filter performance

**Expected Results**:
- ✅ Search executes in < 1 second
- ✅ Filter responsive
- ✅ Sorting quick
- ✅ Pagination smooth
- ✅ No UI freezing

**Acceptance Criteria**:
- [ ] Search fast with large data
- [ ] Filtering responsive
- [ ] Sorting quick
- [ ] Pagination smooth

---

## Test Case 12.6: Memory Leak Detection
**Objective**: Verify no memory leaks

**Steps**:
1. Open DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Navigate through several pages
4. Perform actions repeatedly (login, create record, delete)
5. Take another heap snapshot
6. Compare memory usage
7. Look for growing memory usage

**Expected Results**:
- ✅ Memory usage stable
- ✅ No detached DOM nodes
- ✅ Objects properly cleaned up
- ✅ No memory leaks detected
- ✅ Browser performance stable

**Acceptance Criteria**:
- [ ] No memory leaks
- [ ] Memory stable
- [ ] Performance consistent

---

## Test Case 12.7: Image & Asset Optimization
**Objective**: Verify images and assets are optimized

**Steps**:
1. Open DevTools → Network tab
2. Filter by images
3. Check image sizes:
   - Logo should be < 100KB
   - Icons should be < 50KB
   - Large images should be < 500KB
4. Check for unused CSS/JavaScript
5. Verify CSS/JS minified

**Expected Results**:
- ✅ Images appropriately sized
- ✅ Modern formats used (WebP if available)
- ✅ CSS/JS minified
- ✅ No unused assets loaded
- ✅ Gzip compression enabled

**Acceptance Criteria**:
- [ ] Assets optimized
- [ ] File sizes reasonable
- [ ] Minified
- [ ] Compression enabled

---

## Test Case 12.8: Browser Compatibility
**Objective**: Verify application works across browsers

**Steps**:
1. Test on browsers:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)
   - Mobile Chrome
   - Mobile Safari
2. For each browser:
   - Login
   - Navigate pages
   - Submit forms
   - Check layout
   - Check functionality

**Expected Results**:
- ✅ All features work in all browsers
- ✅ Layout responsive on mobile
- ✅ Forms submit successfully
- ✅ No console errors
- ✅ No visual glitches

**Acceptance Criteria**:
- [ ] Works in all major browsers
- [ ] Mobile responsive
- [ ] No errors
- [ ] Consistent appearance

---

## Test Case 12.9: Mobile Responsiveness
**Objective**: Verify mobile compatibility

**Steps**:
1. Open DevTools → Toggle Device Toolbar
2. Test on different screen sizes:
   - iPhone SE (375px)
   - iPhone 12 (390px)
   - Pixel 5 (393px)
   - iPad (768px)
   - iPad Pro (1024px)
3. For each size:
   - Check layout responsive
   - Check navigation accessible
   - Check forms usable
   - Check no horizontal scroll

**Expected Results**:
- ✅ Mobile layout responsive
- ✅ Touch targets adequate (44x44px+)
- ✅ Text readable
- ✅ Navigation accessible
- ✅ Forms usable on mobile

**Acceptance Criteria**:
- [ ] Mobile responsive
- [ ] Touch-friendly
- [ ] Readable
- [ ] No scrolling issues

---

## Test Case 12.10: Backup & Recovery
**Objective**: Verify backup and disaster recovery

**Steps**:
1. Check backup configuration
2. Create test data
3. Verify backup runs (check logs)
4. Simulate data loss (if in test environment)
5. Restore from backup
6. Verify data recovered
7. Verify application operational post-recovery

**Expected Results**:
- ✅ Backup runs on schedule
- ✅ Backup completes successfully
- ✅ Backup data complete
- ✅ Restore functional
- ✅ Data recoverable
- ✅ Application operable after restore

**Acceptance Criteria**:
- [ ] Backup configured
- [ ] Backup runs regularly
- [ ] Restore works
- [ ] Data intact

---

# 📝 TEST EXECUTION SUMMARY

## Defect Tracking Format

Use the following format for any issues found:

```
Defect ID: [DEF-XXX]
Title: [Brief issue title]
Severity: [Critical/High/Medium/Low]
Phase: [Phase number]
Test Case: [Test case number]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected Result: [Expected outcome]
Actual Result: [What actually happened]
Screenshots: [Attach relevant screenshots]
```

---

## Pass/Fail Checklist

Create a final checklist for test closure:

- [ ] All Phase 1 tests passed (Authentication)
- [ ] All Phase 2 tests passed (Admin Dashboard)
- [ ] All Phase 3 tests passed (Forms)
- [ ] All Phase 4 tests passed (Membership)
- [ ] All Phase 5 tests passed (Payments)
- [ ] All Phase 6 tests passed (Renewals)
- [ ] All Phase 7 tests passed (Reports)
- [ ] All Phase 8 tests passed (Member Portal)
- [ ] All Phase 9 tests passed (Certificates)
- [ ] All Phase 10 tests passed (Advanced)
- [ ] All Phase 11 tests passed (Security)
- [ ] All Phase 12 tests passed (Performance)
- [ ] No Critical defects open
- [ ] Performance meets requirements
- [ ] Security scan passed
- [ ] User acceptance testing complete
- [ ] Sign-off obtained

---

## Test Environment Notes

- **Database**: PostgreSQL on port 5435
- **Backend API**: Running on port 5001
- **Frontend**: Running on port 3000
- **Time Zone**: [Server timezone]
- **Network**: [On-prem/Cloud/Hybrid]

---

## Contacts

- **QA Lead**: [Name]
- **Developer Lead**: [Name]
- **Product Owner**: [Name]
- **DevOps Contact**: [Name]

---

**Document Version**: 1.0  
**Last Updated**: May 25, 2026  
**Next Review**: [Date]

