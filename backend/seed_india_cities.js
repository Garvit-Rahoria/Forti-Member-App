/**
 * Seed: India Cities for all States
 * Run: node seed_india_cities.js
 */
const { pool } = require('./src/config/database');

// State ID => cities list (based on DB state IDs from country_id=1)
const CITIES_BY_STATE = {
  1: [ // Andhra Pradesh
    'Visakhapatnam','Vijayawada','Guntur','Tirupati','Kakinada','Nellore','Kurnool','Rajahmundry',
    'Kadapa','Anantapur','Vizianagaram','Eluru','Ongole','Nandyal','Machilipatnam','Adoni',
    'Tenali','Proddatur','Chittoor','Hindupur','Bhimavaram','Madanapalle','Guntakal','Dharmavaram',
    'Gudivada','Narasaraopet','Tadipatri','Amaravati','Srikakulam','Parvathipuram',
  ],
  2: [ // Arunachal Pradesh
    'Itanagar','Naharlagun','Pasighat','Namsai','Bomdila','Tawang','Ziro','Along','Tezu',
    'Aalo','Roing','Khonsa','Changlang','Daporijo','Anini',
  ],
  3: [ // Assam
    'Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur','Bongaigaon',
    'Dhubri','Diphu','Karimganj','Sivasagar','Goalpara','Barpeta','Lakhimpur','Dhemaji',
    'Morigaon','Sonitpur','Kamrup','Kokrajhar','Haflong','Mangaldoi','Nalbari','Rangiya',
    'Lumding','Titabar','Gauripur','Golaghat','Duliajan','Mariani',
  ],
  4: [ // Bihar
    'Patna','Gaya','Muzaffarpur','Bhagalpur','Darbhanga','Arrah','Begusarai','Chhapra',
    'Katihar','Munger','Purnia','Saharsa','Hajipur','Sasaram','Bihar Sharif','Bettiah',
    'Motihari','Sitamarhi','Madhubani','Siwan','Buxar','Aurangabad','Jehanabad','Nawada',
    'Jamui','Khagaria','Kishanganj','Supaul','Lakhisarai','Sheikhpura','Araria','Sheohar',
    'Gopalganj','West Champaran','East Champaran','Rohtas','Vaishali',
  ],
  30: [ // Chandigarh
    'Chandigarh','Manimajra','Panchkula',
  ],
  5: [ // Chhattisgarh
    'Raipur','Bhilai','Bilaspur','Durg','Korba','Rajnandgaon','Jagdalpur','Ambikapur',
    'Raigarh','Champa','Dhamtari','Mahasamund','Kanker','Kondagaon','Narayanpur',
    'Bijapur','Sukma','Dantewada','Bemetara','Mungeli','Kabirdham','Balod',
    'Gariaband','Balrampur','Janjgir','Surajpur','Koriya','Surguja',
  ],
  31: [ // Dadra and Nagar Haveli and Daman and Diu
    'Silvassa','Daman','Diu','Naroli','Amli',
  ],
  32: [ // Delhi
    'New Delhi','Old Delhi','Dwarka','Rohini','Janakpuri','Lajpat Nagar','Karol Bagh',
    'Saket','Vasant Kunj','Pitampura','Preet Vihar','Mayur Vihar','Shahdara',
    'Narela','Bawana','Mehrauli','Okhla','Uttam Nagar','Punjabi Bagh','Paschim Vihar',
    'Ashok Vihar','Vikaspuri','Tilak Nagar','Patel Nagar','Rajouri Garden',
    'Shalimar Bagh','Moti Bagh','Lodhi Colony','Civil Lines','Model Town',
  ],
  6: [ // Goa
    'Panaji','Margao','Vasco da Gama','Mapusa','Ponda','Bicholim','Curchorem','Sanquelim',
    'Cuncolim','Canacona','Pernem','Sanguem','Quepem',
  ],
  7: [ // Gujarat
    'Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Junagadh','Gandhinagar',
    'Anand','Navsari','Morbi','Nadiad','Surendranagar','Bharuch','Mehsana','Bhuj',
    'Porbandar','Palanpur','Valsad','Amreli','Botad','Chhota Udaipur','Dahod','Patan',
    'Godhra','Kapadvanj','Sidhpur','Unjha','Ankleshwar','Vapi','Gandhidham','Veraval',
    'Dwarka','Somnath','Palitana','Gondal','Jetpur','Wankaner','Dhoraji','Upleta',
    'Amreli','Dang','Tapi','Narmada','Sabarkantha','Banaskantha',
  ],
  8: [ // Haryana
    'Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal',
    'Sonipat','Panchkula','Bhiwani','Sirsa','Bahadurgarh','Jind','Thanesar','Kaithal',
    'Palwal','Rewari','Hansi','Narnaul','Fatehabad','Gohana','Tohana','Narwana',
    'Mewat','Jhajjar','Mahendragarh','Charkhi Dadri','Nuh',
  ],
  9: [ // Himachal Pradesh
    'Shimla','Dharamshala','Solan','Mandi','Baddi','Nahan','Paonta Sahib','Sundernagar',
    'Kullu','Manali','Chamba','Hamirpur','Una','Bilaspur','Kangra','Palampur',
    'Nurpur','Yol','Nalagarh','Arki',
  ],
  33: [ // Jammu and Kashmir
    'Srinagar','Jammu','Anantnag','Baramulla','Sopore','Udhampur','Kathua','Rajouri',
    'Pulwama','Budgam','Ganderbal','Kulgam','Shopian','Bandipora','Kupwara','Handwara',
    'Punch','Reasi','Samba','Kishtwar','Ramban','Bhaderwah','Akhnoor','Mendhar',
    'Pahalgam','Gulmarg','Patnitop','Doda','Chatroo',
  ],
  10: [ // Jharkhand
    'Ranchi','Jamshedpur','Dhanbad','Bokaro Steel City','Deoghar','Phusro','Hazaribagh',
    'Giridih','Ramgarh','Medininagar','Chirkunda','Sahibganj','Dumka','Chapra',
    'Koderma','Chatra','Lohardaga','Gumla','Simdega','Pakur','Godda','Jamtara',
    'Khunti','Seraikela','West Singhbhum','East Singhbhum',
  ],
  11: [ // Karnataka
    'Bengaluru','Mysuru','Hubli','Mangaluru','Belagavi','Kalaburagi','Davanagere',
    'Ballari','Vijayapura','Shimoga','Tumkur','Raichur','Bidar','Hassan','Udupi',
    'Gadag','Bagalkot','Chitradurga','Dharwad','Chikkamagaluru','Koppal','Yadgir',
    'Chamarajanagar','Mandya','Kodagu','Chikkaballapur','Bangalore Rural','Kolar',
    'Ramanagara','Haveri','Uttara Kannada','Dakshina Kannada','Tumkuru',
  ],
  34: [ // Ladakh
    'Leh','Kargil','Diskit','Padum','Zanskar',
  ],
  35: [ // Lakshadweep
    'Kavaratti','Agatti','Andrott','Minicoy','Amini',
  ],
  13: [ // Madhya Pradesh
    'Bhopal','Indore','Gwalior','Jabalpur','Ujjain','Sagar','Dewas','Satna','Ratlam',
    'Rewa','Murwara','Singrauli','Burhanpur','Khandwa','Bhind','Chhindwara','Guna',
    'Shivpuri','Vidisha','Chhatarpur','Damoh','Mandsaur','Khargone','Neemuch',
    'Pithampur','Hoshangabad','Itarsi','Sehore','Balaghat','Seoni','Mandla',
    'Dindori','Betul','Harda','Tikamgarh','Panna','Shajapur','Agar Malwa',
    'Rajgarh','Umaria','Shahdol','Anuppur','Katni','Narsinghpur','Niwari',
  ],
  14: [ // Maharashtra
    'Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad','Solapur','Amravati',
    'Kolhapur','Akola','Latur','Chandrapur','Jalgaon','Sangli','Bhiwandi','Malegaon',
    'Nanded','Ulhasnagar','Navi Mumbai','Vasai-Virar','Dhule','Ahmednagar',
    'Raigad','Satara','Ratnagiri','Sindhudurg','Yavatmal','Buldhana','Wardha',
    'Hingoli','Parbhani','Osmanabad','Beed','Jalna','Gondia','Bhandara','Gadchiroli',
    'Washim','Palghar','Shirdi','Pandharpur','Barshi',
  ],
  15: [ // Manipur
    'Imphal','Thoubal','Bishnupur','Senapati','Churachandpur','Ukhrul','Chandel',
    'Tamenglong','Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl','Tengnoupal',
  ],
  16: [ // Meghalaya
    'Shillong','Tura','Nongstoin','Nongpoh','Jowai','Baghmara','Resubelpara',
    'Khliehriat','Williamnagar','Ampati','Mawkyrwat',
  ],
  17: [ // Mizoram
    'Aizawl','Lunglei','Champhai','Kolasib','Lawngtlai','Mamit','Saiha',
    'Serchhip','Hnahthial','Khawzawl','Saitual',
  ],
  18: [ // Nagaland
    'Kohima','Dimapur','Mokokchung','Tuensang','Wokha','Zunheboto','Mon',
    'Phek','Kiphire','Longleng','Peren',
  ],
  19: [ // Odisha
    'Bhubaneswar','Cuttack','Rourkela','Brahmapur','Sambalpur','Puri','Balasore',
    'Bhadrak','Baripada','Jharsuguda','Bargarh','Rayagada','Jeypore','Angul',
    'Dhenkanal','Keonjhar','Jagatsinghpur','Kendrapara','Ganjam','Gajapati',
    'Kalahandi','Bolangir','Sonepur','Nuapada','Boudh','Kandhamal',
    'Nayagarh','Khordha','Koraput','Malkanagiri','Nabarangpur','Sundargarh',
  ],
  36: [ // Puducherry
    'Puducherry','Karaikal','Yanam','Mahe','Ozhukarai',
  ],
  20: [ // Punjab
    'Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Hoshiarpur',
    'Batala','Pathankot','Moga','Abohar','Malerkotla','Khanna','Phagwara',
    'Muktsar','Ropar','Faridkot','Sangrur','Barnala','Nawanshahr','Rajpura',
    'Firozpur','Fazilka','Gurdaspur','Kapurthala','Tarn Taran','Mansa',
  ],
  21: [ // Rajasthan
    'Jaipur','Jodhpur','Kota','Ajmer','Bikaner','Udaipur','Bhilwara','Alwar',
    'Bharatpur','Sikar','Pali','Sri Ganganagar','Barmer','Tonk','Churu',
    'Jhunjhunu','Beawar','Hanumangarh','Nagaur','Makrana','Kishangarh','Bhiwadi',
    'Gangapur City','Balotra','Falna','Sujangarh','Nokha','Sawai Madhopur',
    'Chittorgarh','Dungarpur','Sirohi','Jaisalmer','Karauli','Dausa','Rajsamand',
    'Banswara','Baran','Bundi','Jhalawar','Dholpur','Pratapgarh',
    'Jhalarapatan','Merta','Nimbahera','Nathdwara','Kuchaman',
  ],
  22: [ // Sikkim
    'Gangtok','Namchi','Gyalshing','Mangan','Singtam','Rangpo','Jorethang',
    'Nayabazar','Rongli','Soreng',
  ],
  23: [ // Tamil Nadu
    'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli',
    'Tiruppur','Vellore','Erode','Thoothukkudi','Dindigul','Thanjavur',
    'Ranipet','Sivakasi','Karur','Udhagamandalam','Hosur','Nagercoil',
    'Kanchipuram','Kumbakonam','Tiruvannamalai','Pollachi','Rajapalayam',
    'Cuddalore','Pudukkottai','Tenkasi','Nagapattinam','Namakkal',
    'Ariyalur','Perambalur','Villupuram','Virudhunagar','Theni',
    'Krishnagiri','Dharmapuri','Tiruvarur','The Nilgiris',
  ],
  24: [ // Telangana
    'Hyderabad','Warangal','Nizamabad','Khammam','Karimnagar','Ramagundam',
    'Mahbubnagar','Nalgonda','Adilabad','Suryapet','Miryalaguda','Siddipet',
    'Jagtial','Mancherial','Nirmal','Peddapalli','Jangoan','Yadadri Bhuvanagiri',
    'Rajanna Sircilla','Medchal','Sangareddy','Medak','Kamareddy','Nagarkurnool',
    'Wanaparthy','Jogulamba Gadwal','Narayanpet','Mahabubabad','Mulugu','Bhadradri Kothagudem',
  ],
  25: [ // Tripura
    'Agartala','Dharmanagar','Udaipur','Kailashahar','Belonia','Ambassa','Sabroom',
    'Sonamura','Amarpur','Bishalgarh','Khowai','Gomati','Sepahijala','Unakoti',
  ],
  26: [ // Uttar Pradesh
    'Lucknow','Agra','Varanasi','Kanpur','Prayagraj','Meerut','Ghaziabad','Mathura',
    'Aligarh','Bareilly','Moradabad','Saharanpur','Gorakhpur','Noida','Firozabad',
    'Loni','Jhansi','Muzaffarnagar','Hapur','Rampur','Shahjahanpur','Farrukhabad',
    'Mau','Haridwar','Etawah','Mirzapur','Bulandshahr','Sambhal','Amroha',
    'Hardoi','Sitapur','Faizabad','Gonda','Sultanpur','Azamgarh','Bijnor',
    'Bahraich','Basti','Mainpuri','Unnao','Jaunpur','Fatehpur','Rae Bareli',
    'Budaun','Barabanki','Etah','Deoria','Ballia','Banda','Chitrakoot',
    'Hamirpur','Mahoba','Lalitpur','Shravasti','Balrampur','Lakhimpur Kheri',
  ],
  27: [ // Uttarakhand
    'Dehradun','Haridwar','Roorkee','Haldwani','Rudrapur','Kashipur','Rishikesh',
    'Kotdwar','Ramnagar','Pithoragarh','Almora','Pauri','Tehri','Uttarkashi',
    'Chamoli','Bageshwar','Champawat','Nainital','Mussoorie','Lansdowne',
  ],
  28: [ // West Bengal
    'Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman','Maheshtala',
    'Rajpur Sonarpur','South Dumdum','Malda','Baharampur','Habra','Kharagpur',
    'Shantipur','Dankuni','Dhulian','Ranaghat','Haldia','Raiganj','Krishnanagar',
    'Nabadwip','Medinipur','Jalpaiguri','Balurghat','Basirhat','Bankura','Cooch Behar',
    'Darjeeling','Purulia','Bongaon','Chandernagore','Serampore','Kamarhati',
    'Santipur','Bally','Uttarpara','Titagarh','North Barrackpore','Rishra',
  ],
  29: [ // Andaman and Nicobar Islands
    'Port Blair','Diglipur','Rangat','Mayabunder','Car Nicobar','Campbell Bay',
  ],
};

async function seed() {
  console.log('=== Seeding India Cities ===\n');

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [stateId, cities] of Object.entries(CITIES_BY_STATE)) {
    // Get state name for logging
    const [[state]] = await pool.query('SELECT name FROM states WHERE id=?', [stateId]);
    if (!state) { console.log(`  ⚠ State ID ${stateId} not found, skipping`); continue; }

    // Get existing cities for this state
    const [existing] = await pool.query('SELECT name FROM cities WHERE state_id=?', [stateId]);
    const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

    const toInsert = cities.filter(c => !existingNames.has(c.toLowerCase().trim()));

    if (toInsert.length === 0) {
      console.log(`  ✓ ${state.name}: all ${cities.length} cities already exist`);
      totalSkipped += cities.length;
      continue;
    }

    // Batch insert
    const values = toInsert.map(name => [stateId, name, 1]);
    await pool.query('INSERT INTO cities (state_id, name, is_active) VALUES ?', [values]);
    console.log(`  ✅ ${state.name}: inserted ${toInsert.length} cities (${cities.length - toInsert.length} already existed)`);
    totalInserted += toInsert.length;
    totalSkipped += (cities.length - toInsert.length);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Already existed: ${totalSkipped}`);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM cities');
  console.log(`Total cities in DB: ${total}`);
  process.exit(0);
}

seed().catch(e => {
  console.error('Seed error:', e.message);
  // Try without is_active column if it doesn't exist
  if (e.message.includes('is_active')) {
    console.log('Retrying without is_active column...');
    seedWithoutActive().catch(e2 => { console.error(e2.message); process.exit(1); });
  } else {
    process.exit(1);
  }
});

async function seedWithoutActive() {
  for (const [stateId, cities] of Object.entries(CITIES_BY_STATE)) {
    const [[state]] = await pool.query('SELECT name FROM states WHERE id=?', [stateId]);
    if (!state) continue;
    const [existing] = await pool.query('SELECT name FROM cities WHERE state_id=?', [stateId]);
    const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));
    const toInsert = cities.filter(c => !existingNames.has(c.toLowerCase().trim()));
    if (toInsert.length === 0) continue;
    const values = toInsert.map(name => [stateId, name]);
    await pool.query('INSERT INTO cities (state_id, name) VALUES ?', [values]);
    console.log(`  ✅ ${state.name}: inserted ${toInsert.length}`);
  }
  console.log('Done');
  process.exit(0);
}
