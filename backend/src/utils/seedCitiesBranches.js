const { pool } = require('../config/database');

// State name => cities (resolved dynamically by name, not fragile IDs)
const CITIES_BY_STATE_NAME = {
  'Andhra Pradesh': [
    'Visakhapatnam','Vijayawada','Guntur','Tirupati','Kakinada','Nellore','Kurnool','Rajahmundry',
    'Kadapa','Anantapur','Vizianagaram','Eluru','Ongole','Nandyal','Machilipatnam','Adoni',
    'Tenali','Proddatur','Chittoor','Hindupur','Bhimavaram','Madanapalle','Guntakal','Dharmavaram',
    'Gudivada','Narasaraopet','Tadipatri','Amaravati','Srikakulam','Parvathipuram',
  ],
  'Arunachal Pradesh': [
    'Itanagar','Naharlagun','Pasighat','Namsai','Bomdila','Tawang','Ziro','Along','Tezu',
    'Aalo','Roing','Khonsa','Changlang','Daporijo','Anini',
  ],
  'Assam': [
    'Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur','Bongaigaon',
    'Dhubri','Diphu','Karimganj','Sivasagar','Goalpara','Barpeta','Lakhimpur','Dhemaji',
    'Morigaon','Sonitpur','Kamrup','Kokrajhar','Haflong','Mangaldoi','Nalbari','Rangiya',
  ],
  'Bihar': [
    'Patna','Gaya','Muzaffarpur','Bhagalpur','Darbhanga','Arrah','Begusarai','Chhapra',
    'Katihar','Munger','Purnia','Saharsa','Hajipur','Sasaram','Bihar Sharif','Bettiah',
    'Motihari','Sitamarhi','Madhubani','Siwan','Buxar','Aurangabad','Jehanabad','Nawada',
  ],
  'Chandigarh': ['Chandigarh','Manimajra','Panchkula'],
  'Chhattisgarh': [
    'Raipur','Bhilai','Bilaspur','Durg','Korba','Rajnandgaon','Jagdalpur','Ambikapur',
    'Raigarh','Champa','Dhamtari','Mahasamund','Kanker','Kondagaon',
  ],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa','Daman','Diu','Naroli','Amli'],
  'Delhi': [
    'New Delhi','Old Delhi','Dwarka','Rohini','Janakpuri','Lajpat Nagar','Karol Bagh',
    'Saket','Vasant Kunj','Pitampura','Preet Vihar','Mayur Vihar','Shahdara',
    'Narela','Okhla','Uttam Nagar','Punjabi Bagh','Model Town',
  ],
  'Goa': [
    'Panaji','Margao','Vasco da Gama','Mapusa','Ponda','Bicholim','Curchorem','Sanquelim',
  ],
  'Gujarat': [
    'Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Junagadh','Gandhinagar',
    'Anand','Navsari','Morbi','Nadiad','Surendranagar','Bharuch','Mehsana','Bhuj',
    'Porbandar','Palanpur','Valsad','Vapi','Gandhidham',
  ],
  'Haryana': [
    'Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal',
    'Sonipat','Panchkula','Bhiwani','Sirsa','Bahadurgarh','Jind','Rewari',
  ],
  'Himachal Pradesh': [
    'Shimla','Dharamshala','Solan','Mandi','Baddi','Nahan','Paonta Sahib','Sundernagar',
    'Kullu','Manali','Chamba','Hamirpur','Una','Bilaspur','Kangra','Palampur',
  ],
  'Jammu and Kashmir': [
    'Srinagar','Jammu','Anantnag','Baramulla','Sopore','Udhampur','Kathua','Rajouri',
    'Pulwama','Budgam','Pahalgam','Gulmarg',
  ],
  'Jharkhand': [
    'Ranchi','Jamshedpur','Dhanbad','Bokaro','Hazaribagh','Deoghar','Giridih','Phusro',
    'Adityapur','Ramgarh','Medininagar','Chaibasa','Dumka','Sahebganj',
  ],
  'Karnataka': [
    'Bengaluru','Mysuru','Mangaluru','Hubli','Belagavi','Kalaburagi','Ballari','Vijayapura',
    'Shivamogga','Tumakuru','Davangere','Raichur','Bidar','Hassan','Udupi','Chikkamagaluru',
  ],
  'Kerala': [
    'Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Kannur','Alappuzha',
    'Palakkad','Malappuram','Kottayam','Pathanamthitta','Idukki','Wayanad','Kasaragod',
  ],
  'Ladakh': ['Leh','Kargil','Nubra','Zanskar'],
  'Lakshadweep': ['Kavaratti','Agatti','Minicoy','Amini'],
  'Madhya Pradesh': [
    'Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Rewa','Satna','Ratlam',
    'Burhanpur','Khandwa','Morena','Bhind','Chhindwara','Guna','Shivpuri','Vidisha',
  ],
  'Maharashtra': [
    'Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad','Solapur','Amravati','Kolhapur',
    'Nanded','Sangli','Jalgaon','Akola','Latur','Dhule','Ahmednagar','Chandrapur','Parbhani',
  ],
  'Manipur': ['Imphal','Thoubal','Bishnupur','Churachandpur','Ukhrul','Senapati','Kakching'],
  'Meghalaya': ['Shillong','Tura','Jowai','Nongpoh','Williamnagar','Baghmara'],
  'Mizoram': ['Aizawl','Lunglei','Champhai','Serchhip','Kolasib','Lawngtlai'],
  'Nagaland': ['Kohima','Dimapur','Mokokchung','Tuensang','Wokha','Zunheboto','Phek'],
  'Odisha': [
    'Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri','Balasore','Baripada',
    'Bhadrak','Jharsuguda','Jeypore','Angul','Dhenkanal','Bargarh',
  ],
  'Puducherry': ['Puducherry','Karaikal','Mahe','Yanam'],
  'Punjab': [
    'Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Hoshiarpur','Pathankot',
    'Moga','Firozpur','Kapurthala','Sangrur','Barnala','Faridkot','Rajpura',
  ],
  'Rajasthan': [
    'Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner','Alwar','Bharatpur',
    'Sikar','Jhunjhunu','Dausa','Nagaur','Pali','Barmer','Jaisalmer','Jalore',
    'Chittorgarh','Rajsamand','Banswara','Dungarpur','Bhilwara','Tonk','Baran',
    'Bundi','Jhalawar','Sawai Madhopur','Karauli','Dholpur','Churu',
    'Sri Ganganagar','Hanumangarh','Beawar','Balotra','Gangapur City',
  ],
  'Sikkim': ['Gangtok','Namchi','Gyalshing','Mangan','Rangpo','Jorethang'],
  'Tamil Nadu': [
    'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Erode',
    'Vellore','Thoothukudi','Dindigul','Thanjavur','Ranipet','Sivakasi','Karur','Nagercoil',
  ],
  'Telangana': [
    'Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam','Mahbubnagar',
    'Nalgonda','Adilabad','Siddipet','Suryapet','Miryalaguda','Jagtial',
  ],
  'Tripura': ['Agartala','Udaipur','Dharmanagar','Kailashahar','Belonia','Ambassa'],
  'Uttar Pradesh': [
    'Lucknow','Agra','Varanasi','Kanpur','Prayagraj','Meerut','Ghaziabad','Mathura',
    'Aligarh','Bareilly','Moradabad','Saharanpur','Gorakhpur','Noida','Firozabad',
    'Jhansi','Muzaffarnagar','Ayodhya','Azamgarh','Bareilly',
  ],
  'Uttarakhand': [
    'Dehradun','Haridwar','Roorkee','Haldwani','Rudrapur','Kashipur','Rishikesh',
    'Kotdwar','Nainital','Mussoorie','Almora','Pithoragarh',
  ],
  'West Bengal': [
    'Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Malda','Haldia',
    'Kharagpur','Jalpaiguri','Darjeeling','Cooch Behar','Bankura','Purulia',
  ],
  'Andaman and Nicobar Islands': ['Port Blair','Diglipur','Rangat','Mayabunder','Car Nicobar'],
};

const RAJASTHAN_BRANCHES = [
  { name: 'Jaipur HQ', city: 'Jaipur' },
  { name: 'Jodhpur Branch', city: 'Jodhpur' },
  { name: 'Udaipur Branch', city: 'Udaipur' },
  { name: 'Kota Branch', city: 'Kota' },
  { name: 'Ajmer Branch', city: 'Ajmer' },
  { name: 'Bikaner Branch', city: 'Bikaner' },
  { name: 'Alwar Branch', city: 'Alwar' },
];

async function getIndiaCountryId() {
  const [[row]] = await pool.query(
    `SELECT id FROM countries
     WHERE upper(COALESCE(iso_code, '')) = 'IN' OR lower(name) = 'india'
     ORDER BY id LIMIT 1`
  );
  return row?.id || 1;
}

async function seedCitiesAndBranches() {
  console.log('=== Seeding cities & branches ===');

  const indiaId = await getIndiaCountryId();
  const [states] = await pool.query(
    'SELECT id, name, country_id FROM states WHERE country_id = ? ORDER BY name',
    [indiaId]
  );
  const stateByName = new Map(states.map(s => [String(s.name).toLowerCase(), s]));

  let citiesInserted = 0;
  for (const [stateName, cityNames] of Object.entries(CITIES_BY_STATE_NAME)) {
    const state = stateByName.get(stateName.toLowerCase());
    if (!state) {
      console.log(`  skip cities: state not found (${stateName})`);
      continue;
    }
    const [existing] = await pool.query('SELECT name FROM cities WHERE state_id = ?', [state.id]);
    const existingNames = new Set(existing.map(c => String(c.name).toLowerCase().trim()));
    for (const name of cityNames) {
      if (existingNames.has(name.toLowerCase().trim())) continue;
      await pool.query(
        'INSERT INTO cities (state_id, country_id, name, is_active) VALUES (?, ?, ?, TRUE)',
        [state.id, indiaId, name]
      );
      citiesInserted += 1;
    }
  }

  // Ensure every India state has at least one branch (with country + optional city)
  let branchesInserted = 0;
  for (const state of states) {
    const [existingBranches] = await pool.query(
      'SELECT id, name FROM portal_branches WHERE state_id = ?',
      [state.id]
    );
    if (existingBranches.length) continue;

    if (String(state.name).toLowerCase() === 'rajasthan') {
      for (const item of RAJASTHAN_BRANCHES) {
        const [[city]] = await pool.query(
          'SELECT id FROM cities WHERE state_id = ? AND lower(name) = lower(?) LIMIT 1',
          [state.id, item.city]
        );
        await pool.query(
          `INSERT INTO portal_branches (name, country_id, state_id, city_id, is_active)
           VALUES (?, ?, ?, ?, TRUE)`,
          [item.name, indiaId, state.id, city?.id || null]
        );
        branchesInserted += 1;
      }
    } else {
      // State-level association branch (no specific city)
      await pool.query(
        `INSERT INTO portal_branches (name, country_id, state_id, city_id, is_active)
         VALUES (?, ?, ?, NULL, TRUE)`,
        [`${state.name} Branch`, indiaId, state.id]
      );
      branchesInserted += 1;
    }
  }

  // Backfill city/country on any existing branches missing mapping
  await pool.query(`
    UPDATE portal_branches b
    SET country_id = COALESCE(b.country_id, ?)
    WHERE b.country_id IS NULL AND b.state_id IS NOT NULL
  `, [indiaId]);

  await pool.query(`
    UPDATE portal_branches b
    SET city_id = c.id
    FROM cities c
    WHERE b.city_id IS NULL
      AND b.state_id IS NOT NULL
      AND c.state_id = b.state_id
      AND (
        lower(b.name) = lower(c.name)
        OR lower(b.name) = lower(c.name || ' Branch')
        OR lower(b.name) = lower(c.name || ' HQ')
        OR lower(regexp_replace(b.name, '\\s+(Branch|HQ)$', '', 'i')) = lower(c.name)
      )
  `);

  const [[cityCount]] = await pool.query('SELECT COUNT(*)::int AS cnt FROM cities');
  const [[branchCount]] = await pool.query('SELECT COUNT(*)::int AS cnt FROM portal_branches');
  console.log(`Cities inserted: ${citiesInserted} (total ${cityCount.cnt})`);
  console.log(`Branches inserted: ${branchesInserted} (total ${branchCount.cnt})`);
}

async function ensureCitiesAndBranchesSeeded() {
  try {
    // Always run hierarchy backfill lightly even when data exists
    const indiaId = await getIndiaCountryId();
    await pool.query(`
      UPDATE portal_branches b
      SET country_id = COALESCE(b.country_id, s.country_id, ?)
      FROM states s
      WHERE b.state_id = s.id AND b.country_id IS NULL
    `, [indiaId]);

    await pool.query(`
      UPDATE portal_branches b
      SET city_id = c.id
      FROM cities c
      WHERE b.city_id IS NULL
        AND b.state_id IS NOT NULL
        AND c.state_id = b.state_id
        AND (
          lower(b.name) = lower(c.name)
          OR lower(b.name) = lower(c.name || ' Branch')
          OR lower(b.name) = lower(c.name || ' HQ')
          OR lower(regexp_replace(b.name, '\\s+(Branch|HQ)$', '', 'i')) = lower(c.name)
        )
    `);

    const [[cityCount]] = await pool.query('SELECT COUNT(*)::int AS cnt FROM cities');
    const [[branchCount]] = await pool.query('SELECT COUNT(*)::int AS cnt FROM portal_branches');
    if (Number(cityCount.cnt) > 0 && Number(branchCount.cnt) > 0) {
      console.log(`[SEED] Cities (${cityCount.cnt}) and branches (${branchCount.cnt}) already present`);
      return;
    }
    console.log('[SEED] Cities/branches empty — seeding now…');
    await seedCitiesAndBranches();
    console.log('[SEED] Cities & branches seed complete ✓');
  } catch (err) {
    console.error('[SEED] Cities/branches seed failed (non-fatal):', err.message);
  }
}

module.exports = { seedCitiesAndBranches, ensureCitiesAndBranchesSeeded };

if (require.main === module) {
  seedCitiesAndBranches()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
