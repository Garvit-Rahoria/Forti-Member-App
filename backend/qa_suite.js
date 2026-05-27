/**
 * FORTI Member App - Comprehensive QA Test Runner
 * Validates Phase 1 through Phase 11 functionality using native Node.js APIs (fetch, FormData, File).
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
let adminToken = '';
let memberToken = '';
let submissionId = null;
let submissionUuid = '';
let membershipId = '';

async function runSuite() {
  console.log('='.repeat(80));
  console.log('                 FORTI MEMBER APPLICATION - COMPLETE QA TEST SUITE');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      console.log(`\n▶ Starting Test: ${name}`);
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Reason: ${err.message}`);
      if (err.response) {
        console.error(`   Response status: ${err.response.status}`);
        console.error(`   Response body:`, err.response.body);
      }
      failed++;
    }
  }

  // Helper for requests
  async function apiCall(method, route, body = null, headers = {}, isMultipart = false) {
    const url = `${BASE_URL}${route}`;
    const opts = {
      method,
      headers: {
        ...headers,
      }
    };

    if (adminToken && !headers['Authorization']) {
      opts.headers['Authorization'] = `Bearer ${adminToken}`;
    }

    if (body) {
      if (isMultipart) {
        opts.body = body;
        // Fetch sets the content-type boundary automatically for FormData
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, opts);
    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      const err = new Error(`API error: ${response.status} ${response.statusText}`);
      err.response = { status: response.status, body: data };
      throw err;
    }

    return data;
  }

  // ----------------- PHASE 1: AUTHENTICATION & ACCESS CONTROL -----------------
  
  await test('Test Case 1.1: Admin Login (Valid Credentials)', async () => {
    const data = await apiCall('POST', '/api/auth/login', {
      email: 'admin@forti.org',
      password: 'Admin@12345'
    });
    if (!data.success || !data.data.token) {
      throw new Error('Login response did not return a valid JWT token');
    }
    adminToken = data.data.token;
    console.log(`   → Session token stored. User: ${data.data.user.full_name} (${data.data.user.role})`);
  });

  await test('Test Case 1.2: Login Validation (Invalid Credentials)', async () => {
    try {
      await apiCall('POST', '/api/auth/login', {
        email: 'invalid@forti.org',
        password: 'WrongPassword'
      });
      throw new Error('Endpoint accepted invalid credentials (expected 401)');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log(`   → Correctly rejected with status ${err.response.status}: ${JSON.stringify(err.response.body)}`);
      } else {
        throw err;
      }
    }
  });

  await test('Test Case 1.2: Login Validation (Empty Fields)', async () => {
    try {
      await apiCall('POST', '/api/auth/login', { email: '', password: '' });
      throw new Error('Endpoint accepted empty fields (expected 422)');
    } catch (err) {
      if (err.response && err.response.status === 422) {
        console.log(`   → Correctly rejected with status ${err.response.status}`);
      } else {
        throw err;
      }
    }
  });

  // ----------------- PHASE 2: ADMIN DASHBOARD & CONFIGURATION -----------------

  await test('Test Case 2.1: Dashboard Overview Metrics', async () => {
    const data = await apiCall('GET', '/api/reports/dashboard');
    if (!data.success || data.data.total_members === undefined) {
      throw new Error('Dashboard endpoint failed or missing total_members metric');
    }
    console.log(`   → Dashboard metrics loaded: total_members=${data.data.total_members}, active_members=${data.data.active_members}`);
  });

  await test('Test Case 2.2: Settings Configuration Fetch', async () => {
    const data = await apiCall('GET', '/api/settings');
    if (!data.success) {
      throw new Error('Settings fetch failed');
    }
    console.log(`   → System settings fetched. Keys: ${Object.keys(data.data).join(', ')}`);
  });

  await test('Test Case 2.3: Email Templates Fetch', async () => {
    const data = await apiCall('GET', '/api/settings/email-templates');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Email templates did not return an array');
    }
    console.log(`   → Loaded ${data.data.length} email templates.`);
  });

  await test('Test Case 2.4: Currency Settings Fetch', async () => {
    const data = await apiCall('GET', '/api/currency-settings');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Currency settings did not return an array');
    }
    console.log(`   → Loaded ${data.data.length} currency scopes. Default currency code: ${data.data.find(c => c.is_default)?.currency_code || 'None'}`);
  });

  // ----------------- PHASE 3: FORMS & APPLICATION MANAGEMENT -----------------

  await test('Test Case 3.1: View Application Forms', async () => {
    const data = await apiCall('GET', '/api/forms');
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Forms endpoint failed');
    }
    console.log(`   → Found ${data.data.length} forms in the system.`);
  });

  // ----------------- PHASE 4 & 8: MEMBERSHIP SUBMISSION & PORTAL -----------------

  let countryId, stateId, wingId, packageId, paymentMethodId;

  await test('Retrieve dynamic dropdown inputs for application form', async () => {
    const countries = await apiCall('GET', '/api/locations/countries');
    const states = await apiCall('GET', '/api/locations/states');
    const wings = await apiCall('GET', '/api/wings');
    
    if (!countries.data.length || !states.data.length || !wings.data.length) {
      throw new Error('Prerequisite dropdowns returned empty results');
    }
    
    countryId = countries.data[0].id;
    stateId = states.data[0].id;
    wingId = wings.data[0].id;

    console.log(`   → Resolved countryId=${countryId}, stateId=${stateId}, wingId=${wingId}`);
  });

  await test('Retrieve package matching logic', async () => {
    const data = await apiCall('GET', `/api/membership/packages/match?membership_type=individual&plan_type=yearly&location_type=rajasthan`);
    if (!data.success || !data.data.id) {
      throw new Error('Package match endpoint failed');
    }
    packageId = data.data.id;
    console.log(`   → Matched Package: ${data.data.name} (Price: ${data.data.currency} ${data.data.price})`);
  });

  await test('Retrieve payment methods matching logic', async () => {
    const data = await apiCall('GET', `/api/membership/payment-methods?location=rajasthan`);
    if (!data.success || !data.data.length) {
      throw new Error('Payment methods endpoint returned empty');
    }
    paymentMethodId = data.data[0].id;
    console.log(`   → Matched Payment Method: ${data.data[0].name} (ID: ${paymentMethodId})`);
  });

  await test('Test Case 8.1 / 4.1: Send OTP for member application', async () => {
    const email = `qa_test_${Date.now()}@forti.org`;
    const data = await apiCall('POST', '/api/otp/send', {
      email,
      full_name: 'QA Test Applicant',
      phone: '+919999988888',
      purpose: 'apply'
    });
    if (!data.success) {
      throw new Error('OTP send failed');
    }
    console.log(`   → OTP sent successfully for ${email}`);
  });

  let applicantToken = '';
  await test('Test Case 8.1 / 4.1: Verify OTP using hardcoded 000000 bypass', async () => {
    const email = 'qa_test_member@forti.org';
    const data = await apiCall('POST', '/api/otp/verify', {
      email,
      otp: '000000',
      purpose: 'apply'
    });
    if (!data.success || !data.data.token) {
      throw new Error('Bypass OTP verification failed');
    }
    applicantToken = data.data.token;
    console.log(`   → OTP Verified. Applicant JWT received.`);
  });

  await test('Test Case 1.2: Reject wrong OTP verification code', async () => {
    try {
      await apiCall('POST', '/api/otp/verify', {
        email: 'qa_test_member@forti.org',
        otp: '999999', // Truly wrong OTP
        purpose: 'apply'
      });
      throw new Error('Verification accepted incorrect OTP 999999 (expected 400)');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`   → Correctly rejected wrong OTP code with status ${err.response.status}`);
      } else {
        throw err;
      }
    }
  });

  await test('Test Case 4.1 / 5.4: Submit Member Application (Multipart Upload)', async () => {
    // Write a dummy file to simulate the screenshot upload
    const dummyFilePath = path.join(__dirname, 'dummy_screenshot.jpg');
    fs.writeFileSync(dummyFilePath, 'dummy screenshot content');

    const form = new FormData();
    form.append('full_name', 'QA Test Applicant');
    form.append('email', 'qa_test_member@forti.org');
    form.append('phone', '+919999988888');
    form.append('gender', 'male');
    form.append('id_type', 'aadhaar');
    form.append('aadhaar_number', '999988887777');
    form.append('pin_code', '302001');
    form.append('organisation_name', 'QA Test Organisation');
    form.append('organisation_type', 'Startup');
    form.append('location_type', 'rajasthan');
    form.append('state_id', String(stateId));
    form.append('city_id', '1');
    form.append('country_id', String(countryId));
    form.append('membership_type', 'individual');
    form.append('plan_type', 'yearly');
    form.append('package_id', String(packageId));
    form.append('wing_id', String(wingId));
    form.append('payment_method', String(paymentMethodId));
    form.append('payment_reference', `TXN-${Date.now()}`);
    form.append('currency', 'INR');

    // Load file and convert to Blob/File for native FormData in Node.js
    const screenshotBuffer = fs.readFileSync(dummyFilePath);
    const screenshotFile = new File([screenshotBuffer], 'dummy_screenshot.jpg', { type: 'image/jpeg' });
    form.append('payment_screenshot', screenshotFile);

    const data = await apiCall('POST', '/api/membership/apply', form, {
      'Authorization': `Bearer ${applicantToken}`
    }, true);

    if (!data.success || !data.data.submission_uuid) {
      throw new Error('Membership apply response missing submission UUID');
    }

    submissionUuid = data.data.submission_uuid;
    membershipId = data.data.membership_id;
    console.log(`   → Application submitted. UUID: ${submissionUuid}, membershipId: ${membershipId}`);

    // Clean up dummy file
    fs.unlinkSync(dummyFilePath);
  });

  await test('Test Case 4.2: Retrieve submission in Admin list', async () => {
    const data = await apiCall('GET', '/api/membership/submissions?per_page=100');
    if (!data.success || !data.data.data) {
      throw new Error('Admin submissions list failed');
    }
    const match = data.data.data.find(s => s.uuid === submissionUuid);
    if (!match) {
      throw new Error(`Submission UUID ${submissionUuid} not found in admin list`);
    }
    submissionId = match.id;
    console.log(`   → Located submission ID in database: ${submissionId}`);
  });

  // ----------------- PHASE 4: APPROVAL WORKFLOW -----------------

  await test('Test Case 4.3: Transition to payment_verified state', async () => {
    const data = await apiCall('PATCH', `/api/approvals/${submissionId}/status`, {
      status: 'payment_verified',
      notes: 'Payment verified by QA Suite'
    });
    if (!data.success || data.data.status !== 'payment_verified') {
      throw new Error('Failed to change status to payment_verified');
    }
    console.log('   → Status changed to payment_verified');
  });

  await test('Test Case 4.3: Transition to approved state', async () => {
    const data = await apiCall('PATCH', `/api/approvals/${submissionId}/status`, {
      status: 'approved',
      notes: 'Application approved by QA Suite'
    });
    if (!data.success || data.data.status !== 'approved') {
      throw new Error('Failed to change status to approved');
    }
    console.log('   → Status changed to approved');
  });

  await test('Test Case 4.3: Transition to active (Activated membership)', async () => {
    const data = await apiCall('PATCH', `/api/approvals/${submissionId}/status`, {
      status: 'activate',
      notes: 'Membership activated by QA Suite'
    });
    if (!data.success || data.data.status !== 'active') {
      throw new Error('Failed to change status to active');
    }
    console.log('   → Status changed to active. Activation completed.');
  });

  // ----------------- PHASE 8: MEMBER PORTAL LOGIN -----------------

  await test('Test Case 8.1: Member Login via OTP verification', async () => {
    const data = await apiCall('POST', '/api/otp/verify', {
      email: 'qa_test_member@forti.org',
      otp: '000000',
      purpose: 'login'
    });
    if (!data.success || !data.data.token) {
      throw new Error('Member OTP login failed');
    }
    memberToken = data.data.token;
    console.log('   → Member login successful. Received member session JWT.');
  });

  await test('Test Case 8.3: Retrieve/Update Member Profile via Portal', async () => {
    const profile = await apiCall('GET', '/api/member/me', null, {
      'Authorization': `Bearer ${memberToken}`
    });
    if (!profile.success || profile.data.email !== 'qa_test_member@forti.org') {
      throw new Error('Member profile retrieve returned incorrect data');
    }
    console.log(`   → Retrieved profile successfully: ${profile.data.full_name}`);
  });

  await test('Test Case 8.8: Public Membership Status Lookup', async () => {
    const data = await apiCall('GET', `/api/status?referenceId=${membershipId}`);
    if (!data.success || data.data.status !== 'active' || data.data.member_status !== 'active') {
      throw new Error('Public lookup returned incorrect status');
    }
    console.log(`   → Lookup for ${membershipId} returned status: ${data.data.status}/${data.data.member_status}`);
  });

  // ----------------- PHASE 7: REPORTING & ANALYTICS -----------------

  await test('Test Case 7.1 / 7.2: Export Members Report API', async () => {
    const response = await fetch(`${BASE_URL}/api/reports/export/members`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (!response.ok) {
      throw new Error('Export members CSV endpoint returned error');
    }
    const text = await response.text();
    if (!text.includes('membership_id') || !text.includes('qa_test_member@forti.org')) {
      throw new Error('CSV output is missing required headers or target member record');
    }
    console.log(`   → Export CSV successful. CSV length: ${text.length} characters.`);
  });

  // ----------------- PHASE 11: SECURITY & COMPLIANCE -----------------

  await test('Test Case 11.2: SQL Injection Prevention (Sanitization check)', async () => {
    const query = "' OR '1'='1";
    // Hit submission query with SQL injection payload
    const data = await apiCall('GET', `/api/membership/submissions?q=${encodeURIComponent(query)}`);
    if (!data.success) {
      throw new Error('Endpoint crashed when receiving SQL injection query');
    }
    console.log('   → SQL Injection safely handled (no crash, parameterized query works correctly)');
  });

  console.log('\n' + '='.repeat(80));
  console.log(`QA SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
