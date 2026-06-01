import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Build the list of completed steps based on real backend data only
function buildSteps(result) {
  if (!result) return []
  const { status, member_status, payment_status, submitted_at, approved_at, payment_date } = result
  const steps = []

  // Step 1 – always shown when we have data
  steps.push({ key: 'submitted', label: 'Submitted', desc: 'Application received', date: submitted_at })

  // Step 2 – under review
  const pastSubmitted = ['under_review', 'approved', 'payment_pending', 'payment_submitted', 'payment_verified', 'active']
  if (pastSubmitted.includes(status)) {
    steps.push({ key: 'under_review', label: 'Under Review', desc: 'Being reviewed by our team' })
  }

  // Step 3 – approved
  if (['approved', 'payment_pending', 'payment_submitted', 'payment_verified', 'active'].includes(status)) {
    steps.push({ key: 'approved', label: 'Approved', desc: 'Application approved', date: approved_at })
  }

  // Step 4 – payment submitted by applicant
  const pmtSubmitted = ['submitted', 'verified', 'approved']
  if (pmtSubmitted.includes(payment_status) || ['payment_submitted', 'payment_verified'].includes(status)) {
    steps.push({ key: 'payment_submitted', label: 'Payment Submitted', desc: 'Awaiting payment verification', date: payment_date })
  }

  // Step 5 – payment verified by admin
  if (['verified', 'approved'].includes(payment_status) || status === 'payment_verified') {
    steps.push({ key: 'payment_verified', label: 'Payment Verified', desc: 'Payment has been confirmed' })
  }

  // Step 6 – membership active ONLY when app approved AND payment verified
  const appApproved = ['approved', 'active'].includes(status)
  const pmtVerified = ['verified', 'approved'].includes(payment_status)
  if (member_status === 'active' && appApproved && pmtVerified) {
    steps.push({ key: 'active', label: 'Membership Activated', desc: 'Membership is active' })
  }

  return steps
}

export default function TrackApplication() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const initialMembershipId = searchParams.get('membership_id') || location.state?.application?.membership_id || ''
  const [input, setInput]     = useState('')
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchApplication(id) {
    const membershipId = String(id || '').trim()
    if (!membershipId) return
    setInput(membershipId)
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.get(`/member/track?membership_id=${encodeURIComponent(membershipId)}`)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Application not found. Please check your Application ID.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialMembershipId) return
    fetchApplication(initialMembershipId)
  }, [initialMembershipId])

  async function handleTrack(e) {
    e.preventDefault()
    const id = input.trim()
    if (!id) return
    await fetchApplication(id)
  }

  const steps = buildSteps(result)
  const lastIdx = steps.length - 1

  return (
    <div className="page-shell bg-gradient-to-br from-primary-50 to-white">
      <PublicHeader />

      <div className="flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Track Application</h1>
          <p className="text-gray-500 text-sm">Enter your Application ID to check your membership status</p>
        </div>

        {/* Search card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. FR-123456"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition">
              {loading ? 'Checking…' : 'Track'}
            </button>
          </form>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
          )}

          {result && steps.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No status information available yet.</p>
          )}

          {result && steps.length > 0 && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Application ID</p>
                  <p className="text-base font-bold text-gray-800 font-mono">{result.membership_id}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                  result.status === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : ['payment_verified', 'approved', 'active'].includes(steps[lastIdx]?.key)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {result.status === 'rejected' ? 'Rejected' : (steps[lastIdx]?.label || 'Submitted')}
                </span>
              </div>

              {/* Dynamic Timeline — only completed steps */}
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const isCurrent = i === lastIdx
                  return (
                    <div key={step.key} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        {i < lastIdx && (
                          <div className="w-0.5 h-8 mt-1 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold leading-tight text-gray-900">{step.label}</p>
                        <p className="text-xs mt-0.5 text-gray-400">{step.desc}</p>
                        {step.date && (
                          <p className="text-xs text-primary-600 font-medium mt-0.5">{fmt(step.date)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {result.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  Your application has been rejected. Please contact support for more information.
                </div>
              )}

              {result.member_status === 'active' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                  Your membership is active. <a href="/member/login" className="underline font-bold">Login to your portal →</a>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Your Application ID was sent to your email when you applied.{' '}
          <Link to="/" className="text-primary-600 hover:underline">← Back to home</Link>
        </p>
      </div>
      </div>

      <PublicFooter />
    </div>
  )
}
