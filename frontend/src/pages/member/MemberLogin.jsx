import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useMember } from '../../contexts/MemberContext'
import {
  Mail, ShieldCheck, Loader2, AlertCircle, CheckCircle2,
  RefreshCw, ArrowLeft, LogIn
} from 'lucide-react'

const http = axios.create({ baseURL: '/api' })

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
        <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          disabled={disabled} value={d}
          onChange={e => handleChange(i, e)} onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-primary-500 transition
            ${d ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-white'}
            disabled:opacity-50`}
        />
      ))}
    </div>
  )
}

export default function MemberLogin() {
  const navigate = useNavigate()
  const { login, member } = useMember()

  const [phase, setPhase]     = useState('email') // 'email' | 'otp'
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (member) navigate('/member/dashboard', { replace: true })
  }, [member])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSendOTP() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }
    setLoading(true)
    setErrors({})
    try {
      await http.post('/otp/send', { email: email.trim(), purpose: 'login' })
      setPhase('otp')
      setCountdown(60)
      setInfo(`OTP sent to ${email.trim()}`)
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Failed to send OTP. Please check your email address.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOTP() {
    if (countdown > 0) return
    setLoading(true); setOtp(''); setErrors({})
    try {
      await http.post('/otp/send', { email: email.trim(), purpose: 'login' })
      setCountdown(60)
      setInfo('A new OTP has been sent to your email.')
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Failed to resend OTP.' })
    } finally { setLoading(false) }
  }

  async function handleVerify() {
    if (otp.length !== 6) { setErrors({ otp: 'Please enter the 6-digit OTP' }); return }
    setLoading(true); setErrors({})
    try {
      const res = await http.post('/otp/verify', { email: email.trim(), otp, purpose: 'login' })
      login(res.data.data.token, res.data.data.member)
      navigate('/member/dashboard', { replace: true })
    } catch (err) {
      setErrors({ otp: err.response?.data?.message || 'Invalid OTP. Please try again.' })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Back to homepage */}
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-600 text-sm mb-6 transition">
          <ArrowLeft size={16}/> Back to Homepage
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-900 p-8 text-white text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {phase === 'otp' ? <ShieldCheck size={28}/> : <LogIn size={28}/>}
            </div>
            <h1 className="text-2xl font-black">Member Login</h1>
            <p className="text-primary-200 text-sm mt-1">
              {phase === 'email' ? 'Sign in to your member dashboard' : 'Enter the OTP sent to your email'}
            </p>
          </div>

          {/* Body */}
          <div className="p-8">

            {/* Email phase */}
            {phase === 'email' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <p className="font-medium mb-1">Passwordless Login</p>
                  <p className="text-blue-600 text-xs">We'll send a one-time password to your registered email address. No password needed.</p>
                </div>
                <div>
                  <label className="label flex items-center gap-1.5"><Mail size={14}/> Registered Email Address</label>
                  <input className="input" type="email" placeholder="member@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors({}) }}
                    onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors.email}</p>}
                </div>
                {errors._global && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5"/>{errors._global}
                  </div>
                )}
                <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full btn-lg">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>Sending OTP…</> : 'Send Login OTP'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  Not a member yet?{' '}
                  <button onClick={() => navigate('/membership')} className="text-primary-600 hover:underline font-medium">Apply for Membership</button>
                </p>
              </div>
            )}

            {/* OTP phase */}
            {phase === 'otp' && (
              <div className="space-y-5">
                {info && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 size={14}/>{info}
                  </div>
                )}
                <div className="text-center space-y-1">
                  <p className="text-sm text-gray-600">OTP sent to</p>
                  <p className="font-semibold text-gray-900">{email}</p>
                  <p className="text-xs text-gray-400">This OTP is valid for 10 minutes</p>
                </div>
                <OTPInput value={otp} onChange={v => { setOtp(v); setErrors(e => ({...e, otp:''})) }} disabled={loading}/>
                {errors.otp && (
                  <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1">
                    <AlertCircle size={12}/>{errors.otp}
                  </p>
                )}
                <button onClick={handleVerify} disabled={loading || otp.length !== 6} className="btn-primary w-full btn-lg">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>Verifying…</> : 'Login to Dashboard'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => { setPhase('email'); setOtp(''); setErrors({}) }}
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
    </div>
  )
}
