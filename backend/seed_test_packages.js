const { pool } = require('./src/config/database');

async function run() {
  const packages = [
    { name: 'Corporate Rajasthan Basic', code: 'CORP-RAJ-BSC', price: 10000, loc: 'rajasthan', mtype: 'corporate', dur: 'yearly' },
    { name: 'Corporate Rajasthan Pro', code: 'CORP-RAJ-PRO', price: 25000, loc: 'rajasthan', mtype: 'corporate', dur: 'yearly' },
    { name: 'Corporate Rajasthan Enterprise', code: 'CORP-RAJ-ENT', price: 50000, loc: 'rajasthan', mtype: 'corporate', dur: 'yearly' },
    
    { name: 'Individual Overseas Standard', code: 'IND-OVS-STD', price: 100, loc: 'overseas', mtype: 'individual', dur: 'yearly', curr: 'USD' },
    { name: 'Individual Overseas Premium', code: 'IND-OVS-PRM', price: 250, loc: 'overseas', mtype: 'individual', dur: 'yearly', curr: 'USD' },
    
    { name: 'Institutional Other States 3Y', code: 'INST-OTH-3Y', price: 75000, loc: 'other_states', mtype: 'institutional', dur: '3years' },
    { name: 'Institutional Other States Lifetime', code: 'INST-OTH-LF', price: 200000, loc: 'other_states', mtype: 'institutional', dur: 'lifetime' }
  ];

  for (const pkg of packages) {
    try {
      await pool.query(
        `INSERT INTO portal_packages 
          (name, code, price, location, membership_type, duration, currency, is_active, auto_generated, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 'Test package')`,
        [pkg.name, pkg.code, pkg.price, pkg.loc, pkg.mtype, pkg.dur, pkg.curr || 'INR']
      );
      console.log(`Inserted: ${pkg.name}`);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log(`Already exists: ${pkg.name}`);
      } else {
        console.error(`Error inserting ${pkg.name}:`, e.message);
      }
    }
  }

  process.exit(0);
}

run().catch(console.error);
