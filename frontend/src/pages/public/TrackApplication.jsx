import { useState } from 'react'
import api from '../../api/client'

const STEPS = [
  { key: 'submitted',       label: 'Submitted',        desc: 'Application received' },
  { key: 'under_review',    label: 'Under Review',     desc: 'Being reviewed by our team' },
  { key: 'approved',        label: 'Approved',         desc: 'Application approved' },
  { key: 'payment_pending', label: 'Payment Pending',  desc: 'Awaiting payment verification' },
  { key: 'active',          label: 'Active',           desc: 'Membership is active' },
]

function getStepIndex(status, member_status, payment_status) {
  if (member_status === 'active') return 4
  if (payment_status === 'pending' || payment_status === 'submitted') return 3
  if (status === 'approved') return 2
  if (status === 'under_review') return 1
  return 0
}

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrackApplication() {
  const [input, setInput]     = useState('')
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleTrack(e) {
    e.preventDefault()
    const id = input.trim()
    if (!id) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.get(`/member/track?membership_id=${encodeURIComponent(id)}`)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Application not found. Please check your Application ID.')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = result ? getStepIndex(result.status, result.member_status, result.payment_status) : -1

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
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
              placeholder="e.g. FORTI-123456"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition">
              {loading ? 'Checking…' : 'Track'}
            </button>
          </form>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
          )}

          {result && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Application ID</p>
                  <p className="text-base font-bold text-gray-800 font-mono">{result.membership_id}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                  result.member_status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : result.status === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {result.member_status === 'active' ? 'Active' : String(result.status || '').replace(/_/g, ' ')}
                </span>
              </div>

              {/* Timeline */}
              <div className="space-y-0">
                {STEPS.map((step, i) => {
                  const done    = i <= currentStep
                  const current = i === currentStep
                  return (
                    <div key={step.key} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                          done
                            ? current
                              ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                              : 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-300'
                        }`}>
                          {done && !current ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 rounded-full ${i < currentStep ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-semibold leading-tight ${done ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</p>
                        <p className={`text-xs mt-0.5 ${done ? 'text-gray-400' : 'text-gray-200'}`}>{step.desc}</p>
                        {current && step.key === 'submitted' && result.submitted_at && (
                          <p className="text-xs text-primary-600 font-medium mt-0.5">{fmt(result.submitted_at)}</p>
                        )}
                        {step.key === 'approved' && result.approved_at && i <= currentStep && (
                          <p className="text-xs text-emerald-600 font-medium mt-0.5">{fmt(result.approved_at)}</p>
                        )}
                        {step.key === 'payment_pending' && result.payment_date && i <= currentStep && (
                          <p className="text-xs text-gray-400 font-medium mt-0.5">Payment received {fmt(result.payment_date)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

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
          <a href="/" className="text-primary-600 hover:underline">← Back to home</a>
        </p>
      </div>
    </div>
  )
}
