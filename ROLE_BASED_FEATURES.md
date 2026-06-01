# Role-Based Features Index Matrix
## FORTI Member Application - Authorization Specification

This document provides a highly detailed index of every operational feature in the FORTI Member App, mapping precisely what each user tier (**Super Admin**, **Manager**, and **Office**) is allowed to do, their specific limits, and absolute boundaries.

---

## 1. Complete Comparative Table

| Index | Feature Description | Super Admin | Manager | Office |
| :--- | :--- | :---: | :---: | :---: |
| **1.1** | View System Configurations & Keys | **Full Access** | *Blocked* | *Blocked* |
| **1.2** | Edit API Credentials & Mail Server | **Full Access** | *Blocked* | *Blocked* |
| **1.3** | Create or Suspend Staff Accounts | **Full Access** | *Blocked* | *Blocked* |
| **1.4** | View Staff Action Logs | **Full Access** | *Blocked* | *Blocked* |
| **1.5** | Edit Package Names & Fees | **Full Access** | *Read Only* | *Blocked* |
| **1.6** | Delete Package Templates | **Full Access** | *Blocked* | *Blocked* |
| **1.7** | Hard-Delete Member Profiles | **Full Access** | *Blocked* | *Blocked* |
| **1.8** | Export Complete Financial Ledger | **Full Access** | **Full Access** | *Blocked* |
| **1.9** | Final Membership Approval Trigger | **Full Access** | **Full Access** | *Blocked* |
| **1.10** | Issue Refund or Overrides | **Full Access** | **Full Access** | *Blocked* |
| **1.11** | Reject / Hold Application With Notes | **Full Access** | **Full Access** | *Blocked* |
| **1.12** | Create/Edit Member Profiles | **Full Access** | **Full Access** | **Full Access** |
| **1.13** | File Verification Checks (Aadhaar/Photo)| **Full Access** | **Full Access** | **Full Access** |
| **1.14** | Flag Profile as "Under Review" | **Full Access** | **Full Access** | **Full Access** |
| **1.15** | Download / Print Certificates & Cards | **Full Access** | **Full Access** | **Full Access** |
| **1.16** | Manage Event Blogs & Image Galleries | **Full Access** | **Full Access** | **Full Access** |

---

## 2. Feature-by-Feature Detailed Index

### Index 1: System Settings & Security
*   **Super Admin:**
    *   Complete access to view, update, and reset third-party keys (Payment Gateway secrets, SMTP Mailer passwords, Google Maps, SMS API).
    *   Complete visibility into absolute database logs, system health charts, and administrative audit trails.
*   **Manager Limitation:**
    *   **Blocked.** Cannot view or edit database configurations or security protocols. The "System Settings" route is hidden from their sidebar navigation.
*   **Office Limitation:**
    *   **Blocked.** Strictly no access. Direct API requests to configuration paths will reject with a `403 Forbidden` header.

### Index 2: Staff User Registry
*   **Super Admin:**
    *   Full administrative permission to add new staff profiles, assign operational roles (`manager` or `office`), reset passwords, or suspend access.
*   **Manager Limitation:**
    *   **Blocked.** Cannot create, view, modify, or delete accounts of other managers or clerical clerks.
*   **Office Limitation:**
    *   **Blocked.** Strictly restricted. Has zero knowledge of other administrative login accounts.

### Index 3: Packages, Plans & Pricing
*   **Super Admin:**
    *   Full authority to design new packages (e.g. Life Memberships, Corporate Memberships).
    *   Authorized to update pricing amounts, change active years, configure registration taxes, or delete unused packages.
*   **Manager Limitation:**
    *   **Limited to Read-Only.** Can view active plans to explain details to callers or applicants. Editing inputs, creation forms, and delete buttons are completely hidden or disabled.
*   **Office Limitation:**
    *   **Blocked.** Cannot access the package list or modify how plans operate.

### Index 4: Membership Approval Flow
*   **Super Admin:**
    *   Full review capability. Can override any state on the application timeline.
*   **Manager Limitation:**
    *   **Full Approval Authority.** Can inspect documents, verify transactions, and click "Approve" (moving the member to `Active` status).
    *   **Rejection Authority.** Can trigger holds or rejections, entering comments explaining why the member needs to re-upload photos or ID proof.
*   **Office Limitation:**
    *   **No Approval Rights.** Completely blocked from final approvals. Office staff can inspect files and click "Mark Ready for Manager" or "Under Review" to escalate the file to the manager's review list. They cannot change the status to `Active`.

### Index 5: Member Directory & Profiling
*   **Super Admin:**
    *   Complete authorization. Can edit any field on any member's profile and permanently delete files/profiles.
*   **Manager Limitation:**
    *   **Oversight & Editing.** Allowed to perform edits on name spelling, email addresses, incorporation details, and phone numbers to keep database records clean.
    *   **No Deletions.** Cannot delete or purge any member profile.
*   **Office Limitation:**
    *   **Clerical Verification.** Can view profile inputs to confirm they match Aadhaar uploads.
    *   **Limited Editing.** Can correct data entry errors, but cannot change fields once a member is moved to the "Under Review" or higher phase without submitting requests.

### Index 6: Printing, Receipts & Downloads
*   **Super Admin:**
    *   Can generate, preview, download, and email certificates, ID Cards, invoices, and receipts.
*   **Manager Limitation:**
    *   **Full Print Access.** Authorized to download, email, and generate all ID cards, membership certificates, invoices, and receipts.
*   **Office Limitation:**
    *   **Full Print Access.** Fully authorized to generate and print documents immediately upon request from walk-in members or supervisors.

### Index 7: Content & Gallery Management
*   **Super Admin:**
    *   Can create, modify, publish, or delete event blogs, press columns, banner highlights, and photo gallery uploads.
*   **Manager Limitation:**
    *   **Complete Management.** Full read/write access to add gallery items and event announcements.
*   **Office Limitation:**
    *   **Complete Management.** Permitted to upload photos, draft announcements, and input gallery descriptions to assist operations.

---

## 3. Enforcement Strategy (Backend & Frontend)

### A. Backend Enforcement (Express Controller Route Guards)
Every admin endpoint must be protected by a role-checking middleware:
```javascript
// Example Node/Express role check helper
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// Route Mapping Examples:
router.post('/admin/packages', checkRole(['super_admin']), createPackage);
router.post('/admin/approve-member', checkRole(['super_admin', 'manager']), approveMember);
router.post('/admin/verify-document', checkRole(['super_admin', 'manager', 'office']), verifyDoc);
```

### B. Frontend Enforcement (React Navigation and Render Shields)
To prevent navigation errors and secure the browser UI, route configurations and individual buttons must match the user credentials:
```jsx
// React Component Shielding Example
function MemberActionPanel({ member, userRole }) {
  const isOffice = userRole === 'office';
  
  return (
    <div className="flex gap-4">
      {/* Office, Manager, and Admin can all download invoices */}
      <button onClick={downloadInvoice}>Download Invoice</button>

      {/* Only Managers and Super Admins can click the final Approve trigger */}
      {!isOffice && (
        <button onClick={handleApprove} className="btn-approve">
          Approve Application
        </button>
      )}
    </div>
  );
}
```
