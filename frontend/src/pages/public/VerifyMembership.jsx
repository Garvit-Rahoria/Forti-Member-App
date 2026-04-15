import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
  Shield, Search, CheckCircle, XCircle, AlertCircle,
  User, Calendar, MapPin, Award, ArrowLeft, Loader2, Clock
} from 'lucide-react'

const http = axios.create({ baseURL: '/api' })

export default function VerifyMembership() {
  const [searchParams] = useSearchParams()
  const [input, setInput] = useState(searchParams.get('id') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Auto-search if id pre-filled from URL
  useEffect(() => {
    if (searchParams.get('id')) handleVerify()
  }, [])

  async function handleVerify(e) {
    if (e) e.preventDefault()
    const id = input.trim().toUpperCase()
    if (!id) { setError('Please enter a Membership ID'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await http.get(`/member/verify/${encodeURIComponent(id)}`)
      setResult(res.data.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Membership ID not found. Please check and try again.')
      } else {
        setError(err.response?.data?.message || 'Verification failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const isValid = result?.valid
  const isExpired = result && !result.valid && result.member_status === 'active'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black">F</div>
            <span className="font-bold text-gray-900">FORTI</span>
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1 transition">
            <ArrowLeft size={14}/> Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-primary-600"/>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Verify Membership</h1>
          <p className="text-gray-500 mt-2">Enter a FORTI Membership ID to verify its authenticity and current status.</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleVerify} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Membership ID</label>
          <div className="flex gap-3">
            <input
              type="text"
              className="input flex-1 font-mono uppercase"
              placeholder="e.g. FORTI-2026-00001"
              value={input}
              onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); setResult(null) }}
            />
            <button type="submit" disabled={loading}
              className="btn-primary flex items-center gap-2 shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
              {loading ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={15}/> {error}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">Enter the Membership ID exactly as printed on the certificate or ID card.</p>
        </form>

        {/* Result */}
        {result && (
          <div className={`rounded-2xl border-2 p-6 ${isValid ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            {/* Status banner */}
            <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${isValid ? 'bg-green-100' : 'bg-red-100'}`}>
              {isValid
                ? <CheckCircle size={28} className="text-green-600 shrink-0"/>
                : <XCircle size={28} className="text-red-600 shrink-0"/>
              }
              <div>
                <p className={`text-lg font-black ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                  {isValid ? '✓ Valid Membership' : '✗ Membership Not Active'}
                </p>
                <p className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {isValid
                    ? 'This is a genuine and currently active FORTI membership.'
                    : isExpired
                      ? 'This membership has expired.'
                      : 'This membership is not currently active or has been suspended.'}
                </p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailRow icon={Shield} label="Membership ID" value={result.membership_id}/>
              <DetailRow icon={User} label="Member Name" value={result.full_name}/>
              <DetailRow icon={Award} label="Membership Type" value={result.membership_type?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}/>
              <DetailRow icon={Award} label="Package" value={result.package_name}/>
              <DetailRow icon={MapPin} label="Country" value={result.country || '—'}/>
              <DetailRow icon={MapPin} label="State" value={result.state || '—'}/>
              <DetailRow
                icon={isValid ? CheckCircle : Clock}
                label="Status"
                value={result.member_status?.replace(/_/g,' ').toUpperCase()}
                valueClass={isValid ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}
              />
              <DetailRow
                icon={Calendar}
                label={result.expiry_date ? 'Valid Until' : 'Validity'}
                value={result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : 'Lifetime'}
              />
            </div>

            <p className="text-xs text-gray-400 mt-5 text-center">
              Verification performed on {new Date().toLocaleString()}. This is an official FORTI membership verification.
            </p>
          </div>
        )}

        {/* Info box */}
        {!result && !error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <Shield size={32} className="text-gray-300 mx-auto mb-3"/>
            <p className="text-gray-500 text-sm">Enter a Membership ID above to verify its status.</p>
            <p className="text-xs text-gray-400 mt-2">FORTI membership IDs are formatted as <span className="font-mono font-semibold">FORTI-YEAR-NNNNN</span></p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Questions? <a href="/contact" className="text-primary-600 hover:underline">Contact FORTI</a> ·{' '}
          <Link to="/" className="text-primary-600 hover:underline">Return to Home</Link>
        </p>
      </main>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        <Icon size={13}/><span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`font-semibold text-gray-900 text-sm ${valueClass}`}>{value || '—'}</p>
    </div>
  )
}
