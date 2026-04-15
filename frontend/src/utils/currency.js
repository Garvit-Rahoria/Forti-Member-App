export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  SGD: 'S$',
  CNY: '¥',
  SAR: '﷼',
  QAR: '﷼',
  KWD: 'KD',
  BHD: 'BD',
  OMR: 'OMR',
  MYR: 'RM',
  NZD: 'NZ$',
  ZAR: 'R',
  SEK: 'kr',
  CHF: 'CHF',
  NOK: 'kr',
  DKK: 'kr',
  BRL: 'R$',
  MXN: '$',
  IDR: 'Rp',
  LKR: '₨',
  NPR: '₨',
  BDT: '৳',
  PKR: '₨',
  NGN: '₦',
  KES: 'KSh',
  GHS: '₵',
}

export const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  CAD: 'en-CA',
  AUD: 'en-AU',
  JPY: 'ja-JP',
  SGD: 'en-SG',
}

/** Returns the symbol for a currency code; falls back to the code itself */
export function getCurrencySymbol(code) {
  if (!code) return ''
  const upper = code.toUpperCase()
  return CURRENCY_SYMBOLS[upper] || upper
}

/** Formats an amount with the currency symbol and locale-aware number formatting */
export function fmtAmount(amount, currency = 'INR') {
  const code = (currency || 'INR').toUpperCase()
  const sym = CURRENCY_SYMBOLS[code] || code
  const locale = CURRENCY_LOCALES[code] || 'en-US'
  return `${sym}${Number(amount || 0).toLocaleString(locale)}`
}
