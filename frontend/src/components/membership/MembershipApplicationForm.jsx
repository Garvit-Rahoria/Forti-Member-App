import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Upload, Trash2, Loader2, AlertCircle, CheckCircle, User,
  MapPin, Users, CreditCard, Package, ChevronRight, ChevronLeft,
  Building2, Camera, Plus, Link2, Clock, Crown, Banknote,
  Globe2, Search, ChevronDown, X, Shield, Receipt, ExternalLink, FileText, Copy,
} from 'lucide-react'
import { getCurrencySymbol, fmtAmount } from '../../utils/currency'
import { QRCodeSVG } from 'qrcode.react'
import {
  formatFullPhoneNumber,
  getFixedCurrencyByCountry,
  getFlagEmoji,
  getPhonePlaceholder,
  ORGANISATION_TYPE_OPTIONS as ORG_TYPE_DEFAULTS,
  PHONE_COUNTRIES,
  RAJASTHAN_MAJOR_CITIES,
  OTHER_STATES,
  validatePhoneNumber,
  normalizeCountryRecord,
  mergeCountryDatasets,
} from '../../utils/membershipForm'

const http = axios.create({ baseURL: '/api' })

/** Active branches for a location: prefer city-specific, else state/country-level (city_id null). */
function filterBranchesForLocation(branches, { location_type, country_id, state_id, city_id }) {
  const active = (branches || []).filter(b => b.is_active !== false)
  if (location_type === 'rajasthan' || location_type === 'other_states') {
    if (city_id) {
      const cityExact = active.filter(b => String(b.city_id) === String(city_id))
      if (cityExact.length) return cityExact
      return active.filter(b => String(b.state_id) === String(state_id) && (b.city_id == null || b.city_id === ''))
    }
    if (state_id) return active.filter(b => String(b.state_id) === String(state_id))
    return []
  }
  if (location_type === 'overseas') {
    if (city_id) {
      const cityExact = active.filter(b => String(b.city_id) === String(city_id))
      if (cityExact.length) return cityExact
    }
    if (country_id) {
      return active.filter(b => String(b.country_id) === String(country_id))
    }
  }
  return []
}

function NoBranchMessage({ tone = 'orange' }) {
  const styles = {
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }
  return (
    <div className={`border rounded-lg px-3 py-2.5 text-xs leading-relaxed ${styles[tone] || styles.orange}`}>
      <p className="font-semibold mb-0.5">No branch available for this location</p>
      <p>You can still continue with membership — your application will be handled by the appropriate FORTI team.</p>
    </div>
  )
}

// Org types: fetched from API on first use, fallback to static list
let _orgTypesCache = null
async function fetchOrgTypes() {
  if (_orgTypesCache) return _orgTypesCache
  try {
    const res = await http.get('/settings/org-types')
    _orgTypesCache = Array.isArray(res.data?.data) && res.data.data.length ? res.data.data : ORG_TYPE_DEFAULTS
  } catch { _orgTypesCache = ORG_TYPE_DEFAULTS }
  return _orgTypesCache
}

// mergeCountryDatasets and normalizeCountryRecord are imported from ../../utils/membershipForm

function buildCountryOption(country) {
  const flag = getFlagEmoji(country.iso2)
  const dial = country.phone_code || '+00'
  const iso = country.iso2 || '--'
  return {
    value: iso,
    label: country.name,
    inputLabel: country.name,
    secondary: `${iso} ${dial}`,
    searchText: `${country.name} ${iso} ${dial} ${dial.replace(/^\+/, '')}`,
    raw: country,
    flag,
  }
}

function renderCountryOption(option, state) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-base leading-none">{option.flag}</span>
        <div className="min-w-0">
          <div className={`truncate text-sm ${state.isSelected ? 'font-semibold' : 'font-medium'}`}>{option.label}</div>
          <div className="truncate text-xs text-gray-500">{option.secondary}</div>
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-gray-400">{option.raw?.phone_code || '+00'}</span>
    </div>
  )
}

function renderOrgTypeOption(option, state) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`truncate text-sm ${state.isSelected ? 'font-semibold' : 'font-medium'}`}>{option.label}</span>
      {option.secondary ? <span className="shrink-0 text-xs text-gray-400">{option.secondary}</span> : null}
    </div>
  )
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const STEPS = [
  { key: 'basic', label: 'Basic Details', icon: User },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'membership', label: 'Membership Type', icon: Users },
  { key: 'plan', label: 'Plan & Package', icon: Package },
  { key: 'payment', label: 'Payment', icon: CreditCard },
]

const LOCATION_OPTIONS = [
  { value: 'rajasthan', label: 'Rajasthan', desc: 'Within Rajasthan', icon: <img src="/images/rajasthan-icon.png" alt="Rajasthan" className="w-12 h-12 object-cover mix-blend-multiply rounded-full" />, color: 'from-orange-500 to-amber-500' },
  { value: 'other_states', label: 'Other States', desc: 'Other Indian States', icon: <img src="/images/india-map.png" alt="India Map" className="w-12 h-12 object-cover mix-blend-multiply rounded-full" />, color: 'from-blue-500 to-indigo-500' },
  { value: 'overseas', label: 'Overseas', desc: 'International Applicant', icon: <img src="/images/overseas-icon.png" alt="Overseas" className="w-12 h-12 object-cover mix-blend-multiply rounded-full" />, color: 'from-emerald-500 to-teal-500' },
]

const MEMBERSHIP_OPTIONS = [
  {
    value: 'individual',
    label: 'Individual',
    desc: 'For personal use (students / professionals)',
    icon: '👤',
    features: ['Single user access', 'Digital membership ID', 'Access to events & updates'],
  },
  {
    value: 'corporate',
    label: 'Corporate',
    desc: 'For companies and organizations',
    icon: '🏢',
    features: ['Organization profile listing', 'Multiple team members access', 'Faster support from admin'],
  },
]

const PLAN_OPTIONS = [
  { value: '1year', label: 'Yearly', desc: '12-month membership, renewable annually', icon: () => <img src="/images/yearly-icon.png" alt="Yearly" className="w-14 h-14 object-contain mix-blend-multiply" />, noIconBg: true, gradient: 'from-blue-50 to-indigo-50', selectedGradient: 'from-blue-100 to-indigo-100', iconFrom: 'from-blue-400', iconTo: 'to-indigo-500', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', border: 'border-blue-400' },
  { value: '3years', label: '3 Years', desc: '3-year membership — save more vs yearly', icon: () => <img src="/images/3years-icon.png" alt="3 Years" className="w-14 h-14 object-contain mix-blend-multiply" />, noIconBg: true, gradient: 'from-green-50 to-teal-50', selectedGradient: 'from-green-100 to-teal-100', iconFrom: 'from-green-400', iconTo: 'to-teal-500', iconBg: 'bg-green-100', iconColor: 'text-green-600', border: 'border-green-400' },
  { value: 'lifetime', label: 'Lifetime', desc: 'One-time payment, valid forever', icon: () => <img src="/images/lifetime-icon.png" alt="Lifetime" className="w-14 h-14 object-contain mix-blend-multiply" />, noIconBg: true, gradient: 'from-orange-50 to-amber-50', selectedGradient: 'from-orange-100 to-amber-100', iconFrom: 'from-orange-400', iconTo: 'to-amber-500', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', border: 'border-orange-400' },
]

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']
const DEFAULT_GENDER = ''
const GENDER_SELECT_OPTIONS = [
  { value: '', label: 'Select', searchText: 'select' },
  ...GENDER_OPTIONS.map(g => ({ value: g, label: g, searchText: g })),
]

const INDIAN_ID_TYPE_OPTIONS = [
  { value: 'aadhaar',       label: 'Aadhaar Card' },
  { value: 'passport',      label: 'Passport' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'voter_id',      label: 'Voter ID' },
  { value: 'other_govt_id', label: 'Other Government ID' },
]

const INTERNATIONAL_ID_TYPE_OPTIONS = [
  { value: 'passport',      label: 'Passport' },
  { value: 'driving_licence', label: 'Driving Licence' },
  { value: 'national_id',   label: 'National ID / Identity Card' },
  { value: 'other_govt_id', label: 'Other Government-Issued ID' },
]

function isIndianCountryName(countryName) {
  return String(countryName || 'India').trim().toLowerCase() === 'india'
}

function getIdTypeOptionsForCountry(countryName) {
  return isIndianCountryName(countryName) ? INDIAN_ID_TYPE_OPTIONS : INTERNATIONAL_ID_TYPE_OPTIONS
}

function getDefaultIdType(countryName) {
  return isIndianCountryName(countryName) ? 'aadhaar' : 'passport'
}

function getIdentityFieldConfig(idType) {
  switch (idType) {
    case 'aadhaar':
      return {
        field: 'aadhaar_number',
        label: 'Aadhaar Number',
        placeholder: 'Enter 12-digit Aadhaar number',
        inputMode: 'numeric',
        maxLength: 12,
        transform: value => String(value || '').replace(/\D/g, '').slice(0, 12),
        validate: value => /^\d{12}$/.test(String(value || '')),
        error: 'Aadhaar number must be exactly 12 digits',
      }
    case 'driving_licence':
      return {
        field: 'driving_licence_number',
        label: 'Driving Licence Number',
        placeholder: 'Enter driving licence number',
        inputMode: 'text',
        maxLength: 20,
        transform: value => String(value || '').replace(/[^A-Za-z0-9 -]/g, '').toUpperCase().slice(0, 20),
        validate: value => String(value || '').trim().length >= 5,
        error: 'Please enter a valid driving licence number',
      }
    case 'voter_id':
      return {
        field: 'voter_id_number',
        label: 'Voter ID Number',
        placeholder: 'Enter Voter ID number',
        inputMode: 'text',
        maxLength: 15,
        transform: value => String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15),
        validate: value => String(value || '').trim().length >= 5,
        error: 'Please enter a valid Voter ID number',
      }
    case 'national_id':
      return {
        field: 'national_id_number',
        label: 'National ID / Identity Card Number',
        placeholder: 'Enter national ID number',
        inputMode: 'text',
        maxLength: 20,
        transform: value => String(value || '').replace(/[^A-Za-z0-9 -]/g, '').toUpperCase().slice(0, 20),
        validate: value => /^[A-Za-z0-9][A-Za-z0-9 -]{4,19}$/.test(String(value || '').trim()),
        error: 'National ID number must be 5 to 20 alphanumeric characters',
      }
    case 'other_govt_id':
      return {
        field: 'other_govt_id_number',
        label: 'Government ID Number',
        placeholder: 'Enter your government ID number',
        inputMode: 'text',
        maxLength: 30,
        transform: value => String(value || '').slice(0, 30),
        validate: value => String(value || '').trim().length >= 3,
        error: 'Please enter your government ID number',
      }
    case 'passport':
    default:
      return {
        field: 'passport_number',
        label: 'Passport Number',
        placeholder: 'Enter passport number',
        inputMode: 'text',
        maxLength: 9,
        transform: value => String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 9),
        validate: value => /^[A-Za-z0-9]{6,9}$/.test(String(value || '')),
        error: 'Passport number must be 6 to 9 alphanumeric characters',
      }
  }
}

const SOCIAL_PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { value: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
  { value: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { value: 'google', label: 'Google Business', placeholder: 'https://g.co/yourprofile' },
  { value: 'other', label: 'Other', placeholder: 'https://...' },
]

const STEP_VALIDATION_FIELDS = {
  0: ['full_name', 'email', 'phone', 'gender', 'id_type', 'aadhaar_number', 'passport_number', 'driving_licence_number', 'voter_id_number', 'national_id_number', 'other_govt_id_number', 'id_type_other_label', 'pin_code', 'organisation_name', 'organisation_type', 'organisation_type_other'],
  1: ['location_type', 'state_id', 'city_id', 'branch_id', 'country_id'],
  2: ['wing_id', 'membership_type'],
  3: ['plan_type', 'package_id'],
  4: ['payment_method', 'payment_confirmed', 'payment_screenshot'],
}

const FIELD_SELECTOR_MAP = {
  full_name: '[data-field="full_name"]',
  email: '[data-field="email"]',
  phone: '[data-field="phone"]',
  gender: '[data-field="gender"]',
  id_type: '[data-field="id_type"]',
  aadhaar_number: '[data-field="aadhaar_number"]',
  passport_number: '[data-field="passport_number"]',
  driving_licence_number: '[data-field="driving_licence_number"]',
  voter_id_number: '[data-field="voter_id_number"]',
  national_id_number: '[data-field="national_id_number"]',
  other_govt_id_number: '[data-field="other_govt_id_number"]',
  id_type_other_label: '[data-field="id_type_other_label"]',
  pin_code: '[data-field="pin_code"]',
  organisation_name: '[data-field="organisation_name"]',
  organisation_type: '[data-field="organisation_type"]',
  organisation_type_other: '[data-field="organisation_type_other"]',
  city_id: '[data-field="city_id"]',
  branch_id: '[data-field="branch_id"]',
  country_id: '[data-field="country_id"]',
}

const REQUIRED_FIELD_MESSAGE = 'This field is required'

/* ─── Helpers ───────────────────────────────────────────────────────── */
function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} />{msg}</p>
}

function SectionCard({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl overflow-hidden">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Icon size={16} className="text-primary-600" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
              {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  minQueryLength = 0,
  allowCustom = false,
  loading = false,
  emptyText = 'No matches found',
  loadingText = 'Loading…',
  inputName,
  autoComplete = 'new-password',
  getSearchText,
  renderOption,
  getDisplayValue,
  inputAriaInvalid = false,
  dataField,
}) {
  const rootRef = useRef(null)
  const optionRefs = useRef([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOption = useMemo(
    () => options.find(option => String(option.value) === String(value)) || null,
    [options, value],
  )

  const selectedLabel = selectedOption
    ? String(getDisplayValue ? getDisplayValue(selectedOption) : (selectedOption.inputLabel || selectedOption.label))
    : ''

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    // Keep the full list open when the input still shows the selected option
    // (e.g. "Female" must not hide "Male" / "Other").
    if (!term || (selectedLabel && term === selectedLabel.toLowerCase())) {
      return minQueryLength > 0 && !term ? [] : options
    }
    const filtered = options
      .map(option => {
        const label = String(option.label || '').toLowerCase()
        const searchText = String(getSearchText ? getSearchText(option) : option.searchText || option.secondary || '').toLowerCase()
        const haystack = `${label} ${searchText}`.trim()
        if (!haystack.includes(term)) return null
        const startsWithLabel = label.startsWith(term) ? 0 : 1
        const startsWithMeta = !startsWithLabel && searchText.startsWith(term) ? 0 : 1
        return { option, rank: startsWithLabel + startsWithMeta }
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || String(a.option.label || '').localeCompare(String(b.option.label || '')))
      .map(entry => entry.option)

    return filtered
  }, [getSearchText, minQueryLength, options, query, selectedLabel])

  // Sync query text with value (for pre-fill / external changes), but never
  // overwrite while the dropdown is open — that re-filters the list to only
  // the current selection (Female hid every other gender).
  useEffect(() => {
    if (open) return
    if (selectedOption) {
      setQuery(selectedLabel)
      return
    }
    // allowCustom: keep the raw value as display text even if not in options
    if (allowCustom && value) { setQuery(String(value)); return }
    if (!value) setQuery('')
  }, [selectedOption, selectedLabel, value, allowCustom, open])

  function commitCustom() {
    const trimmed = query.trim()
    if (allowCustom && trimmed && !selectedOption) {
      onChange(trimmed, { value: trimmed, label: trimmed })
    } else if (!trimmed) {
      onChange('', null)
      setQuery('')
    } else {
      setQuery(selectedOption?.label || (allowCustom ? String(value || '') : ''))
    }
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        commitCustom()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [selectedOption, query, allowCustom, value])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  useEffect(() => {
    if (!open) return
    const node = optionRefs.current[highlightedIndex]
    node?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, open, visibleOptions])

  function selectOption(option) {
    onChange(option.value, option)
    setQuery(getDisplayValue ? getDisplayValue(option) : (option.inputLabel || option.label))
    setOpen(false)
  }

  function handleOpen() {
    if (disabled) return
    setOpen(true)
  }

  function handleKeyDown(event) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex(index => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex(index => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = visibleOptions[highlightedIndex]
      if (option) selectOption(option)
      else if (allowCustom && query.trim()) {
        onChange(query.trim(), { value: query.trim(), label: query.trim() })
        setOpen(false)
      }
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selectedOption ? (getDisplayValue ? getDisplayValue(selectedOption) : (selectedOption.inputLabel || selectedOption.label)) : (allowCustom ? String(value || '') : ''))
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        className={`input pr-10 ${inputClassName}`}
        value={query}
        name={inputName}
        data-field={dataField}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-invalid={inputAriaInvalid}
        onFocus={handleOpen}
        onClick={handleOpen}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(event.target.value.trim().length >= minQueryLength || minQueryLength === 0)
        }}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />
      {minQueryLength === 0 && <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[9999] rounded-xl border border-gray-200 bg-white shadow-xl max-h-72 overflow-auto overscroll-contain">
          {loading ? (
            <div className="px-3 py-3 text-sm text-gray-400">{loadingText}</div>
          ) : visibleOptions.length ? visibleOptions.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            const isHighlighted = index === highlightedIndex
            return (
              <button
                key={option.value}
                ref={node => { optionRefs.current[index] = node }}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`w-full px-3 py-2.5 text-left text-sm transition flex items-center justify-between gap-3
                  ${isHighlighted ? 'bg-primary-50' : 'bg-white'}
                  ${isSelected ? 'text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="min-w-0 flex-1">
                  {renderOption ? renderOption(option, { isSelected, isHighlighted }) : option.label}
                </span>
                {isSelected && <CheckCircle size={14} className="text-primary-500 shrink-0" />}
              </button>
            )
          }) : (
            <div className="px-3 py-3 text-sm text-gray-400">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ────────────────────────────────────────────────── */
export default function MembershipApplicationForm({ prefill = {} }) {
  const navigate = useNavigate()
  const topRef = useRef()

  // Helper to load saved form draft
  const loadSavedForm = (currentEmail) => {
    try {
      const saved = localStorage.getItem('forti_application_form')
      if (saved) {
        const parsed = JSON.parse(saved)
        // If the draft belongs to a different email than the one just verified, discard it.
        if (parsed.email && currentEmail && parsed.email.toLowerCase() !== currentEmail.toLowerCase()) {
          localStorage.removeItem('forti_application_form')
          localStorage.removeItem('forti_application_step')
          localStorage.removeItem('forti_application_social')
          return null
        }
        return {
          ...parsed,
          profile_photo: null,
          organisation_logo: null,
          payment_screenshot: null,
        }
      }
    } catch (e) {
      console.error('Failed to load saved form draft:', e)
    }
    return null
  }

  const [form, setForm] = useState(() => {
    const saved = loadSavedForm(prefill?.email)
    const base = saved || {
      full_name: prefill?.full_name || '',
      email: prefill?.email || '',
      phone: prefill?.phone || '',
      phone_country_code: prefill?.phone_country_code || '+91',
      phone_country_iso2: prefill?.phone_country_iso2 || 'IN',
      country_name: prefill?.country_name || 'India',
      profile_photo: null,
      gender: DEFAULT_GENDER,
      id_type: prefill?.id_type || '',
      aadhaar_number: '',
      passport_number: '',
      driving_licence_number: '',
      voter_id_number: '',
      national_id_number: '',
      other_govt_id_number: '',
      id_type_other_label: '',
      pin_code: '',
      organisation_name: '',
      organisation_type: '',
      organisation_type_other: '',
      organisation_logo: null,
      location_type: '',
      state_id: '',
      city_id: '',
      branch_id: '',
      country_id: '',
      city_other: '',
      overseas_city: '',
      wing_id: '',
      membership_type: prefill?.membership_type || '',
      plan_type: '',
      package_id: null,
      payment_method: '',
      payment_screenshot: null,
    }
    if (base.gender && !GENDER_OPTIONS.includes(base.gender)) base.gender = DEFAULT_GENDER
    if (!base.gender) base.gender = DEFAULT_GENDER
    return base
  })

  const [step, setStep] = useState(() => {
    const savedStep = localStorage.getItem('forti_application_step')
    return savedStep ? Number(savedStep) : 0
  })
  
  const [orgTypes, setOrgTypes] = useState(ORG_TYPE_DEFAULTS)
  const [orgTypesLoading, setOrgTypesLoading] = useState(true)
  useEffect(() => {
    let active = true
    setOrgTypesLoading(true)
    fetchOrgTypes()
      .then(items => { if (active) setOrgTypes(items) })
      .finally(() => { if (active) setOrgTypesLoading(false) })
    return () => { active = false }
  }, [])
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [pincodeVerifying, setPincodeVerifying] = useState(false)
  const [pincodeDetails, setPincodeDetails] = useState(null)

  const verifyPincode = async (pincode) => {
    setPincodeVerifying(true)
    setPincodeDetails(null)
    setErrors(current => {
      const next = { ...current }
      delete next.pin_code
      return next
    })
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await res.json()
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const first = data[0].PostOffice[0]
        setPincodeDetails({
          verified: true,
          state: first.State,
          district: first.District
        })
      } else {
        setPincodeDetails({ verified: false })
        setErrors(current => ({
          ...current,
          pin_code: 'Invalid PIN code. Please enter a valid Indian PIN code.'
        }))
      }
    } catch (err) {
      console.error('PIN code verification network error:', err)
      setPincodeDetails(null)
    } finally {
      setPincodeVerifying(false)
    }
  }

  const formRef = useRef(form)
  useEffect(() => {
    formRef.current = form
  }, [form])

  /* Social links: array of { platform, url } */
  const [socialLinks, setSocialLinks] = useState(() => {
    try {
      const savedSocial = localStorage.getItem('forti_application_social')
      if (savedSocial) return JSON.parse(savedSocial)
    } catch {}
    return [{ platform: '', url: '' }]
  })

  // Persist form state changes (excluding files)
  useEffect(() => {
    const serializeForm = { ...form }
    delete serializeForm.profile_photo
    delete serializeForm.organisation_logo
    delete serializeForm.payment_screenshot
    localStorage.setItem('forti_application_form', JSON.stringify(serializeForm))
  }, [form])

  // Persist step changes
  useEffect(() => {
    localStorage.setItem('forti_application_step', String(step))
  }, [step])

  // Persist social links changes
  useEffect(() => {
    localStorage.setItem('forti_application_social', JSON.stringify(socialLinks))
  }, [socialLinks])

  // Warn user on window unload if they have started filling the form and haven't submitted yet
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasContent = form.full_name || form.email || form.phone || step > 0
      if (hasContent && !submitted) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [form, step, submitted])
  const [wings, setWings] = useState([])

  useEffect(() => {
    http.get('/wings').then(r => setWings(r.data.data || [])).catch(() => setWings([]))
  }, [])

  const [profilePreview, setProfilePreview] = useState(null)
  const [photoZoom, setPhotoZoom] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [ssPreview, setSsPreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const profileRef = useRef()
  const cameraRef = useRef()
  const logoRef = useRef()
  const ssRef = useRef()
  const proofSectionRef = useRef()
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef(null)

  const [states, setStates] = useState([])
  const [branches, setBranches] = useState([])
  const [cities, setCities] = useState([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [countries, setCountries] = useState([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [availablePkgs, setAvailablePkgs] = useState([])
  const [pkg, setPkg] = useState(null)
  const [pkgLoading, setPkgLoading] = useState(false)
  const [pkgError, setPkgError] = useState('')
  const [methods, setMethods] = useState([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState({})

  // Payment flow: Payment Pending → Submitted / Awaiting Verification → Payment Verified (admin only)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  /** Client payment lifecycle (never "verified" — admin only): pending → submitted → awaiting_verification */
  const [paymentStatus, setPaymentStatus] = useState('pending') // pending | submitted | awaiting_verification
  const [ssFileMeta, setSsFileMeta] = useState(null) // { name, size, type, isPdf }
  const [paymentAttempts, setPaymentAttempts] = useState([])
  const [paymentConfirmModal, setPaymentConfirmModal] = useState(null) // complete | method | plan | package
  const [showInstructions, setShowInstructions] = useState(false)
  const [fxQuote, setFxQuote] = useState(null)
  const [fxQuoteLoading, setFxQuoteLoading] = useState(false)

  const genPaymentRef = () => `FR-${Math.floor(100000 + Math.random() * 900000)}`
  const [referenceId, setReferenceId] = useState(genPaymentRef)
  const normalizedCountryName = String(form.country_name || 'India').trim()
  const isIndianApplicant = isIndianCountryName(normalizedCountryName)
  const idTypeOptions = useMemo(() => getIdTypeOptionsForCountry(normalizedCountryName), [normalizedCountryName])
  const defaultIdType = getDefaultIdType(normalizedCountryName)
  const activeIdType = idTypeOptions.some(option => option.value === form.id_type) ? form.id_type : defaultIdType
  const identityFieldConfig = useMemo(() => getIdentityFieldConfig(activeIdType), [activeIdType])
  const formCurrency = getFixedCurrencyByCountry(normalizedCountryName)
  const supportPhoneDigits = String(paymentSettings.support_whatsapp || paymentSettings.support_phone || '916367063168')
    .replace(/\D/g, '')
  const whatsappLink = supportPhoneDigits ? `https://wa.me/${supportPhoneDigits}` : ''

  function getInputClassName(fieldName, baseClassName = 'input') {
    return errors[fieldName]
      ? `${baseClassName} border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30`
      : baseClassName
  }

  function focusField(fieldName) {
    const selector = FIELD_SELECTOR_MAP[fieldName]
    if (!selector) return
    const element = document.querySelector(selector)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      if (typeof element.focus === 'function') {
        element.focus({ preventScroll: true })
      }
    }, 120)
  }

  function set(key, value) {
    const nextForm = { ...formRef.current, [key]: value }
    formRef.current = nextForm
    setForm(nextForm)
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function markTouched(...fieldNames) {
    if (!fieldNames.length) return
    setTouched(current => {
      let changed = false
      const next = { ...current }
      fieldNames.forEach(fieldName => {
        if (!next[fieldName]) {
          next[fieldName] = true
          changed = true
        }
      })
      return changed ? next : current
    })
  }

  function setFieldError(fieldName, message) {
    setErrors(current => {
      if (!message && !current[fieldName]) return current
      if (message && current[fieldName] === message) return current
      const next = { ...current }
      if (message) next[fieldName] = message
      else delete next[fieldName]
      return next
    })
  }

  function getFieldError(fieldName, currentForm = formRef.current, stepIndex = step) {
    const currentCountryName = String(currentForm.country_name || 'India').trim()
    const currentIsIndianApplicant = isIndianCountryName(currentCountryName)
    const currentIdTypeOptions = getIdTypeOptionsForCountry(currentCountryName)
    const currentDefaultIdType = getDefaultIdType(currentCountryName)
    const currentActiveIdType = currentIdTypeOptions.some(option => option.value === currentForm.id_type)
      ? currentForm.id_type
      : currentDefaultIdType
    const currentIdentityFieldConfig = getIdentityFieldConfig(currentActiveIdType)
    if (stepIndex === 0) {
      switch (fieldName) {
        case 'full_name':
          return currentForm.full_name?.trim() ? '' : 'Full name is required'
        case 'email':
          if (!currentForm.email?.trim()) return REQUIRED_FIELD_MESSAGE
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentForm.email)
            ? ''
            : 'Valid email is required'
        case 'phone': {
          if (!String(currentForm.phone || '').trim()) return REQUIRED_FIELD_MESSAGE
          return validatePhoneNumber(currentForm.phone, selectedPhoneCountry) || ''
        }
        case 'gender':
          return currentForm.gender ? '' : REQUIRED_FIELD_MESSAGE
        case 'id_type':
          return currentActiveIdType ? '' : REQUIRED_FIELD_MESSAGE
        case 'aadhaar_number':
        case 'passport_number':
        case 'national_id_number':
          if (fieldName !== currentIdentityFieldConfig.field) return ''
          if (!String(currentForm[currentIdentityFieldConfig.field] || '').trim()) return REQUIRED_FIELD_MESSAGE
          return currentIdentityFieldConfig.validate(currentForm[currentIdentityFieldConfig.field])
            ? ''
            : currentIdentityFieldConfig.error
        case 'organisation_name':
          return currentForm.organisation_name?.trim() ? '' : REQUIRED_FIELD_MESSAGE
        case 'pin_code':
          if (currentForm.id_type !== 'aadhaar') return ''
          if (currentIsIndianApplicant) {
            if (!String(currentForm.pin_code || '').trim()) return REQUIRED_FIELD_MESSAGE
            if (!/^\d{6}$/.test(currentForm.pin_code || '')) return 'Valid 6-digit PIN code is required'
            if (pincodeDetails && pincodeDetails.verified === false) {
              return 'Invalid PIN code. Please enter a valid Indian PIN code.'
            }
            return ''
          }
          return currentForm.pin_code?.trim() ? '' : REQUIRED_FIELD_MESSAGE
        case 'organisation_type':
          return currentForm.organisation_type?.trim() ? '' : REQUIRED_FIELD_MESSAGE
        case 'organisation_type_other':
          return currentForm.organisation_type === 'Other' && !currentForm.organisation_type_other?.trim()
            ? REQUIRED_FIELD_MESSAGE
            : ''
        default:
          return ''
      }
    }

    if (stepIndex === 1) {
      switch (fieldName) {
        case 'location_type':
          return currentForm.location_type ? '' : REQUIRED_FIELD_MESSAGE
        case 'state_id':
          return currentForm.location_type === 'other_states' && !currentForm.state_id ? REQUIRED_FIELD_MESSAGE : ''
        case 'city_id':
          if (currentForm.location_type === 'rajasthan' && !currentForm.city_id && !currentForm.city_other) return REQUIRED_FIELD_MESSAGE
          if (currentForm.location_type === 'other_states' && !currentForm.city_id && !currentForm.city_other) return REQUIRED_FIELD_MESSAGE
          return ''
        case 'branch_id':
          // Branch is never required — users must not be blocked if no branch exists
          return ''
        case 'country_id':
          return currentForm.location_type === 'overseas' && !currentForm.country_id && !currentForm.country_name?.trim()
            ? REQUIRED_FIELD_MESSAGE
            : ''
        default:
          return ''
      }
    }

    if (stepIndex === 2) {
      if (fieldName === 'wing_id' && !currentForm.wing_id) return REQUIRED_FIELD_MESSAGE
      return fieldName === 'membership_type' && !currentForm.membership_type ? REQUIRED_FIELD_MESSAGE : ''
    }

    if (stepIndex === 3) {
      if (fieldName === 'plan_type') return currentForm.plan_type ? '' : REQUIRED_FIELD_MESSAGE
      if (fieldName === 'package_id') {
        if (pkgLoading) return 'Please wait while the package loads'
        if (pkgError) return 'No package available for this selection. Please contact admin.'
        return currentForm.package_id && pkg ? '' : 'No package found for this selection'
      }
      return ''
    }

    if (stepIndex === 4) {
      if (fieldName === 'payment_method') return currentForm.payment_method ? '' : REQUIRED_FIELD_MESSAGE
      if (fieldName === 'payment_confirmed') {
        return currentForm.payment_method && !paymentConfirmed
          ? 'Please confirm you have completed the payment before uploading your receipt'
          : ''
      }
      if (fieldName === 'payment_screenshot') {
        return currentForm.payment_screenshot
          ? ''
          : 'Please upload your payment receipt (JPG, PNG, or PDF, max 5 MB)'
      }
    }

    return ''
  }

  function getStepErrors(stepIndex, currentForm = formRef.current) {
    const nextErrors = {}
      ; (STEP_VALIDATION_FIELDS[stepIndex] || []).forEach(fieldName => {
        const message = getFieldError(fieldName, currentForm, stepIndex)
        if (message) nextErrors[fieldName] = message
      })
    return nextErrors
  }

  function updateFieldErrors(fieldNames, nextForm = formRef.current, stepIndex = step) {
    if (!fieldNames.length) return
    setErrors(current => {
      const next = { ...current }
      let changed = false
      fieldNames.forEach(fieldName => {
        const nextMessage = getFieldError(fieldName, nextForm, stepIndex)
        if (nextMessage) {
          if (next[fieldName] !== nextMessage) {
            next[fieldName] = nextMessage
            changed = true
          }
        } else if (next[fieldName]) {
          delete next[fieldName]
          changed = true
        }
      })
      return changed ? next : current
    })
  }

  function handleFieldChange(fieldName, value, options = {}) {
    if (fieldName === 'pin_code') {
      if (isIndianApplicant && value.length === 6) {
        verifyPincode(value)
      } else {
        setPincodeDetails(null)
        setPincodeVerifying(false)
      }
    }

    const relatedFields = options.relatedFields || [fieldName]
    const nextForm = { ...formRef.current, [fieldName]: value }
    formRef.current = nextForm
    setForm(nextForm)
    if (errors._global) {
      setErrors(current => ({ ...current, _global: '' }))
    }
    const shouldValidate = relatedFields.some(name => touched[name] || errors[name])
    if (shouldValidate) {
      updateFieldErrors(relatedFields, nextForm)
      return
    }
    setErrors(current => {
      const next = { ...current }
      let changed = false
      relatedFields.forEach(name => {
        if (next[name]) {
          delete next[name]
          changed = true
        }
      })
      return changed ? next : current
    })
  }

  function validateField(fieldName, options = {}) {
    const relatedFields = options.relatedFields || [fieldName]
    const nextForm = options.nextForm || formRef.current
    markTouched(...relatedFields)
    updateFieldErrors(relatedFields, nextForm)
  }

  function applyCountrySelection(countryLike) {
    const country = normalizeCountryRecord(countryLike)
    if (!country) return

    const currentCountryName = String(formRef.current.country_name || 'India').trim()
    const currentActiveIdType = getIdTypeOptionsForCountry(currentCountryName).some(option => option.value === formRef.current.id_type)
      ? formRef.current.id_type
      : getDefaultIdType(currentCountryName)

    const nextForm = {
      ...formRef.current,
      country_name: country.name || formRef.current.country_name,
      country_id: country.id ? String(country.id) : '',
      phone_country_iso2: country.iso2 || formRef.current.phone_country_iso2,
      phone_country_code: country.phone_code || formRef.current.phone_country_code,
      id_type: currentActiveIdType,
    }
    formRef.current = nextForm
    setForm(nextForm)

    setErrors(current => ({
      ...current,
      country_id: '',
      id_type: '',
      aadhaar_number: '',
      passport_number: '',
      driving_licence_number: '',
      voter_id_number: '',
      national_id_number: '',
      other_govt_id_number: '',
      id_type_other_label: '',
      phone: '',
    }))
  }

  const selectedPhoneCountry = useMemo(() => {
    const matched = countries.find(country => String(country.iso2 || '').toUpperCase() === String(form.phone_country_iso2 || '').toUpperCase())
    if (matched) return matched
    return {
      id: 'in',
      name: normalizedCountryName || 'India',
      iso2: form.phone_country_iso2 || 'IN',
      phone_code: form.phone_country_code || '+91',
    }
  }, [countries, form.phone_country_code, form.phone_country_iso2, normalizedCountryName])

  const rajasthanState = useMemo(
    () => states.find(state => String(state.name || '').toLowerCase() === 'rajasthan') || null,
    [states],
  )
  const rajasthanCityOptions = useMemo(() => {
    const map = new Map()
    if (Array.isArray(cities)) {
      cities.forEach(city => {
        map.set(String(city?.name || '').toLowerCase(), { value: String(city?.id || ''), label: city?.name || '', raw: city })
      })
    }
    RAJASTHAN_MAJOR_CITIES.forEach(cityName => {
      const key = cityName.toLowerCase()
      if (!map.has(key)) map.set(key, { value: String(cityName), label: cityName, raw: { name: cityName } })
    })
    return [...map.values()].sort((left, right) => left.label.localeCompare(right.label))
  }, [cities])
  const stateOptions = useMemo(() => {
    const map = new Map()
    // DB states first
    states.forEach(state => {
      map.set(String(state.name).toLowerCase(), { value: String(state.id), label: state.name, raw: state })
    })
    // Static fallback so dropdown is never empty
    OTHER_STATES.forEach(name => {
      const key = name.toLowerCase()
      if (!map.has(key)) map.set(key, { value: name, label: name, raw: { name } })
    })
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [states])

  const cityOptions = useMemo(
    () => (Array.isArray(cities) ? cities : []).map(city => ({ value: String(city?.id || ''), label: city?.name || '', raw: city })),
    [cities],
  )

  const countryOptions = useMemo(() => {
    return countries.map(buildCountryOption)
  }, [countries])

  const organisationTypeOptions = useMemo(
    () => orgTypes.map(type => ({ value: type, label: type, inputLabel: type, searchText: type })),
    [orgTypes],
  )

  /* ── Social link helpers ─────────────────────────────────────────── */
  function updateSocialLink(i, field, value) {
    setSocialLinks(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function addSocialLink() {
    setSocialLinks(prev => [...prev, { platform: '', url: '' }])
  }
  function removeSocialLink(i) {
    setSocialLinks(prev => prev.length <= 1 ? [{ platform: '', url: '' }] : prev.filter((_, idx) => idx !== i))
  }

  /* ── Load Indian states + branches on mount ──────────────────────── */
  useEffect(() => {
    http.get('/locations/states?country_id=1')
      .then(r => setStates(r.data.data || []))
      .catch(() => { })
    http.get('/branches')
      .then(r => setBranches(r.data.data || []))
      .catch(() => setBranches([]))
  }, [])

  useEffect(() => {
    setCountriesLoading(true)
    http.get('/locations/countries')
      .then(r => setCountries(mergeCountryDatasets(r.data.data || [], PHONE_COUNTRIES)))
      .catch(() => setCountries(mergeCountryDatasets([], PHONE_COUNTRIES)))
      .finally(() => setCountriesLoading(false))
  }, [])

  useEffect(() => {
    http.get('/member/payment-settings')
      .then(r => setPaymentSettings(r.data.data || {}))
      .catch(() => setPaymentSettings({}))
  }, [])

  useEffect(() => {
    if (!countries.length || !normalizedCountryName) return
    const matchedCountry = countries.find(country => String(country.name || '').toLowerCase() === normalizedCountryName.toLowerCase())
    if (!matchedCountry) return

    setForm(current => {
      const next = { ...current }
      // Only auto-set country_id for non-overseas (overseas uses manual searchable select)
      if (!current.country_id && current.location_type !== 'overseas') next.country_id = String(matchedCountry.id)
      if (!current.phone_country_iso2) next.phone_country_iso2 = matchedCountry.iso2 || current.phone_country_iso2
      if (!current.phone_country_code || current.phone_country_code === '+91') next.phone_country_code = matchedCountry.phone_code || current.phone_country_code
      return next
    })
  }, [countries, normalizedCountryName])

  useEffect(() => {
    setForm(current => {
      const nextIdType = idTypeOptions.some(option => option.value === current.id_type)
        ? current.id_type
        : defaultIdType

      const next = {
        ...current,
        id_type: nextIdType,
        aadhaar_number:          nextIdType === 'aadhaar'          ? current.aadhaar_number          : '',
        passport_number:         nextIdType === 'passport'         ? current.passport_number         : '',
        driving_licence_number:  nextIdType === 'driving_licence'  ? current.driving_licence_number  : '',
        voter_id_number:         nextIdType === 'voter_id'         ? current.voter_id_number         : '',
        national_id_number:      nextIdType === 'national_id'      ? current.national_id_number      : '',
        other_govt_id_number:    nextIdType === 'other_govt_id'    ? current.other_govt_id_number    : '',
        id_type_other_label:     nextIdType === 'other_govt_id'    ? current.id_type_other_label     : '',
      }

      if (
        next.id_type === current.id_type &&
        next.aadhaar_number === current.aadhaar_number &&
        next.passport_number === current.passport_number &&
        next.driving_licence_number === current.driving_licence_number &&
        next.voter_id_number === current.voter_id_number &&
        next.national_id_number === current.national_id_number &&
        next.other_govt_id_number === current.other_govt_id_number &&
        next.id_type_other_label === current.id_type_other_label
      ) {
        return current
      }

      return next
    })
  }, [defaultIdType, idTypeOptions])

  useEffect(() => {
    if (!form.state_id) { setCities([]); return }
    setCitiesLoading(true)
    http.get(`/locations/cities?state_id=${form.state_id}`)
      .then(r => setCities(r.data.data || []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false))
  }, [form.state_id])

  useEffect(() => {
    if (form.location_type === 'rajasthan' && rajasthanState) {
      set('state_id', String(rajasthanState.id))
    }
  }, [form.location_type, rajasthanState])

  useEffect(() => {
    if (!form.location_type || !form.membership_type || !form.plan_type) {
      setPkg(null)
      setForm(f => ({ ...f, package_id: null }))
      setPkgError('')
      setPkgLoading(false)
      return
    }

    // Use AbortController so stale in-flight requests cannot clobber later ones
    const controller = new AbortController()
    setPkgLoading(true)
    setPkgError('')
    setPkg(null)

    const qp = new URLSearchParams({
      membership_type: form.membership_type,
      plan_type: form.plan_type,
      location_type: form.location_type,
    })
    if (form.location_type === 'overseas' && form.country_id) {
      qp.set('country_id', form.country_id)
    }

    http.get(`/membership/packages/match?${qp}`, { signal: controller.signal })
      .then(r => {
        if (controller.signal.aborted) return
        const pData = r.data?.data
        const pkgs = Array.isArray(pData) ? pData : (pData ? [pData] : [])
        if (pkgs.length > 0) {
          setAvailablePkgs(pkgs)
          // Auto-select if there is only 1 package. Otherwise, wait for user selection.
          if (pkgs.length === 1) {
            setPkg(pkgs[0])
            setForm(f => ({ ...f, package_id: pkgs[0].id }))
          } else {
            setPkg(null)
            setForm(f => ({ ...f, package_id: null }))
          }
          setPkgError('')
        } else {
          setAvailablePkgs([])
          setPkg(null)
          setForm(f => ({ ...f, package_id: null }))
          setPkgError('No package configured for this selection. Please contact the administrator.')
        }
      })
      .catch(err => {
        if (
          controller.signal.aborted ||
          err?.code === 'ERR_CANCELED' ||
          err?.name === 'CanceledError' ||
          axios.isCancel?.(err)
        ) return
        setAvailablePkgs([])
        setPkg(null)
        setForm(f => ({ ...f, package_id: null }))
        const serverMsg = err?.response?.data?.message
        setPkgError(serverMsg || 'Unable to load package. Please check your connection and try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setPkgLoading(false)
      })

    return () => controller.abort()
  }, [form.location_type, form.membership_type, form.plan_type, form.country_id])

  useEffect(() => {
    if (!form.location_type) { setMethods([]); set('payment_method', ''); return }
    const params = { location: form.location_type }
    if (form.location_type === 'overseas' && form.country_id) {
      // Look up iso_code from countries list for country_code param
      const country = countries.find(c => String(c.id) === String(form.country_id))
      if (country?.iso2) params.country_code = country.iso2
    }
    setMethodsLoading(true)
    set('payment_method', '') // reset on every location/country change
    http.get('/membership/payment-methods', { params })
      .then(r => {
        const rows = r.data.data || []
        // Hide incomplete UPI methods (no UPI ID and no QR)
        setMethods(rows.filter(m => {
          if (m.type === 'upi') {
            return !!(String(m.upi_id || '').trim() || String(m.qr_image || '').trim())
          }
          if (m.type === 'bank_transfer') {
            return !!(
              String(m.account_number || '').trim() ||
              String(m.ifsc_code || '').trim() ||
              String(m.bank_name || '').trim()
            )
          }
          if (m.type === 'international_wire') {
            return !!(
              String(m.swift_code || '').trim() ||
              String(m.iban || '').trim() ||
              String(m.account_number || '').trim() ||
              String(m.bank_name || '').trim()
            )
          }
          return true
        }))
      })
      .catch(() => setMethods([]))
      .finally(() => setMethodsLoading(false))
  }, [form.location_type, form.country_id, countries])

  function archivePaymentAttempt(reason = 'superseded') {
    setPaymentAttempts(prev => [
      ...prev,
      {
        reference_id: referenceId,
        method_id: formRef.current.payment_method || null,
        package_id: formRef.current.package_id || null,
        plan_type: formRef.current.plan_type || null,
        status: reason,
        had_confirmation: paymentConfirmed,
        had_proof: !!formRef.current.payment_screenshot,
        archived_at: new Date().toISOString(),
      },
    ])
  }

  function clearPaymentProofFiles() {
    set('payment_screenshot', null)
    setSsPreview(null)
    setSsFileMeta(null)
    if (ssRef.current) ssRef.current.value = ''
  }

  /** Reset confirmation/receipt and optionally mint a new reference (plan change). */
  function resetPaymentFlow({ regenerateReference = true, reason = 'superseded' } = {}) {
    if (paymentConfirmed || formRef.current.payment_screenshot || paymentStatus !== 'pending') {
      archivePaymentAttempt(reason)
    }
    setPaymentConfirmed(false)
    setPaymentStatus('pending')
    setShowInstructions(false)
    clearPaymentProofFiles()
    if (regenerateReference) setReferenceId(genPaymentRef())
  }

  function requestPaymentMethodChange(nextMethodId) {
    if (String(nextMethodId) === String(form.payment_method)) return
    if (paymentStatus === 'awaiting_verification') {
      toast.error('Payment receipt is already submitted. Contact FORTI support to change payment method.')
      return
    }
    if (paymentConfirmed || paymentStatus === 'submitted') {
      setPaymentConfirmModal({ type: 'method', nextMethodId: String(nextMethodId) })
      return
    }
    set('payment_method', String(nextMethodId))
    clearPaymentProofFiles()
    setShowInstructions(false)
  }

  function requestPlanChange(nextPlanType) {
    if (nextPlanType === form.plan_type) return
    if (paymentStatus === 'awaiting_verification') {
      toast.error('Payment receipt is already submitted. Contact FORTI support to change your plan.')
      return
    }
    if (paymentConfirmed || paymentStatus === 'submitted' || form.payment_screenshot) {
      setPaymentConfirmModal({ type: 'plan', nextPlanType })
      return
    }
    set('plan_type', nextPlanType)
  }

  function requestPackageChange(nextPkg) {
    if (!nextPkg || nextPkg.id === pkg?.id) return
    if (paymentStatus === 'awaiting_verification') {
      toast.error('Payment receipt is already submitted. Contact FORTI support to change your package.')
      return
    }
    if (paymentConfirmed || paymentStatus === 'submitted' || form.payment_screenshot) {
      setPaymentConfirmModal({ type: 'package', nextPkg })
      return
    }
    setPkg(nextPkg)
    setForm(f => ({ ...f, package_id: nextPkg.id }))
  }

  function confirmPaymentModalAction() {
    const modal = paymentConfirmModal
    if (!modal) return
    if (modal.type === 'complete') {
      // User-side only: never marks payment as verified
      setPaymentConfirmed(true)
      setPaymentStatus(formRef.current.payment_screenshot ? 'awaiting_verification' : 'submitted')
      setPaymentConfirmModal(null)
      setTimeout(() => proofSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
      toast.success('Payment submitted — awaiting admin verification. Upload your receipt below.')
      return
    }
    if (modal.type === 'method') {
      resetPaymentFlow({ regenerateReference: false, reason: 'reset' })
      set('payment_method', modal.nextMethodId)
      setPaymentConfirmModal(null)
      toast('Payment reset to Pending — complete payment with the new method', { icon: 'ℹ️' })
      return
    }
    if (modal.type === 'plan') {
      resetPaymentFlow({ regenerateReference: true, reason: 'superseded' })
      set('plan_type', modal.nextPlanType)
      setPaymentConfirmModal(null)
      toast('Plan changed — previous payment superseded. Complete a new payment and upload a new receipt.', { icon: 'ℹ️' })
      return
    }
    if (modal.type === 'package') {
      resetPaymentFlow({ regenerateReference: true, reason: 'superseded' })
      setPkg(modal.nextPkg)
      setForm(f => ({ ...f, package_id: modal.nextPkg.id }))
      setPaymentConfirmModal(null)
      toast('Package changed — previous payment superseded. Complete a new payment and upload a new receipt.', { icon: 'ℹ️' })
    }
  }

  // Convert INR membership fee → USD (or method currency) for International Wire
  useEffect(() => {
    const selected = methods.find(m => String(m.id) === String(form.payment_method))
    const isWire = selected?.type === 'international_wire'
    const baseInr = Number(pkg?.price)
    if (!isWire || !Number.isFinite(baseInr) || baseInr <= 0) {
      setFxQuote(null)
      setFxQuoteLoading(false)
      return
    }
    const target = String(selected.currency || 'USD').toUpperCase()
    const controller = new AbortController()
    setFxQuoteLoading(true)
    http.get('/currency-settings/convert', {
      params: { amount: baseInr, from: 'INR', to: target },
      signal: controller.signal,
    })
      .then(r => setFxQuote(r.data.data || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return
        setFxQuote(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setFxQuoteLoading(false)
      })
    return () => controller.abort()
  }, [form.payment_method, methods, pkg?.price])

  const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
  const RECEIPT_OK_MIME = ['image/jpeg', 'image/png', 'application/pdf']
  const RECEIPT_OK_EXT = /\.(jpe?g|png|pdf)$/i

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function handleFile(key, file, setPreview) {
    if (!file) return
    if (key === 'payment_screenshot') {
      const mimeOk = RECEIPT_OK_MIME.includes(file.type)
      const extOk = RECEIPT_OK_EXT.test(file.name || '')
      if (!mimeOk && !extOk) {
        toast.error('Payment receipt must be JPG, PNG, or PDF')
        if (ssRef.current) ssRef.current.value = ''
        return
      }
      if (file.size > RECEIPT_MAX_BYTES) {
        toast.error('Payment receipt must be 5 MB or smaller')
        if (ssRef.current) ssRef.current.value = ''
        return
      }
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')
      setSsFileMeta({ name: file.name, size: file.size, type: file.type, isPdf })
      set(key, file)
      if (isPdf) {
        setPreview(null)
      } else {
        setPreview(URL.createObjectURL(file))
      }
      setPaymentStatus('awaiting_verification')
      setFieldError('payment_screenshot', '')
      toast.success('Receipt uploaded — awaiting admin verification')
      return
    }
    set(key, file)
    setPreview(URL.createObjectURL(file))
  }
  function clearFile(key, setPreview) {
    set(key, null)
    setPreview(null)
    if (key === 'payment_screenshot') {
      setSsFileMeta(null)
      if (ssRef.current) ssRef.current.value = ''
      setPaymentStatus(paymentConfirmed ? 'submitted' : 'pending')
    }
  }

  /* ── Camera modal ──────────────────────────────────────────── */
  async function openCameraModal() {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      setCameraOpen(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      })
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.')
      } else {
        toast.error('Camera not available. You can upload a photo instead.')
      }
    }
  }
  function closeCameraModal() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
  }
  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })
      handleFile('profile_photo', file, setProfilePreview)
      closeCameraModal()
    }, 'image/jpeg', 0.9)
  }

  /* ── Validations ────────────────────────────────────────────────── */
  function validateStep(s) {
    const e = getStepErrors(s)
    if (Object.keys(e).length > 0) {
      markTouched(...(STEP_VALIDATION_FIELDS[s] || []))
      toast.error('Please complete all required fields before continuing.', { id: `membership-step-${s}-validation` })
      focusField(Object.keys(e)[0])
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function isStepComplete(stepIndex) {
    return Object.keys(getStepErrors(stepIndex)).length === 0
  }

  function handleNext() {
    if (!validateStep(step)) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  function handleBack() {
    setStep(s => Math.max(s - 1, 0))
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /* ── Submit ─────────────────────────────────────────────────────── */
  async function handleSubmit() {
    for (let i = 0; i <= step; i++) {
      if (!validateStep(i)) {
        setStep(i)
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('full_name', form.full_name)
      fd.append('email', form.email)
      fd.append('phone', formatFullPhoneNumber(selectedPhoneCountry, form.phone))
      fd.append('phone_country_code', form.phone_country_code)
      fd.append('phone_country_iso2', form.phone_country_iso2)
      fd.append('country_name', form.country_name)
      if (form.gender) fd.append('gender', form.gender)
      fd.append('id_type', activeIdType)
      if (activeIdType === 'aadhaar' && form.aadhaar_number) fd.append('aadhaar_number', form.aadhaar_number)
      if (activeIdType === 'passport' && form.passport_number) fd.append('passport_number', form.passport_number)
      if (activeIdType === 'national_id' && form.national_id_number) fd.append('national_id_number', form.national_id_number)
      if (form.pin_code) fd.append('pin_code', form.pin_code)
      if (form.organisation_name) fd.append('organisation_name', form.organisation_name)
      if (form.organisation_type) fd.append('organisation_type', form.organisation_type)
      if (form.organisation_type_other) fd.append('organisation_type_other', form.organisation_type_other)
      // Social links as JSON
      const validLinks = socialLinks.filter(l => l.platform && l.url?.trim())
      if (validLinks.length) fd.append('social_links', JSON.stringify(validLinks))
      if (form.profile_photo) fd.append('profile_photo', form.profile_photo)
      if (form.organisation_logo) fd.append('organisation_logo', form.organisation_logo)
      fd.append('location_type', form.location_type)
      if (form.state_id) fd.append('state_id', form.state_id)
      if (form.city_id) fd.append('city_id', form.city_id)
      if (form.branch_id) fd.append('branch_id', form.branch_id)
      if (form.city_other) fd.append('city_other', form.city_other)
      if (form.country_id) fd.append('country_id', form.country_id)
      if (form.overseas_city) fd.append('overseas_city', form.overseas_city)
      fd.append('wing_id', form.wing_id)
      fd.append('membership_type', form.membership_type)
      fd.append('plan_type', form.plan_type)
      fd.append('package_id', form.package_id || '')
      fd.append('payment_method', form.payment_method)
      fd.append('payment_reference', referenceId)
      fd.append('payment_client_status', paymentStatus === 'awaiting_verification' ? 'awaiting_verification' : (paymentConfirmed || paymentStatus === 'submitted' ? 'submitted' : 'pending'))
      if (paymentAttempts.length) {
        fd.append('payment_attempts', JSON.stringify(paymentAttempts))
      }
      const selectedPayMethod = methods.find(m => String(m.id) === String(form.payment_method))
      if (selectedPayMethod?.type === 'international_wire' && fxQuote?.payable_amount != null) {
        fd.append('currency', fxQuote.target_currency || 'USD')
        fd.append('payable_amount', String(fxQuote.payable_amount))
        fd.append('exchange_rate', String(fxQuote.exchange_rate))
        fd.append('base_amount_inr', String(fxQuote.base_amount))
      } else {
        fd.append('currency', formCurrency)
      }
      if (form.payment_screenshot) fd.append('payment_screenshot', form.payment_screenshot)

      const res = await http.post('/membership/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      // Clear localStorage drafts on successful submission
      localStorage.removeItem('forti_application_form')
      localStorage.removeItem('forti_application_step')
      localStorage.removeItem('forti_application_social')

      const resData = res.data.data
      const membershipId = resData?.membership_id || resData?.application_id || ''
      navigate(`/track${membershipId ? `?membership_id=${encodeURIComponent(membershipId)}` : ''}`, {
        replace: true,
        state: { application: resData },
      })
    } catch (err) {
      const message = err.response?.data?.message || 'Submission failed. Please try again.'
      if (/aadhaar number must be exactly 12 digits/i.test(message)) {
        setStep(0)
        markTouched('id_type', 'aadhaar_number')
        setFieldError('aadhaar_number', 'Aadhaar number must be exactly 12 digits')
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
      } else if (/account with this email/i.test(message) || /already pending approval/i.test(message)) {
        setStep(0)
        markTouched('email')
        setFieldError('email', message)
        topRef.current?.scrollIntoView({ behavior: 'smooth' })
        setTimeout(() => focusField('email'), 100)
      } else {
        setErrors({ _global: message })
      }
    } finally { setSubmitting(false) }
  }

  /* ─── Success Popup ─────────────────────────────────────────────── */
  if (submitted) {
    const TRACK_STEPS = [
      'Application Submitted',
      'Payment Submitted / Awaiting Verification',
      'Payment Verified',
      'Under Review',
      'Approved',
      'Membership Activated',
    ]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Application Submitted Successfully</h2>
          <p className="text-gray-500 text-sm">Your payment receipt was received and is awaiting admin verification. You can track your status below.</p>
          <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-2xl p-5 text-left">
            <p className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Application ID</p>
            <p className="text-2xl font-bold text-primary-700 mt-1 font-mono">{submitted.membership_id}</p>
            <p className="text-xs text-gray-400 mt-1">Save this ID — you'll need it to track your application</p>
          </div>

          {/* Track Status Timeline */}
          <div className="text-left space-y-1 bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Application Status</p>
            {TRACK_STEPS.map((label, i) => {
              const done = i === 0
              const current = i === 1
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${current ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : done ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-300 border border-gray-200'
                      }`}>
                      {done && !current ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : current ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <span className="text-[10px]">{i + 1}</span>
                      )}
                    </div>
                    {i < TRACK_STEPS.length - 1 && (
                      <div className={`w-0.5 h-5 mt-0.5 rounded-full ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <p className={`text-sm leading-tight pt-1 pb-4 ${current ? 'text-primary-700 font-semibold' : done ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                    {label}
                    {current && <span className="ml-2 text-[10px] font-bold bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">Current</span>}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 justify-center">
            <button onClick={() => navigate('/track')} className="btn-primary flex-1">
              Track Status
            </button>
            <button onClick={() => navigate('/')} className="btn-outline text-gray-500 flex-1">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Stepper ───────────────────────────────────────────────────── */
  function renderStepper() {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="font-medium">Step {step + 1} of {STEPS.length}</span>
          <span className="font-semibold text-primary-700">{STEPS[step].label}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5">
          <div
            className="bg-gradient-to-r from-primary-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={i} className="flex flex-col items-center relative group">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300
                  ${done ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm shadow-green-200'
                    : active ? 'bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg shadow-primary-200 ring-4 ring-primary-100 scale-110'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                  {done ? '✓' : <Icon size={14} />}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-1 sm:mt-2 hidden sm:block max-w-[64px] sm:max-w-[80px] text-center leading-tight
                  ${active ? 'text-primary-700 font-bold' : done ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ─── Step 1: Basic Details ─────────────────────────────────────── */
  function renderBasicDetails() {
    return (
      <SectionCard icon={User} title="Personal & Organisation Details" desc="Fill in your basic information">
        {/* Hidden camera capture input (capture="environment" opens device camera) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
          onChange={e => { if (e.target.files?.[0]) { handleFile('profile_photo', e.target.files[0], setProfilePreview) } e.target.value = '' }} />

        {/* Profile Photo */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center gap-5">
          {profilePreview ? (
            <div className="relative shrink-0">
              <img src={profilePreview} alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-md cursor-pointer hover:opacity-90 transition"
                onClick={() => setPhotoZoom(true)} />
              <button type="button"
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition"
                onClick={() => clearFile('profile_photo', setProfilePreview)}>
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition shrink-0"
              onClick={() => profileRef.current?.click()}>
              <Camera size={22} />
              <span className="text-[10px] mt-0.5 font-medium">Photo</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-700">Profile Photo</p>
            <p className="text-xs text-gray-400 mt-0.5">Optional · JPG, PNG – max 2 MB</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => profileRef.current?.click()}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                <Upload size={12} /> {profilePreview ? 'Change' : 'Upload'}
              </button>
              <button type="button" onClick={openCameraModal}
                className="btn-outline btn-sm inline-flex items-center gap-1.5">
                <Camera size={12} /> Use Camera
              </button>
            </div>
          </div>
          <input ref={profileRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile('profile_photo', e.target.files[0], setProfilePreview)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 items-start">
          <div className="space-y-1.5">
            <label className="label">Full Name *</label>
            <input className={getInputClassName('full_name')} placeholder="Enter your full name"
              data-field="full_name"
              aria-invalid={!!errors.full_name}
              value={form.full_name}
              onChange={e => handleFieldChange('full_name', e.target.value)}
              onBlur={() => validateField('full_name')} />
            <FieldError msg={errors.full_name} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Gender *</label>
            <SearchableSelect
              options={GENDER_SELECT_OPTIONS}
              value={form.gender}
              onChange={v => handleFieldChange('gender', v)}
              onBlur={() => validateField('gender')}
              placeholder="Select gender"
              minQueryLength={0}
              inputAriaInvalid={!!errors.gender}
              inputClassName={errors.gender ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30' : ''}
              dataField="gender"
            />
            <FieldError msg={errors.gender} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Email Address *</label>
            <input className={getInputClassName('email')} type="email" placeholder="email@example.com"
              data-field="email"
              aria-invalid={!!errors.email}
              value={form.email}
              onChange={e => handleFieldChange('email', e.target.value)}
              onBlur={() => validateField('email')} />
            <FieldError msg={errors.email} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Mobile Number *</label>
            <div className="grid grid-cols-[80px_minmax(0,1fr)] sm:grid-cols-[90px_minmax(0,1fr)] gap-3">
              <SearchableSelect
                options={countryOptions}
                value={form.phone_country_iso2}
                placeholder={countriesLoading ? '...' : '+'}
                loading={countriesLoading}
                inputName="member-phone-country-search"
                autoComplete="new-password"
                getSearchText={option => option.searchText}
                getDisplayValue={option => option.raw?.phone_code || '+00'}
                renderOption={renderCountryOption}
                onChange={(_, option) => applyCountrySelection(option?.raw)}
                inputClassName="text-sm px-2 text-center"
              />
              <input className={getInputClassName('phone')} type="tel" inputMode="numeric" placeholder={getPhonePlaceholder(selectedPhoneCountry)}
                data-field="phone"
                aria-invalid={!!errors.phone}
                value={form.phone}
                onChange={e => handleFieldChange('phone', String(e.target.value || '').replace(/\D/g, '').slice(0, 15))}
                onBlur={() => validateField('phone')} />
            </div>
            <FieldError msg={errors.phone} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Country</label>
            <SearchableSelect
              options={countryOptions}
              value={form.phone_country_iso2}
              placeholder={countriesLoading ? 'Loading countries…' : 'Search country (e.g. India, IN, +91)'}
              loading={countriesLoading}
              inputName="member-country-search"
              autoComplete="new-password"
              getSearchText={option => option.searchText}
              getDisplayValue={option => option.label}
              renderOption={renderCountryOption}
              onChange={(_, option) => applyCountrySelection(option?.raw)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">ID Type *</label>
            <SearchableSelect
              options={idTypeOptions}
              value={activeIdType}
              onChange={v => handleFieldChange('id_type', v, { relatedFields: ['id_type', identityFieldConfig.field] })}
              onBlur={() => validateField('id_type', { relatedFields: ['id_type', identityFieldConfig.field] })}
              placeholder="Select ID Type"
              minQueryLength={0}
              inputAriaInvalid={!!errors.id_type}
              inputClassName={errors.id_type ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30' : ''}
              dataField="id_type"
            />
            <FieldError msg={errors.id_type} />
          </div>
          <div className="space-y-1.5">
            <label className="label">{identityFieldConfig.label} *</label>
            <input
              className={getInputClassName(identityFieldConfig.field)}
              placeholder={identityFieldConfig.placeholder}
              data-field={identityFieldConfig.field}
              aria-invalid={!!errors[identityFieldConfig.field]}
              inputMode={identityFieldConfig.inputMode}
              maxLength={identityFieldConfig.maxLength}
              value={form[identityFieldConfig.field] || ''}
              onChange={e => handleFieldChange(identityFieldConfig.field, identityFieldConfig.transform(e.target.value))}
              onBlur={() => validateField(identityFieldConfig.field)}
            />
            <FieldError msg={errors[identityFieldConfig.field]} />
          </div>
          {activeIdType === 'aadhaar' && (
            <div className="space-y-1.5">
              <label className="label">{isIndianApplicant ? 'PIN Code *' : 'Postal Code *'}</label>
              {isIndianApplicant ? (
                <input className={getInputClassName('pin_code')} placeholder="6-digit PIN code" maxLength={6}
                  data-field="pin_code"
                  aria-invalid={!!errors.pin_code}
                  value={form.pin_code}
                  onChange={e => handleFieldChange('pin_code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => validateField('pin_code')} />
              ) : (
                <input className={getInputClassName('pin_code')} placeholder="Enter postal / zip code" maxLength={20}
                  data-field="pin_code"
                  aria-invalid={!!errors.pin_code}
                  value={form.pin_code}
                  onChange={e => handleFieldChange('pin_code', e.target.value.replace(/[^A-Za-z0-9 -]/g, '').slice(0, 20))}
                  onBlur={() => validateField('pin_code')} />
              )}
              {isIndianApplicant && pincodeVerifying && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-ping" />
                  Verifying PIN code...
                </p>
              )}
              {isIndianApplicant && pincodeDetails && pincodeDetails.verified && (
                <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                  ✓ Valid PIN code - {pincodeDetails.district}, {pincodeDetails.state}
                </p>
              )}
              <FieldError msg={errors.pin_code} />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="label">Organisation Name *</label>
            <input className={getInputClassName('organisation_name')} placeholder="Company / Organisation name"
              data-field="organisation_name"
              aria-invalid={!!errors.organisation_name}
              value={form.organisation_name}
              onChange={e => handleFieldChange('organisation_name', e.target.value)}
              onBlur={() => validateField('organisation_name')} />
            <FieldError msg={errors.organisation_name} />
          </div>
          <div className="space-y-1.5">
            <label className="label">Organisation Type *</label>
            <SearchableSelect
              options={organisationTypeOptions}
              value={form.organisation_type}
              onChange={v => handleFieldChange('organisation_type', v, { relatedFields: ['organisation_type', 'organisation_type_other'] })}
              placeholder={orgTypesLoading ? 'Loading organization types…' : 'Select type'}
              minQueryLength={0}
              loading={orgTypesLoading}
              inputName="organization-type-search"
              dataField="organisation_type"
              inputAriaInvalid={!!errors.organisation_type}
              inputClassName={errors.organisation_type ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50/30' : ''}
              onBlur={() => validateField('organisation_type', { relatedFields: ['organisation_type', 'organisation_type_other'] })}
              autoComplete="new-password"
              getSearchText={option => option.searchText}
              renderOption={renderOrgTypeOption}
              emptyText="No organization types found"
              allowCustom
            />
            <FieldError msg={errors.organisation_type} />
          </div>
          {form.organisation_type === 'Other' && (
            <div className="sm:col-span-2">
              <label className="label">Specify your organization type</label>
              <input
                className={getInputClassName('organisation_type_other')}
                placeholder="Enter your organization type"
                data-field="organisation_type_other"
                aria-invalid={!!errors.organisation_type_other}
                value={form.organisation_type_other}
                onChange={e => handleFieldChange('organisation_type_other', e.target.value)}
                onBlur={() => validateField('organisation_type_other')}
              />
              <FieldError msg={errors.organisation_type_other} />
            </div>
          )}
        </div>

        {/* Organisation Logo */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <label className="label mb-3">Organisation Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative shrink-0">
                <img src={logoPreview} alt="Logo"
                  className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white p-1" />
                <button type="button"
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  onClick={() => clearFile('organisation_logo', setLogoPreview)}>
                  <Trash2 size={11} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition shrink-0"
                onClick={() => logoRef.current?.click()}>
                <Building2 size={18} /><span className="text-[10px] mt-0.5 font-medium">Logo</span>
              </div>
            )}
            <div>
              <button type="button" onClick={() => logoRef.current?.click()} className="btn-outline btn-sm">
                {logoPreview ? 'Replace' : 'Upload Logo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Optional · JPG, PNG – max 2 MB</p>
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile('organisation_logo', e.target.files[0], setLogoPreview)} />
        </div>

        {/* Social Links — dropdown + URL, multi-row */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0 flex items-center gap-2">
              <Link2 size={14} className="text-gray-400" />Social Links
            </label>
            <button type="button" onClick={addSocialLink}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              <Plus size={13} /> Add Link
            </button>
          </div>
          <div className="space-y-3">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex items-start gap-2">
                <select
                  className="input w-40 shrink-0 text-sm"
                  value={link.platform}
                  onChange={e => updateSocialLink(i, 'platform', e.target.value)}>
                  <option value="">Platform</option>
                  {SOCIAL_PLATFORMS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    className="input pl-9 text-sm"
                    placeholder={SOCIAL_PLATFORMS.find(p => p.value === link.platform)?.placeholder || 'https://...'}
                    value={link.url}
                    onChange={e => updateSocialLink(i, 'url', e.target.value)} />
                  <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button type="button" onClick={() => removeSocialLink(i)}
                  className="mt-2 text-gray-400 hover:text-red-500 transition shrink-0">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    )
  }

  /* ─── Step 2: Location ──────────────────────────────────────────── */
  function renderLocation() {
    const selectedCountry = countries.find(c => String(c.id) === String(form.country_id))
    const overseasCurrency = 'USD'

    return (
      <SectionCard icon={MapPin} title="Select Your Location" desc="Choose where you are based">
        {/* Location type cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {LOCATION_OPTIONS.map(loc => {
            const selected = form.location_type === loc.value
            return (
              <button key={loc.value} type="button"
                onClick={() => {
                  set('location_type', loc.value)
                  setForm(f => ({
                    ...f,
                    state_id: '',
                    city_id: '',
                    branch_id: '',
                    state_other: '',
                    city_other: '',
                    overseas_city: '',
                    country_id: loc.value === 'overseas' ? f.country_id : '',
                  }))
                  if (loc.value !== 'overseas') {
                    const india = countries.find(country => String(country.iso2 || '').toUpperCase() === 'IN')
                    if (india) applyCountrySelection(india)
                  }
                  setCities([])
                }}
                className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 group
                  ${selected
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${loc.color} flex items-center justify-center text-2xl mb-3 shadow-sm`}>
                  {loc.icon}
                </div>
                <p className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{loc.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{loc.desc}</p>
                {selected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <FieldError msg={errors.location_type} />

        {/* ── Rajasthan: city dropdown → branch dropdown ── */}
        {form.location_type === 'rajasthan' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-orange-800">Select City & Branch</p>
              <span className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full">
                {getCurrencySymbol('INR')} INR
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2 text-orange-800">
                  <MapPin size={14} /> City *
                </label>
                <SearchableSelect
                  options={rajasthanCityOptions}
                  value={form.city_id || form.city_other}
                  placeholder={citiesLoading ? 'Loading cities…' : (rajasthanCityOptions.length ? 'Search city...' : 'Type your city')}
                  allowCustom={true}
                  inputName="city_id"
                  dataField="city_id"
                  onChange={(val, opt) => {
                    set('branch_id', '')
                    if (!opt) {
                      set('city_id', '')
                      set('city_other', val)
                    } else {
                      set('city_id', val)
                      set('city_other', '')
                    }
                  }}
                  inputClassName="bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-200"
                />
                <FieldError msg={errors.city_id} />
              </div>
              <div>
                <label className="label flex items-center gap-2 text-orange-800">
                  <Building2 size={14} /> Branch
                  <span className="text-xs text-orange-500 font-normal">(optional)</span>
                </label>
                {(() => {
                  const rajState = states.find(s => String(s.name || '').toLowerCase() === 'rajasthan')
                  const stateId = rajState ? rajState.id : form.state_id
                  const hasCity = !!(form.city_id || form.city_other)
                  const rajBranches = filterBranchesForLocation(branches, {
                    location_type: 'rajasthan',
                    state_id: stateId,
                    city_id: form.city_id,
                  })
                  if (hasCity && rajBranches.length === 0) {
                    return <NoBranchMessage tone="orange" />
                  }
                  if (!hasCity) {
                    return (
                      <select disabled className="input w-full bg-gray-50 border-orange-200 text-gray-400">
                        <option>Select city first</option>
                      </select>
                    )
                  }
                  return (
                    <select
                      value={form.branch_id}
                      data-field="branch_id"
                      onChange={e => set('branch_id', e.target.value)}
                      className="input w-full bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-200 text-gray-700"
                    >
                      <option value="">Select preferred branch (optional)</option>
                      {rajBranches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Other States: State + City + Branch ── */}
        {form.location_type === 'other_states' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-800">Select State, City & Branch</p>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {getCurrencySymbol('INR')} INR
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label flex items-center gap-2 text-blue-800">
                  <MapPin size={14} /> State *
                </label>
                <SearchableSelect
                  options={stateOptions}
                  value={form.state_id}
                  placeholder={states.length ? 'Search state' : 'Loading states…'}
                  onChange={nextValue => {
                    set('state_id', nextValue)
                    set('city_id', '')
                    set('city_other', '')
                    set('branch_id', '')
                  }}
                  inputClassName="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200"
                />
                <FieldError msg={errors.state_id} />
              </div>
              <div>
                <label className="label flex items-center gap-2 text-blue-800">
                  <MapPin size={14} /> City *
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value={form.city_id || form.city_other}
                  placeholder={
                    !form.state_id
                      ? 'Select state first'
                      : citiesLoading
                        ? 'Loading cities…'
                        : (cityOptions.length ? 'Search city...' : 'Type your city')
                  }
                  allowCustom={true}
                  inputName="city_id"
                  dataField="city_id"
                  onChange={(val, opt) => {
                    set('branch_id', '')
                    if (!opt) {
                      set('city_id', '')
                      set('city_other', val)
                    } else {
                      set('city_id', val)
                      set('city_other', '')
                    }
                  }}
                  disabled={!form.state_id}
                  inputClassName={`bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200 ${!form.state_id ? 'bg-gray-50' : ''}`}
                />
                <FieldError msg={errors.city_id} />
              </div>
              <div>
                <label className="label flex items-center gap-2 text-blue-800">
                  <Building2 size={14} /> Branch
                  <span className="text-xs text-blue-400 font-normal">(optional)</span>
                </label>
                {(() => {
                  const hasCity = !!(form.city_id || form.city_other)
                  const stateBranches = filterBranchesForLocation(branches, {
                    location_type: 'other_states',
                    state_id: form.state_id,
                    city_id: form.city_id,
                  })
                  if (form.state_id && hasCity && stateBranches.length === 0) {
                    return <NoBranchMessage tone="blue" />
                  }
                  if (!form.state_id || !hasCity) {
                    return (
                      <select disabled className="input w-full bg-gray-50 border-blue-200 text-gray-400">
                        <option>{!form.state_id ? 'Select state first' : 'Select city first'}</option>
                      </select>
                    )
                  }
                  return (
                    <select
                      value={form.branch_id}
                      data-field="branch_id"
                      onChange={e => set('branch_id', e.target.value)}
                      className="input w-full bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200 text-gray-700"
                    >
                      <option value="">Select preferred branch (optional)</option>
                      {stateBranches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Overseas: searchable country autocomplete ── */}
        {form.location_type === 'overseas' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald-800">Select Country & City</p>
              {overseasCurrency && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {getCurrencySymbol(overseasCurrency)} {overseasCurrency}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country */}
              <div>
                <label className="label flex items-center gap-2 text-emerald-800">
                  <Globe2 size={14} /> Country *
                </label>
                <SearchableSelect
                  options={countryOptions}
                  value={form.phone_country_iso2}
                  placeholder={countries.length ? 'Search country...' : 'Loading countries…'}
                  loading={countriesLoading}
                  inputName="overseas-country-search"
                  autoComplete="new-password"
                  getSearchText={option => option.searchText}
                  renderOption={renderCountryOption}
                  onChange={(_, option) => {
                    applyCountrySelection(option?.raw)
                    set('overseas_city', '')
                    set('city_id', '')
                    set('branch_id', '')
                  }}
                  inputClassName="bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
                />
                <FieldError msg={errors.country_id} />
              </div>

              {/* City */}
              <div>
                <label className="label flex items-center gap-2 text-emerald-800">
                  <MapPin size={14} /> City *
                </label>
                <input
                  className="input w-full bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
                  placeholder="Enter your city"
                  value={form.overseas_city || ''}
                  onChange={e => {
                    set('overseas_city', e.target.value)
                    set('branch_id', '')
                  }}
                  data-field="overseas_city"
                />
                <FieldError msg={errors.overseas_city} />
              </div>
            </div>

            {/* Branch / Association for overseas (Country → Branch when configured) */}
            <div>
              <label className="label flex items-center gap-2 text-emerald-800">
                <Building2 size={14} /> Branch / Association
                <span className="text-xs text-emerald-500 font-normal">(optional)</span>
              </label>
              {(() => {
                const overseasBranches = filterBranchesForLocation(branches, {
                  location_type: 'overseas',
                  country_id: form.country_id,
                  city_id: form.city_id,
                })
                if (!form.country_id) {
                  return (
                    <select disabled className="input w-full bg-gray-50 border-emerald-200 text-gray-400">
                      <option>Select country first</option>
                    </select>
                  )
                }
                if (overseasBranches.length === 0) {
                  return <NoBranchMessage tone="emerald" />
                }
                return (
                  <select
                    value={form.branch_id}
                    data-field="branch_id"
                    onChange={e => set('branch_id', e.target.value)}
                    className="input w-full bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200 text-gray-700"
                  >
                    <option value="">Select branch / association (optional)</option>
                    {overseasBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )
              })()}
            </div>
          </div>
        )}
      </SectionCard>
    )

  }

  /* ─── Step 3: Membership Type ───────────────────────────────────── */
  function renderMembershipType() {
    return (
      <>
        <SectionCard icon={Users} title="Choose Your Wing" desc="Select the FORTI wing you are joining">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-field="wing_id">
            {wings.map(w => {
              const selected = String(form.wing_id) === String(w.id)
              return (
                <button key={w.id} type="button"
                  onClick={() => set('wing_id', String(w.id))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${selected
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className={`font-bold ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{w.name}</p>
                  {w.description && <p className="text-xs text-gray-500 mt-1">{w.description}</p>}
                </button>
              )
            })}
          </div>
          <FieldError msg={errors.wing_id} />
        </SectionCard>
        <SectionCard icon={Users} title="Choose Membership Type" desc="Select the type of membership you want">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {MEMBERSHIP_OPTIONS.map(opt => {
              const selected = form.membership_type === opt.value
              return (
                <button key={opt.value} type="button"
                  onClick={() => set('membership_type', opt.value)}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 group
                  ${selected
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-purple-50 ring-2 ring-primary-200 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{opt.icon}</span>
                    <p className={`font-bold text-lg ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{opt.label}</p>
                  </div>
                  {selected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <FieldError msg={errors.membership_type} />
        </SectionCard>
      </>
    )
  }

  /* ─── Step 4: Plan & Package ────────────────────────────────────── */
  /* ─── Step 4: Plan & Package ────────────────────────────────────── */
  function renderPlanPackage() {
    // Derive display values from current pkg
    const effectiveCurrency = form.location_type === 'overseas'
      ? (formCurrency || pkg?.currency || 'USD')
      : (formCurrency || pkg?.currency || 'INR')
    const currSymbol = getCurrencySymbol(effectiveCurrency)
    const locale = effectiveCurrency === 'INR' ? 'en-IN'
      : effectiveCurrency === 'JPY' ? 'ja-JP'
        : 'en-US'
    const hiddenBenefits = new Set([
      'forti membership certificate',
      'access to member events',
      'industry networking',
      'directory listing',
    ])
    const benefits = Array.isArray(pkg?.benefits)
      ? pkg.benefits
        .filter(Boolean)
        .filter(benefit => !hiddenBenefits.has(String(benefit).trim().toLowerCase()))
      : []
    const showPackageBenefits = form.membership_type !== 'corporate' && benefits.length > 0
    const durMonths = pkg?.duration_months ?? 0
    const durationLabel = pkg?.duration === 'lifetime' ? 'Lifetime (valid forever)'
      : durMonths >= 36 ? `${Math.round(durMonths / 12)} Years`
        : durMonths > 0 ? `${durMonths} months`
          : PLAN_OPTIONS.find(p => p.value === form.plan_type)?.label || ''

    return (
      <SectionCard icon={Package} title="Select Plan Duration" desc="Choose your membership plan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {PLAN_OPTIONS.map(opt => {
            const selected = form.plan_type === opt.value
            const Icon = opt.icon
            return (
              <button key={opt.value} type="button"
                onClick={() => requestPlanChange(opt.value)}
                disabled={paymentStatus === 'awaiting_verification'}
                className={`relative p-6 rounded-2xl border-2 text-center transition-all duration-300 ease-in-out group
                  ${paymentStatus === 'awaiting_verification' ? 'opacity-60 cursor-not-allowed' : ''}
                  ${selected
                    ? `bg-gradient-to-br ${opt.selectedGradient} ${opt.border} ring-2 ring-offset-1 shadow-lg`
                    : `bg-gradient-to-br ${opt.gradient} border-gray-200 hover:${opt.border} hover:shadow-lg hover:scale-105`
                  }`}>
                <div className={`w-14 h-14 mx-auto mb-3 flex items-center justify-center transition-all ${opt.noIconBg ? '' : 'rounded-2xl'}
                  ${selected
                    ? (opt.noIconBg ? '' : `bg-gradient-to-br ${opt.iconFrom} ${opt.iconTo} text-white shadow-md`)
                    : (opt.noIconBg ? '' : `${opt.iconBg} ${opt.iconColor}`)}`}>
                  <Icon size={26} />
                </div>
                <p className={`font-bold text-lg mt-1 ${selected ? 'text-gray-900' : 'text-gray-800'}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-snug">{opt.desc}</p>
                {selected && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow">
                    <CheckCircle size={12} className="text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <FieldError msg={errors.plan_type} />
        {paymentStatus === 'awaiting_verification' && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            Plan and payment method are locked after receipt upload. Contact FORTI support if you need changes.
          </div>
        )}

        {/* ── Loading state ── */}
        {pkgLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-3 text-gray-500 text-sm mt-2">
            <Loader2 size={18} className="animate-spin text-primary-500 shrink-0" />
            <span>Loading package details…</span>
          </div>
        )}

        {/* ── Error / not configured state ── */}
        {pkgError && !pkgLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-3 text-amber-700 mt-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Package Not Available</p>
              <p className="text-xs mt-0.5">{pkgError}</p>
            </div>
          </div>
        )}

        {/* ── Multiple Packages Selection ── */}
        {!pkgLoading && !pkgError && availablePkgs.length > 1 && (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Multiple packages are available. Please select one:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {availablePkgs.map(p => {
                 const isSelected = p.id === pkg?.id;
                 return (
                   <button key={p.id} type="button" onClick={() => requestPackageChange(p)}
                     disabled={paymentStatus === 'awaiting_verification'}
                     className={`text-left p-4 rounded-xl border-2 transition-all ${paymentStatus === 'awaiting_verification' ? 'opacity-60 cursor-not-allowed' : ''} ${isSelected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                     <div className="flex justify-between items-start mb-1">
                       <p className={`font-bold text-base ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{p.name}</p>
                     </div>
                     <p className="font-extrabold text-primary-700 mb-2">{getCurrencySymbol(p.currency)}{Number(p.price).toLocaleString()}</p>
                     {p.description && <p className="text-xs text-gray-500 mb-2">{p.description}</p>}
                   </button>
                 )
               })}
            </div>
          </div>
        )}

        {/* ── Package card ── rendered explicitly (no IIFE) ── */}
        {pkg && !pkgLoading && !pkgError && (
          <div className="bg-gradient-to-r from-primary-50 via-purple-50 to-primary-50 border border-primary-200 rounded-xl p-5 shadow-sm mt-2">
            {/* Header: name + price */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Selected Package</p>
                  <p className="font-bold text-gray-900 mt-0.5 text-base">{pkg.name}</p>
                  {pkg.code && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5 select-all">{pkg.code}</p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-extrabold text-primary-700">
                  {currSymbol}{Number(pkg.price).toLocaleString(locale)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{effectiveCurrency}</p>
              </div>
            </div>

            {/* Duration badge */}
            {durationLabel && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary-100">
                <Clock size={14} className="text-primary-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  Duration: <span className="font-semibold text-primary-700">{durationLabel}</span>
                </span>
              </div>
            )}

            {/* Benefits list */}
            {showPackageBenefits && (
              <div className="mt-3 pt-3 border-t border-primary-100">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <FieldError msg={errors.package_id} />
      </SectionCard>
    )
  }

  /* ─── Step 5: Payment ───────────────────────────────────────────── */
  function renderPayment() {
    const selectedMethod = methods.find(m => String(m.id) === String(form.payment_method))
    const TYPE_ICONS = { upi: '📱', bank_transfer: '🏦', international_wire: '🌐', cash: '💵', cheque: '📝', other: '💳' }
    const TYPE_LABELS = { upi: 'UPI Payment', bank_transfer: 'Bank Transfer', international_wire: 'International Wire', cash: 'Cash', cheque: 'Cheque', other: 'Other' }
    const locationLabel = { rajasthan: 'Rajasthan', other_states: 'Other Indian States', overseas: 'Overseas' }[form.location_type] || 'your location'
    // Amount currency follows selected location/package (overseas → USD, India → INR).
    // International wire converts INR base fee → USD (admin-configured rate) via fxQuote.
    const isWire = selectedMethod?.type === 'international_wire'
    const wirePayableFmt = fxQuote
      ? fmtAmount(fxQuote.payable_amount, fxQuote.target_currency || 'USD')
      : null
    const amountCurrency = isWire && fxQuote
      ? (fxQuote.target_currency || 'USD')
      : (form.location_type === 'overseas'
        ? (formCurrency || pkg?.currency || 'USD')
        : (formCurrency || pkg?.currency || 'INR'))
    const settlementCurrency = isWire
      ? (fxQuote?.target_currency || selectedMethod?.currency || 'USD')
      : amountCurrency
    const effectiveAmount = isWire && wirePayableFmt
      ? wirePayableFmt
      : fmtAmount(pkg?.price, amountCurrency)
    const baseFeeInrFmt = fmtAmount(pkg?.price, 'INR')
    const proofUploaded = !!form.payment_screenshot
    const proofLocked = paymentStatus === 'awaiting_verification'
    const step3Locked = !selectedMethod || !paymentConfirmed
    const receiptReady = proofUploaded || !!ssFileMeta

    // Three user-visible states (never "Payment Verified" on this form)
    const paymentStatusLabel = (proofUploaded || paymentStatus === 'awaiting_verification')
      ? 'Payment Submitted / Awaiting Verification'
      : (paymentConfirmed || paymentStatus === 'submitted')
        ? 'Payment Submitted / Awaiting Verification'
        : 'Payment Pending'

    const upiId = String(selectedMethod?.upi_id || paymentSettings.upi_id || '').trim()
    const hasUpiId = !!upiId
    const hasQrImage = !!(selectedMethod?.qr_image && String(selectedMethod.qr_image).trim())
    const upiQrValue = hasUpiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(selectedMethod?.account_name || 'FORTI')}&am=${pkg?.price || ''}&cu=INR`
      : ''
    const canShowQr = hasQrImage || !!upiQrValue

    /* Reusable copy row — always-visible copy for critical fields */
    function CopyRow({ label, value, mono = true, alwaysShowCopy = true }) {
      if (!value) return null
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 bg-white hover:bg-gray-50 rounded-lg px-4 py-3 transition-colors border-b border-gray-100 last:border-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide sm:w-40 shrink-0">{label}</span>
          <span className={`text-sm text-gray-900 font-bold flex-1 select-all break-all ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span>
          <button type="button"
            onClick={() => navigator.clipboard.writeText(String(value)).then(() => toast.success(`${label} copied!`)).catch(() => {})}
            className={`flex items-center gap-1 text-[11px] font-semibold text-white bg-primary-500 hover:bg-primary-600 px-2.5 py-1.5 rounded-lg transition shrink-0 self-start sm:self-auto ${alwaysShowCopy ? '' : 'opacity-0 group-hover:opacity-100'}`}>
            <Copy size={11}/> Copy
          </button>
        </div>
      )
    }

    function ReferenceIdCard() {
      return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Payment Reference ID</p>
            <p className="text-lg font-black font-mono text-indigo-900 mt-0.5 tracking-wider">{referenceId}</p>
            <p className="text-[11px] text-indigo-500 mt-0.5">Add this in payment remarks / description</p>
          </div>
          <button type="button"
            onClick={() => navigator.clipboard.writeText(referenceId).then(() => toast.success('Reference ID copied!')).catch(() => {})}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-2 rounded-xl transition shrink-0">
            <Copy size={12}/> Copy
          </button>
        </div>
      )
    }

    function PaymentStatusBanner() {
      const isPending = paymentStatusLabel === 'Payment Pending'
      const tone = isPending
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'
      return (
        <div className={`mb-5 rounded-xl border px-4 py-3 flex items-start gap-3 ${tone}`}>
          {isPending ? <AlertCircle size={18} className="shrink-0 mt-0.5"/> : <Clock size={18} className="shrink-0 mt-0.5"/>}
          <div>
            <p className="text-sm font-bold">{paymentStatusLabel}</p>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
              {isPending && 'Complete the payment using the details below, then click “I have completed payment” and upload your payment receipt for verification. Payment is verified only by admin — never automatically.'}
              {!isPending && !proofUploaded && 'You confirmed payment. Upload your receipt below. Status remains Awaiting Verification until an admin verifies it.'}
              {!isPending && proofUploaded && 'Receipt received. Your payment is awaiting admin verification and is not verified yet. You can now submit your application.'}
            </p>
          </div>
        </div>
      )
    }

    /* Step badge */
    function StepBadge({ n, label, done, active }) {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
            ${done ? 'bg-green-500 text-white' : active ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
            {done ? <CheckCircle size={14}/> : n}
          </div>
          <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        </div>
      )
    }

    const step1Done = !!form.payment_method
    const step2Done = paymentConfirmed
    const step3Done = proofUploaded

    return (
      <SectionCard icon={CreditCard} title="Payment Details" desc="Complete the steps below to submit your application">

        {/* ── AMOUNT BANNER ── */}
        {pkg && (
          <div className="mb-6 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-lg shadow-primary-200">
            <div>
              <p className="text-primary-200 text-xs font-semibold uppercase tracking-widest">
                {isWire ? 'Payable Amount (USD)' : 'Total Amount to Pay'}
              </p>
              <p className="text-white text-3xl font-black mt-0.5 tracking-tight">
                {isWire && fxQuoteLoading ? '…' : effectiveAmount}
              </p>
              {isWire && fxQuote && (
                <p className="text-primary-100 text-xs mt-1">
                  Membership Fee {baseFeeInrFmt} INR · {fxQuote.exchange_rate_label}
                </p>
              )}
              <p className="text-primary-200 text-xs mt-1">{pkg.name}{pkg.duration_months >= 999 ? ' · Lifetime' : pkg.duration_months === 36 ? ' · 3 Years' : pkg.duration_months ? ` · ${pkg.duration_months} Months` : ''}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CreditCard size={28} className="text-white"/>
            </div>
          </div>
        )}

        <PaymentStatusBanner/>

        {/* ── FLOW INDICATOR ── */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 bg-gray-50 rounded-xl px-4 py-3">
          <StepBadge n="1" label="Select Method" done={step1Done} active={true}/>
          <ChevronRight size={14} className="text-gray-300 shrink-0"/>
          <StepBadge n="2" label="Make Payment" done={step2Done} active={step1Done}/>
          <ChevronRight size={14} className="text-gray-300 shrink-0"/>
          <StepBadge n="3" label="Confirm Payment" done={step2Done} active={step1Done && !step2Done}/>
          <ChevronRight size={14} className="text-gray-300 shrink-0"/>
          <StepBadge n="4" label="Payment Receipt" done={step3Done} active={!step3Locked}/>
        </div>

        {/* ── STEP 1: SELECT METHOD ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${step1Done ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'}`}>
                {step1Done ? <CheckCircle size={12}/> : '1'}
              </span>
              Select Payment Method
            </p>
            {form.location_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {locationLabel}
              </span>
            )}
          </div>

          {methodsLoading ? (
            <div className="flex items-center gap-3 text-gray-400 text-sm py-4">
              <Loader2 size={18} className="animate-spin text-primary-500"/>Loading payment methods…
            </div>
          ) : methods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {methods.map(m => {
                const selected = String(form.payment_method) === String(m.id)
                return (
                  <button key={m.id} type="button"
                    onClick={() => requestPaymentMethodChange(String(m.id))}
                    disabled={proofLocked && !selected}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3
                      ${proofLocked && !selected ? 'opacity-50 cursor-not-allowed' : ''}
                      ${selected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${selected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      {TYPE_ICONS[m.type] || '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{m.name}</p>
                      <p className="text-xs text-gray-400">{TYPE_LABELS[m.type] || m.type}</p>
                    </div>
                    {selected && <CheckCircle size={18} className="text-primary-500 shrink-0"/>}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
              <p className="font-semibold">No payment methods available</p>
              <p className="mt-1 text-xs">Please contact admin for payment information.</p>
            </div>
          )}
          <FieldError msg={errors.payment_method}/>
          {proofLocked && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Payment method is locked after receipt upload. Contact support if you need to change it.
            </p>
          )}
        </div>

        {/* ── STEP 2 + 3: PAYMENT DETAILS ── */}
        {selectedMethod && (
          <div className="mb-6 rounded-2xl border-2 border-primary-200 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-5 py-3.5 flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                Make Payment Using Details Below
              </p>
              {pkg && (
                <span className="text-sm font-black text-white bg-white/20 px-3 py-1 rounded-full">
                  {effectiveAmount}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4 bg-gray-50">

              {/* ── UPI ── */}
              {selectedMethod.type === 'upi' && (
                <div className="space-y-4">

                  {/* QR + UPI ID side by side */}
                  <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
                    <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-5 ${!canShowQr ? 'sm:justify-center' : ''}`}>
                      {/* QR — only when image or generated QR from UPI ID */}
                      {canShowQr && (
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          {hasQrImage ? (
                            <img
                              src={selectedMethod.qr_image.startsWith('http') ? selectedMethod.qr_image : `/${selectedMethod.qr_image}`}
                              alt="UPI QR Code"
                              className="w-48 h-48 rounded-xl border border-gray-200 p-2 bg-white shadow-sm"
                            />
                          ) : (
                            <div className="p-2 bg-white rounded-xl border border-indigo-100 shadow-sm">
                              <QRCodeSVG value={upiQrValue} size={176} level="M" includeMargin={true}/>
                            </div>
                          )}
                          <p className="text-xs font-semibold text-indigo-600">Scan QR with any UPI app</p>
                        </div>
                      )}

                      {/* UPI ID + Amount */}
                      <div className="flex-1 w-full space-y-3 min-w-0">
                        {hasUpiId && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide mb-1">FORTI UPI ID</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-gray-700">
                                UPI ID:{' '}
                                <span className="font-mono font-black text-indigo-900 text-base select-all">
                                  {upiId}
                                </span>
                              </p>
                              <button type="button"
                                onClick={() => navigator.clipboard.writeText(upiId).then(() => toast.success('UPI ID copied!')).catch(() => {})}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition shrink-0">
                                <Copy size={12}/> Copy
                              </button>
                            </div>
                            <p className="text-[11px] text-indigo-500 mt-2">
                              {canShowQr
                                ? <>You can pay by scanning the QR code <strong>or</strong> by entering this UPI ID manually in your UPI app.</>
                                : <>Enter this UPI ID in your UPI app to complete payment.</>}
                            </p>
                          </div>
                        )}

                        {pkg && (
                          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold text-green-600 uppercase tracking-wide">Payment Amount</p>
                              <p className="text-2xl font-black text-green-800 mt-0.5">{effectiveAmount}</p>
                            </div>
                            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Pay exactly this amount</span>
                          </div>
                        )}

                        <p className="text-xs text-gray-400">PhonePe · Google Pay · Paytm · BHIM · any UPI app</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Reference ID — needed for verification */}
                  <ReferenceIdCard/>

                  {/* Instructions — dynamic based on available details */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={13}/> How to pay via UPI
                    </p>
                    <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Open your UPI app (PhonePe, Google Pay, Paytm, BHIM, etc.)</li>
                      {canShowQr && hasUpiId && (
                        <li>
                          <strong>Option A:</strong> Scan the QR code above — <strong>or Option B:</strong> enter UPI ID <strong className="font-mono">{upiId}</strong>
                        </li>
                      )}
                      {canShowQr && !hasUpiId && (
                        <li>Scan the QR code above</li>
                      )}
                      {!canShowQr && hasUpiId && (
                        <li>Enter UPI ID <strong className="font-mono">{upiId}</strong> as the payee</li>
                      )}
                      <li>Enter / confirm amount: <strong>{effectiveAmount}</strong></li>
                      <li>Add Reference ID <strong className="font-mono">{referenceId}</strong> in payment remarks (helps verification)</li>
                      <li>Complete payment, then click <em>&quot;I have completed payment&quot;</em> below and upload your receipt in Step 4</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* ── BANK TRANSFER ── */}
              {selectedMethod.type === 'bank_transfer' && (
                <div className="space-y-4">
                  {pkg && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-green-600 uppercase tracking-wide">Exact Payment Amount</p>
                        <p className="text-2xl font-black text-green-800 mt-0.5">{effectiveAmount}</p>
                      </div>
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Transfer exactly this amount</span>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Shield size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Add the beneficiary using the bank details below, transfer exactly <strong>{effectiveAmount}</strong>, and put the Reference ID in payment remarks. Payment will be verified within 1–2 business days.
                    </p>
                  </div>

                  <ReferenceIdCard/>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-primary-50 px-4 py-3 border-b border-primary-100">
                      <p className="text-sm font-bold text-primary-800">Bank Account Details</p>
                      <p className="text-[11px] text-primary-600 mt-0.5">Use these exact details for your transfer</p>
                    </div>
                    <div>
                      <CopyRow label="Account Name" value={selectedMethod.account_name} mono={false}/>
                      <CopyRow label="Bank Name" value={selectedMethod.bank_name} mono={false}/>
                      <CopyRow label="Account Number" value={selectedMethod.account_number} mono={true}/>
                      <CopyRow label="IFSC Code" value={selectedMethod.ifsc_code} mono={true}/>
                      <CopyRow label="Branch" value={selectedMethod.branch_name} mono={false}/>
                      <CopyRow label="Account Type" value={selectedMethod.account_type} mono={false}/>
                    </div>
                    {!(selectedMethod.account_name || selectedMethod.bank_name || selectedMethod.account_number || selectedMethod.ifsc_code) && (
                      <p className="px-4 py-3 text-sm text-amber-700">Bank account details are not configured. Please contact admin or choose another payment method.</p>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={13}/> How to complete Bank Transfer
                    </p>
                    <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Log in to your net banking or UPI app</li>
                      <li>
                        Add a new beneficiary using the details above
                        {selectedMethod.account_number && <> (Account No. <strong className="font-mono">{selectedMethod.account_number}</strong></>}
                        {selectedMethod.ifsc_code && <>, IFSC <strong className="font-mono">{selectedMethod.ifsc_code}</strong></>}
                        {selectedMethod.account_number && <>)</>}
                      </li>
                      <li>Transfer exactly <strong>{effectiveAmount}</strong> — do not round or change the amount</li>
                      <li>In payment remarks / narration, add Reference ID <strong className="font-mono">{referenceId}</strong></li>
                      <li>Save your transaction receipt / screenshot</li>
                      <li>Click <em>&quot;I have completed payment&quot;</em> below, then upload your receipt in Step 4</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* ── INTERNATIONAL WIRE ── */}
              {selectedMethod.type === 'international_wire' && (
                <div className="space-y-4">
                  {/* Conversion breakdown — INR base, USD payable */}
                  <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3">
                      <p className="text-sm font-bold text-white">International Payment Summary</p>
                      <p className="text-[11px] text-emerald-100 mt-0.5">Base fee stays in INR · you pay the converted USD amount</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {fxQuoteLoading && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 size={16} className="animate-spin text-emerald-600"/> Calculating payable USD amount…
                        </div>
                      )}
                      {fxQuote && !fxQuoteLoading && (
                        <>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-500">Membership Fee</span>
                            <span className="font-bold text-gray-900">{baseFeeInrFmt} <span className="text-xs font-semibold text-gray-500">INR</span></span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-500">Exchange Rate</span>
                            <span className="font-semibold text-gray-800">{fxQuote.exchange_rate_label}</span>
                          </div>
                          <div className="border-t border-emerald-100 pt-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Payable Amount</p>
                              <p className="text-2xl font-black text-emerald-800 mt-0.5">{wirePayableFmt} <span className="text-sm font-bold">USD</span></p>
                            </div>
                            <span className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full">Transfer this amount</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                            <p className="text-sm font-bold text-emerald-900">{fxQuote.instruction}</p>
                          </div>
                        </>
                      )}
                      {!fxQuote && !fxQuoteLoading && (
                        <p className="text-sm text-amber-700">
                          Unable to load exchange rate. Please contact admin, or try again later.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0"/>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Bank / intermediary charges apply.</strong> Choose fee option <strong>OUR</strong> (sender pays all charges) so FORTI receives exactly {wirePayableFmt || 'the payable USD amount'}. Do not transfer the INR figure.
                    </p>
                  </div>

                  <ReferenceIdCard/>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-primary-50 px-4 py-3 border-b border-primary-100">
                      <p className="text-sm font-bold text-primary-800">International Wire Details</p>
                      <p className="text-[11px] text-primary-600 mt-0.5">Use these exact SWIFT / beneficiary details</p>
                    </div>
                    <div>
                      <CopyRow label="Beneficiary Name" value={selectedMethod.account_name} mono={false}/>
                      <CopyRow label="Bank Name" value={selectedMethod.bank_name} mono={false}/>
                      <CopyRow label="Bank Address" value={selectedMethod.bank_address} mono={false}/>
                      {selectedMethod.iban && (
                        <CopyRow label="IBAN" value={selectedMethod.iban} mono={true}/>
                      )}
                      {selectedMethod.account_number && (
                        <CopyRow label="Account Number" value={selectedMethod.account_number} mono={true}/>
                      )}
                      <CopyRow label="SWIFT / BIC Code" value={selectedMethod.swift_code} mono={true}/>
                      {selectedMethod.routing_number && (
                        <CopyRow label="Routing Number" value={selectedMethod.routing_number} mono={true}/>
                      )}
                      <CopyRow label="Currency" value={String(settlementCurrency || 'USD').toUpperCase()} mono={false}/>
                    </div>
                    {!(selectedMethod.account_name || selectedMethod.bank_name || selectedMethod.iban || selectedMethod.swift_code) && (
                      <p className="px-4 py-3 text-sm text-amber-700">International wire details are not configured. Please contact admin or choose another payment method.</p>
                    )}
                    {selectedMethod.iban && !selectedMethod.account_number && (
                      <p className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-100">
                        IBAN is sufficient for this transfer — account number is not required.
                      </p>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={13}/> How to complete International Wire (SWIFT)
                    </p>
                    <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>Log in to your bank&apos;s international / SWIFT transfer portal</li>
                      <li>
                        Add beneficiary using the details above
                        {selectedMethod.swift_code && <> (SWIFT <strong className="font-mono">{selectedMethod.swift_code}</strong></>}
                        {selectedMethod.iban && <>, IBAN <strong className="font-mono">{selectedMethod.iban}</strong></>}
                        {(selectedMethod.swift_code || selectedMethod.iban) && <>)</>}
                      </li>
                      <li>
                        {fxQuote
                          ? <>Select currency <strong>USD</strong> and transfer exactly <strong>{wirePayableFmt} USD</strong></>
                          : <>Transfer the payable USD amount shown above</>}
                      </li>
                      <li>Choose fee option <strong>OUR</strong> (you pay all bank/intermediary charges)</li>
                      <li>In transfer note / description, add Reference ID <strong className="font-mono">{referenceId}</strong></li>
                      <li>Save the bank confirmation, click <em>&quot;I have completed payment&quot;</em>, then upload your receipt in Step 4</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* ── CASH / CHEQUE / OTHER ── */}
              {['cash', 'cheque', 'other'].includes(selectedMethod.type) && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Shield size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Your payment will be verified by admin after submission. Please include the Reference ID in your payment.
                    </p>
                  </div>
                  <ReferenceIdCard/>
                  {(selectedMethod.bank_name || selectedMethod.account_name || selectedMethod.account_number) && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-primary-50 px-4 py-3 border-b border-primary-100">
                        <p className="text-sm font-bold text-primary-800">Payment Details</p>
                      </div>
                      <div>
                        <CopyRow label="Account Name" value={selectedMethod.account_name} mono={false}/>
                        <CopyRow label="Bank Name" value={selectedMethod.bank_name} mono={false}/>
                        <CopyRow label="Account Number" value={selectedMethod.account_number} mono={true}/>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CONFIRM PAYMENT (all methods) ── */}
              <div className="border-t border-gray-200 pt-4">
                {!paymentConfirmed ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-gray-600 font-medium">After you finish paying, click below. This does <strong>not</strong> verify payment — an admin will verify later.</p>
                    <button type="button"
                      onClick={() => setPaymentConfirmModal({ type: 'complete' })}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg shadow-primary-200 transition-all duration-200 mx-auto">
                      <CheckCircle size={16}/> I have completed payment
                    </button>
                    <FieldError msg={errors.payment_confirmed}/>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-white"/>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900">Payment Submitted / Awaiting Verification</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          {proofUploaded
                            ? 'Receipt attached. An admin will verify your payment — it is not verified yet.'
                            : 'Upload your payment receipt in Step 4 below. Verification happens only after admin review.'}
                        </p>
                      </div>
                    </div>
                    <button type="button" disabled
                      className="w-full inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-bold text-sm px-8 py-3 rounded-xl cursor-not-allowed opacity-80">
                      <CheckCircle size={16}/> I have completed payment
                    </button>
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-t border-primary-100">
              <div className="h-px flex-1 bg-primary-100"/>
              <span className="text-xs text-primary-500 font-semibold">After paying, upload your Payment Receipt in Step 4 ↓</span>
              <div className="h-px flex-1 bg-primary-100"/>
            </div>
          </div>
        )}

        {/* ── STEP 4: PAYMENT RECEIPT ── */}
        <div ref={proofSectionRef} className={`rounded-2xl border-2 overflow-hidden transition-all
          ${step3Locked ? 'border-dashed border-gray-200 opacity-50 pointer-events-none' : 'border-gray-200 shadow-sm'}`}>

          <div className={`px-5 py-3.5 border-b ${proofUploaded ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                ${proofUploaded ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'}`}>
                {proofUploaded ? <CheckCircle size={12}/> : '4'}
              </span>
              Payment Receipt
              {step3Locked && <span className="text-xs font-normal text-gray-400 ml-1">({!selectedMethod ? 'select a method first' : 'confirm payment first'})</span>}
            </p>
          </div>

          <div className="p-5 bg-white space-y-4">

            {!proofUploaded && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <Receipt size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                <div className="text-xs text-blue-700 leading-relaxed">
                  <p className="font-semibold mb-0.5">Upload your payment receipt or transaction screenshot</p>
                  <p>Our team will verify it before approving your membership. Accepted: <strong>JPG, PNG, PDF</strong> · Max size: <strong>5 MB</strong></p>
                </div>
              </div>
            )}

            <input ref={ssRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="hidden"
              onChange={e => handleFile('payment_screenshot', e.target.files[0], setSsPreview)}/>

            {receiptReady ? (
              <div className="bg-green-50 rounded-xl border border-green-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {ssPreview && !ssFileMeta?.isPdf ? (
                    <img src={ssPreview} alt="Receipt preview" className="h-16 w-16 object-cover rounded-lg border border-green-200 shrink-0"/>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border border-green-200 bg-white flex items-center justify-center shrink-0">
                      <FileText size={28} className="text-primary-600"/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-800 flex items-center gap-1.5">
                      <CheckCircle size={14}/> Receipt uploaded successfully
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5 font-medium truncate" title={ssFileMeta?.name || form.payment_screenshot?.name}>
                      {ssFileMeta?.name || form.payment_screenshot?.name || 'Payment receipt'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {ssFileMeta?.size ? formatFileSize(ssFileMeta.size) : ''}
                      {ssFileMeta?.size ? ' · ' : ''}
                      Awaiting admin verification — not verified yet
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-green-100">
                  <button type="button"
                    onClick={() => ssRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition">
                    <Upload size={12}/> Replace
                  </button>
                  <button type="button"
                    onClick={() => clearFile('payment_screenshot', setSsPreview)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 bg-white border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition">
                    <Trash2 size={12}/> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all duration-200"
                onClick={() => ssRef.current?.click()}>
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Upload size={22} className="text-primary-600"/>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Click to upload payment receipt</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Max 5 MB</p>
                </div>
              </div>
            )}
            <FieldError msg={errors.payment_screenshot}/>

            {!proofUploaded && selectedMethod && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle size={13} className="shrink-0"/>
                <span>The <strong>Submit Application</strong> button stays disabled until your payment receipt is uploaded.</span>
              </div>
            )}

            {proofUploaded && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-800">
                <CheckCircle size={13} className="shrink-0"/>
                <span className="font-semibold">Payment Submitted / Awaiting Verification — click &quot;Submit Application&quot; below to finish.</span>
              </div>
            )}

            {supportPhoneDigits && (
              <p className="text-xs text-gray-400 text-center pt-1">
                Need help?{' '}
                <a href={`https://wa.me/${supportPhoneDigits}?text=Hi%2C%20I%20need%20help%20with%20payment%20for%20FORTI%20membership.`}
                  target="_blank" rel="noreferrer"
                  className="text-[#25D366] font-semibold hover:underline inline-flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Chat on WhatsApp
                </a>
              </p>
            )}
          </div>
        </div>

      </SectionCard>
    )
  }

  /* ─── Main Render ───────────────────────────────────────────────── */
  const stepRenderers = [renderBasicDetails, renderLocation, renderMembershipType, renderPlanPackage, renderPayment]

  return (
    <div ref={topRef}>
      {/* Profile photo zoom modal */}
      {photoZoom && profilePreview && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4" onClick={() => setPhotoZoom(false)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setPhotoZoom(false)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-100 z-10 transition">
              <X size={18} className="text-gray-600" />
            </button>
            <img src={profilePreview} alt="Profile Photo" className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white" />
            <div className="mt-3 flex justify-center">
              <button type="button" onClick={() => { setPhotoZoom(false); profileRef.current?.click() }}
                className="text-xs bg-white/90 hover:bg-white text-gray-700 font-semibold px-4 py-2 rounded-xl shadow transition">
                Replace Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera capture modal */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Camera size={16} /> Take Photo</h3>
              <button type="button" onClick={closeCameraModal} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
            </div>
            <div className="bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-4 flex gap-3">
              <button type="button" onClick={capturePhoto}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition">
                <Camera size={16} /> Capture
              </button>
              <button type="button" onClick={closeCameraModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment confirmation / reset modals */}
      {paymentConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
              <div className={`p-2 rounded-full shrink-0 ${
                paymentConfirmModal.type === 'complete' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {paymentConfirmModal.type === 'complete' && 'Confirm you have paid?'}
                  {paymentConfirmModal.type === 'method' && 'Change payment method?'}
                  {paymentConfirmModal.type === 'plan' && 'Change plan?'}
                  {paymentConfirmModal.type === 'package' && 'Change package?'}
                </h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  {paymentConfirmModal.type === 'complete' && (
                    <>Only confirm if you have <strong>already transferred</strong> the exact amount using Reference ID <span className="font-mono font-semibold">{referenceId}</span>. This marks payment as <strong>Submitted / Awaiting Verification</strong> — it does <strong>not</strong> verify payment. An admin verifies later.</>
                  )}
                  {paymentConfirmModal.type === 'method' && (
                    <>Changing the payment method will reset status to <strong>Payment Pending</strong>. You must pay again and upload a new receipt. Previous attempt is marked Superseded/Reset.</>
                  )}
                  {(paymentConfirmModal.type === 'plan' || paymentConfirmModal.type === 'package') && (
                    <>Changing the plan/package resets payment to <strong>Payment Pending</strong>, clears the current receipt, generates a <strong>new Reference ID</strong>, and updates the amount. Previous attempt is marked Superseded.</>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setPaymentConfirmModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => setPaymentConfirmModal(null)} className="btn-outline flex-1 justify-center">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPaymentModalAction}
                className={`flex-1 justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition ${
                  paymentConfirmModal.type === 'complete'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                <CheckCircle size={16} />
                {paymentConfirmModal.type === 'complete' ? 'Yes, submit for verification' : 'Yes, reset & continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renderStepper()}
      {stepRenderers[step]()}

      {errors._global && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />{errors._global}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4">
        {step > 0 ? (
          <button type="button" onClick={handleBack}
            className="btn-outline flex items-center gap-2 text-gray-600 hover:bg-gray-50">
            <ChevronLeft size={16} /> Back
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/')} className="btn-outline text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button type="button" onClick={handleNext} disabled={submitting}
            className="btn-primary flex items-center gap-2 shadow-md shadow-primary-200 hover:shadow-lg disabled:opacity-60 disabled:shadow-none"
            aria-disabled={submitting}>
            Save & Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !isStepComplete(4)}
            className="btn-primary btn-lg flex items-center gap-2 disabled:opacity-60 shadow-md shadow-primary-200 hover:shadow-lg"
            aria-disabled={submitting || !isStepComplete(4)}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" />Submitting…</>
              : <><CheckCircle size={16} />Submit Application</>}
          </button>
        )}
      </div>
    </div>
  )
}
