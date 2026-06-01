const { pool } = require('./src/config/database');

async function fix() {
  const [accounts] = await pool.query("SELECT id, membership_id FROM member_accounts WHERE membership_id IS NOT NULL AND membership_id NOT LIKE 'FR-%'");
  let count = 0;
  for (const acc of accounts) {
    const newId = `FR-${String(Math.floor(100000 + Math.random() * 900000))}`;
    await pool.query('UPDATE member_accounts SET membership_id = ? WHERE id = ?', [newId, acc.id]);
    console.log(`Updated account ${acc.id} from ${acc.membership_id} to ${newId}`);
    count++;
  }

  console.log(`Updated ${count} IDs.`);
  process.exit(0);
}

fix();
