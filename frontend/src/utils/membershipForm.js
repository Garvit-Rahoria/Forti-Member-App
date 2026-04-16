export const DEFAULT_PHONE_PLACEHOLDER = 'e.g. 9876543210'

export const PHONE_EXAMPLE_MAP = {
  IN: 'e.g. 9876543210',
  US: 'e.g. 2025550123',
  GB: 'e.g. 7400123456',
  AE: 'e.g. 501234567',
  CA: 'e.g. 4165550123',
  AU: 'e.g. 412345678',
  SG: 'e.g. 81234567',
}

export const PHONE_VALIDATION_MAP = {
  IN: { min: 10, max: 10, pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
  US: { min: 10, max: 10, pattern: /^\d{10}$/, message: 'Enter a valid 10-digit US mobile number' },
  CA: { min: 10, max: 10, pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Canadian mobile number' },
  GB: { min: 10, max: 10, pattern: /^\d{10}$/, message: 'Enter a valid 10-digit UK mobile number' },
  AE: { min: 9, max: 9, pattern: /^\d{9}$/, message: 'Enter a valid 9-digit UAE mobile number' },
  AU: { min: 9, max: 9, pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Australian mobile number' },
  SG: { min: 8, max: 8, pattern: /^\d{8}$/, message: 'Enter a valid 8-digit Singapore mobile number' },
}

export const ORGANISATION_TYPE_OPTIONS = [
  'Individual / Student',
  'Freelancer / Self-employed',
  'Startup',
  'Private Company',
  'Government Organization',
  'NGO / Non-profit',
  'Corporate / Enterprise',
  'Other',
]

export const RAJASTHAN_MAJOR_CITIES = [
  'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bharatpur',
  'Sikar', 'Jhunjhunu', 'Dausa', 'Nagaur', 'Pali', 'Barmer', 'Jaisalmer', 'Jalore',
  'Chittorgarh', 'Rajsamand', 'Banswara', 'Dungarpur', 'Bhilwara', 'Tonk', 'Baran',
  'Bundi', 'Jhalawar', 'Sawai Madhopur', 'Karauli', 'Dholpur', 'Churu',
  'Sri Ganganagar', 'Hanumangarh', 'Beawar', 'Balotra', 'Didwana-Kuchaman',
  'Neem Ka Thana', 'Phalodi', 'Salumber', 'Shahpura', 'Anupgarh', 'Gangapur City',
  'Kotputli-Behror', 'Deeg', 'Khairthal-Tijara',
]

export const OTHER_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

export const OVERSEAS_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Congo-Brazzaville)', 'Democratic Republic of the Congo', 'Costa Rica',
  "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic (Czechia)', 'Denmark',
  'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
  'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania', 'Thailand',
  'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
]

// Static fallback list for OTP country-code selector (used when DB countries table is empty)
export const PHONE_COUNTRIES = [
  { id: 'af', name: 'Afghanistan',           iso2: 'AF', phone_code: '+93'   },
  { id: 'al', name: 'Albania',               iso2: 'AL', phone_code: '+355'  },
  { id: 'dz', name: 'Algeria',               iso2: 'DZ', phone_code: '+213'  },
  { id: 'ar', name: 'Argentina',             iso2: 'AR', phone_code: '+54'   },
  { id: 'au', name: 'Australia',             iso2: 'AU', phone_code: '+61'   },
  { id: 'at', name: 'Austria',               iso2: 'AT', phone_code: '+43'   },
  { id: 'bh', name: 'Bahrain',               iso2: 'BH', phone_code: '+973'  },
  { id: 'bd', name: 'Bangladesh',            iso2: 'BD', phone_code: '+880'  },
  { id: 'be', name: 'Belgium',               iso2: 'BE', phone_code: '+32'   },
  { id: 'br', name: 'Brazil',                iso2: 'BR', phone_code: '+55'   },
  { id: 'ca', name: 'Canada',                iso2: 'CA', phone_code: '+1'    },
  { id: 'cl', name: 'Chile',                 iso2: 'CL', phone_code: '+56'   },
  { id: 'cn', name: 'China',                 iso2: 'CN', phone_code: '+86'   },
  { id: 'co', name: 'Colombia',              iso2: 'CO', phone_code: '+57'   },
  { id: 'hr', name: 'Croatia',               iso2: 'HR', phone_code: '+385'  },
  { id: 'cy', name: 'Cyprus',                iso2: 'CY', phone_code: '+357'  },
  { id: 'cz', name: 'Czech Republic',        iso2: 'CZ', phone_code: '+420'  },
  { id: 'dk', name: 'Denmark',               iso2: 'DK', phone_code: '+45'   },
  { id: 'eg', name: 'Egypt',                 iso2: 'EG', phone_code: '+20'   },
  { id: 'et', name: 'Ethiopia',              iso2: 'ET', phone_code: '+251'  },
  { id: 'fi', name: 'Finland',               iso2: 'FI', phone_code: '+358'  },
  { id: 'fr', name: 'France',                iso2: 'FR', phone_code: '+33'   },
  { id: 'de', name: 'Germany',               iso2: 'DE', phone_code: '+49'   },
  { id: 'gh', name: 'Ghana',                 iso2: 'GH', phone_code: '+233'  },
  { id: 'gr', name: 'Greece',                iso2: 'GR', phone_code: '+30'   },
  { id: 'hk', name: 'Hong Kong',             iso2: 'HK', phone_code: '+852'  },
  { id: 'hu', name: 'Hungary',               iso2: 'HU', phone_code: '+36'   },
  { id: 'in', name: 'India',                 iso2: 'IN', phone_code: '+91'   },
  { id: 'id', name: 'Indonesia',             iso2: 'ID', phone_code: '+62'   },
  { id: 'ir', name: 'Iran',                  iso2: 'IR', phone_code: '+98'   },
  { id: 'iq', name: 'Iraq',                  iso2: 'IQ', phone_code: '+964'  },
  { id: 'ie', name: 'Ireland',               iso2: 'IE', phone_code: '+353'  },
  { id: 'il', name: 'Israel',                iso2: 'IL', phone_code: '+972'  },
  { id: 'it', name: 'Italy',                 iso2: 'IT', phone_code: '+39'   },
  { id: 'jp', name: 'Japan',                 iso2: 'JP', phone_code: '+81'   },
  { id: 'jo', name: 'Jordan',                iso2: 'JO', phone_code: '+962'  },
  { id: 'ke', name: 'Kenya',                 iso2: 'KE', phone_code: '+254'  },
  { id: 'kw', name: 'Kuwait',                iso2: 'KW', phone_code: '+965'  },
  { id: 'lb', name: 'Lebanon',               iso2: 'LB', phone_code: '+961'  },
  { id: 'my', name: 'Malaysia',              iso2: 'MY', phone_code: '+60'   },
  { id: 'mv', name: 'Maldives',              iso2: 'MV', phone_code: '+960'  },
  { id: 'mx', name: 'Mexico',                iso2: 'MX', phone_code: '+52'   },
  { id: 'ma', name: 'Morocco',               iso2: 'MA', phone_code: '+212'  },
  { id: 'mm', name: 'Myanmar',               iso2: 'MM', phone_code: '+95'   },
  { id: 'np', name: 'Nepal',                 iso2: 'NP', phone_code: '+977'  },
  { id: 'nl', name: 'Netherlands',           iso2: 'NL', phone_code: '+31'   },
  { id: 'nz', name: 'New Zealand',           iso2: 'NZ', phone_code: '+64'   },
  { id: 'ng', name: 'Nigeria',               iso2: 'NG', phone_code: '+234'  },
  { id: 'no', name: 'Norway',                iso2: 'NO', phone_code: '+47'   },
  { id: 'om', name: 'Oman',                  iso2: 'OM', phone_code: '+968'  },
  { id: 'pk', name: 'Pakistan',              iso2: 'PK', phone_code: '+92'   },
  { id: 'ph', name: 'Philippines',           iso2: 'PH', phone_code: '+63'   },
  { id: 'pl', name: 'Poland',                iso2: 'PL', phone_code: '+48'   },
  { id: 'pt', name: 'Portugal',              iso2: 'PT', phone_code: '+351'  },
  { id: 'qa', name: 'Qatar',                 iso2: 'QA', phone_code: '+974'  },
  { id: 'ro', name: 'Romania',               iso2: 'RO', phone_code: '+40'   },
  { id: 'ru', name: 'Russia',                iso2: 'RU', phone_code: '+7'    },
  { id: 'sa', name: 'Saudi Arabia',          iso2: 'SA', phone_code: '+966'  },
  { id: 'sg', name: 'Singapore',             iso2: 'SG', phone_code: '+65'   },
  { id: 'za', name: 'South Africa',          iso2: 'ZA', phone_code: '+27'   },
  { id: 'kr', name: 'South Korea',           iso2: 'KR', phone_code: '+82'   },
  { id: 'es', name: 'Spain',                 iso2: 'ES', phone_code: '+34'   },
  { id: 'lk', name: 'Sri Lanka',             iso2: 'LK', phone_code: '+94'   },
  { id: 'se', name: 'Sweden',                iso2: 'SE', phone_code: '+46'   },
  { id: 'ch', name: 'Switzerland',           iso2: 'CH', phone_code: '+41'   },
  { id: 'tw', name: 'Taiwan',                iso2: 'TW', phone_code: '+886'  },
  { id: 'tz', name: 'Tanzania',              iso2: 'TZ', phone_code: '+255'  },
  { id: 'th', name: 'Thailand',              iso2: 'TH', phone_code: '+66'   },
  { id: 'tr', name: 'Turkey',                iso2: 'TR', phone_code: '+90'   },
  { id: 'ae', name: 'United Arab Emirates',  iso2: 'AE', phone_code: '+971'  },
  { id: 'gb', name: 'United Kingdom',        iso2: 'GB', phone_code: '+44'   },
  { id: 'us', name: 'United States',         iso2: 'US', phone_code: '+1'    },
  { id: 'uy', name: 'Uruguay',               iso2: 'UY', phone_code: '+598'  },
  { id: 'uz', name: 'Uzbekistan',            iso2: 'UZ', phone_code: '+998'  },
  { id: 'vn', name: 'Vietnam',               iso2: 'VN', phone_code: '+84'   },
  { id: 'ye', name: 'Yemen',                 iso2: 'YE', phone_code: '+967'  },
  { id: 'zm', name: 'Zambia',                iso2: 'ZM', phone_code: '+260'  },
  { id: 'zw', name: 'Zimbabwe',              iso2: 'ZW', phone_code: '+263'  },
]

export function getFlagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '🌐'
  return iso2
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

export function getPhonePlaceholder(country) {
  return PHONE_EXAMPLE_MAP[(country?.iso2 || '').toUpperCase()] || DEFAULT_PHONE_PLACEHOLDER
}

export function getPhoneValidation(country) {
  const iso2 = (country?.iso2 || '').toUpperCase()
  return PHONE_VALIDATION_MAP[iso2] || {
    min: 6,
    max: 15,
    pattern: /^\d{6,15}$/,
    message: 'Enter a valid mobile number',
  }
}

export function normalizePhoneInput(value, country) {
  const digits = String(value || '').replace(/\D/g, '')
  const { max } = getPhoneValidation(country)
  return digits.slice(0, max)
}

export function validatePhoneNumber(value, country) {
  const digits = normalizePhoneInput(value, country)
  const rule = getPhoneValidation(country)
  if (!digits) return 'Mobile number is required'
  if (!rule.pattern.test(digits)) return rule.message
  return ''
}

export function formatFullPhoneNumber(country, nationalNumber) {
  const prefix = String(country?.phone_code || '').trim()
  const digits = normalizePhoneInput(nationalNumber, country)
  if (!prefix) return digits
  return `${prefix}${digits}`
}

export function getCountryDialDisplay(country) {
  const flag = getFlagEmoji(country?.iso2)
  const phoneCode = country?.phone_code || '+00'
  return `${flag} ${phoneCode}`
}

export function getFixedCurrencyByCountry(countryName) {
  return String(countryName || '').trim().toLowerCase() === 'india' ? 'INR' : 'USD'
}
