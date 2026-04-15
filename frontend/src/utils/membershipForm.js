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
  'Jaipur',
  'Jodhpur',
  'Udaipur',
  'Kota',
  'Ajmer',
  'Bikaner',
  'Alwar',
  'Bharatpur',
  'Sikar',
  'Pali',
  'Bhilwara',
  'Sri Ganganagar',
  'Hanumangarh',
  'Tonk',
  'Chittorgarh',
  'Jhunjhunu',
  'Barmer',
  'Nagaur',
  'Dungarpur',
  'Banswara',
  'Jaisalmer',
  'Sawai Madhopur',
  'Abu Road',
  'Kishangarh',
  'Beawar',
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
