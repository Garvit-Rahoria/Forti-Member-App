const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('FORTI PORTAL - API TEST SUITE');
  console.log('='.repeat(60));
  let pass = 0, fail = 0;

  async function test(name, fn) {
    try {
      const result = await fn();
      if (result.ok) {
        console.log(`✅ PASS: ${name}`);
        pass++;
      } else {
        console.log(`❌ FAIL: ${name} → ${result.reason}`);
        fail++;
      }
    } catch (e) {
      console.log(`❌ ERROR: ${name} → ${e.message}`);
      fail++;
    }
  }

  // 1. Countries endpoint
  await test('GET /api/locations/countries returns data', async () => {
    const r = await request('GET', '/api/locations/countries');
    if (r.status !== 200) return { ok: false, reason: `status ${r.status}` };
    const rows = r.body?.data || [];
    if (!Array.isArray(rows)) return { ok: false, reason: 'data is not array' };
    if (rows.length === 0) return { ok: false, reason: 'empty array - no active countries in DB' };
    const sample = rows[0];
    const hasFields = sample.phone_code && sample.iso2 && sample.name;
    if (!hasFields) return { ok: false, reason: `missing fields: ${JSON.stringify(sample)}` };
    console.log(`   → ${rows.length} countries, sample: ${sample.name} ${sample.phone_code}`);
    return { ok: true };
  });

  // 2. OTP send - valid request
  await test('POST /api/otp/send with valid data', async () => {
    const r = await request('POST', '/api/otp/send', {
      email: 'testdiag123@test.com',
      full_name: 'Test User',
      phone: '+919876543210',
      purpose: 'apply'
    });
    if (r.status === 429) return { ok: false, reason: 'Rate limited (too many OTPs for this IP/email)' };
    if (r.status === 500) return { ok: false, reason: `Server error: ${r.body?.message}` };
    if (r.status !== 200) return { ok: false, reason: `status ${r.status}: ${r.body?.message}` };
    console.log(`   → OTP sent, dev_otp: ${r.body?.data?._dev_otp || '(hidden in prod)'}`);
    return { ok: true };
  });

  // 3. OTP send - missing name
  await test('POST /api/otp/send rejects missing name', async () => {
    const r = await request('POST', '/api/otp/send', { email: 'test@test.com', purpose: 'apply' });
    return { ok: r.status === 422, reason: `Expected 422, got ${r.status}` };
  });

  // 4. OTP send - invalid email
  await test('POST /api/otp/send rejects invalid email', async () => {
    const r = await request('POST', '/api/otp/send', { email: 'notanemail', full_name: 'Test', purpose: 'apply' });
    return { ok: r.status === 422, reason: `Expected 422, got ${r.status}` };
  });

  // 5. OTP verify - wrong OTP
  await test('POST /api/otp/verify rejects wrong OTP', async () => {
    const r = await request('POST', '/api/otp/verify', { email: 'testdiag123@test.com', otp: '000000', purpose: 'apply' });
    return { ok: r.status === 400, reason: `Expected 400, got ${r.status}: ${r.body?.message}` };
  });

  // 6. Track status - missing email
  await test('GET /api/member/track-status requires email', async () => {
    const r = await request('GET', '/api/member/track-status');
    return { ok: r.status === 422, reason: `Expected 422, got ${r.status}` };
  });

  // 7. Track status - non-existent email
  await test('GET /api/member/track-status returns 404 for unknown email', async () => {
    const r = await request('GET', '/api/member/track-status?email=nobody_xyz123@test.com');
    return { ok: r.status === 404, reason: `Expected 404, got ${r.status}` };
  });

  // 8. Packages endpoint
  await test('GET /api/member/packages returns data', async () => {
    const r = await request('GET', '/api/member/packages');
    if (r.status !== 200) return { ok: false, reason: `status ${r.status}` };
    const rows = r.body?.data || [];
    console.log(`   → ${rows.length} packages found`);
    return { ok: true };
  });

  // Clean up test OTP
  const { pool } = require('./src/config/database');
  await pool.query("DELETE FROM member_otps WHERE email='testdiag123@test.com'");

  console.log('='.repeat(60));
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(60));
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner error:', e.message); process.exit(1); });
