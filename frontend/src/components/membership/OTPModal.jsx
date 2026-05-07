import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { X, Mail, Phone, User, ShieldCheck, Loader2, AlertCircle, CheckCircle2, RefreshCw, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  formatFullPhoneNumber,
  getFlagEmoji,
  getPhonePlaceholder,
  validatePhoneNumber,
  normalizePhoneInput,
  PHONE_COUNTRIES,
  mergeCountryDatasets,
} from '../../utils/membershipForm'

const http = axios.create({ baseURL: '/api' })

function normalizeCountrySearch(value) {
  const query = String(value || '').trim()
  const normalized = query.toLowerCase().replace(/\s+/g, ' ')
  const digits = query.replace(/\D/g, '')
  const withPlus = digits ? `+${digits}` : ''
  return { query, normalized, digits, withPlus }
}

function searchCountries(countries, value) {
  const { normalized, digits, withPlus } = normalizeCountrySearch(value)
  if (!normalized && !digits) return countries

  const scored = countries
    .map(country => {
      const name = String(country?.name || '').toLowerCase()
      const iso = String(country?.iso2 || '').toLowerCase()
      const phoneCode = String(country?.phone_code || '')
      const codeDigits = phoneCode.replace(/\D/g, '')

      let score = -1
      if (digits && codeDigits === digits) score = 0
      else if (normalized && phoneCode.toLowerCase() === normalized) score = 0
      else if (normalized && iso === normalized) score = 1
      else if (normalized && name === normalized) score = 2
      else if (digits && phoneCode.startsWith(withPlus)) score = 3
      else if (digits && codeDigits.startsWith(digits)) score = 4
      else if (normalized && name.startsWith(normalized)) score = 5
      else if (normalized && name.includes(normalized)) score = 6
      else if (normalized && iso.includes(normalized)) score = 7

      return score === -1 ? null : { country, score }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score
      return left.country.name.localeCompare(right.country.name)
    })

  return scored.map(item => item.country)
}

function formatCountryDisplay(country) {
  return `${getFlagEmoji(country.iso2)} ${country.name} (${country.phone_code})`
}

// ── OTP Input (6 boxes) ────────────────────────────────────────────────────
function OTPInput({ value, onChange, disabled }) {
  const len = 6
  const refs = Array.from({ length: len }, () => useRef())
  const digits = value.split('').concat(Array(len).fill('')).slice(0, len)

  function handleKey(i, e) {
    if (e.key === 'Backspace') {
      const next = digits.map((d, idx) => idx === i ? '' : d).join('')
      onChange(next)
      if (i > 0) refs[i - 1].current?.focus()
    }
  }

  function handleChange(i, e) {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, idx) => idx === i ? char : d).join('')
    onChange(next)
    if (char && i < len - 1) refs[i + 1].current?.focus()
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, len)
    onChange(text.padEnd(len, '').slice(0, len))
    if (text.length > 0) refs[Math.min(text.length, len - 1)].current?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-primary-500 transition
            ${d ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-white'}
            disabled:opacity-50`}
        />
      ))}
    </div>
  )
}

// ── Main OTP Modal ─────────────────────────────────────────────────────────
/**
 * Props:
 *   onVerified({ token, applicant: { email, full_name, phone } }) — callback after OTP verified
 *   onClose() — close the modal
 */
export default function OTPModal({ onVerified, onClose }) {
  const [phase, setPhase] = useState('form') // 'form' | 'otp' | 'done'
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countries, setCountries] = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const countryContainerRef = useRef(null)
  const dropdownListRef = useRef(null)
  const [otp, setOtp]     = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [info, setInfo] = useState('')
  const [devOtp, setDevOtp] = useState(null) // shown on screen when email SMTP not configured

  const selectedCountry = countries.find(country => String(country.id) === String(selectedCountryId)) || null

  // Filtered countries: match by name, ISO2, or dial code (strips + and spaces)
  const filteredCountries = useMemo(() => searchCountries(countries, countryQuery), [countries, countryQuery])

  useEffect(() => {
    let ignore = false
    http.get('/locations/countries')
      .then(res => {
        if (ignore) return
        const rows = res.data?.data || []
        const list = mergeCountryDatasets(rows, PHONE_COUNTRIES)
        setCountries(list)
        const india = list.find(c => (c.iso2 || '').toUpperCase() === 'IN')
        setSelectedCountryId(india ? String(india.id) : String(list[0].id))
      })
      .catch(() => {
        if (!ignore) {
          const list = mergeCountryDatasets([], PHONE_COUNTRIES)
          setCountries(list)
          const india = list.find(c => (c.iso2 || '').toUpperCase() === 'IN')
          setSelectedCountryId(india ? String(india.id) : String(list[0].id))
        }
      })
    return () => { ignore = true }
  }, [])

  // Sync autocomplete display text when selected country changes
  useEffect(() => {
    if (selectedCountry) {
      setCountryQuery(formatCountryDisplay(selectedCountry))
    }
  }, [selectedCountry])

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlightedIndex(-1) }, [filteredCountries])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownListRef.current) return
    const items = dropdownListRef.current.querySelectorAll('[data-country-item]')
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (!countryContainerRef.current?.contains(e.target)) {
        setCountryDropdownOpen(false)
        if (selectedCountry) {
          setCountryQuery(formatCountryDisplay(selectedCountry))
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedCountry])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function validateForm() {
    const e = {}
    if (!name.trim()) e.name = 'Full name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email is required'
    if (!selectedCountry) e.country = 'Please select your country'
    const phoneError = validatePhoneNumber(phone, selectedCountry)
    if (phoneError) e.phone = phoneError
    setErrors(e)
    return !Object.keys(e).length
  }

  async function handleSendOTP() {
    if (!validateForm()) return
    setLoading(true)
    setErrors({})
    try {
      const res = await http.post('/otp/send', {
        email: email.trim(),
        full_name: name.trim(),
        phone: formatFullPhoneNumber(selectedCountry, phone),
        purpose: 'apply',
      })
      setDevOtp(res.data?.data?._dev_otp || null)
      setPhase('otp')
      setCountdown(60)
      setInfo(`OTP sent to ${email.trim()}`)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send OTP. Please try again.'
      setErrors({ _global: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    if (countdown > 0) return
    setLoading(true)
    setOtp('')
    setErrors({})
    try {
      const res = await http.post('/otp/send', {
        email: email.trim(),
        full_name: name.trim(),
        phone: formatFullPhoneNumber(selectedCountry, phone),
        purpose: 'apply',
      })
      setDevOtp(res.data?.data?._dev_otp || null)
      setCountdown(60)
      setInfo('A new OTP has been sent to your email.')
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend OTP.'
      setErrors({ _global: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP() {
    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP' })
      return
    }
    setLoading(true)
    setErrors({})
    try {
      const res = await http.post('/otp/verify', { email: email.trim(), otp, purpose: 'apply' })
      setPhase('done')
      const nationalPhone = normalizePhoneInput(phone, selectedCountry)
      const fullPhone = formatFullPhoneNumber(selectedCountry, nationalPhone)
      setTimeout(() => onVerified({
        ...res.data.data,
        applicant: {
          ...res.data.data?.applicant,
          email: email.trim().toLowerCase(),
          full_name: name.trim(),
          phone: nationalPhone,
          phone_full: fullPhone,
          phone_country_code: selectedCountry?.phone_code || '+91',
          phone_country_iso2: selectedCountry?.iso2 || 'IN',
          country_name: selectedCountry?.name || 'India',
        },
      }), 600)
    } catch (err) {
      setErrors({ otp: err.response?.data?.message || 'Invalid OTP. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white relative">
          <button onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition">
            <X size={20}/>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={22}/>
            </div>
            <div>
              <h2 className="text-lg font-bold">Identity Verification</h2>
              <p className="text-primary-200 text-sm">
                {phase === 'form' ? 'Enter your details to begin' : phase === 'otp' ? 'Enter the OTP sent to your email' : 'Verified!'}
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {['Your Details', 'OTP Verification'].map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold
                  ${(phase === 'form' ? 0 : 1) > i ? 'bg-green-400 text-white' :
                    (phase === 'form' ? 0 : phase === 'otp' ? 1 : 2) === i ? 'bg-white text-primary-700' : 'bg-white/30 text-white'}`}>
                  {(phase === 'form' ? 0 : 1) > i ? '✓' : i + 1}
                </div>
                <span className="text-xs text-primary-200">{s}</span>
                {i < 1 && <div className="w-4 h-px bg-white/30 mx-1"/>}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* Success state */}
          {phase === 'done' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={36} className="text-green-500"/>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verified!</h3>
              <p className="text-gray-500 text-sm mt-1">Opening your membership application…</p>
            </div>
          )}

          {/* Phase 1: Details form */}
          {phase === 'form' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Please provide your details below. An OTP will be sent to your email to verify your identity.
              </p>

              <div>
                <label className="label flex items-center gap-2"><User size={14}/>Full Name *</label>
                <input className="input" placeholder="e.g. Rajesh Kumar Sharma"
                  value={name} onChange={e => { setName(e.target.value); setErrors(er => ({...er, name:''})) }} />
                {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.name}</p>}
              </div>

              <div>
                <label className="label flex items-center gap-2"><Phone size={14}/>Mobile Number *</label>

                {/* Country Autocomplete */}
                <div ref={countryContainerRef} className="relative mb-2">
                  <input
                    className="input pr-9"
                    placeholder="Search country (e.g. India, IN, +91)..."
                    value={countryQuery}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    onFocus={() => {
                      setCountryDropdownOpen(true)
                      setCountryQuery('')
                      setHighlightedIndex(-1)
                    }}
                    onChange={e => {
                      setCountryQuery(e.target.value)
                      setCountryDropdownOpen(true)
                      setHighlightedIndex(-1)
                    }}
                    onKeyDown={e => {
                      if (!countryDropdownOpen) {
                        if (e.key === 'ArrowDown' || e.key === 'Enter') {
                          setCountryDropdownOpen(true)
                          setHighlightedIndex(0)
                          e.preventDefault()
                        }
                        return
                      }
                      if (e.key === 'ArrowDown') {
                        setHighlightedIndex(i => Math.min(i + 1, filteredCountries.length - 1))
                        e.preventDefault()
                      } else if (e.key === 'ArrowUp') {
                        setHighlightedIndex(i => Math.max(i - 1, 0))
                        e.preventDefault()
                      } else if (e.key === 'Enter') {
                        e.preventDefault()
                        const matches = searchCountries(countries, e.currentTarget.value)
                        const pick = matches[highlightedIndex] ?? matches[0]
                        if (pick) {
                          setSelectedCountryId(String(pick.id))
                          setPhone('')
                          setErrors(er => ({ ...er, country: '', phone: '' }))
                          setCountryDropdownOpen(false)
                          setCountryQuery(formatCountryDisplay(pick))
                        }
                      } else if (e.key === 'Escape' || e.key === 'Tab') {
                        setCountryDropdownOpen(false)
                        if (selectedCountry) {
                          setCountryQuery(formatCountryDisplay(selectedCountry))
                        }
                      }
                    }}
                  />
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  {errors.country && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.country}</p>}
                  {countryDropdownOpen && (
                    <div
                      ref={dropdownListRef}
                      className="absolute left-0 right-0 top-full mt-1 z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                      style={{maxHeight: '220px', overflowY: 'auto'}}
                    >
                      {filteredCountries.length ? filteredCountries.map((c, idx) => (
                        <button
                          key={c.id}
                          type="button"
                          data-country-item
                          onMouseDown={e => e.preventDefault()}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => {
                            setSelectedCountryId(String(c.id))
                            setPhone('')
                            setErrors(er => ({ ...er, country: '', phone: '' }))
                            setCountryDropdownOpen(false)
                            setCountryQuery(formatCountryDisplay(c))
                          }}
                          className={`w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 transition
                            ${idx === highlightedIndex
                              ? 'bg-primary-100 text-primary-800'
                              : String(c.id) === String(selectedCountryId)
                                ? 'bg-primary-50 text-primary-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className="text-base w-6 text-center shrink-0">{getFlagEmoji(c.iso2)}</span>
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-gray-400 font-mono shrink-0">{c.phone_code}</span>
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-sm text-gray-400 text-center">No countries found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Phone number with code prefix */}
                <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition">
                  <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-700 text-sm font-mono shrink-0 select-none">
                    {selectedCountry?.phone_code || '+91'}
                  </span>
                  <input
                    className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
                    placeholder={getPhonePlaceholder(selectedCountry)}
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => {
                      setPhone(normalizePhoneInput(e.target.value, selectedCountry))
                      setErrors(er => ({...er, phone:''}))
                    }}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.phone}</p>}
              </div>

              <div>
                <label className="label flex items-center gap-2"><Mail size={14}/>Email Address *</label>
                <input className="input" placeholder="email@example.com" type="email"
                  value={email} onChange={e => { setEmail(e.target.value); setErrors(er => ({...er, email:''})) }} />
                {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.email}</p>}
                <p className="text-xs text-gray-400 mt-1">An OTP will be sent to this email address</p>
              </div>

              {errors._global && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5"/>{errors._global}
                </div>
              )}

              <button onClick={handleSendOTP} disabled={loading}
                className="btn-primary w-full btn-lg">
                {loading ? <><Loader2 size={16} className="animate-spin"/>Sending OTP…</> : 'Send OTP'}
              </button>
            </div>
          )}

          {/* Phase 2: OTP verification */}
          {phase === 'otp' && (
            <div className="space-y-5">
              {info && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 size={15}/>{info}
                </div>
              )}

              <div className="text-center space-y-1">
                <p className="text-sm text-gray-600">We sent a 6-digit OTP to</p>
                <p className="font-semibold text-gray-900">{email}</p>
                <p className="text-xs text-gray-400">Check your inbox (and spam folder)</p>
              </div>

              <OTPInput value={otp} onChange={v => { setOtp(v); setErrors(er => ({...er, otp:''})) }} disabled={loading} />

              {errors.otp && (
                <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1">
                  <AlertCircle size={12}/>{errors.otp}
                </p>
              )}
              {errors._global && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{errors._global}</div>
              )}

              <button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}
                className="btn-primary w-full btn-lg">
                {loading ? <><Loader2 size={16} className="animate-spin"/>Verifying…</> : 'Verify OTP'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button onClick={() => { setPhase('form'); setOtp(''); setErrors({}) }}
                  className="text-gray-400 hover:text-gray-600">← Change email</button>
                <button onClick={handleResendOTP} disabled={countdown > 0 || loading}
                  className={`flex items-center gap-1 ${countdown > 0 ? 'text-gray-400' : 'text-primary-600 hover:underline'}`}>
                  <RefreshCw size={13}/>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
