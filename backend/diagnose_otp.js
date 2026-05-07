const { pool } = require('./src/config/database');

(async () => {
  try {
    // Check member_otps table
    const [tables] = await pool.query("SHOW TABLES LIKE 'member_otps'");
    console.log('member_otps table exists:', tables.length > 0);

    if (tables.length > 0) {
      const [cols] = await pool.query('DESCRIBE member_otps');
      console.log('Columns:', cols.map(c => c.Field).join(', '));
    } else {
      console.log('TABLE MISSING - need to create it');
    }

    // Check countries table
    const [ctables] = await pool.query("SHOW TABLES LIKE 'countries'");
    console.log('countries table exists:', ctables.length > 0);
    if (ctables.length > 0) {
      const [cnt] = await pool.query('SELECT COUNT(*) AS n FROM countries WHERE is_active=1');
      console.log('Active countries count:', cnt[0].n);
    }

    // Test OTP insert
    console.log('\n--- Testing OTP insert ---');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      'INSERT INTO member_otps (email, phone, full_name, otp_code, purpose, expires_at) VALUES (?,?,?,?,?,?)',
      ['test@test.com', null, 'Test User', '123456', 'apply', expiresAt]
    );
    console.log('OTP insert SUCCESS');

    // Clean up test
    await pool.query("DELETE FROM member_otps WHERE email='test@test.com' AND otp_code='123456'");
    console.log('Cleanup done');

    // Test rate-limit query
    const [recent] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM member_otps WHERE email=? AND purpose=? AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)',
      ['test@test.com', 'apply']
    );
    console.log('Rate limit query OK, count:', recent[0].cnt);

  } catch(e) {
    console.error('ERROR:', e.message);
    console.error('Stack:', e.stack);
  }
  process.exit(0);
})();
