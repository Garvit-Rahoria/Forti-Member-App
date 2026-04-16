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
import { useMember } from '../../contexts/MemberContext'
import {
  formatFullPhoneNumber,
  getCountryDialDisplay,
  getFixedCurrencyByCountry,
  getFlagEmoji,
  getPhonePlaceholder,
  ORGANISATION_TYPE_OPTIONS,
  RAJASTHAN_MAJOR_CITIES,
  OTHER_STATES,
  OVERSEAS_COUNTRIES,
  validatePhoneNumber,
} from '../../utils/membershipForm'

const http = axios.create({ baseURL: '/api' })

/* ─── Constants ─────────────────────────────────────────────────────── */
const STEPS = [
  { key: 'basic',      label: 'Basic Details',    icon: User },
  { key: 'location',   label: 'Location',         icon: MapPin },
  { key: 'membership', label: 'Membership Type',  icon: Users },
  { key: 'plan',       label: 'Plan & Package',   icon: Package },
  { key: 'payment',    label: 'Payment',           icon: CreditCard },
]

const LOCATION_OPTIONS = [
  { value: 'rajasthan',    label: 'Rajasthan',     desc: 'Within Rajasthan',        icon: '🏛️', color: 'from-orange-500 to-amber-500' },
  { value: 'other_states', label: 'Other States',  desc: 'Other Indian States',     icon: '🇮🇳', color: 'from-blue-500 to-indigo-500' },
  { value: 'overseas',     label: 'Overseas',       desc: 'International Applicant', icon: '🌍', color: 'from-emerald-500 to-teal-500' },
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
  { value: 'yearly',   label: 'Yearly',   desc: '12-month membership, renewable annually', icon: Clock,    gradient: 'from-blue-50 to-indigo-50',  selectedGradient: 'from-blue-100 to-indigo-100',  iconFrom: 'from-blue-400',   iconTo: 'to-indigo-500',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   border: 'border-blue-400' },
  { value: '3years',   label: '3 Years',  desc: '3-year membership — save more vs yearly',  icon: Package,  gradient: 'from-green-50 to-teal-50',   selectedGradient: 'from-green-100 to-teal-100',   iconFrom: 'from-green-400',  iconTo: 'to-teal-500',     iconBg: 'bg-green-100',  iconColor: 'text-green-600',  border: 'border-green-400' },
  { value: 'lifetime', label: 'Lifetime', desc: 'One-time payment, valid forever',           icon: Crown,    gradient: 'from-orange-50 to-amber-50', selectedGradient: 'from-orange-100 to-amber-100', iconFrom: 'from-orange-400', iconTo: 'to-amber-500',    iconBg: 'bg-orange-100', iconColor: 'text-orange-600', border: 'border-orange-400' },
]

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

const SOCIAL_PLATFORMS = [
  { value: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/yourname' },
  { value: 'website',   label: 'Website',   placeholder: 'https://yourwebsite.com' },
  { value: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@yourchannel' },
  { value: 'twitter',   label: 'Twitter / X', placeholder: 'https://x.com/yourhandle' },
  { value: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { value: 'google',    label: 'Google Business', placeholder: 'https://g.co/yourprofile' },
  { value: 'other',     label: 'Other',     placeholder: 'https://...' },
]

/* ─── Helpers ───────────────────────────────────────────────────────── */
function FieldError({ msg }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/>{msg}</p>
}

function SectionCard({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl overflow-hidden">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Icon size={16} className="text-primary-600"/>
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
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  minQueryLength = 0,
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedOption = useMemo(
    () => options.find(option => String(option.value) === String(value)) || null,
    [options, value],
  )

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return minQueryLength > 0 ? [] : options
    const filtered = options.filter(option => String(option.label || '').toLowerCase().includes(term))
    // Sort: items starting with the term appear first
    return filtered.sort((a, b) => {
      const aL = String(a.label || '').toLowerCase()
      const bL = String(b.label || '').toLowerCase()
      const aS = aL.startsWith(term)
      const bS = bL.startsWith(term)
      if (aS && !bS) return -1
      if (!aS && bS) return 1
      return 0
    })
  }, [options, query, minQueryLength])

  useEffect(() => {
    setQuery(selectedOption?.label || '')
  }, [selectedOption])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
        setQuery(selectedOption?.label || '')
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [selectedOption])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  function selectOption(option) {
    onChange(option.value, option)
    setQuery(option.label)
    setOpen(false)
  }

  function handleKeyDown(event) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex(index => Math.min(index + 1, visibleOptions.length - 1))
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
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selectedOption?.label || '')
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        className={`input pr-10 ${inputClassName}`}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => { if (!disabled) { if (minQueryLength === 0) { setQuery(''); setOpen(true) } } }}
        onClick={() => { if (!disabled) { if (minQueryLength === 0) { setQuery(''); setOpen(true) } } }}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(event.target.value.trim().length >= minQueryLength)
        }}
        onKeyDown={handleKeyDown}
      />
      {minQueryLength === 0 && <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[9999] rounded-xl border border-gray-200 bg-white shadow-xl max-h-64 overflow-auto">
          {visibleOptions.length ? visibleOptions.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            const isHighlighted = index === highlightedIndex
            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`w-full px-3 py-2.5 text-left text-sm transition flex items-center justify-between gap-3
                  ${isHighlighted ? 'bg-primary-50' : 'bg-white'}
                  ${isSelected ? 'text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span>{option.label}</span>
                {isSelected && <CheckCircle size={14} className="text-primary-500 shrink-0"/>}
              </button>
            )
          }) : (
            <div className="px-3 py-3 text-sm text-gray-400">No matches found</div>
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
  const { token: memberToken, member, refetch: refetchMember } = useMember()

  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    full_name: prefill?.full_name || '',
    email:     prefill?.email     || '',
    phone:     prefill?.phone     || '',
    phone_country_code: prefill?.phone_country_code || '+91',
    phone_country_iso2: prefill?.phone_country_iso2 || 'IN',
    country_name: prefill?.country_name || 'India',
    profile_photo: null,
    gender: '',
    aadhaar_number: '',
    passport_number: '',
    pin_code: '',
    organisation_name: '',
    organisation_type: '',
    organisation_type_other: '',
    organisation_logo: null,
    location_type: '',
    state_id: '',
    city_id: '',
    country_id: '',
    state_other: '',
    city_other: '',
    overseas_city: '',
    membership_type: '',
    plan_type: '',
    package_id: null,
    payment_method: '',
    payment_screenshot: null,
  })

  /* Social links: array of { platform, url } */
  const [socialLinks, setSocialLinks] = useState([{ platform: '', url: '' }])

  const [errors, setErrors]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(null)

  const [profilePreview, setProfilePreview] = useState(null)
  const [photoZoom, setPhotoZoom] = useState(false)
  const [logoPreview, setLogoPreview]       = useState(null)
  const [ssPreview, setSsPreview]           = useState(null)
  const [cameraOpen, setCameraOpen]         = useState(false)
  const profileRef = useRef()
  const cameraRef  = useRef()
  const logoRef    = useRef()
  const ssRef      = useRef()
  const videoRef   = useRef()
  const canvasRef  = useRef()
  const streamRef  = useRef(null)

  const [states, setStates]     = useState([])
  const [cities, setCities]     = useState([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [countries, setCountries] = useState([])
  const [pkg, setPkg]           = useState(null)
  const [pkgLoading, setPkgLoading] = useState(false)
  const [pkgError, setPkgError] = useState('')
  const [methods, setMethods]   = useState([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState({})

  // Payment confirmation state (for manual methods: bank transfer, wire, etc.)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Stable reference ID generated once per form session
  const referenceId = useMemo(() => `FORTI-${Math.floor(100000 + Math.random() * 900000)}`, [])
  const normalizedCountryName = String(form.country_name || 'India').trim()
  const isIndianApplicant = normalizedCountryName.toLowerCase() === 'india'
  const formCurrency = getFixedCurrencyByCountry(normalizedCountryName)
  const supportPhoneDigits = String(paymentSettings.support_whatsapp || paymentSettings.support_phone || '916367063168')
    .replace(/\D/g, '')
  const whatsappLink = supportPhoneDigits ? `https://wa.me/${supportPhoneDigits}` : ''

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
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
    cities.forEach(city => {
      map.set(String(city.name).toLowerCase(), { value: String(city.id), label: city.name, raw: city })
    })
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
    () => cities.map(city => ({ value: String(city.id), label: city.name, raw: city })),
    [cities],
  )

  const countryOptions = useMemo(() => {
    const map = new Map()
    // DB countries first (with flags)
    countries.forEach(c => {
      map.set(String(c.name).toLowerCase(), {
        value: String(c.id),
        label: `${getFlagEmoji(c.iso2 || '')} ${c.name}`,
        raw: c,
      })
    })
    // Static fallback so dropdown is never empty
    OVERSEAS_COUNTRIES.forEach(name => {
      const key = name.toLowerCase()
      if (!map.has(key)) map.set(key, { value: name, label: name, raw: { name } })
    })
    return [...map.values()].sort((a, b) => {
      // Sort by plain name (strip emoji prefix if present)
      const la = a.label.replace(/^[^\w]+/, '').trim()
      const lb = b.label.replace(/^[^\w]+/, '').trim()
      return la.localeCompare(lb)
    })
  }, [countries])

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

  /* ── Load Indian states on mount ─────────────────────────────────── */
  useEffect(() => {
    http.get('/locations/states?country_id=1')
      .then(r => setStates(r.data.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    http.get('/locations/countries')
      .then(r => setCountries(r.data.data || []))
      .catch(() => setCountries([]))
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
      setPkg(null); set('package_id', null); setPkgError(''); return
    }
    setPkgLoading(true)
    setPkgError('')
    const params = {
      membership_type: form.membership_type,
      plan_type:       form.plan_type,
      location_type:   form.location_type,
    }
    // For overseas, pass country_id so backend can try country-specific package first
    if (form.location_type === 'overseas' && form.country_id) {
      params.country_id = form.country_id
    }
    http.get('/membership/packages/match', { params })
      .then(r => {
        const p = r.data.data
        if (!p || Number(p.price) === 0) {
          setPkg(null); set('package_id', null)
          setPkgError('Plan not configured. Please contact admin.')
        } else {
          setPkg(p); set('package_id', p.id)
        }
      })
      .catch(() => {
        setPkg(null); set('package_id', null)
        setPkgError('Plan not configured. Please contact admin.')
      })
      .finally(() => setPkgLoading(false))
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
      .then(r => setMethods(r.data.data || []))
      .catch(() => setMethods([]))
      .finally(() => setMethodsLoading(false))
  }, [form.location_type, form.country_id, countries])

  // Reset payment confirmation + instructions toggle whenever the user picks a different method
  useEffect(() => { setPaymentConfirmed(false); setShowInstructions(false) }, [form.payment_method])

  function handleFile(key, file, setPreview) {
    if (!file) return
    set(key, file)
    setPreview(URL.createObjectURL(file))
  }
  function clearFile(key, setPreview) {
    set(key, null)
    setPreview(null)
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
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 640
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
    const e = {}
    if (s === 0) {
      if (!form.full_name?.trim()) e.full_name = 'Full name is required'
      if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = 'Valid email is required'
      const phoneError = validatePhoneNumber(form.phone, selectedPhoneCountry)
      if (phoneError) e.phone = phoneError
      if (!form.gender) e.gender = 'Please select your gender'
      if (isIndianApplicant) {
        if (!/^\d{12}$/.test(form.aadhaar_number || '')) e.aadhaar_number = 'Aadhaar number must be exactly 12 digits'
      } else if (!/^[A-Za-z0-9]{6,9}$/.test(form.passport_number || '')) {
        e.passport_number = 'Passport number must be 6 to 9 alphanumeric characters'
      }
      if (!form.organisation_name?.trim()) e.organisation_name = 'Organisation name is required'
      if (!form.organisation_type?.trim()) e.organisation_type = 'Please select an organization type'
      if (form.organisation_type === 'Other' && !form.organisation_type_other?.trim()) {
        e.organisation_type_other = 'Please specify your organization type'
      }
    }
    if (s === 1) {
      if (!form.location_type) e.location_type = 'Please select your location'
      if (form.location_type === 'rajasthan' && !form.city_id) e.city_id = 'Please select your city'
      if (form.location_type === 'other_states' && !form.state_id) e.state_id = 'Please select your state'
      if (form.location_type === 'other_states' && !form.city_id) e.city_id = 'Please select your city'
      if (form.location_type === 'overseas' && !form.country_id && !form.country_name?.trim()) e.country_id = 'Country is required'
    }
    if (s === 2) {
      if (!form.membership_type) e.membership_type = 'Please select membership type'
    }
    if (s === 3) {
      if (!form.plan_type) e.plan_type = 'Please select plan duration'
      if (!form.package_id) e.package_id = 'No package available for this selection'
    }
    if (s === 4) {
      if (!form.payment_method) e.payment_method = 'Please select payment method'
      const selMethod = methods.find(m => String(m.id) === String(form.payment_method))
      const isManual = selMethod && ['bank_transfer', 'international_wire', 'cash', 'cheque', 'other'].includes(selMethod.type)
      if (isManual && !paymentConfirmed) e.payment_confirmed = 'Please confirm you have completed the payment before uploading proof'
      if (!form.payment_screenshot) e.payment_screenshot = 'Payment screenshot is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function isStepComplete(stepIndex) {
    const currentErrors = {}
    if (stepIndex === 0) {
      currentErrors.full_name = !form.full_name?.trim()
      currentErrors.email = !form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      currentErrors.phone = !!validatePhoneNumber(form.phone, selectedPhoneCountry)
      currentErrors.document = isIndianApplicant
        ? !/^\d{12}$/.test(form.aadhaar_number || '')
        : !/^[A-Za-z0-9]{6,9}$/.test(form.passport_number || '')
      currentErrors.organisation_name = !form.organisation_name?.trim()
      currentErrors.organisation_type = !form.organisation_type?.trim() || (form.organisation_type === 'Other' && !form.organisation_type_other?.trim())
    }
    if (stepIndex === 4) {
      const selMethod = methods.find(m => String(m.id) === String(form.payment_method))
      const isManual = selMethod && ['bank_transfer', 'international_wire', 'cash', 'cheque', 'other'].includes(selMethod.type)
      currentErrors.payment = !form.payment_method || (isManual && !paymentConfirmed) || !form.payment_screenshot
    }
    return !Object.values(currentErrors).some(Boolean)
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
    if (!validateStep(step)) return
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
      if (form.aadhaar_number) fd.append('aadhaar_number', form.aadhaar_number)
      if (form.passport_number) fd.append('passport_number', form.passport_number)
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
      if (form.country_id) fd.append('country_id', form.country_id)
      if (form.overseas_city) fd.append('overseas_city', form.overseas_city)
      fd.append('membership_type', form.membership_type)
      fd.append('plan_type', form.plan_type)
      fd.append('package_id', form.package_id || '')
      fd.append('payment_method', form.payment_method)
      fd.append('payment_reference', referenceId)
      fd.append('currency', formCurrency)
      if (form.payment_screenshot) fd.append('payment_screenshot', form.payment_screenshot)

      const res = await http.post('/membership/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const resData = res.data.data
      if (memberToken || member) {
        // Already logged-in member: go directly to dashboard (don't await refetch to avoid logout race)
        navigate('/member/dashboard', { replace: true })
        refetchMember?.() // fire-and-forget
        return
      }
      setSubmitted(resData)
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Submission failed. Please try again.' })
    } finally { setSubmitting(false) }
  }

  /* ─── Success Popup ─────────────────────────────────────────────── */
  if (submitted) {
    const TRACK_STEPS = [
      'Application Submitted',
      'Under Review',
      'Approved',
      'Payment Pending',
      'Payment Submitted',
      'Payment Verified',
      'Membership Activated',
    ]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
            <CheckCircle size={40} className="text-white"/>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Application Submitted Successfully</h2>
          <p className="text-gray-500 text-sm">Your application is under review. You can track your status below.</p>
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
              const current = i === 0
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                      current ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                        : done ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-300 border border-gray-200'
                    }`}>
                      {done && !current ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : current ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                  ${done ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm shadow-green-200'
                    : active ? 'bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg shadow-primary-200 ring-4 ring-primary-100 scale-110'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                  {done ? '✓' : <Icon size={16}/>}
                </div>
                <span className={`text-[11px] mt-2 hidden sm:block max-w-[80px] text-center leading-tight
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
                onClick={() => setPhotoZoom(true)}/>
              <button type="button"
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition"
                onClick={() => clearFile('profile_photo', setProfilePreview)}>
                <Trash2 size={12}/>
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition shrink-0"
              onClick={() => profileRef.current?.click()}>
              <Camera size={22}/>
              <span className="text-[10px] mt-0.5 font-medium">Photo</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-700">Profile Photo</p>
            <p className="text-xs text-gray-400 mt-0.5">Optional · JPG, PNG – max 2 MB</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => profileRef.current?.click()}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
                <Upload size={12}/> {profilePreview ? 'Change' : 'Upload'}
              </button>
              <button type="button" onClick={openCameraModal}
                className="btn-outline btn-sm inline-flex items-center gap-1.5">
                <Camera size={12}/> Use Camera
              </button>
            </div>
          </div>
          <input ref={profileRef} type="file" accept="image/*" className="hidden"
            onChange={e => handleFile('profile_photo', e.target.files[0], setProfilePreview)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="label">Country</label>
            <input className="input bg-gray-50 text-gray-600" value={form.country_name} readOnly disabled />
          </div>
          <div>
            <label className="label">Mobile Number *</label>
            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3">
              <input className="input bg-gray-50 text-gray-600" value={getCountryDialDisplay(selectedPhoneCountry)} readOnly disabled />
              <input className="input" type="tel" inputMode="numeric" placeholder={getPhonePlaceholder(selectedPhoneCountry)}
                value={form.phone}
                onChange={e => set('phone', String(e.target.value || '').replace(/\D/g, '').slice(0, 15))} />
            </div>
            <FieldError msg={errors.phone} />
          </div>
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="Enter your full name"
              value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            <FieldError msg={errors.full_name} />
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input className="input" type="email" placeholder="email@example.com"
              value={form.email} onChange={e => set('email', e.target.value)} />
            <FieldError msg={errors.email} />
          </div>
          <div>
            <label className="label">Gender *</label>
            <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <FieldError msg={errors.gender} />
          </div>
          <div>
            <label className="label">{isIndianApplicant ? 'Aadhaar Number *' : 'Passport Number *'}</label>
            {isIndianApplicant ? (
              <>
                <input className="input" placeholder="12-digit Aadhaar number" maxLength={12}
                  value={form.aadhaar_number}
                  onChange={e => set('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))} />
                <FieldError msg={errors.aadhaar_number} />
              </>
            ) : (
              <>
                <input className="input" placeholder="Passport number" maxLength={9}
                  value={form.passport_number}
                  onChange={e => set('passport_number', e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 9))} />
                <FieldError msg={errors.passport_number} />
              </>
            )}
          </div>
          <div>
            <label className="label">{isIndianApplicant ? 'PIN Code' : 'Postal Code'}</label>
            {isIndianApplicant ? (
              <input className="input" placeholder="6-digit PIN code" maxLength={6}
                value={form.pin_code}
                onChange={e => set('pin_code', e.target.value.replace(/\D/g, '').slice(0, 6))} />
            ) : (
              <input className="input" placeholder="Enter postal / zip code" maxLength={20}
                value={form.pin_code}
                onChange={e => set('pin_code', e.target.value.replace(/[^A-Za-z0-9 -]/g, '').slice(0, 20))} />
            )}
          </div>
          <div>
            <label className="label">Organisation Name *</label>
            <input className="input" placeholder="Company / Organisation name"
              value={form.organisation_name} onChange={e => set('organisation_name', e.target.value)} />
            <FieldError msg={errors.organisation_name} />
          </div>
          <div>
            <label className="label">Organisation Type *</label>
            <SearchableSelect
              options={ORGANISATION_TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
              value={form.organisation_type}
              onChange={v => set('organisation_type', v)}
              placeholder="Select type"
            />
            <FieldError msg={errors.organisation_type} />
          </div>
          {form.organisation_type === 'Other' && (
            <div className="sm:col-span-2">
              <label className="label">Specify your organization type</label>
              <input
                className="input"
                placeholder="Enter your organization type"
                value={form.organisation_type_other}
                onChange={e => set('organisation_type_other', e.target.value)}
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
                  className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-white p-1"/>
                <button type="button"
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  onClick={() => clearFile('organisation_logo', setLogoPreview)}>
                  <Trash2 size={11}/>
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition shrink-0"
                onClick={() => logoRef.current?.click()}>
                <Building2 size={18}/><span className="text-[10px] mt-0.5 font-medium">Logo</span>
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
              <Link2 size={14} className="text-gray-400"/>Social Links
            </label>
            <button type="button" onClick={addSocialLink}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              <Plus size={13}/> Add Link
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
                  <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                </div>
                <button type="button" onClick={() => removeSocialLink(i)}
                  className="mt-2 text-gray-400 hover:text-red-500 transition shrink-0">
                  <X size={16}/>
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
    const overseasCurrency = selectedCountry ? getFixedCurrencyByCountry(selectedCountry.name) : 'USD'

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
                  setForm(f => ({ ...f, state_id: '', city_id: '', state_other: '', city_other: '', overseas_city: '', country_id: '' }))
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
                    <CheckCircle size={14} className="text-white"/>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <FieldError msg={errors.location_type} />

        {/* ── Rajasthan: city dropdown only ── */}
        {form.location_type === 'rajasthan' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label flex items-center gap-2 text-orange-800 mb-0">
                <MapPin size={14}/> Select City *
              </label>
              <span className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full">
                {getCurrencySymbol('INR')} INR
              </span>
            </div>
            <div className="relative">
              <SearchableSelect
                options={rajasthanCityOptions}
                value={form.city_id}
                placeholder={citiesLoading ? 'Loading cities…' : 'Search Rajasthan city'}
                onChange={nextValue => {
                  set('city_id', nextValue)
                  set('city_other', '')
                }}
                inputClassName="bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-200"
              />
            </div>
            <FieldError msg={errors.city_id} />
          </div>
        )}

        {/* ── Other States: State dropdown → City dropdown (both required) ── */}
        {form.location_type === 'other_states' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-800">Select State & City</p>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {getCurrencySymbol('INR')} INR
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2 text-blue-800">
                  <MapPin size={14}/> State *
                </label>
                <SearchableSelect
                  options={stateOptions}
                  value={form.state_id}
                  placeholder={states.length ? 'Search state' : 'Loading states…'}
                  onChange={nextValue => {
                    set('state_id', nextValue)
                    set('city_id', '')
                    set('city_other', '')
                    set('state_other', '')
                  }}
                  inputClassName="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200"
                />
                <FieldError msg={errors.state_id} />
              </div>
              <div>
                <label className="label flex items-center gap-2 text-blue-800">
                  <MapPin size={14}/> City *
                </label>
                <SearchableSelect
                  options={cityOptions}
                  value={form.city_id}
                  disabled={!form.state_id}
                  placeholder={!form.state_id
                    ? 'Select state first'
                    : citiesLoading
                      ? 'Loading cities…'
                      : 'Type to search city…'}
                  minQueryLength={1}
                  onChange={nextValue => {
                    set('city_id', nextValue)
                    set('city_other', '')
                  }}
                  inputClassName="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-200"
                />
                <FieldError msg={errors.city_id} />
              </div>
            </div>
          </div>
        )}

        {/* ── Overseas: searchable country autocomplete ── */}
        {form.location_type === 'overseas' && (
          <div className="mt-5 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label flex items-center gap-2 text-emerald-800 mb-0">
                <Globe2 size={14}/> Country *
              </label>
              {overseasCurrency && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full transition-all">
                  {getCurrencySymbol(overseasCurrency)} {overseasCurrency}
                </span>
              )}
            </div>
            <SearchableSelect
              options={countryOptions}
              value={form.country_id}
              placeholder={countries.length ? 'Search country...' : 'Loading countries…'}
              onChange={(nextValue, option) => {
                set('country_id', nextValue)
                set('country_name', option?.raw?.name || '')
                set('overseas_city', '')
              }}
              inputClassName="bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
            />
            <FieldError msg={errors.country_id} />
            <div>
              <label className="label flex items-center gap-2 text-emerald-800">City</label>
              <input
                className="input bg-white border-emerald-200 focus:border-emerald-400 focus:ring-emerald-200"
                value={form.overseas_city}
                onChange={e => set('overseas_city', e.target.value)}
                placeholder="Enter your city (optional)"
              />
            </div>
          </div>
        )}
      </SectionCard>
    )
  }

  /* ─── Step 3: Membership Type ───────────────────────────────────── */
  function renderMembershipType() {
    return (
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
                    <CheckCircle size={14} className="text-white"/>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <FieldError msg={errors.membership_type} />
      </SectionCard>
    )
  }

  /* ─── Step 4: Plan & Package ────────────────────────────────────── */
  function renderPlanPackage() {
    return (
      <SectionCard icon={Package} title="Select Plan Duration" desc="Choose your membership plan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {PLAN_OPTIONS.map(opt => {
            const selected = form.plan_type === opt.value
            const Icon = opt.icon
            return (
              <button key={opt.value} type="button"
                onClick={() => set('plan_type', opt.value)}
                className={`relative p-6 rounded-2xl border-2 text-center transition-all duration-300 ease-in-out group
                  ${selected
                    ? `bg-gradient-to-br ${opt.selectedGradient} ${opt.border} ring-2 ring-offset-1 shadow-lg`
                    : `bg-gradient-to-br ${opt.gradient} border-gray-200 hover:${opt.border} hover:shadow-lg hover:scale-105`
                  }`}>
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all
                  ${selected
                    ? `bg-gradient-to-br ${opt.iconFrom} ${opt.iconTo} text-white shadow-md`
                    : `${opt.iconBg} ${opt.iconColor}`}`}>
                  <Icon size={26}/>
                </div>
                <p className={`font-bold text-lg mt-1 ${selected ? 'text-gray-900' : 'text-gray-800'}`}>{opt.label}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-snug">{opt.desc}</p>
                {selected && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shadow">
                    <CheckCircle size={12} className="text-white"/>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <FieldError msg={errors.plan_type} />

        {pkgLoading && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-3 text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin text-primary-500"/>Finding your package…
          </div>
        )}

        {pkgError && !pkgLoading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-3 text-amber-700">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-amber-500"/>
            </div>
            <div>
              <p className="text-sm font-semibold">Package Not Configured</p>
              <p className="text-xs mt-0.5">{pkgError}</p>
            </div>
          </div>
        )}

        {pkg && !pkgLoading && (() => {
          // For overseas: always derive currency from the selected country (formCurrency),
          // which uses DB country.currency field. pkg.currency may be the generic 'USD'
          // stored at auto-generation time, which is overridden by country-level mapping.
          const effectiveCurrency = form.location_type === 'overseas'
            ? (formCurrency || 'USD')
            : (formCurrency || pkg.currency || 'INR')
          const currSymbol = getCurrencySymbol(effectiveCurrency)
          const locale = effectiveCurrency === 'JPY' ? 'ja-JP'
            : effectiveCurrency === 'INR' ? 'en-IN'
            : 'en-US'
          return (
            <div className="bg-gradient-to-r from-primary-50 via-purple-50 to-primary-50 border border-primary-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Package size={18} className="text-primary-600"/>
                  </div>
                  <div>
                    <p className="text-xs text-primary-500 font-semibold uppercase tracking-widest">Your Package</p>
                    <p className="font-bold text-gray-900 mt-0.5">{pkg.name}</p>
                    {pkg.code && <p className="text-xs text-gray-500 font-mono">{pkg.code}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-primary-700">
                    {currSymbol}{Number(pkg.price).toLocaleString(locale)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{effectiveCurrency}</p>
                </div>
              </div>
              {Array.isArray(pkg.benefits) && pkg.benefits.length > 0 && (
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-primary-100 pt-3">
                  {pkg.benefits.map((b, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <CheckCircle size={11} className="text-primary-500 shrink-0"/>{b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}


        <FieldError msg={errors.package_id} />
      </SectionCard>
    )
  }

  /* ─── Step 5: Payment ───────────────────────────────────────────── */
  function renderPayment() {
    const selectedMethod = methods.find(m => String(m.id) === String(form.payment_method))
    const TYPE_ICONS  = { upi: '📱', bank_transfer: '🏦', international_wire: '🌐', cash: '💵', cheque: '📝', other: '💳' }
    const TYPE_LABELS = { upi: 'UPI', bank_transfer: 'Bank Transfer', international_wire: 'International Wire', cash: 'Cash', cheque: 'Cheque', other: 'Other' }
    const locationLabel = { rajasthan: 'Rajasthan', other_states: 'Other Indian States', overseas: 'Overseas' }[form.location_type] || 'your location'
    const effectiveAmount = fmtAmount(pkg?.price, formCurrency)
    const isManualMethod  = selectedMethod && ['bank_transfer', 'international_wire', 'cash', 'cheque', 'other'].includes(selectedMethod.type)
          const step3Locked     = !selectedMethod || (isManualMethod && !paymentConfirmed)

    // UPI deep-link for dynamic QR generation
    const upiQrValue = selectedMethod?.upi_id
      ? `upi://pay?pa=${selectedMethod.upi_id}&pn=${encodeURIComponent(selectedMethod.account_name || 'FORTI')}&am=${pkg?.price || ''}&cu=INR`
      : ''

    /* Reusable copy row */
    function CopyRow({ label, value, mono = true }) {
      if (!value) return null
      return (
        <div className="flex items-center gap-3 bg-white/80 hover:bg-white rounded-lg px-3 py-2.5 transition-colors group">
          <span className="text-xs font-semibold text-gray-400 w-28 shrink-0">{label}</span>
          <span className={`text-sm text-gray-900 font-medium flex-1 select-all ${mono ? 'font-mono' : ''}`}>{value}</span>
          <button type="button"
            onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied!`)).catch(() => {})}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-primary-600 transition opacity-0 group-hover:opacity-100 shrink-0 px-2 py-1 rounded hover:bg-primary-50">
            <Copy size={11}/> Copy
          </button>
        </div>
      )
    }

    /* Reference ID card shown to manual-payment users */
    function ReferenceIdCard() {
      return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-indigo-600">Your Payment Reference ID</p>
            <p className="text-base font-bold font-mono text-indigo-900 mt-0.5">{referenceId}</p>
            <p className="text-[11px] text-indigo-500 mt-0.5">Add this ID in the payment remarks / description</p>
          </div>
          <button type="button"
            onClick={() => navigator.clipboard.writeText(referenceId).then(() => toast.success('Reference ID copied!')).catch(() => {})}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition shrink-0">
            <Copy size={12}/> Copy
          </button>
        </div>
      )
    }

    return (
      <SectionCard icon={CreditCard} title="Payment Details" desc="Follow the steps below to complete your payment">

        {/* ── STEP INDICATOR ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { n: '1', label: 'Select Method' },
            { n: '2', label: 'Make Payment' },
            { n: '3', label: 'Upload Proof' },
          ].map((s, i) => {
            const done  = (i === 0 && form.payment_method) ||
                          (i === 1 && form.payment_method && (!isManualMethod || paymentConfirmed)) ||
                          (i === 2 && form.transaction_id && form.payment_screenshot)
            const active = (i === 0) || (i === 1 && !!form.payment_method) || (i === 2 && !step3Locked)
            return (
              <div key={s.n} className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done ? 'bg-green-500 text-white' : active ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? <CheckCircle size={14}/> : s.n}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
                {i < 2 && <ChevronRight size={14} className="text-gray-300 ml-1"/>}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: SELECT METHOD ───────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              Select Payment Method
            </p>
            {form.location_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Methods for: <strong>{locationLabel}</strong>
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
                    onClick={() => set('payment_method', String(m.id))}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3
                      ${selected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0
                      ${selected ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      {TYPE_ICONS[m.type] || '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${selected ? 'text-primary-700' : 'text-gray-900'}`}>{m.name}</p>
                      <p className="text-xs text-gray-500">{TYPE_LABELS[m.type] || m.type}</p>
                    </div>
                    {selected && <CheckCircle size={16} className="text-primary-500 shrink-0"/>}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
              <p className="font-medium">No payment methods configured</p>
              <p className="mt-1 text-xs">Please contact admin for payment information.</p>
            </div>
          )}
          <FieldError msg={errors.payment_method} />
        </div>

        {/* ── STEP 2: PAYMENT DETAILS (shown only once method is selected) ─ */}
        {selectedMethod && (
          <div className="mb-6 rounded-2xl border-2 border-primary-200 overflow-hidden">

            {/* Step header */}
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
                Make Payment Using Details Below
              </p>
              {pkg && (
                <span className="text-sm font-extrabold text-white bg-white/15 px-3 py-1 rounded-full">
                  {effectiveAmount}
                </span>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-4">

              {/* ── UPI ── */}
              {selectedMethod.type === 'upi' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">📱 Scan &amp; Pay via UPI</p>

                  {/* QR: admin-uploaded static image OR auto-generated from UPI ID */}
                  {(selectedMethod.qr_image || selectedMethod.upi_id) && (
                    <div className="flex flex-col items-center gap-3 py-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                      {selectedMethod.qr_image ? (
                        <img
                          src={selectedMethod.qr_image.startsWith('http') ? selectedMethod.qr_image : `/${selectedMethod.qr_image}`}
                          alt="UPI QR Code"
                          className="w-52 h-52 border border-gray-200 rounded-xl bg-white p-2 shadow-sm"
                        />
                      ) : (
                        <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                          <QRCodeSVG value={upiQrValue} size={192} level="M" includeMargin={true}/>
                        </div>
                      )}
                      <p className="text-sm font-bold text-indigo-700">📲 Scan to Pay</p>
                      <p className="text-xs text-gray-400">PhonePe · GPay · Paytm · any UPI app</p>
                      {pkg && (
                        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                          Amount: {effectiveAmount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* UPI ID copy */}
                  {selectedMethod.upi_id && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1.5">Or enter UPI ID manually:</p>
                      <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-4 py-3 shadow-sm">
                        <span className="text-base font-mono font-bold text-indigo-900 flex-1 select-all">{selectedMethod.upi_id}</span>
                        <button type="button"
                          onClick={() => navigator.clipboard.writeText(selectedMethod.upi_id).then(() => toast.success('UPI ID copied!')).catch(() => {})}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition shrink-0">
                          <Copy size={12}/> Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <button type="button"
                    onClick={() => setShowInstructions(v => !v)}
                    className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 transition text-left">
                    {showInstructions ? 'Hide Instructions' : 'View Payment Instructions'}
                  </button>
                  {showInstructions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                    <div>
                      <p className="text-xs font-bold text-amber-800">How to pay via UPI</p>
                      <ol className="text-xs text-amber-700 mt-1 space-y-0.5 list-decimal list-inside">
                        <li>Open your UPI app (PhonePe, GPay, Paytm, etc.)</li>
                        <li>Scan the QR code above OR enter the UPI ID</li>
                        <li>Enter amount: <strong>{effectiveAmount}</strong></li>
                        <li>Complete the payment &amp; take a screenshot</li>
                          <li>Upload your payment confirmation below</li>
                      </ol>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* ── BANK TRANSFER ── */}
              {selectedMethod.type === 'bank_transfer' && !(selectedMethod.upi_id && !selectedMethod.bank_name) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                    🏦 Bank Transfer Details
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Shield size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-blue-700">
                      <strong>Manual Payment:</strong> Your payment will be verified by admin within 1–2 business days after submission.
                    </p>
                  </div>

                  <ReferenceIdCard/>

                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    <CopyRow label="Account Name"  value={selectedMethod.account_name}   mono={false}/>
                    <CopyRow label="Bank Name"      value={selectedMethod.bank_name}      mono={false}/>
                    <CopyRow label="Account No."    value={selectedMethod.account_number} mono={true}/>
                    <CopyRow label="IFSC Code"      value={selectedMethod.ifsc_code}      mono={true}/>
                    {selectedMethod.upi_id && <CopyRow label="UPI ID" value={selectedMethod.upi_id} mono={true}/>}
                  </div>

                  <button type="button"
                    onClick={() => setShowInstructions(v => !v)}
                    className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 transition text-left">
                    {showInstructions ? 'Hide Instructions' : 'View Payment Instructions'}
                  </button>
                  {showInstructions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-amber-700">
                      <strong>Important:</strong> Transfer exactly <strong>{effectiveAmount}</strong> and include <strong>{referenceId}</strong> in the payment remarks / narration. Upload your receipt below after transfer.
                    </p>
                  </div>
                  )}
                </div>
              )}

              {/* ── INTERNATIONAL WIRE ── */}
              {selectedMethod.type === 'international_wire' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                    🌐 International Wire Transfer Details
                  </p>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Shield size={14} className="text-emerald-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-emerald-700">
                      <strong>Manual Payment:</strong> Use the following details to complete your international transfer. Your payment will be verified by admin after submission.
                    </p>
                  </div>

                  <ReferenceIdCard/>

                  <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    <CopyRow label="Account Name"  value={selectedMethod.account_name}   mono={false}/>
                    <CopyRow label="Bank Name"      value={selectedMethod.bank_name}      mono={false}/>
                    <CopyRow label="Account No."    value={selectedMethod.account_number} mono={true}/>
                    <CopyRow label="SWIFT / BIC"    value={selectedMethod.swift_code}     mono={true}/>
                    {selectedMethod.iban && <CopyRow label="IBAN" value={selectedMethod.iban} mono={true}/>}
                    {selectedMethod.ifsc_code && <CopyRow label="IFSC" value={selectedMethod.ifsc_code} mono={true}/>}
                    {selectedMethod.bank_address && <CopyRow label="Bank Address" value={selectedMethod.bank_address} mono={false}/>}
                  </div>

                  <button type="button"
                    onClick={() => setShowInstructions(v => !v)}
                    className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 transition text-left">
                    {showInstructions ? 'Hide Instructions' : 'View Payment Instructions'}
                  </button>
                  {showInstructions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                    <div>
                      <p className="text-xs font-bold text-amber-800">How to complete International Wire</p>
                      <ol className="text-xs text-amber-700 mt-1 space-y-0.5 list-decimal list-inside">
                        <li>Log in to your bank’s international transfer / SWIFT portal</li>
                        <li>Add beneficiary using the details above</li>
                        <li>Transfer exactly <strong>{effectiveAmount}</strong> (send bank charges separately)</li>
                        <li>Add <strong>{referenceId}</strong> in the transfer note / description</li>
                        <li>Note the SWIFT / Reference ID provided by your bank</li>
                        <li>Click <em>“I have completed payment”</em> below, then upload confirmation</li>
                      </ol>
                      <p className="text-[11px] text-amber-600 font-semibold mt-2 flex items-center gap-1">
                        <AlertCircle size={11}/> Bank charges may apply. Transfer the exact membership amount — charges must be borne by sender.
                      </p>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* ── CASH / CHEQUE / OTHER ── */}
              {['cash', 'cheque', 'other'].includes(selectedMethod.type) && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                    {TYPE_ICONS[selectedMethod.type]} {TYPE_LABELS[selectedMethod.type]} Payment
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2">
                    <Shield size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                    <p className="text-xs text-blue-700">
                      <strong>Manual Payment:</strong> Your payment will be verified by admin after submission.
                    </p>
                  </div>
                  <ReferenceIdCard/>
                  {(selectedMethod.bank_name || selectedMethod.account_name || selectedMethod.account_number) && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                      <CopyRow label="Account Name"  value={selectedMethod.account_name}   mono={false}/>
                      <CopyRow label="Bank Name"      value={selectedMethod.bank_name}      mono={false}/>
                      <CopyRow label="Account No."    value={selectedMethod.account_number} mono={true}/>
                    </div>
                  )}
                </div>
              )}

              {/* ── CONFIRMATION BUTTON (manual methods only) ── */}
              {isManualMethod && !paymentConfirmed && (
                <div className="border-t border-primary-100 pt-4 text-center space-y-2">
                  <p className="text-sm text-gray-600">Completed your payment? Click below to upload proof.</p>
                  <button type="button"
                    onClick={() => setPaymentConfirmed(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-sm px-7 py-3 rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transition-all duration-200">
                    <CheckCircle size={16}/> I have completed payment
                  </button>
                  <FieldError msg={errors.payment_confirmed}/>
                </div>
              )}

              {/* ── CONFIRMED BANNER ── */}
              {isManualMethod && paymentConfirmed && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle size={16} className="text-white"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">Payment Confirmed!</p>
                    <p className="text-xs text-green-600">Now upload your payment confirmation below.</p>
                  </div>
                  <button type="button" className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0"
                    onClick={() => setPaymentConfirmed(false)}>undo</button>
                </div>
              )}

            </div>

            {/* Divider with arrow pointing down */}
            <div className="flex items-center gap-3 px-5 py-2 bg-white border-t border-b border-primary-100">
              <div className="h-px flex-1 bg-primary-100"/>
              <span className="text-xs text-primary-500 font-semibold">After paying, complete Step 3 below ↓</span>
              <div className="h-px flex-1 bg-primary-100"/>
            </div>
          </div>
        )}

        {/* ── STEP 3: UPLOAD PROOF ────────────────────────────────────── */}
        <div className={`rounded-2xl border-2 overflow-hidden transition-all
          ${step3Locked ? 'border-dashed border-gray-200 opacity-60 pointer-events-none' : 'border-gray-200'}`}>
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0
                ${form.payment_screenshot ? 'bg-green-500 text-white' : 'bg-primary-500 text-white'}`}>
                {form.payment_screenshot ? <CheckCircle size={14}/> : '3'}
              </span>
              Upload Payment Proof
              {step3Locked && (
                <span className="text-xs font-normal text-gray-400 ml-1">
                  {!selectedMethod ? '(select a payment method first)' : '(confirm payment first)'}
                </span>
              )}
            </p>
          </div>

          <div className="p-5 bg-white space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="label">Payment Confirmation *</label>
                <input ref={ssRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleFile('payment_screenshot', e.target.files[0], setSsPreview)} />
                {ssPreview ? (
                  <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3 border border-green-200">
                    <img src={ssPreview} alt="Screenshot" className="h-12 w-12 object-cover rounded-lg border border-green-200"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-700 font-semibold flex items-center gap-1"><CheckCircle size={11}/>Screenshot uploaded</p>
                      <p className="text-[11px] text-gray-400 truncate">Tap Replace to change</p>
                    </div>
                    <button type="button" className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition"
                      onClick={() => ssRef.current?.click()}>Replace</button>
                    <button type="button" className="text-red-400 hover:text-red-600 transition"
                      onClick={() => clearFile('payment_screenshot', setSsPreview)}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition"
                    onClick={() => ssRef.current?.click()}>
                    <Upload size={22} className="text-gray-400"/>
                    <span className="text-sm text-gray-500 font-medium">Upload payment receipt / screenshot</span>
                    <span className="text-[11px] text-gray-400">JPG, PNG, PDF – max 5 MB</span>
                  </div>
                )}
                <FieldError msg={errors.payment_screenshot} />
              </div>
            </div>

            {supportPhoneDigits && (
              <p className="text-xs text-gray-400 text-center">
                Need help?{' '}
                <a
                  href={`https://wa.me/${supportPhoneDigits}?text=Hi%2C%20I%20need%20help%20with%20payment%20for%20FORTI%20membership.`}
                  target="_blank"
                  rel="noreferrer"
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
              <X size={18} className="text-gray-600"/>
            </button>
            <img src={profilePreview} alt="Profile Photo" className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white"/>
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
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Camera size={16}/> Take Photo</h3>
              <button type="button" onClick={closeCameraModal} className="text-gray-400 hover:text-gray-600 transition"><X size={18}/></button>
            </div>
            <div className="bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden"/>
            <div className="p-4 flex gap-3">
              <button type="button" onClick={capturePhoto}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition">
                <Camera size={16}/> Capture
              </button>
              <button type="button" onClick={closeCameraModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {renderStepper()}
      {stepRenderers[step]()}

      {errors._global && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16}/>{errors._global}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4">
        {step > 0 ? (
          <button type="button" onClick={handleBack}
            className="btn-outline flex items-center gap-2 text-gray-600 hover:bg-gray-50">
            <ChevronLeft size={16}/> Back
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/')} className="btn-outline text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button type="button" onClick={handleNext}
            className="btn-primary flex items-center gap-2 shadow-md shadow-primary-200 hover:shadow-lg">
            Save & Next <ChevronRight size={16}/>
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting || !isStepComplete(4)}
            className="btn-primary btn-lg flex items-center gap-2 disabled:opacity-60 shadow-md shadow-primary-200 hover:shadow-lg"
            aria-disabled={submitting || !isStepComplete(4)}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin"/>Submitting…</>
              : <><CheckCircle size={16}/>Submit Application</>}
          </button>
        )}
      </div>
    </div>
  )
}
