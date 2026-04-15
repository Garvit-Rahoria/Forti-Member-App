/**
 * FORTI Portal - Seed countries, states, cities
 * Run from backend directory: node seedLocations.js
 */
const mysql = require('mysql2/promise');

const cfg = {
  host: '127.0.0.1', port: 3306,
  user: 'root', password: 'lifepulse123',
  database: 'forti_membership'
};

const COUNTRIES = [
  { name: 'India',                iso: 'IN', phone: '+91',  currency: 'INR' },
  { name: 'United States',        iso: 'US', phone: '+1',   currency: 'USD' },
  { name: 'United Kingdom',       iso: 'GB', phone: '+44',  currency: 'GBP' },
  { name: 'United Arab Emirates', iso: 'AE', phone: '+971', currency: 'AED' },
  { name: 'Australia',            iso: 'AU', phone: '+61',  currency: 'AUD' },
  { name: 'Canada',               iso: 'CA', phone: '+1',   currency: 'CAD' },
  { name: 'Singapore',            iso: 'SG', phone: '+65',  currency: 'SGD' },
  { name: 'Germany',              iso: 'DE', phone: '+49',  currency: 'EUR' },
  { name: 'France',               iso: 'FR', phone: '+33',  currency: 'EUR' },
  { name: 'Netherlands',          iso: 'NL', phone: '+31',  currency: 'EUR' },
  { name: 'New Zealand',          iso: 'NZ', phone: '+64',  currency: 'NZD' },
  { name: 'South Africa',         iso: 'ZA', phone: '+27',  currency: 'ZAR' },
  { name: 'Malaysia',             iso: 'MY', phone: '+60',  currency: 'MYR' },
  { name: 'Bahrain',              iso: 'BH', phone: '+973', currency: 'BHD' },
  { name: 'Qatar',                iso: 'QA', phone: '+974', currency: 'QAR' },
  { name: 'Kuwait',               iso: 'KW', phone: '+965', currency: 'KWD' },
  { name: 'Oman',                 iso: 'OM', phone: '+968', currency: 'OMR' },
  { name: 'Saudi Arabia',         iso: 'SA', phone: '+966', currency: 'SAR' },
  { name: 'Japan',                iso: 'JP', phone: '+81',  currency: 'JPY' },
  { name: 'China',                iso: 'CN', phone: '+86',  currency: 'CNY' },
  { name: 'Sri Lanka',            iso: 'LK', phone: '+94',  currency: 'LKR' },
  { name: 'Nepal',                iso: 'NP', phone: '+977', currency: 'NPR' },
  { name: 'Bangladesh',           iso: 'BD', phone: '+880', currency: 'BDT' },
  { name: 'Pakistan',             iso: 'PK', phone: '+92',  currency: 'PKR' },
  { name: 'Nigeria',              iso: 'NG', phone: '+234', currency: 'NGN' },
  { name: 'Kenya',                iso: 'KE', phone: '+254', currency: 'KES' },
  { name: 'Ghana',                iso: 'GH', phone: '+233', currency: 'GHS' },
  { name: 'Ireland',              iso: 'IE', phone: '+353', currency: 'EUR' },
  { name: 'Sweden',               iso: 'SE', phone: '+46',  currency: 'SEK' },
  { name: 'Switzerland',          iso: 'CH', phone: '+41',  currency: 'CHF' },
  { name: 'Italy',                iso: 'IT', phone: '+39',  currency: 'EUR' },
  { name: 'Spain',                iso: 'ES', phone: '+34',  currency: 'EUR' },
  { name: 'Brazil',               iso: 'BR', phone: '+55',  currency: 'BRL' },
  { name: 'Mexico',               iso: 'MX', phone: '+52',  currency: 'MXN' },
  { name: 'Indonesia',            iso: 'ID', phone: '+62',  currency: 'IDR' },
];

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
];

const UK_REGIONS = [
  'England','Scotland','Wales','Northern Ireland',
  'Greater London','South East','South West','East of England',
  'West Midlands','East Midlands','Yorkshire and Humber',
  'North West','North East',
];

const AUS_STATES = [
  'New South Wales','Victoria','Queensland','South Australia',
  'Western Australia','Tasmania','Australian Capital Territory','Northern Territory',
];

const CANADA_PROVINCES = [
  'Ontario','Quebec','British Columbia','Alberta','Manitoba','Saskatchewan',
  'Nova Scotia','New Brunswick','Newfoundland and Labrador',
  'Prince Edward Island','Northwest Territories','Nunavut','Yukon',
];

const UAE_EMIRATES = [
  'Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah',
];

async function seed() {
  const c = await mysql.createConnection(cfg);
  console.log('Connected');

  // Create countries table
  await c.query(`CREATE TABLE IF NOT EXISTS countries (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    iso_code     VARCHAR(5) NULL,
    phone_prefix VARCHAR(10) NULL,
    currency     VARCHAR(10) NULL,
    is_active    TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_iso (iso_code)
  )`);

  // Create states table
  await c.query(`CREATE TABLE IF NOT EXISTS states (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    country_id INT UNSIGNED NOT NULL,
    name       VARCHAR(120) NOT NULL,
    code       VARCHAR(10) NULL,
    INDEX idx_country (country_id)
  )`);

  // Create cities table
  await c.query(`CREATE TABLE IF NOT EXISTS cities (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    state_id INT UNSIGNED NOT NULL,
    name     VARCHAR(120) NOT NULL,
    INDEX idx_state (state_id)
  )`);

  console.log('Tables ready');

  // Clear old data
  await c.query('SET FOREIGN_KEY_CHECKS=0');
  await c.query('TRUNCATE TABLE cities');
  await c.query('TRUNCATE TABLE states');
  await c.query('TRUNCATE TABLE countries');
  await c.query('SET FOREIGN_KEY_CHECKS=1');

  // Insert countries
  for (const country of COUNTRIES) {
    await c.query(
      'INSERT INTO countries (name, iso_code, phone_prefix, currency) VALUES (?,?,?,?)',
      [country.name, country.iso, country.phone, country.currency]
    );
  }
  console.log(`Inserted ${COUNTRIES.length} countries`);

  // Helper: get country ID by ISO
  async function getCountryId(iso) {
    const [r] = await c.query('SELECT id FROM countries WHERE iso_code=?', [iso]);
    return r[0]?.id;
  }

  // Insert states for each country
  const countryStates = [
    { iso: 'IN', states: INDIA_STATES },
    { iso: 'US', states: US_STATES },
    { iso: 'GB', states: UK_REGIONS },
    { iso: 'AU', states: AUS_STATES },
    { iso: 'CA', states: CANADA_PROVINCES },
    { iso: 'AE', states: UAE_EMIRATES },
  ];

  for (const { iso, states } of countryStates) {
    const cid = await getCountryId(iso);
    if (!cid) continue;
    for (const name of states) {
      await c.query('INSERT INTO states (country_id, name) VALUES (?,?)', [cid, name]);
    }
    console.log(`  + ${states.length} states for ${iso}`);
  }

  // Seed major Indian cities per state
  const indianCities = {
    'Maharashtra':    ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Solapur','Kolhapur','Thane','Navi Mumbai'],
    'Karnataka':      ['Bangalore','Mysore','Hubli','Dharwad','Belgaum','Mangalore','Gulbarga','Bijapur'],
    'Tamil Nadu':     ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode'],
    'Telangana':      ['Hyderabad','Warangal','Karimnagar','Nizamabad','Khammam','Ramagundam'],
    'Andhra Pradesh': ['Visakhapatnam','Vijayawada','Guntur','Kakinada','Rajahmundry','Tirupati','Nellore'],
    'Kerala':         ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kannur','Kollam','Palakkad'],
    'Gujarat':        ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand'],
    'Rajasthan':      ['Jaipur','Jodhpur','Udaipur','Ajmer','Kota','Bikaner','Alwar','Bhilwara'],
    'Uttar Pradesh':  ['Lucknow','Kanpur','Agra','Varanasi','Meerut','Prayagraj','Ghaziabad','Noida'],
    'Delhi':          ['New Delhi','Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi','Dwarka','Rohini'],
    'West Bengal':    ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Malda','Bardhaman'],
    'Punjab':         ['Chandigarh','Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali'],
    'Haryana':        ['Gurugram','Faridabad','Rohtak','Hisar','Panipat','Ambala','Yamunanagar'],
    'Madhya Pradesh': ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Rewa'],
    'Bihar':          ['Patna','Gaya','Muzaffarpur','Bhagalpur','Purnia','Darbhanga','Bihar Sharif'],
    'Odisha':         ['Bhubaneswar','Cuttack','Rourkela','Brahmapur','Sambalpur','Puri','Balasore'],
    'Assam':          ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur'],
    'Jharkhand':      ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar','Hazaribagh','Giridih'],
    'Chhattisgarh':   ['Raipur','Bhilai','Bilaspur','Korba','Durg','Rajnandgaon','Jagdalpur'],
    'Uttarakhand':    ['Dehradun','Haridwar','Rishikesh','Roorkee','Nainital','Haldwani','Rudrapur'],
    'Himachal Pradesh':['Shimla','Manali','Dharamsala','Kangra','Mandi','Solan','Kullu'],
    'Goa':            ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda'],
  };

  const [indiaRows] = await c.query('SELECT id FROM countries WHERE iso_code=?', ['IN']);
  const indiaId = indiaRows[0]?.id;
  if (indiaId) {
    for (const [stateName, cityList] of Object.entries(indianCities)) {
      const [stateRows] = await c.query('SELECT id FROM states WHERE country_id=? AND name=?', [indiaId, stateName]);
      if (!stateRows.length) continue;
      const stateId = stateRows[0].id;
      for (const city of cityList) {
        await c.query('INSERT INTO cities (state_id, name) VALUES (?,?)', [stateId, city]);
      }
    }
    console.log('  + Indian cities seeded');
  }

  const [total] = await c.query('SELECT COUNT(*) AS n FROM countries');
  const [totalS] = await c.query('SELECT COUNT(*) AS n FROM states');
  const [totalC] = await c.query('SELECT COUNT(*) AS n FROM cities');
  console.log(`\nDone! Countries: ${total[0].n}, States: ${totalS[0].n}, Cities: ${totalC[0].n}`);

  await c.end();
}

seed().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
