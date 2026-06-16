import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, ChevronDown, ChevronRight, Save, Eye, EyeOff, Send } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

export default function SmtpSettingsPage() {
  const queryClient = useQueryClient()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isTestEmailLoading, setIsTestEmailLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    MAIL_FROM: '',
    MAIL_USER: '',
    MAIL_PASS: '',
    MAIL_HOST: '',
    MAIL_PORT: ''
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(res => res.data.data)
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        MAIL_FROM: settings.MAIL_FROM || '',
        MAIL_USER: settings.MAIL_USER || '',
        MAIL_PASS: settings.MAIL_PASS || '',
        MAIL_HOST: settings.MAIL_HOST || '',
        MAIL_PORT: settings.MAIL_PORT || ''
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data) => api.put('/settings', data),
    onSuccess: () => {
      toast.success('SMTP settings saved successfully')
      queryClient.invalidateQueries(['settings'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    }
  })

  const handleSave = (e) => {
    e.preventDefault()
    // When saving from the main panel, make MAIL_USER match MAIL_FROM if it's typical Gmail
    // Wait, the UI only has "Sending Email Address" and "Email / App Password".
    // "Sending Email Address" = apimails1@gmail.com
    // So both MAIL_FROM and MAIL_USER should be set to this.
    const payload = {
      MAIL_FROM: formData.MAIL_FROM,
      MAIL_USER: formData.MAIL_FROM, // As per UI, it's a single email field
      MAIL_PASS: formData.MAIL_PASS,
      MAIL_HOST: formData.MAIL_HOST || 'smtp.gmail.com',
      MAIL_PORT: formData.MAIL_PORT || '587'
    }
    saveMutation.mutate(payload)
  }

  const handleTestEmail = async () => {
    const testTo = window.prompt("Enter an email address to send the test email to:")
    if (!testTo) return

    setIsTestEmailLoading(true)
    try {
      await api.post('/settings/test-email', { to: testTo })
      toast.success('Test email sent successfully! Please check your inbox.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email')
    } finally {
      setIsTestEmailLoading(false)
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>
  }

  const isSecure = formData.MAIL_PORT === '465'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">SMTP Email Delivery</h2>
              <p className="text-sm text-gray-500">Used to send invoices and credentials to clients</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Info size={20} />
          </button>
        </div>

        <div className="mt-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 text-sm text-blue-800 mb-6">
            <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
            <p>
              Enter your email and app password. SMTP host and port are auto-configured by the system. For Gmail, create an <strong>App Password</strong> instead of using your regular password.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sending Email Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Sending Email Address
                </label>
                <input
                  type="email"
                  value={formData.MAIL_FROM}
                  onChange={(e) => setFormData({ ...formData, MAIL_FROM: e.target.value })}
                  placeholder="apimails1@gmail.com"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  The email that will appear as 'From' in all emails
                </p>
              </div>

              {/* Email / App Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email / App Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.MAIL_PASS}
                    onChange={(e) => setFormData({ ...formData, MAIL_PASS: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Section Toggle */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none"
              >
                {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Advanced: Custom SMTP Host & Port
              </button>
            </div>

            {/* Advanced Fields */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 pb-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={formData.MAIL_HOST}
                    onChange={(e) => setFormData({ ...formData, MAIL_HOST: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    Leave blank to auto-detect from email domain
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={formData.MAIL_PORT}
                    onChange={(e) => setFormData({ ...formData, MAIL_PORT: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">
                    587 (TLS) or 465 (SSL)
                  </p>
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSecure}
                      onChange={(e) => setFormData({ ...formData, MAIL_PORT: e.target.checked ? '465' : '587' })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Use secure SSL/TLS (port 465)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestEmailLoading || !formData.MAIL_FROM || !formData.MAIL_PASS}
                className="px-5 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestEmailLoading ? 'Sending...' : 'Send Test Email'}
              </button>
              
              <button
                type="submit"
                disabled={saveMutation.isLoading}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saveMutation.isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
