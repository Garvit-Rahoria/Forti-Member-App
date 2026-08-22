import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { SITE_LOGO } from '../../data/siteAssets'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { token: tokenParam } = useParams()
  const [searchParams] = useSearchParams()
  // Support both /reset-password/:token (path param) and /reset-password?token= (query param)
  const token = tokenParam || searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link')
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
      toast.success('Password updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-100 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <img
              src={SITE_LOGO}
              alt="FORTI"
              className="h-auto w-auto max-h-14 max-w-[200px] object-contain mx-auto mb-4"
              onError={e => { e.target.style.display = 'none' }}
            />
            <h1 className="text-2xl font-bold text-gray-900">FORTI Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Set New Password</p>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-sm text-gray-700 font-medium">Password updated successfully!</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Confirm New Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </span>
                ) : 'Set New Password'}
              </button>
              <button type="button" onClick={() => navigate('/login')} className="btn-outline w-full text-sm">
                Back to Sign In
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            FORTI Membership Management System © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
