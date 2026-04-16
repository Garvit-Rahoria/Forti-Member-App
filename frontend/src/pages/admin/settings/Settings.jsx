import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Save, Loader2, Globe, Users, CreditCard, Bell, Mail, Upload, Image } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

const CURRENCIES = ['INR', 'USD']
const DURATIONS  = [
  { value: '1_year', label: '1 Year' },
  { value: '2_years', label: '2 Years' },
  { value: '3_years', label: '3 Years' },
  { value: 'lifetime', label: 'Lifetime' },
]

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon size={16} className="text-primary-600" /> {title}
        </h3>
      </div>
      <div className="card-body space-y-4">{children}</div>
    </div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const nav = useNavigate()

  // Individual forms per section so saves are isolated
  const [generalForm, setGeneralForm]       = useState({ portal_name: '', default_currency: 'INR', site_logo: '' })
  const [logoUploading, setLogoUploading]   = useState(false)
  const logoInputRef = useRef(null)
  const [membershipForm, setMembershipForm] = useState({ default_duration: '1_year', renewal_reminder_days: '30' })
  const [paymentForm, setPaymentForm]       = useState({ default_payment_method: '', payment_instructions: '' })
  const [notifForm, setNotifForm]           = useState({ email_notifications_enabled: '1', renewal_reminder_email: '1' })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data),
  })

  useEffect(() => {
    if (!settings) return
    setGeneralForm({
      portal_name:      settings.portal_name      || '',
      default_currency: settings.default_currency || 'INR',
      site_logo:        settings.site_logo || settings.org_logo_url || '',
    })
    setMembershipForm({
      default_duration:       settings.default_duration       || '1_year',
      renewal_reminder_days:  settings.renewal_reminder_days  || '30',
    })
    setPaymentForm({
      default_payment_method: settings.default_payment_method || '',
      payment_instructions:   settings.payment_instructions   || '',
    })
    setNotifForm({
      email_notifications_enabled: settings.email_notifications_enabled ?? '1',
      renewal_reminder_email:      settings.renewal_reminder_email      ?? '1',
    })
  }, [settings])

  const saveMut = useMutation({
    mutationFn: payload => api.put('/settings', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved!')
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving'),
  })

  async function handleLogoUpload(file) {
    if (!file) return
    const fd = new FormData()
    fd.append('logo', file)
    setLogoUploading(true)
    try {
      const res = await api.post('/settings/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data.data?.url || ''
      setGeneralForm(f => ({ ...f, site_logo: url }))
      toast.success('Logo uploaded! Click "Save General Settings" to apply.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {settingsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 size={20} className="animate-spin" /> Loading settings…
        </div>
      ) : (
        <>
          {/* A. General Settings */}
          <SectionCard icon={Globe} title="General Settings">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Portal Name</label>
                <input className="input" value={generalForm.portal_name}
                  onChange={e => setGeneralForm(f => ({ ...f, portal_name: e.target.value }))}
                  placeholder="e.g. FORTI Membership Portal" />
              </div>
              <div>
                <label className="label">Default Currency</label>
                <select className="input" value={generalForm.default_currency}
                  onChange={e => setGeneralForm(f => ({ ...f, default_currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Organisation Logo</label>
                <div className="flex gap-2 items-center">
                  <input className="input flex-1" value={generalForm.site_logo}
                    onChange={e => setGeneralForm(f => ({ ...f, site_logo: e.target.value }))}
                    placeholder="https://example.com/logo.png or upload below" />
                  <button type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="shrink-0 inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition">
                    {logoUploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                    {logoUploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleLogoUpload(e.target.files?.[0])} />
                </div>
                {generalForm.site_logo && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={generalForm.site_logo} alt="Logo preview" className="h-10 max-w-[180px] object-contain rounded border border-gray-200 p-1 bg-white"/>
                    <span className="text-xs text-gray-400">Logo preview</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">This logo appears in all outgoing email templates. Must be a publicly accessible URL.</p>
              </div>
            </div>
            <div>
              <button className="btn-primary flex items-center gap-2"
                onClick={() => saveMut.mutate(generalForm)} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save General Settings
              </button>
            </div>
          </SectionCard>

          {/* B. Membership Settings */}
          <SectionCard icon={Users} title="Membership Settings">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Default Membership Duration</label>
                <select className="input" value={membershipForm.default_duration}
                  onChange={e => setMembershipForm(f => ({ ...f, default_duration: e.target.value }))}>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Renewal Reminder (days before expiry)</label>
                <input className="input" type="number" min={1} max={365}
                  value={membershipForm.renewal_reminder_days}
                  onChange={e => setMembershipForm(f => ({ ...f, renewal_reminder_days: e.target.value }))}
                  placeholder="30" />
              </div>
            </div>
            <div>
              <button className="btn-primary flex items-center gap-2"
                onClick={() => saveMut.mutate(membershipForm)} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Membership Settings
              </button>
            </div>
          </SectionCard>

          {/* D. Notification Settings */}
          <SectionCard icon={Bell} title="Notification Settings">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={notifForm.email_notifications_enabled === '1'}
                  onChange={e => setNotifForm(f => ({ ...f, email_notifications_enabled: e.target.checked ? '1' : '0' }))}
                  className="w-4 h-4 accent-primary-600" />
                <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
                <span className="text-xs text-gray-400">(sends emails on application approval, rejection, payment)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={notifForm.renewal_reminder_email === '1'}
                  onChange={e => setNotifForm(f => ({ ...f, renewal_reminder_email: e.target.checked ? '1' : '0' }))}
                  className="w-4 h-4 accent-primary-600" />
                <span className="text-sm font-medium text-gray-700">Renewal Reminder Emails</span>
                <span className="text-xs text-gray-400">(automatic reminders before membership expiry)</span>
              </label>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="btn-primary flex items-center gap-2"
                onClick={() => saveMut.mutate(notifForm)} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Notification Settings
              </button>
              <button
                className="btn-outline flex items-center gap-2"
                onClick={() => nav('/email-templates')}
              >
                <Mail size={14} /> Manage Email Templates
              </button>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
