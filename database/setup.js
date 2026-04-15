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
  console.log('Database forti_membership created/exists');

  try {
    await root.query("CREATE USER 'forti'@'127.0.0.1' IDENTIFIED BY 'forti@2026'");
    console.log('User forti@127.0.0.1 created');
  } catch (e) {
    if (e.code === 'ER_CANNOT_USER') {
      console.log('User forti already exists, updating password...');
      await root.query("ALTER USER 'forti'@'127.0.0.1' IDENTIFIED BY 'forti@2026'");
    }
  }

  try {
    await root.query("CREATE USER 'forti'@'localhost' IDENTIFIED BY 'forti@2026'");
  } catch (e) { /* already exists */ }

  await root.query("GRANT ALL PRIVILEGES ON forti_membership.* TO 'forti'@'127.0.0.1'");
  await root.query("GRANT ALL PRIVILEGES ON forti_membership.* TO 'forti'@'localhost'");
  await root.query('FLUSH PRIVILEGES');
  console.log('Privileges granted');

  await root.end();

  // Run migrations with forti user
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306,
    user: 'root', password: 'lifepulse123',
    database: 'forti_membership',
    multipleStatements: true
  });

  const dbDir = __dirname;
  const migrations = fs.readdirSync(dbDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(dbDir, file), 'utf8');
    try {
      await conn.query(sql);
      console.log(`Ran migration: ${file}`);
    } catch (e) {
      console.log(`Migration ${file} error (may already exist): ${e.message.split('\n')[0]}`);
    }
  }

  await conn.end();
  console.log('\nSetup complete! forti_membership database is ready.');
}

setup().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
