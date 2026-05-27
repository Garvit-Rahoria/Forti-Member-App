const { pool } = require('./src/config/database');

async function testQuery() {
  try {
    const sid = 13; // Using a known submission_id from logs
    const photoPath = '/uploads/photos/test.jpg';

    // Test ensurePublicSlug
    console.log('Testing ensurePublicSlug query...');
    await pool.query(
      `INSERT INTO member_public_profiles (submission_id, public_slug)
       VALUES (?, ?)
       ON CONFLICT (submission_id) DO UPDATE SET public_slug = EXCLUDED.public_slug
       RETURNING submission_id`,
      [sid, 'test-slug']
    );
    console.log('ensurePublicSlug query succeeded.');

    // Test the POST /photo query
    console.log('Testing POST /photo query...');
    await pool.query(
      `INSERT INTO member_public_profiles (submission_id, profile_photo_path) VALUES (?, ?)
       ON CONFLICT (submission_id) DO UPDATE SET profile_photo_path=EXCLUDED.profile_photo_path, updated_at=NOW()`,
      [sid, photoPath]
    );
    console.log('POST /photo query succeeded.');

  } catch (err) {
    console.error('DATABASE ERROR:', err);
  } finally {
    process.exit(0);
  }
}

testQuery();
