import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Info, ChevronDown, ChevronRight, Save, Eye, EyeOff,
  Send, CheckCircle2, XCircle, AlertTriangle, Loader2, Mail
} from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

export default function SmtpSettingsPage() {
  const queryClient = useQueryClient()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [testResult, setTestResult] = useState(null) // { ok: bool, message: string }
  const [isTestLoading, setIsTestLoading] = useState(false)

  const [formData, setFormData] = useState({
    MAIL_FROM: '',
    MAIL_USER: '',
    MAIL_PASS: '',
    MAIL_HOST: '',
    MAIL_PORT: '587',
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(res => res.data.data),
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        MAIL_FROM: settings.MAIL_FROM || '',
        MAIL_USER: settings.MAIL_USER || '',
        MAIL_PASS: settings.MAIL_PASS || '',
        MAIL_HOST: settings.MAIL_HOST || '',
        MAIL_PORT: settings.MAIL_PORT || '587',
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      toast.success('SMTP settings saved successfully')
      setTestResult(null)
      queryClient.invalidateQueries(['settings'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    },
  })

  const handleSave = (e) => {
    e.preventDefault()
    if (!formData.MAIL_FROM) { toast.error('Sending email address is required'); return }
    if (!formData.MAIL_PASS)  { toast.error('App password is required'); return }
    const payload = {
      MAIL_FROM: formData.MAIL_FROM,
      MAIL_USER: formData.MAIL_FROM, // username = sending address
      MAIL_PASS: formData.MAIL_PASS,
      MAIL_HOST: formData.MAIL_HOST || 'smtp.gmail.com',
      MAIL_PORT: formData.MAIL_PORT || '587',
    }
    saveMutation.mutate(payload)
  }

  const handleTestEmail = async () => {
    const to = testEmailAddress.trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error('Enter a valid email address to send the test to')
      return
    }
    setIsTestLoading(true)
    setTestResult(null)
    try {
      await api.post('/settings/test-email', { to })
      setTestResult({ ok: true, message: `Test email sent to ${to}. Please check your inbox (and spam folder).` })
      toast.success('Test email sent!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send test email'
      setTestResult({ ok: false, message: msg })
      toast.error(msg)
    } finally {
      setIsTestLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  const isConfigured = !!(formData.MAIL_FROM && formData.MAIL_PASS)
  const isSecure = formData.MAIL_PORT === '465'

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Send size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">SMTP Email Delivery</h2>
          <p className="text-sm text-gray-500">Configure outgoing email for OTP verification and member notifications</p>
        </div>
      </div>

      {/* Status banner */}
      {isConfigured ? (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          SMTP credentials are configured. Use "Send Test Email" below to verify delivery.
        </div>
      ) : (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">SMTP not configured — OTP emails will not be delivered.</p>
            <p className="text-amber-700 mt-0.5">Enter your sending email address and app password below to enable email delivery.</p>
          </div>
        </div>
      )}

      {/* Main form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3.5">
          <h3 className="font-semibold text-gray-800 text-sm">Email Credentials</h3>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start gap-2.5 text-sm text-blue-800">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <p>
              For Gmail, use an <strong>App Password</strong> — not your regular Gmail password.{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-medium">
                Generate App Password →
              </a>
            </p>
          </div>

          {/* Sending email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Sending Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.MAIL_FROM}
              onChange={(e) => setFormData({ ...formData, MAIL_FROM: e.target.value })}
              placeholder="youremail@gmail.com"
              className="input w-full"
              required
            />
            <p className="mt-1.5 text-xs text-gray-400">
              This address appears as "From" in all emails. Also used as the SMTP login username.
            </p>
          </div>

          {/* App password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              App Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.MAIL_PASS}
                onChange={(e) => setFormData({ ...formData, MAIL_PASS: e.target.value })}
                placeholder="••••••••••••••••"
                className="input w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              For Gmail: Settings → Security → 2-Step Verification → App Passwords.
            </p>
          </div>

          {/* Advanced toggle */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              {showAdvanced ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Advanced: Custom SMTP Host &amp; Port
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP Host</label>
                <input
                  type="text"
                  value={formData.MAIL_HOST}
                  onChange={(e) => setFormData({ ...formData, MAIL_HOST: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-400">Leave blank to auto-detect from email domain</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">SMTP Port</label>
                <input
                  type="text"
                  value={formData.MAIL_PORT}
                  onChange={(e) => setFormData({ ...formData, MAIL_PORT: e.target.value })}
                  placeholder="587"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-gray-400">587 (TLS) or 465 (SSL)</p>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSecure}
                    onChange={(e) => setFormData({ ...formData, MAIL_PORT: e.target.checked ? '465' : '587' })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
                </label>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={saveMutation.isLoading}
              className="btn-primary flex items-center gap-2 px-6"
            >
              {saveMutation.isLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saveMutation.isLoading ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Test Email */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3.5 flex items-center gap-2">
          <Mail size={15} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Send Test Email</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            After saving your credentials, send a test email to verify that OTP delivery is working correctly.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => { setTestEmailAddress(e.target.value); setTestResult(null) }}
              placeholder="your@email.com"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isTestLoading || !testEmailAddress}
              className="btn-outline flex items-center gap-2 px-4 shrink-0 disabled:opacity-50"
            >
              {isTestLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isTestLoading ? 'Sending…' : 'Send Test'}
            </button>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
              testResult.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {testResult.ok
                ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
              <div>
                <p>{testResult.message}</p>
                {testResult.ok && (
                  <p className="text-xs mt-1 text-emerald-600">
                    Check your <strong>Inbox</strong> and <strong>Spam/Junk</strong> folder.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Setup guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">Gmail Setup Guide</h4>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Enable <strong>2-Step Verification</strong> on your Google account.</li>
          <li>Go to <strong>Google Account → Security → App Passwords</strong>.</li>
          <li>Create an App Password for "Mail" / "Other" and copy the 16-character code.</li>
          <li>Enter your Gmail address as the Sending Email and paste the App Password above.</li>
          <li>Save Settings, then use "Send Test Email" to confirm delivery.</li>
        </ol>
        <p className="text-xs text-gray-400 pt-1">
          For other providers (Outlook, Zoho, SendGrid, etc.) — use their SMTP credentials and enable the Advanced section to set the correct host and port.
        </p>
      </div>

    </div>
  )
}
