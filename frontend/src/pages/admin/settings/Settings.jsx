import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Loader2, Settings2, Shield, LogOut } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import WingsPositionsSettings from './WingsPositionsSettings'
import {
  AdminLogoutConfirmModal,
  useAdminLogoutConfirm,
} from '../../../components/admin/AdminLogoutConfirm'

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
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { confirmAndLogout, panelLabel } = useAdminLogoutConfirm()

  const [form, setForm] = useState({
    otp_expiry_time:        '10',
    max_file_size_mb:       '5',
    allowed_file_types:     'jpg,jpeg,png,pdf',
    payment_proof_required: '1',
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data),
  })

  useEffect(() => {
    if (!settings) return
    setForm({
      otp_expiry_time:        settings.otp_expiry_time        || '10',
      max_file_size_mb:       settings.max_file_size_mb       || '5',
      allowed_file_types:     settings.allowed_file_types     || 'jpg,jpeg,png,pdf',
      payment_proof_required: settings.payment_proof_required ?? '1',
    })
  }, [settings])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveMut = useMutation({
    mutationFn: payload => api.put('/settings', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved!')
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving'),
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {settingsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
          <Loader2 size={20} className="animate-spin" /> Loading settings...
        </div>
      ) : (
        <SectionCard icon={Settings2} title="System Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">OTP Expiry Time (minutes)</label>
              <input className="input" type="number" min={1} max={60}
                value={form.otp_expiry_time}
                onChange={e => set('otp_expiry_time', e.target.value)}
                placeholder="10" />
              <p className="text-xs text-gray-400 mt-1">Minutes before a verification OTP expires.</p>
            </div>
            <div>
              <label className="label">Max File Upload Size (MB)</label>
              <input className="input" type="number" min={1} max={50}
                value={form.max_file_size_mb}
                onChange={e => set('max_file_size_mb', e.target.value)}
                placeholder="5" />
              <p className="text-xs text-gray-400 mt-1">Maximum size for uploaded documents and screenshots.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Allowed File Types</label>
              <input className="input" value={form.allowed_file_types}
                onChange={e => set('allowed_file_types', e.target.value)}
                placeholder="jpg,jpeg,png,pdf" />
              <p className="text-xs text-gray-400 mt-1">Comma-separated extensions (e.g. jpg,png,pdf).</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={form.payment_proof_required === '1'}
                onChange={e => set('payment_proof_required', e.target.checked ? '1' : '0')}
                className="w-4 h-4 accent-primary-600" />
              <span className="text-sm font-medium text-gray-700">Payment Proof Required</span>
              <span className="text-xs text-gray-400">(applicants must upload a payment screenshot)</span>
            </label>
          </div>
          <div>
            <button className="btn-primary flex items-center gap-2"
              onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Settings
            </button>
          </div>
        </SectionCard>
      )}

      <SectionCard icon={Settings2} title="Wings & positions">
        <WingsPositionsSettings />
      </SectionCard>

      {/* Account & Security — separate from System Settings / Wings */}
      <SectionCard icon={Shield} title="Account & Security">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50/40 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Logout</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Sign out from your Super Admin account
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </SectionCard>

      <AdminLogoutConfirmModal
        open={logoutOpen}
        panelLabel={panelLabel}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          confirmAndLogout()
        }}
      />
    </div>
  )
}
