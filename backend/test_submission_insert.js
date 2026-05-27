const { pool } = require('./src/config/database');

async function run() {
  const submUuid = require('crypto').randomUUID();
  const formId = 1;
  const full_name = 'QA Test Applicant';
  const email = 'qa_test_member@forti.org';
  const phone = '+919999988888';
  const membershipId = `FORTI-${Date.now()}`;
  const plan_type = 'yearly';
  const membership_type = 'individual';
  const package_id = 1; // let's try a valid ID in the DB
  const resolvedWingId = 1; // let's try a valid ID in the DB
  const ip = '127.0.0.1';
  const formData = {};

  try {
    const [r] = await pool.query(
      `INSERT INTO fb_submissions
         (uuid, form_id, user_id, status, current_step, submitted_at,
          applicant_name, applicant_email, applicant_phone, membership_id, ip_address, data,
          plan_type, membership_type, package_id, wing_id)
       VALUES (?,?,0,'submitted',5,NOW(),?,?,?,?,?,?,?,?,?,?)`,
      [submUuid, formId, full_name, email, phone || null,
       membershipId, ip, JSON.stringify(formData),
       plan_type || null, membership_type || null, package_id ? Number(package_id) : null,
       resolvedWingId]
    );
    console.log('Success, insertId:', r.insertId);
  } catch (err) {
    console.error('Submission Insert failed with error:');
    console.error(err);
  }
  await pool.end();
}

run().catch(console.error);
