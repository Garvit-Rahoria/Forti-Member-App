import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, token, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: import.meta.env.DEV ? 'admin@forti.org' : '',
    password: import.meta.env.DEV ? 'Admin@12345' : '',
  })
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // Already logged in → go straight to dashboard
  useEffect(() => {
    if (!authLoading && token) {
      navigate('/dashboard', { replace: true })
    }
  }, [token, authLoading, navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async e => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
              F
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FORTI Portal</h1>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'forgot' ? 'Reset your password' : 'Super Admin Panel'}
            </p>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@forti.org"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password</label>
                  <button type="button" onClick={() => { setMode('forgot'); setForgotEmail(form.email); setForgotSent(false) }}
                    className="text-xs text-primary-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full btn-lg mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          ) : forgotSent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="text-sm text-gray-700">
                If <strong>{forgotEmail}</strong> is registered, you will receive a password reset link shortly.
              </p>
              <p className="text-xs text-gray-400">Check your inbox and spam folder. The link expires in 1 hour.</p>
              <button onClick={() => setMode('login')} className="btn-outline w-full">
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-sm text-gray-600">Enter your admin email address and we'll send you a reset link.</p>
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@forti.org"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={forgotLoading}>
                {forgotLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </span>
                ) : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setMode('login')} className="btn-outline w-full">
                Back to Sign In
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            FORTI Membership Management System © {new Date().getFullYear()}
          </p>
          <div className="text-center mt-3">
            <a href="/" className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
