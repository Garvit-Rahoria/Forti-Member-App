const { faker } = require('@faker-js/faker');
const { pool } = require('../config/database');
const crypto = require('crypto');

async function seedData() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('Seeding mock members for renewal testing...');

    // Expiration scenarios
    const now = new Date();
    const addDays = (d) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + d);
      return dt;
    };

    const scenarios = [
      { offset: 1, label: 'expiring tomorrow', count: 3 },
      { offset: 7, label: 'expiring in 7 days', count: 2 },
      { offset: 20, label: 'expiring in 20 days (next month approx)', count: 2 },
      { offset: -7, label: 'expired 7 days ago', count: 2 },
      { offset: 180, label: 'expiring in 6 months', count: 3 },
    ];

    const insertedMembers = [];

    for (const scenario of scenarios) {
      for (let i = 0; i < scenario.count; i++) {
        const expiryDate = addDays(scenario.offset);
        const memberId = `F-${faker.string.numeric(5)}`;
        
        // Insert into fb_submissions
        const [result] = await conn.query(
          `INSERT INTO fb_submissions 
            (uuid, form_id, applicant_name, applicant_email, applicant_phone, membership_id, expiry_date, member_status, plan_type, membership_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id`,
          [
            crypto.randomUUID(),
            1, // dummy form_id
            faker.person.fullName(),
            faker.internet.email(),
            faker.phone.number(),
            memberId,
            expiryDate.toISOString().split('T')[0], // YYYY-MM-DD
            scenario.offset < 0 ? 'expired' : 'active',
            'lifetime',
            'individual'
          ]
        );
        insertedMembers.push({
          id: result.insertId,
          expiryDate,
        });
      }
    }
    console.log(`Inserted ${insertedMembers.length} mock members.`);

    console.log('Generating some pending and verified renewal requests...');
    
    // Pick 3 random members to have "pending" renewal requests
    // Pick 2 random members to have "verified" renewal requests
    // Pick 1 random member to have a "rejected" renewal request

    const statuses = ['pending', 'pending', 'pending', 'verified', 'verified', 'rejected'];
    let index = 0;

    for (const member of insertedMembers) {
      if (index >= statuses.length) break;
      const status = statuses[index];

      await conn.query(
        `INSERT INTO portal_renewals
          (uuid, submission_id, package_id, amount, currency, old_expiry_date, new_expiry_date, status, transaction_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          member.id,
          1, // Dummy package ID
          faker.commerce.price({ min: 1000, max: 5000 }),
          'INR',
          member.expiryDate.toISOString().split('T')[0],
          addDays(365).toISOString().split('T')[0], // Next year expiry
          status,
          `TXN${faker.string.alphanumeric(8).toUpperCase()}`
        ]
      );
      index++;
    }
    
    console.log(`Inserted ${statuses.length} renewal requests.`);

    await conn.commit();
    console.log('Seeding completed successfully!');
  } catch (err) {
    await conn.rollback();
    console.error('Seeding failed:', err);
  } finally {
    conn.release();
    pool.end();
  }
}

seedData();
