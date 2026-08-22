import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  CheckCircle, ArrowRight, Globe, MapPin,
  Loader2, AlertCircle, User, Building2, Clock, Star, Infinity,
  ShieldCheck, Sparkles
} from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

const http = axios.create({ baseURL: '/api' })

function canMatchPlan({ membershipType, planType, locationType }) {
  return !!(membershipType && planType && locationType)
}

const MEMBERSHIP_TYPES = [
  {
    value: 'individual',
    label: 'Individual',
    icon: User,
    desc: 'Professionals, consultants, freelancers & students',
    gradient: 'from-primary-600 to-primary-800',
    activeBg: 'bg-primary-50',
    activeBorder: 'border-primary-500',
    activeText: 'text-primary-700',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    value: 'corporate',
    label: 'Corporate',
    icon: Building2,
    desc: 'Companies, organisations & enterprises',
    gradient: 'from-amber-500 to-amber-700',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-500',
    activeText: 'text-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
]

const PLAN_TYPES = [
  { value: '1year',    label: '1 Year',   icon: Clock,    badge: null,         badgeStyle: '' },
  { value: '3years',   label: '3 Years',  icon: Star,     badge: 'Popular',    badgeStyle: 'bg-emerald-100 text-emerald-700' },
  { value: 'lifetime', label: 'Lifetime', icon: Infinity, badge: 'Best Value', badgeStyle: 'bg-amber-100 text-amber-700' },
]

const LOCATION_TYPES = [
  { value: 'rajasthan',    label: 'Rajasthan',           icon: MapPin },
  { value: 'other_states', label: 'Other Indian States', icon: MapPin },
  { value: 'overseas',     label: 'Overseas',            icon: Globe },
]

function FilterStep({ number, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  )
}

function PackageCard({ pkg, onApply }) {
  const benefits = (() => {
    try { return typeof pkg.benefits === 'string' ? JSON.parse(pkg.benefits) : (pkg.benefits || []) } catch { return [] }
  })()

  const formatPrice = (price, currency) => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : '₹'
    return `${symbol}${Number(price || 0).toLocaleString('en-IN')}`
  }

  const durationLabel = pkg.duration_months >= 999
    ? 'Lifetime Access'
    : pkg.duration_months === 36
    ? '3 Year Membership'
    : pkg.duration_months
    ? `${pkg.duration_months}-Month Membership`
    : ''

  const allFeatures = [
    'Membership Certificate (PDF)',
    'Digital ID Card with QR Code',
    'Member Dashboard Access',
    'Invoice & Receipt',
    ...benefits.slice(0, 4),
  ]

  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border-2 ${pkg.is_featured ? 'border-primary-400 shadow-primary-100 shadow-lg' : 'border-gray-200 hover:border-primary-200'} transition-all duration-300 overflow-hidden flex flex-col`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${pkg.is_featured ? 'bg-gradient-to-r from-primary-500 to-primary-700' : 'bg-gradient-to-r from-gray-200 to-gray-300'}`} />

      {pkg.is_featured && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-bold text-center py-2 tracking-widest flex items-center justify-center gap-1.5">
          <Sparkles size={12} /> RECOMMENDED PLAN
        </div>
      )}

      {/* Price header */}
      <div className="p-6 pb-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-gray-900 leading-tight">{pkg.name}</h3>
            {(pkg.state_name || pkg.country_name) && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin size={10} />{[pkg.state_name, pkg.country_name].filter(Boolean).join(', ')}
              </p>
            )}
            {durationLabel && (
              <span className="inline-block mt-2 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {durationLabel}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-primary-600 leading-none">
              {formatPrice(pkg.price, pkg.currency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {pkg.duration_months >= 999 ? 'one-time' : 'per period'}
            </p>
          </div>
        </div>
        {pkg.description && (
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">{pkg.description}</p>
        )}
      </div>

      {/* Features */}
      <div className="p-6 flex-1 flex flex-col">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">What's included</p>
        <ul className="space-y-2.5 flex-1">
          {allFeatures.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => onApply(pkg)}
          className={`mt-6 w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] ${pkg.is_featured ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800' : 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black'}`}>
          Apply for This Plan <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const navigate = useNavigate()
  const [membershipType, setMembershipType] = useState('individual')
  const [planType, setPlanType] = useState('1year')
  const [locationType, setLocationType] = useState('rajasthan')

  const matchReady = canMatchPlan({ membershipType, planType, locationType })

  const { data: matchedPkgs = [], isLoading, error: matchError } = useQuery({
    queryKey: ['plan-match', membershipType, planType, locationType],
    queryFn: () => {
      const params = new URLSearchParams({
        membership_type: membershipType,
        plan_type: planType,
        location_type: locationType,
      })
      return http.get(`/membership/packages/match?${params}`).then(r => r.data.data)
    },
    enabled: matchReady,
    retry: false,
  })

  function handleApply(pkg) {
    navigate('/membership', { state: { planPreset: pkg } })
  }

  const activeMembership = MEMBERSHIP_TYPES.find(m => m.value === membershipType)

  return (
    <div className="page-shell">
      <PublicHeader />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-primary-200 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <ShieldCheck size={13} /> Membership Plans
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">Find Your Perfect Plan</h1>
          <p className="text-primary-200 text-lg max-w-xl mx-auto leading-relaxed">
            Pricing is based on your location and membership type. Use the filters below to find the exact plan for your region.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        {/* Filter Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-10">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500" />
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-widest">Filter by Your Profile</h2>
          </div>

          <div className="p-6 space-y-7">

            {/* Step 1 – Your Location */}
            <FilterStep number="1" label="Your Location">
              <div className="flex flex-wrap gap-3">
                {LOCATION_TYPES.map(l => {
                  const Icon = l.icon
                  const active = locationType === l.value
                  return (
                    <button
                      key={l.value}
                      onClick={() => setLocationType(l.value)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                      <Icon size={15} className={active ? 'text-primary-500' : 'text-gray-400'} />
                      {l.label}
                    </button>
                  )
                })}
              </div>
            </FilterStep>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Step 2 – Membership Type */}
            <FilterStep number="2" label="Membership Type">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MEMBERSHIP_TYPES.map(t => {
                  const Icon = t.icon
                  const active = membershipType === t.value
                  return (
                    <button
                      key={t.value}
                      onClick={() => setMembershipType(t.value)}
                      className={`group relative text-left rounded-xl p-4 border-2 transition-all duration-200 ${active ? `${t.activeBorder} ${t.activeBg}` : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? t.iconBg : 'bg-gray-100'}`}>
                          <Icon size={20} className={active ? t.iconColor : 'text-gray-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${active ? t.activeText : 'text-gray-800'}`}>{t.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${active ? `${t.activeBorder} ${t.activeBg}` : 'border-gray-300'}`}>
                          {active && <div className={`w-2 h-2 rounded-full ${t.iconBg} ${t.iconColor}`} style={{ background: 'currentColor' }} />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </FilterStep>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Step 3 – Duration */}
            <FilterStep number="3" label="Duration">
              <div className="flex flex-wrap gap-3">
                {PLAN_TYPES.map(p => {
                  const Icon = p.icon
                  const active = planType === p.value
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPlanType(p.value)}
                      className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                      <Icon size={15} className={active ? 'text-primary-500' : 'text-gray-400'} />
                      {p.label}
                      {p.badge && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.badgeStyle}`}>
                          {p.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </FilterStep>

          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Loader2 size={28} className="text-primary-500 animate-spin" />
            </div>
            <p className="text-gray-500 font-medium">Finding the best plan for you…</p>
          </div>

        ) : matchError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-amber-500" />
            </div>
            <h3 className="font-black text-gray-900 text-lg mb-2">No Plan Found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">No membership plan was found for your selected criteria. Try a different combination or contact us for help.</p>
            <Link to="/contact" className="btn-primary inline-flex items-center gap-2 mt-5">
              Contact Us <ArrowRight size={15} />
            </Link>
          </div>

        ) : matchedPkgs.length > 0 ? (
          <div>
            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Results</p>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">
                  {matchedPkgs.length} Plan{matchedPkgs.length !== 1 ? 's' : ''} match your selection
                </h3>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <CheckCircle size={13} className="text-emerald-500" />
                Prices are region-specific
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {matchedPkgs.map(pkg => (
                <PackageCard key={pkg.id || pkg.code} pkg={pkg} onApply={handleApply} />
              ))}
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-primary-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-blue-800 font-medium text-center sm:text-left">
                Want to see all available plans? Plans are automatically matched to your location during signup.
              </p>
              <Link to="/membership" className="shrink-0 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition whitespace-nowrap">
                Start Application <ArrowRight size={14} />
              </Link>
            </div>
          </div>

        ) : null}



      </div>

      <PublicFooter />
    </div>
  )
}
