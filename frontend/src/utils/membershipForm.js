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

// Full international country list with dialing codes (used as static fallback + phone-code merge source)
export const PHONE_COUNTRIES = [
  { id: 'af', name: 'Afghanistan',                    iso2: 'AF', phone_code: '+93'   },
  { id: 'al', name: 'Albania',                        iso2: 'AL', phone_code: '+355'  },
  { id: 'dz', name: 'Algeria',                        iso2: 'DZ', phone_code: '+213'  },
  { id: 'ad', name: 'Andorra',                        iso2: 'AD', phone_code: '+376'  },
  { id: 'ao', name: 'Angola',                         iso2: 'AO', phone_code: '+244'  },
  { id: 'ag', name: 'Antigua and Barbuda',             iso2: 'AG', phone_code: '+1268' },
  { id: 'ar', name: 'Argentina',                      iso2: 'AR', phone_code: '+54'   },
  { id: 'am', name: 'Armenia',                        iso2: 'AM', phone_code: '+374'  },
  { id: 'au', name: 'Australia',                      iso2: 'AU', phone_code: '+61'   },
  { id: 'at', name: 'Austria',                        iso2: 'AT', phone_code: '+43'   },
  { id: 'az', name: 'Azerbaijan',                     iso2: 'AZ', phone_code: '+994'  },
  { id: 'bs', name: 'Bahamas',                        iso2: 'BS', phone_code: '+1242' },
  { id: 'bh', name: 'Bahrain',                        iso2: 'BH', phone_code: '+973'  },
  { id: 'bd', name: 'Bangladesh',                     iso2: 'BD', phone_code: '+880'  },
  { id: 'bb', name: 'Barbados',                       iso2: 'BB', phone_code: '+1246' },
  { id: 'by', name: 'Belarus',                        iso2: 'BY', phone_code: '+375'  },
  { id: 'be', name: 'Belgium',                        iso2: 'BE', phone_code: '+32'   },
  { id: 'bz', name: 'Belize',                         iso2: 'BZ', phone_code: '+501'  },
  { id: 'bj', name: 'Benin',                          iso2: 'BJ', phone_code: '+229'  },
  { id: 'bt', name: 'Bhutan',                         iso2: 'BT', phone_code: '+975'  },
  { id: 'bo', name: 'Bolivia',                        iso2: 'BO', phone_code: '+591'  },
  { id: 'ba', name: 'Bosnia and Herzegovina',          iso2: 'BA', phone_code: '+387'  },
  { id: 'bw', name: 'Botswana',                       iso2: 'BW', phone_code: '+267'  },
  { id: 'br', name: 'Brazil',                         iso2: 'BR', phone_code: '+55'   },
  { id: 'bn', name: 'Brunei',                         iso2: 'BN', phone_code: '+673'  },
  { id: 'bg', name: 'Bulgaria',                       iso2: 'BG', phone_code: '+359'  },
  { id: 'bf', name: 'Burkina Faso',                   iso2: 'BF', phone_code: '+226'  },
  { id: 'bi', name: 'Burundi',                        iso2: 'BI', phone_code: '+257'  },
  { id: 'cv', name: 'Cabo Verde',                     iso2: 'CV', phone_code: '+238'  },
  { id: 'kh', name: 'Cambodia',                       iso2: 'KH', phone_code: '+855'  },
  { id: 'cm', name: 'Cameroon',                       iso2: 'CM', phone_code: '+237'  },
  { id: 'ca', name: 'Canada',                         iso2: 'CA', phone_code: '+1'    },
  { id: 'cf', name: 'Central African Republic',       iso2: 'CF', phone_code: '+236'  },
  { id: 'td', name: 'Chad',                           iso2: 'TD', phone_code: '+235'  },
  { id: 'cl', name: 'Chile',                          iso2: 'CL', phone_code: '+56'   },
  { id: 'cn', name: 'China',                          iso2: 'CN', phone_code: '+86'   },
  { id: 'co', name: 'Colombia',                       iso2: 'CO', phone_code: '+57'   },
  { id: 'km', name: 'Comoros',                        iso2: 'KM', phone_code: '+269'  },
  { id: 'cg', name: 'Congo',                          iso2: 'CG', phone_code: '+242'  },
  { id: 'cd', name: 'Congo (DRC)',                    iso2: 'CD', phone_code: '+243'  },
  { id: 'cr', name: 'Costa Rica',                     iso2: 'CR', phone_code: '+506'  },
  { id: 'ci', name: "Cote d'Ivoire",                  iso2: 'CI', phone_code: '+225'  },
  { id: 'hr', name: 'Croatia',                        iso2: 'HR', phone_code: '+385'  },
  { id: 'cu', name: 'Cuba',                           iso2: 'CU', phone_code: '+53'   },
  { id: 'cy', name: 'Cyprus',                         iso2: 'CY', phone_code: '+357'  },
  { id: 'cz', name: 'Czech Republic',                 iso2: 'CZ', phone_code: '+420'  },
  { id: 'dk', name: 'Denmark',                        iso2: 'DK', phone_code: '+45'   },
  { id: 'dj', name: 'Djibouti',                       iso2: 'DJ', phone_code: '+253'  },
  { id: 'dm', name: 'Dominica',                       iso2: 'DM', phone_code: '+1767' },
  { id: 'do', name: 'Dominican Republic',             iso2: 'DO', phone_code: '+1809' },
  { id: 'ec', name: 'Ecuador',                        iso2: 'EC', phone_code: '+593'  },
  { id: 'eg', name: 'Egypt',                          iso2: 'EG', phone_code: '+20'   },
  { id: 'sv', name: 'El Salvador',                    iso2: 'SV', phone_code: '+503'  },
  { id: 'gq', name: 'Equatorial Guinea',              iso2: 'GQ', phone_code: '+240'  },
  { id: 'er', name: 'Eritrea',                        iso2: 'ER', phone_code: '+291'  },
  { id: 'ee', name: 'Estonia',                        iso2: 'EE', phone_code: '+372'  },
  { id: 'sz', name: 'Eswatini',                       iso2: 'SZ', phone_code: '+268'  },
  { id: 'et', name: 'Ethiopia',                       iso2: 'ET', phone_code: '+251'  },
  { id: 'fj', name: 'Fiji',                           iso2: 'FJ', phone_code: '+679'  },
  { id: 'fi', name: 'Finland',                        iso2: 'FI', phone_code: '+358'  },
  { id: 'fr', name: 'France',                         iso2: 'FR', phone_code: '+33'   },
  { id: 'ga', name: 'Gabon',                          iso2: 'GA', phone_code: '+241'  },
  { id: 'gm', name: 'Gambia',                         iso2: 'GM', phone_code: '+220'  },
  { id: 'ge', name: 'Georgia',                        iso2: 'GE', phone_code: '+995'  },
  { id: 'de', name: 'Germany',                        iso2: 'DE', phone_code: '+49'   },
  { id: 'gh', name: 'Ghana',                          iso2: 'GH', phone_code: '+233'  },
  { id: 'gr', name: 'Greece',                         iso2: 'GR', phone_code: '+30'   },
  { id: 'gd', name: 'Grenada',                        iso2: 'GD', phone_code: '+1473' },
  { id: 'gt', name: 'Guatemala',                      iso2: 'GT', phone_code: '+502'  },
  { id: 'gn', name: 'Guinea',                         iso2: 'GN', phone_code: '+224'  },
  { id: 'gw', name: 'Guinea-Bissau',                  iso2: 'GW', phone_code: '+245'  },
  { id: 'gy', name: 'Guyana',                         iso2: 'GY', phone_code: '+592'  },
  { id: 'ht', name: 'Haiti',                          iso2: 'HT', phone_code: '+509'  },
  { id: 'hn', name: 'Honduras',                       iso2: 'HN', phone_code: '+504'  },
  { id: 'hk', name: 'Hong Kong',                      iso2: 'HK', phone_code: '+852'  },
  { id: 'hu', name: 'Hungary',                        iso2: 'HU', phone_code: '+36'   },
  { id: 'is', name: 'Iceland',                        iso2: 'IS', phone_code: '+354'  },
  { id: 'in', name: 'India',                          iso2: 'IN', phone_code: '+91'   },
  { id: 'id', name: 'Indonesia',                      iso2: 'ID', phone_code: '+62'   },
  { id: 'ir', name: 'Iran',                           iso2: 'IR', phone_code: '+98'   },
  { id: 'iq', name: 'Iraq',                           iso2: 'IQ', phone_code: '+964'  },
  { id: 'ie', name: 'Ireland',                        iso2: 'IE', phone_code: '+353'  },
  { id: 'il', name: 'Israel',                         iso2: 'IL', phone_code: '+972'  },
  { id: 'it', name: 'Italy',                          iso2: 'IT', phone_code: '+39'   },
  { id: 'jm', name: 'Jamaica',                        iso2: 'JM', phone_code: '+1876' },
  { id: 'jp', name: 'Japan',                          iso2: 'JP', phone_code: '+81'   },
  { id: 'jo', name: 'Jordan',                         iso2: 'JO', phone_code: '+962'  },
  { id: 'kz', name: 'Kazakhstan',                     iso2: 'KZ', phone_code: '+7'    },
  { id: 'ke', name: 'Kenya',                          iso2: 'KE', phone_code: '+254'  },
  { id: 'ki', name: 'Kiribati',                       iso2: 'KI', phone_code: '+686'  },
  { id: 'xk', name: 'Kosovo',                         iso2: 'XK', phone_code: '+383'  },
  { id: 'kw', name: 'Kuwait',                         iso2: 'KW', phone_code: '+965'  },
  { id: 'kg', name: 'Kyrgyzstan',                     iso2: 'KG', phone_code: '+996'  },
  { id: 'la', name: 'Laos',                           iso2: 'LA', phone_code: '+856'  },
  { id: 'lv', name: 'Latvia',                         iso2: 'LV', phone_code: '+371'  },
  { id: 'lb', name: 'Lebanon',                        iso2: 'LB', phone_code: '+961'  },
  { id: 'ls', name: 'Lesotho',                        iso2: 'LS', phone_code: '+266'  },
  { id: 'lr', name: 'Liberia',                        iso2: 'LR', phone_code: '+231'  },
  { id: 'ly', name: 'Libya',                          iso2: 'LY', phone_code: '+218'  },
  { id: 'li', name: 'Liechtenstein',                  iso2: 'LI', phone_code: '+423'  },
  { id: 'lt', name: 'Lithuania',                      iso2: 'LT', phone_code: '+370'  },
  { id: 'lu', name: 'Luxembourg',                     iso2: 'LU', phone_code: '+352'  },
  { id: 'mg', name: 'Madagascar',                     iso2: 'MG', phone_code: '+261'  },
  { id: 'mw', name: 'Malawi',                         iso2: 'MW', phone_code: '+265'  },
  { id: 'my', name: 'Malaysia',                       iso2: 'MY', phone_code: '+60'   },
  { id: 'mv', name: 'Maldives',                       iso2: 'MV', phone_code: '+960'  },
  { id: 'ml', name: 'Mali',                           iso2: 'ML', phone_code: '+223'  },
  { id: 'mt', name: 'Malta',                          iso2: 'MT', phone_code: '+356'  },
  { id: 'mh', name: 'Marshall Islands',               iso2: 'MH', phone_code: '+692'  },
  { id: 'mr', name: 'Mauritania',                     iso2: 'MR', phone_code: '+222'  },
  { id: 'mu', name: 'Mauritius',                      iso2: 'MU', phone_code: '+230'  },
  { id: 'mx', name: 'Mexico',                         iso2: 'MX', phone_code: '+52'   },
  { id: 'fm', name: 'Micronesia',                     iso2: 'FM', phone_code: '+691'  },
  { id: 'md', name: 'Moldova',                        iso2: 'MD', phone_code: '+373'  },
  { id: 'mc', name: 'Monaco',                         iso2: 'MC', phone_code: '+377'  },
  { id: 'mn', name: 'Mongolia',                       iso2: 'MN', phone_code: '+976'  },
  { id: 'me', name: 'Montenegro',                     iso2: 'ME', phone_code: '+382'  },
  { id: 'ma', name: 'Morocco',                        iso2: 'MA', phone_code: '+212'  },
  { id: 'mz', name: 'Mozambique',                     iso2: 'MZ', phone_code: '+258'  },
  { id: 'mm', name: 'Myanmar',                        iso2: 'MM', phone_code: '+95'   },
  { id: 'na', name: 'Namibia',                        iso2: 'NA', phone_code: '+264'  },
  { id: 'nr', name: 'Nauru',                          iso2: 'NR', phone_code: '+674'  },
  { id: 'np', name: 'Nepal',                          iso2: 'NP', phone_code: '+977'  },
  { id: 'nl', name: 'Netherlands',                    iso2: 'NL', phone_code: '+31'   },
  { id: 'nz', name: 'New Zealand',                    iso2: 'NZ', phone_code: '+64'   },
  { id: 'ni', name: 'Nicaragua',                      iso2: 'NI', phone_code: '+505'  },
  { id: 'ne', name: 'Niger',                          iso2: 'NE', phone_code: '+227'  },
  { id: 'ng', name: 'Nigeria',                        iso2: 'NG', phone_code: '+234'  },
  { id: 'kp', name: 'North Korea',                    iso2: 'KP', phone_code: '+850'  },
  { id: 'mk', name: 'North Macedonia',                iso2: 'MK', phone_code: '+389'  },
  { id: 'no', name: 'Norway',                         iso2: 'NO', phone_code: '+47'   },
  { id: 'om', name: 'Oman',                           iso2: 'OM', phone_code: '+968'  },
  { id: 'pk', name: 'Pakistan',                       iso2: 'PK', phone_code: '+92'   },
  { id: 'pw', name: 'Palau',                          iso2: 'PW', phone_code: '+680'  },
  { id: 'ps', name: 'Palestine',                      iso2: 'PS', phone_code: '+970'  },
  { id: 'pa', name: 'Panama',                         iso2: 'PA', phone_code: '+507'  },
  { id: 'pg', name: 'Papua New Guinea',               iso2: 'PG', phone_code: '+675'  },
  { id: 'py', name: 'Paraguay',                       iso2: 'PY', phone_code: '+595'  },
  { id: 'pe', name: 'Peru',                           iso2: 'PE', phone_code: '+51'   },
  { id: 'ph', name: 'Philippines',                    iso2: 'PH', phone_code: '+63'   },
  { id: 'pl', name: 'Poland',                         iso2: 'PL', phone_code: '+48'   },
  { id: 'pt', name: 'Portugal',                       iso2: 'PT', phone_code: '+351'  },
  { id: 'qa', name: 'Qatar',                          iso2: 'QA', phone_code: '+974'  },
  { id: 'ro', name: 'Romania',                        iso2: 'RO', phone_code: '+40'   },
  { id: 'ru', name: 'Russia',                         iso2: 'RU', phone_code: '+7'    },
  { id: 'rw', name: 'Rwanda',                         iso2: 'RW', phone_code: '+250'  },
  { id: 'kn', name: 'Saint Kitts and Nevis',          iso2: 'KN', phone_code: '+1869' },
  { id: 'lc', name: 'Saint Lucia',                    iso2: 'LC', phone_code: '+1758' },
  { id: 'vc', name: 'Saint Vincent and the Grenadines', iso2: 'VC', phone_code: '+1784' },
  { id: 'ws', name: 'Samoa',                          iso2: 'WS', phone_code: '+685'  },
  { id: 'sm', name: 'San Marino',                     iso2: 'SM', phone_code: '+378'  },
  { id: 'st', name: 'Sao Tome and Principe',          iso2: 'ST', phone_code: '+239'  },
  { id: 'sa', name: 'Saudi Arabia',                   iso2: 'SA', phone_code: '+966'  },
  { id: 'sn', name: 'Senegal',                        iso2: 'SN', phone_code: '+221'  },
  { id: 'rs', name: 'Serbia',                         iso2: 'RS', phone_code: '+381'  },
  { id: 'sc', name: 'Seychelles',                     iso2: 'SC', phone_code: '+248'  },
  { id: 'sl', name: 'Sierra Leone',                   iso2: 'SL', phone_code: '+232'  },
  { id: 'sg', name: 'Singapore',                      iso2: 'SG', phone_code: '+65'   },
  { id: 'sk', name: 'Slovakia',                       iso2: 'SK', phone_code: '+421'  },
  { id: 'si', name: 'Slovenia',                       iso2: 'SI', phone_code: '+386'  },
  { id: 'sb', name: 'Solomon Islands',                iso2: 'SB', phone_code: '+677'  },
  { id: 'so', name: 'Somalia',                        iso2: 'SO', phone_code: '+252'  },
  { id: 'za', name: 'South Africa',                   iso2: 'ZA', phone_code: '+27'   },
  { id: 'ss', name: 'South Sudan',                    iso2: 'SS', phone_code: '+211'  },
  { id: 'kr', name: 'South Korea',                    iso2: 'KR', phone_code: '+82'   },
  { id: 'es', name: 'Spain',                          iso2: 'ES', phone_code: '+34'   },
  { id: 'lk', name: 'Sri Lanka',                      iso2: 'LK', phone_code: '+94'   },
  { id: 'sd', name: 'Sudan',                          iso2: 'SD', phone_code: '+249'  },
  { id: 'sr', name: 'Suriname',                       iso2: 'SR', phone_code: '+597'  },
  { id: 'se', name: 'Sweden',                         iso2: 'SE', phone_code: '+46'   },
  { id: 'ch', name: 'Switzerland',                    iso2: 'CH', phone_code: '+41'   },
  { id: 'sy', name: 'Syria',                          iso2: 'SY', phone_code: '+963'  },
  { id: 'tw', name: 'Taiwan',                         iso2: 'TW', phone_code: '+886'  },
  { id: 'tj', name: 'Tajikistan',                     iso2: 'TJ', phone_code: '+992'  },
  { id: 'tz', name: 'Tanzania',                       iso2: 'TZ', phone_code: '+255'  },
  { id: 'th', name: 'Thailand',                       iso2: 'TH', phone_code: '+66'   },
  { id: 'tl', name: 'Timor-Leste',                    iso2: 'TL', phone_code: '+670'  },
  { id: 'tg', name: 'Togo',                           iso2: 'TG', phone_code: '+228'  },
  { id: 'to', name: 'Tonga',                          iso2: 'TO', phone_code: '+676'  },
  { id: 'tt', name: 'Trinidad and Tobago',            iso2: 'TT', phone_code: '+1868' },
  { id: 'tn', name: 'Tunisia',                        iso2: 'TN', phone_code: '+216'  },
  { id: 'tr', name: 'Turkey',                         iso2: 'TR', phone_code: '+90'   },
  { id: 'tm', name: 'Turkmenistan',                   iso2: 'TM', phone_code: '+993'  },
  { id: 'tv', name: 'Tuvalu',                         iso2: 'TV', phone_code: '+688'  },
  { id: 'ug', name: 'Uganda',                         iso2: 'UG', phone_code: '+256'  },
  { id: 'ua', name: 'Ukraine',                        iso2: 'UA', phone_code: '+380'  },
  { id: 'ae', name: 'United Arab Emirates',           iso2: 'AE', phone_code: '+971'  },
  { id: 'gb', name: 'United Kingdom',                 iso2: 'GB', phone_code: '+44'   },
  { id: 'us', name: 'United States',                  iso2: 'US', phone_code: '+1'    },
  { id: 'uy', name: 'Uruguay',                        iso2: 'UY', phone_code: '+598'  },
  { id: 'uz', name: 'Uzbekistan',                     iso2: 'UZ', phone_code: '+998'  },
  { id: 'vu', name: 'Vanuatu',                        iso2: 'VU', phone_code: '+678'  },
  { id: 'va', name: 'Vatican City',                   iso2: 'VA', phone_code: '+39'   },
  { id: 've', name: 'Venezuela',                      iso2: 'VE', phone_code: '+58'   },
  { id: 'vn', name: 'Vietnam',                        iso2: 'VN', phone_code: '+84'   },
  { id: 'ye', name: 'Yemen',                          iso2: 'YE', phone_code: '+967'  },
  { id: 'zm', name: 'Zambia',                         iso2: 'ZM', phone_code: '+260'  },
  { id: 'zw', name: 'Zimbabwe',                       iso2: 'ZW', phone_code: '+263'  },
]

// Normalize a raw country record (from DB or static list) to a consistent shape
export function normalizeCountryRecord(country) {
  if (!country) return null
  const iso2 = String(country.iso2 || country.iso_code || '').trim().toUpperCase()
  const name = String(country.name || '').trim()
  if (!name && !iso2) return null
  const rawPhoneCode = String(country.phone_code || country.phone_prefix || '').trim()
  const phoneCode = rawPhoneCode ? (rawPhoneCode.startsWith('+') ? rawPhoneCode : `+${rawPhoneCode}`) : ''
  return {
    id: country.id ?? null,
    name,
    iso2,
    phone_code: phoneCode,
    currency: country.currency || null,
  }
}

// Merge DB country rows with the static phone-code list so every country
// has a valid phone_code even when the DB phone_prefix column is empty.
export function mergeCountryDatasets(primary = [], fallback = []) {
  const merged = new Map()
  ;[...primary, ...fallback]
    .map(normalizeCountryRecord)
    .filter(Boolean)
    .forEach(country => {
      const key = (country.iso2 || country.name.toLowerCase()).toLowerCase()
      const existing = merged.get(key)
      merged.set(key, {
        ...country,
        id: country.id ?? existing?.id ?? null,
        currency: country.currency || existing?.currency || null,
        phone_code: country.phone_code || existing?.phone_code || '',
      })
    })
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name))
}

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
