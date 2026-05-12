import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  CheckCircle, ArrowRight, Globe, MapPin, ChevronDown,
  Award, CreditCard, FileText, Download, Loader2,
  AlertCircle, RefreshCw
} from 'lucide-react'

const http = axios.create({ baseURL: '/api' })

function SiteHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black">F</div>
          <div>
            <span className="font-bold text-gray-900">FORTI</span>
            <p className="text-xs text-gray-400 leading-none">Membership Portal</p>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm">
          {[['Home','/'],['About','/about'],['News','/news'],['Gallery','/gallery'],['Contact','/contact']].map(([l,to])=>(
            <Link key={to} to={to} className="text-gray-600 hover:text-primary-600 transition font-medium">{l}</Link>
          ))}
        </div>
        <Link to="/member/login" className="btn-outline text-sm hidden md:flex">Member Login</Link>
      </div>
    </header>
  )
}

const MEMBERSHIP_TYPES = [
  { value: 'individual',   label: 'Individual',   icon: '👤', desc: 'For individual professionals, consultants, freelancers, students' },
  { value: 'corporate',    label: 'Corporate',    icon: '🏢', desc: 'For companies, organisations, and enterprises' },
  { value: 'institutional',label: 'Institutional',icon: '🏛️', desc: 'For educations institutions, universities, colleges' },
  { value: 'overseas',     label: 'Overseas',     icon: '🌍', desc: 'For international members outside India' },
]

const PLAN_TYPES = [
  { value: 'yearly',   label: 'Yearly',   badge: '' },
  { value: 'lifetime', label: 'Lifetime', badge: 'Best Value' },
]

function PackageCard({ pkg, onApply }) {
  const benefits = (() => {
    try { return typeof pkg.benefits === 'string' ? JSON.parse(pkg.benefits) : (pkg.benefits || []) } catch { return [] }
  })()

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString('en-IN')
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 hover:border-primary-300 shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col">
      {pkg.is_featured && (
        <div className="bg-primary-600 text-white text-xs font-bold text-center py-1.5 tracking-wider">⭐ RECOMMENDED</div>
      )}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-black text-gray-900">{pkg.name}</h3>
            {(pkg.state_name || pkg.country_name) && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPin size={11}/>{[pkg.state_name, pkg.country_name].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary-600">{formatPrice(pkg.price)}</p>
            <p className="text-xs text-gray-400">
              {pkg.duration_months >= 999 ? 'Lifetime' : pkg.duration_months === 36 ? '3 Years' : pkg.duration_months ? `${pkg.duration_months} months` : ''}
            </p>
          </div>
        </div>
        {pkg.description && <p className="text-sm text-gray-500">{pkg.description}</p>}
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="space-y-2 flex-1">
          {[
            'Membership Certificate (PDF)',
            'Digital ID Card with QR Code',
            'Member Dashboard Access',
            'Invoice & Receipt',
            ...(benefits.slice(0, 3)),
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle size={14} className="text-green-500 shrink-0"/>{b}
            </div>
          ))}
        </div>
        <button onClick={() => onApply(pkg)} className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
          Apply for This Plan <ArrowRight size={15}/>
        </button>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const navigate = useNavigate()
  const [membershipType, setMembershipType] = useState('individual')
  const [planType, setPlanType] = useState('yearly')
  const [countryId, setCountryId] = useState('')
  const [stateId, setStateId] = useState('')
  const isOverseas = membershipType === 'overseas'

  // Fetch countries
  const { data: countries = [] } = useQuery({
    queryKey: ['public-countries'],
    queryFn: () => http.get('/locations/countries').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  })

  // Fetch states when country selected
  const { data: states = [] } = useQuery({
    queryKey: ['public-states', countryId],
    queryFn: () => countryId ? http.get(`/locations/states?country_id=${countryId}`).then(r => r.data.data) : Promise.resolve([]),
    enabled: !!countryId,
  })

  // Fetch matching package
  const { data: matchedPkg, isLoading, error: matchError } = useQuery({
    queryKey: ['plan-match', membershipType, planType, countryId, stateId, isOverseas],
    queryFn: () => {
      const params = new URLSearchParams({
        membership_type: membershipType,
        plan_type: planType,
        ...(isOverseas ? { is_overseas: '1' } : { country_id: countryId || '', state_id: stateId || '' }),
      })
      return http.get(`/membership/packages/match?${params}`).then(r => r.data.data)
    },
    enabled: !!(membershipType && planType),
    retry: false,
  })

  function handleApply(pkg) {
    navigate('/membership', { state: { planPreset: pkg } })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Membership Plans</span>
          <h1 className="text-4xl font-black mt-2 mb-3">Find Your Perfect Plan</h1>
          <p className="text-primary-200 text-lg max-w-xl mx-auto">Plans are priced based on your location and membership type. Use the filters below to find the exact plan and pricing for your region.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Filter by Your Profile</h2>
          
          {/* Membership Type */}
          <div className="mb-5">
            <label className="label mb-2">Membership Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MEMBERSHIP_TYPES.map(t => (
                <button key={t.value} onClick={() => { setMembershipType(t.value); setCountryId(''); setStateId('') }}
                  className={`rounded-xl p-3 border-2 text-left transition ${membershipType === t.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="text-xl mb-1">{t.icon}</div>
                  <p className="font-bold text-sm text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Plan Type */}
          <div className="mb-5">
            <label className="label mb-2">Duration</label>
            <div className="flex gap-3">
              {PLAN_TYPES.map(p => (
                <button key={p.value} onClick={() => setPlanType(p.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition ${planType === p.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {p.label}
                  {p.badge && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{p.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Location (only for non-overseas) */}
          {!isOverseas && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label mb-1">Country</label>
                <select className="input" value={countryId} onChange={e => { setCountryId(e.target.value); setStateId('') }}>
                  <option value="">Select Country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {countryId && states.length > 0 && (
                <div>
                  <label className="label mb-1">State / Region</label>
                  <select className="input" value={stateId} onChange={e => setStateId(e.target.value)}>
                    <option value="">All States (Country-level plan)</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="text-primary-500 animate-spin mx-auto mb-3"/>
            <p className="text-gray-500">Finding the best plan for you…</p>
          </div>
        ) : matchError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3"/>
            <h3 className="font-bold text-gray-900 mb-1">No Plan Found</h3>
            <p className="text-gray-500 text-sm">No membership plan was found for your selected criteria. Please try a different combination, or contact us for assistance.</p>
            <Link to="/contact" className="btn-primary inline-flex items-center gap-2 mt-4">Contact Us <ArrowRight size={15}/></Link>
          </div>
        ) : matchedPkg ? (
          <div>
            <p className="text-sm text-gray-500 mb-4 text-center">Best matching plan for your selection:</p>
            <div className="max-w-md mx-auto">
              <PackageCard pkg={matchedPkg} onApply={handleApply}/>
            </div>
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
              <p className="text-sm text-blue-700 font-medium">
                Want to see all available plans? <Link to="/membership" className="underline hover:text-blue-900">Start your application</Link> — plans are automatically matched to your location during the signup process.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Award size={36} className="text-gray-300 mx-auto mb-3"/>
            <p className="text-gray-500">Select your membership type and duration above to see pricing.</p>
          </div>
        )}

        {/* How Plans Work */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">All Plans Include:</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Award,    title: 'Membership Certificate', desc: 'Professionally designed PDF certificate' },
              { icon: CreditCard, title: 'Digital ID Card',     desc: 'QR code ID card for instant verification' },
              { icon: FileText, title: 'Invoice & Receipt',     desc: 'Official invoice for your records' },
              { icon: Download, title: 'Instant Download',      desc: 'Download documents from your dashboard' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary-600"/>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm space-y-1">
          <p>&copy; {new Date().getFullYear()} FORTI. All rights reserved. · <Link to="/" className="hover:text-white transition">Home</Link> · <Link to="/contact" className="hover:text-white transition">Contact</Link></p>
          <p className="text-xs text-gray-600">Developed by <a href="https://kaitensoftware.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Kaiten Software</a></p>
        </div>
      </footer>
    </div>
  )
}
