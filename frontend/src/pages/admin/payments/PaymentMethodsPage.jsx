import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, X, Check, QrCode, Globe, Loader2, Building2, Copy } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

const METHOD_TYPES = [
  { value: 'upi',                 label: 'UPI',               icon: '📱' },
  { value: 'bank_transfer',      label: 'Bank Transfer',     icon: '🏦' },
  { value: 'international_wire', label: 'International Wire', icon: '🌐' },
  { value: 'cash',               label: 'Cash',              icon: '💵' },
  { value: 'cheque',             label: 'Cheque',            icon: '📝' },
  { value: 'other',              label: 'Other',             icon: '💳' },
]

const EMPTY = {
  name: '', type: 'upi',
  account_name: '', bank_name: '', account_number: '', ifsc_code: '', upi_id: '', swift_code: '',
  iban: '', bank_address: '',
  instructions: '', is_active: 1, is_default: 0, sort_order: 0, location: '', country_code: '', country_name: '',
}

function MethodModal({ method, onClose, onSave, saving }) {
  const [d, setD] = useState(() => method
    ? { ...EMPTY, ...method, location: method.location ?? '', country_code: method.country_code ?? '', country_name: method.country_name ?? '', is_default: method.is_default ?? 0 }
    : { ...EMPTY }
  )
  const [qrFile, setQrFile]    = useState(null)
  const [qrPreview, setQrPrev] = useState(method?.qr_image ? `/${method.qr_image}` : null)
  const qrRef = useRef()
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))

  const { data: countries = [] } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => api.get('/locations/countries').then(r => r.data.data || []),
    enabled: d.location === 'overseas',
  })

  function handleQr(e) {
    const file = e.target.files[0]
    if (!file) return
    setQrFile(file)
    setQrPrev(URL.createObjectURL(file))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...d, _qrFile: qrFile })
  }

  const isUPI  = d.type === 'upi'
  const isBank = ['bank_transfer', 'international_wire', 'cheque'].includes(d.type)
  const isIntl = d.type === 'international_wire'

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="card-header sticky top-0 bg-white z-10 border-b">
          <h3 className="font-semibold">{method ? 'Edit Payment Method' : 'New Payment Method'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <form className="card-body space-y-5" onSubmit={handleSubmit}>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Method Name *</label>
              <input className="input" required value={d.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. HDFC Bank Transfer, GPay UPI" />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" value={d.type} onChange={e => set('type', e.target.value)}>
                {METHOD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Account / Holder Name</label>
              <input className="input" value={d.account_name || ''}
                onChange={e => set('account_name', e.target.value)}
                placeholder="FORTI Foundation" />
            </div>
          </div>

          {/* UPI Fields */}
          {isUPI && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">UPI Details</p>
              <div>
                <label className="label">UPI ID *</label>
                <input className="input font-mono" value={d.upi_id || ''}
                  onChange={e => set('upi_id', e.target.value)}
                  placeholder="fortifoundation@sbi" />
              </div>
            </div>
          )}

          {/* Bank Fields */}
          {isBank && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Bank Account Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={d.bank_name || ''}
                    onChange={e => set('bank_name', e.target.value)}
                    placeholder="HDFC Bank" />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input className="input font-mono" value={d.account_number || ''}
                    onChange={e => set('account_number', e.target.value)}
                    placeholder="1234567890123" />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input className="input font-mono" value={d.ifsc_code || ''}
                    onChange={e => set('ifsc_code', e.target.value.toUpperCase())}
                    placeholder="HDFC0001234" maxLength={11} />
                </div>
                {isIntl && (
                  <div>
                    <label className="label">SWIFT / BIC Code</label>
                    <input className="input font-mono" value={d.swift_code || ''}
                      onChange={e => set('swift_code', e.target.value.toUpperCase())}
                      placeholder="HDFCINBB" maxLength={11} />
                  </div>
                )}
              </div>
              {isIntl && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">IBAN <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="input font-mono" value={d.iban || ''}
                      onChange={e => set('iban', e.target.value.toUpperCase())}
                      placeholder="GB29NWBK60161331926819" maxLength={50} />
                  </div>
                  <div>
                    <label className="label">Bank Address <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="input" value={d.bank_address || ''}
                      onChange={e => set('bank_address', e.target.value)}
                      placeholder="123 Bank St, Mumbai, India" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div>
            <label className="label">Payment Instructions</label>
            <textarea className="input text-sm" rows={4}
              placeholder="These instructions appear to the member during the payment step..."
              value={d.instructions || ''}
              onChange={e => set('instructions', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Shown to members at the payment step of their application.</p>
          </div>

          {/* QR Code */}
          <div>
            <label className="label">QR Code Image <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="flex items-center gap-4">
              {qrPreview ? (
                <div className="relative w-24 h-24 shrink-0">
                  <img src={qrPreview} alt="QR" className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1" />
                  <button type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    onClick={() => { setQrFile(null); setQrPrev(null); set('qr_image', null) }}>
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => qrRef.current?.click()}>
                  <QrCode size={22} />
                  <span className="text-xs mt-1">Upload</span>
                </div>
              )}
              <div>
                <button type="button" className="btn-outline btn-sm" onClick={() => qrRef.current?.click()}>
                  {qrPreview ? 'Replace QR Code' : 'Upload QR Code'}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG or JPG — shown to members for scanning</p>
              </div>
            </div>
            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQr} />
          </div>

          {/* Location */}
          <div>
            <label className="label">Region <span className="text-gray-400 font-normal">(leave blank for General fallback)</span></label>
            <select className="input" value={d.location}
              onChange={e => { set('location', e.target.value); if (e.target.value !== 'overseas') { set('country_code', ''); set('country_name', '') } }}>
              <option value="">🛡️ General (fallback)</option>
              <option value="rajasthan">Rajasthan</option>
              <option value="other_states">Other States</option>
              <option value="overseas">Overseas</option>
            </select>
          </div>

          {/* Country (for Overseas) */}
          {d.location === 'overseas' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Country Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Country</label>
                  <select className="input" value={d.country_code || ''}
                    onChange={e => {
                      const c = countries.find(c => (c.iso2 || c.iso_code) === e.target.value)
                      set('country_code', e.target.value)
                      set('country_name', c ? c.name : '')
                    }}>
                    <option value="">All overseas countries (default)</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.iso2 || c.iso_code}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Leave blank for a default overseas method.</p>
                </div>
                <div>
                  <label className="label">Country Name</label>
                  <input className="input" value={d.country_name || ''}
                    onChange={e => set('country_name', e.target.value)}
                    placeholder="Auto-filled from selection" />
                </div>
              </div>
            </div>
          )}

          {/* Sort / Status */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Sort Order</label>
              <input className="input" type="number" min="0" value={d.sort_order}
                onChange={e => set('sort_order', e.target.value)} />
            </div>
            <div className="space-y-2 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary-600"
                  checked={!!d.is_active}
                  onChange={e => set('is_active', e.target.checked ? 1 : 0)} />
                <span className="text-sm text-gray-700 font-medium">Active (visible to members)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-amber-500"
                  checked={!!d.is_default}
                  onChange={e => set('is_default', e.target.checked ? 1 : 0)} />
                <span className="text-sm text-gray-700 font-medium">Default fallback method</span>
              </label>
              <p className="text-xs text-gray-400">Default methods appear when no region-specific method is found.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {method ? 'Save Changes' : 'Create Method'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

function MethodDetail({ m }) {
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success('Copied!') }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {m.bank_name      && <span className="flex items-center gap-1"><Building2 size={10}/>{m.bank_name}</span>}
      {m.account_number && <span className="font-mono cursor-pointer hover:text-primary-600" onClick={() => copy(m.account_number)} title="Click to copy">Acc: {m.account_number}</span>}
      {m.ifsc_code      && <span className="font-mono cursor-pointer hover:text-primary-600" onClick={() => copy(m.ifsc_code)} title="Click to copy">IFSC: {m.ifsc_code}</span>}
      {m.swift_code     && <span className="font-mono cursor-pointer hover:text-primary-600" onClick={() => copy(m.swift_code)} title="Click to copy">SWIFT: {m.swift_code}</span>}
      {m.upi_id         && <span className="font-mono cursor-pointer hover:text-primary-600" onClick={() => copy(m.upi_id)} title="Click to copy">UPI: {m.upi_id}</span>}
      {!m.bank_name && !m.upi_id && !m.account_number && <span className="text-gray-300">—</span>}
    </div>
  )
}

export default function PaymentMethodsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods-admin'],
    queryFn: () => api.get('/payments/methods').then(r => r.data.data),
  })

  const saveMut = useMutation({
    mutationFn: ({ data, id }) => {
      const fd = new FormData()
      const { _qrFile, ...rest } = data
      Object.entries(rest).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
      if (_qrFile) fd.append('qr_image', _qrFile)
      return id
        ? api.put(`/payments/methods/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/payments/methods', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['payment-methods-admin'])
      qc.invalidateQueries(['pkg-payment-methods'])
      toast.success(vars.id ? 'Method updated' : 'Method created')
      setShowModal(false); setEditing(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/payments/methods/${id}`),
    onSuccess: () => { qc.invalidateQueries(['payment-methods-admin']); toast.success('Method deactivated') },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const typeMap = Object.fromEntries(METHOD_TYPES.map(t => [t.value, t]))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
          <p className="text-gray-500 text-sm">Configure payment options shown to members during application.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus size={16} /> New Method
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Account / UPI Details</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">QR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin mx-auto"/></td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No payment methods yet. Click + New Method to create one.</td></tr>
              ) : methods.map(m => {
                const t = typeMap[m.type] || { icon: '💳', label: m.type }
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      {m.account_name && <p className="text-xs text-gray-400">{m.account_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {t.icon} {t.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MethodDetail m={m} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.location ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                            {m.location === 'rajasthan' ? '📍 Rajasthan' : m.location === 'other_states' ? '🇮🇳 Other States' : m.location === 'overseas' ? '🌍 Overseas' : '🛡️ General (fallback)'}
                          </span>
                          {m.country_name && <p className="text-xs text-gray-400 mt-0.5">{m.country_name}</p>}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Globe size={12}/>General (fallback)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.qr_image ? (
                        <img src={`/${m.qr_image}`} alt="QR" className="w-10 h-10 object-contain rounded border border-gray-200 bg-white" />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${m.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="btn-outline btn-sm" title="Edit" onClick={() => { setEditing(m); setShowModal(true) }}>
                          <Edit size={13} />
                        </button>
                        <button className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg px-2" title="Deactivate"
                          onClick={() => { if (window.confirm('Deactivate this payment method?')) deleteMut.mutate(m.id) }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Payment Workflow</p>
        <p className="text-xs text-blue-600">
          Application → Approval → <strong>Plan &amp; Payment Method shown to member</strong> → Member pays &amp; uploads proof →
          Admin reviews &amp; verifies → <strong>Member Activated</strong> → Certificate Generated
        </p>
      </div>

      {showModal && (
        <MethodModal
          method={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          saving={saveMut.isPending}
          onSave={data => saveMut.mutate({ data, id: editing?.id })}
        />
      )}
    </div>
  )
}
