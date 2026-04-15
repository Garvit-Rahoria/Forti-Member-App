function normalizeCountryName(countryName) {
  return String(countryName || '').trim().toLowerCase()
}

function getCurrencyCodeByCountry(countryName) {
  return normalizeCountryName(countryName) === 'india' ? 'INR' : 'USD'
}

function getCurrencySymbolByCountry(countryName) {
  return getCurrencyCodeByCountry(countryName) === 'INR' ? '₹' : '$'
}

function getCurrencyMetaByCountry(countryName) {
  const code = getCurrencyCodeByCountry(countryName)
  return {
    code,
    symbol: code === 'INR' ? '₹' : '$',
  }
}

function extractCountryNameFromSubmissionData(data, fallbackLocationType) {
  if (!data) {
    return fallbackLocationType === 'overseas' ? 'Other' : 'India'
  }

  const parsed = typeof data === 'string'
    ? (() => {
        try { return JSON.parse(data) } catch { return null }
      })()
    : data

  const countryName = parsed?.country_name || parsed?.country || parsed?.countryName
  if (countryName) return String(countryName)

  return parsed?.location_type === 'overseas' || fallbackLocationType === 'overseas' ? 'Other' : 'India'
}

module.exports = {
  normalizeCountryName,
  getCurrencyCodeByCountry,
  getCurrencySymbolByCountry,
  getCurrencyMetaByCountry,
  extractCountryNameFromSubmissionData,
}