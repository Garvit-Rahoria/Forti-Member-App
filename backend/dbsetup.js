const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
  const root = await mysql.createConnection({
    host: '127.0.0.1', port: 3306,
    user: 'root', password: 'lifepulse123',
    multipleStatements: true
  });
  console.log('Connected as root');

  await root.query('CREATE DATABASE IF NOT EXISTS forti_membership');
  console.log('DB forti_membership created/exists');

  try {
    await root.query("CREATE USER 'forti'@'127.0.0.1' IDENTIFIED BY 'forti@2026'");
    console.log('User forti@127.0.0.1 created');
  } catch (e) { console.log('User forti@127.0.0.1 exists:', e.code); }

  try {
    await root.query("CREATE USER 'forti'@'localhost' IDENTIFIED BY 'forti@2026'");
    console.log('User forti@localhost created');
  } catch (e) { console.log('User forti@localhost exists:', e.code); }

  await root.query("GRANT ALL PRIVILEGES ON `forti_membership`.* TO 'forti'@'127.0.0.1'");
  await root.query("GRANT ALL PRIVILEGES ON `forti_membership`.* TO 'forti'@'localhost'");
  await root.query('FLUSH PRIVILEGES');
  console.log('Privileges granted to forti user');
  await root.end();

  // Run migrations
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306,
    user: 'root', password: 'lifepulse123',
    database: 'forti_membership',
    multipleStatements: true
  });

  const dbDir = path.join(__dirname, '..', 'database');
  const migrations = fs.readdirSync(dbDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('\nRunning migrations:', migrations.join(', '));

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(dbDir, file), 'utf8');
    try {
      await conn.query(sql);
      console.log('  OK:', file);
    } catch (e) {
      const msg = e.message.split('\n')[0];
      console.log('  WARN', file + ':', msg);
    }
  }

  await conn.end();
  console.log('\nAll done! forti_membership is ready.');
}

setup().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
