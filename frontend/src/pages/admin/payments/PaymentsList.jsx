import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, Search, Plus, Edit, Trash2, CreditCard, Banknote,
  Globe, Smartphone, ToggleLeft, ToggleRight, Eye, FileText, Download,
  Receipt, ShieldCheck, X, Loader2, ExternalLink, MoreVertical, ArrowRightLeft,
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { fmtAmount } from '../../../utils/currency'
import { DatePicker } from '../../../components/DatePicker'
import { assetUrl as resolveAssetUrl } from '../../../utils/assetUrl'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const LOCATIONS = [
  { value: 'rajasthan',    label: 'Rajasthan' },
  { value: 'other_states', label: 'Other States' },
  { value: 'overseas',     label: 'Overseas' },
];

const LOC_BADGE = {
  rajasthan:    'bg-orange-100 text-orange-700',
  other_states: 'bg-blue-100 text-blue-700',
  overseas:     'bg-green-100 text-green-700',
}

const DROPDOWN_OFFSET = 4

function getDropdownViewportBounds(node) {
  let parent = node?.parentElement

  while (parent) {
    const style = window.getComputedStyle(parent)
    const isScrollable = /(auto|scroll|overlay)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight

    if (isScrollable) {
      const rect = parent.getBoundingClientRect()
      return {
        top: Math.max(rect.top, 8),
        bottom: Math.min(rect.bottom, window.innerHeight - 8),
      }
    }

    parent = parent.parentElement
  }

  return { top: 8, bottom: window.innerHeight - 8 }
}

function useDropdownPlacement(open, anchorRef, menuRef) {
  const [openUpward, setOpenUpward] = useState(false)

  useEffect(() => {
    if (!open) {
      setOpenUpward(false)
      return
    }

    function updatePlacement() {
      if (!anchorRef.current || !menuRef.current) return

      const anchorRect = anchorRef.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const bounds = getDropdownViewportBounds(anchorRef.current)
      const spaceBelow = bounds.bottom - anchorRect.bottom
      const spaceAbove = anchorRect.top - bounds.top
      const needsUpward = spaceBelow < menuRect.height + DROPDOWN_OFFSET && spaceAbove > spaceBelow

      setOpenUpward(needsUpward)
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)

    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, anchorRef, menuRef])

  return openUpward
}

// ── Payment Method type helpers ───────────────────────────────────────────────
const TYPE_LABELS = {
  upi:                { label: 'UPI',              icon: <Smartphone size={14}/>,  color: 'bg-purple-100 text-purple-700' },
  bank_transfer:      { label: 'Bank Transfer',    icon: <Banknote size={14}/>,    color: 'bg-blue-100 text-blue-700' },
  international_wire: { label: 'International Wire', icon: <Globe size={14}/>,     color: 'bg-cyan-100 text-cyan-700' },
  cash:               { label: 'Cash',             icon: <Banknote size={14}/>,    color: 'bg-green-100 text-green-700' },
  cheque:             { label: 'Cheque',           icon: <CreditCard size={14}/>,  color: 'bg-yellow-100 text-yellow-700' },
  other:              { label: 'Other',            icon: <CreditCard size={14}/>,  color: 'bg-gray-100 text-gray-600' },
}

// ── Payment View Modal ────────────────────────────────────────────────────────
function PaymentViewModal({ payment, onClose, onVerify, onReject, verifyPending }) {
  const [notes, setNotes] = useState('')
  if (!payment) return null
  const screenshotSrc = resolveAssetUrl(payment.screenshot_url || payment.screenshot_path)

  const statusColors = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const STATUS_LABELS = {
    pending:   'Under Review',
    approved:  'Paid (Approved)',
    rejected:  'Rejected',
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Payment Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="card-body space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColors[payment.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[payment.status] || payment.status}
            </span>
          </div>

          {/* Member */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Member</span>
              <span className="font-medium text-gray-900">{payment.applicant_name || payment.member_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-700">{payment.applicant_email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Membership ID</span>
              <span className="font-mono font-bold text-primary-700">{payment.membership_id || '—'}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono text-xs text-gray-700">{payment.transaction_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-green-700">{fmtAmount(payment.amount, payment.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Credited in INR</span>
              {payment.currency === 'INR'
                ? <span className="font-semibold text-emerald-700">₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                : payment.credited_inr_amount
                  ? <span className="font-semibold text-emerald-700">₹{Number(payment.credited_inr_amount).toLocaleString('en-IN')}</span>
                  : <span className="text-gray-500 text-xs italic">Not yet credited</span>
              }
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="text-gray-700">{payment.method_name || '—'}</span>
            </div>
            {payment.package_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Package / Plan</span>
                <span className="text-gray-700">{payment.package_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="text-gray-700">{payment.created_at ? new Date(payment.created_at).toLocaleString() : '—'}</span>
            </div>
            {payment.verified_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">{payment.status === 'verified' ? 'Verified' : 'Reviewed'} On</span>
                <span className="text-gray-700">{new Date(payment.verified_at).toLocaleString()}</span>
              </div>
            )}
            {payment.verified_by_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reviewed By</span>
                <span className="text-gray-700">{payment.verified_by_name}</span>
              </div>
            )}
          </div>
          {/* Rejection notes */}
          {payment.status === 'rejected' && payment.notes && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-600 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{payment.notes}</p>
            </div>
          )}

          {/* Screenshot */}
          {screenshotSrc && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Payment Screenshot</p>
              <a href={screenshotSrc} target="_blank" rel="noreferrer">
                <img src={screenshotSrc} alt="Payment screenshot"
                  className="max-h-48 rounded-xl border border-gray-200 object-contain hover:opacity-90 transition"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }} />
              </a>
            </div>
          )}

          {/* Notes for verify action */}
          {payment.status === 'pending' && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <textarea className="input text-sm" rows={2} placeholder="Add notes (optional)…"
                value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  disabled={verifyPending}
                  onClick={() => onVerify(payment.id, notes)}>
                  {verifyPending ? <Loader2 size={14} className="animate-spin"/> : <ShieldCheck size={14}/>}
                  Approve Payment
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 text-sm font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  disabled={verifyPending}
                  onClick={() => onReject(payment.id, notes)}>
                  <XCircle size={14}/> Reject
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Payment Method Modal (Add / Edit) ─────────────────────────────────────────
function MethodModal({ method, onClose, onSave }) {
  const [data, setData] = useState(method || {
    name: '', type: 'upi', instructions: '', sort_order: 0, is_active: 1, location: '',
  })
  const [qrFile, setQrFile] = useState(null)

  const handleSubmit = e => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ''))
    if (qrFile) fd.append('qr_image', qrFile)
    onSave(fd)
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{method ? 'Edit Payment Method' : 'Add Payment Method'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="card-body space-y-4" onSubmit={handleSubmit}>
          {/* Location */}
          <div>
            <label className="label">Region <span className="text-gray-400 font-normal">(leave blank for General fallback)</span></label>
            <select className="input" value={data.location || ''} onChange={e => setData(d => ({ ...d, location: e.target.value }))}>
              <option value="">🛡️ General (fallback)</option>
              {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Assign to a specific region, or leave blank for General fallback.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Method Name *</label>
              <input className="input" required placeholder="e.g. FORTI UPI Payment"
                value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" value={data.type} onChange={e => setData(d => ({ ...d, type: e.target.value }))}>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                <option value="international_wire">International Wire</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque / DD</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Display Order</label>
              <input type="number" className="input" min="0" value={data.sort_order}
                onChange={e => setData(d => ({ ...d, sort_order: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Instructions / Details</label>
            <textarea className="input" rows={4}
              placeholder="UPI ID: forti@upi&#10;Account No: 1234567890&#10;IFSC: FORT0000001&#10;Bank: FORTI Bank, Mumbai&#10;&#10;After payment, upload screenshot below."
              value={data.instructions || ''} onChange={e => setData(d => ({ ...d, instructions: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">This text appears to applicants during payment. Include UPI ID, account numbers, bank name, IFSC, etc.</p>
          </div>

          <div>
            <label className="label">QR Code Image (optional)</label>
            <input type="file" accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              onChange={e => setQrFile(e.target.files[0])} />
            {method?.qr_image && !qrFile && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Current QR:</p>
                <img src={`/${method.qr_image}`} alt="QR Code" className="w-20 h-20 object-contain border border-gray-200 rounded" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!data.is_active} className="w-4 h-4"
                onChange={e => setData(d => ({ ...d, is_active: e.target.checked ? 1 : 0 }))} />
              Active (visible to applicants)
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" className="btn-primary flex-1">Save Method</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Payment Methods Tab ───────────────────────────────────────────────────────
function PaymentMethodsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods-admin'],
    queryFn: () => api.get('/payments/methods').then(r => r.data.data || []),
  })

  const saveMut = useMutation({
    mutationFn: ({ id, fd }) => id
      ? api.put(`/payments/methods/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post('/payments/methods', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { qc.invalidateQueries(['payment-methods-admin']); toast.success('Saved!'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error saving'),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active, method }) => {
      const fd = new FormData()
      Object.entries({ ...method, is_active: is_active ? 1 : 0 }).forEach(([k, v]) => fd.append(k, v ?? ''))
      return api.put(`/payments/methods/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { qc.invalidateQueries(['payment-methods-admin']); toast.success('Updated') },
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/payments/methods/${id}`),
    onSuccess: () => { qc.invalidateQueries(['payment-methods-admin']); toast.success('Deactivated') },
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{methods.length} payment method{methods.length !== 1 ? 's' : ''} configured. Active methods appear to applicants during checkout.</p>
        <button className="btn-primary btn-sm" onClick={() => setModal('new')}>
          <Plus size={14} /> Add Method
        </button>
      </div>

      {methods.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium mb-1">No payment methods configured</p>
          <p className="text-sm mb-4">Add payment methods so applicants can pay during membership registration.</p>
          <button className="btn-primary" onClick={() => setModal('new')}><Plus size={16} /> Add First Method</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {methods.map(m => {
          const typeInfo = TYPE_LABELS[m.type] || TYPE_LABELS.other
          return (
            <div key={m.id} className={`card p-5 relative ${!m.is_active ? 'opacity-60' : ''}`}>
              {/* Active toggle */}
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-primary-600 transition-colors"
                title={m.is_active ? 'Click to deactivate' : 'Click to activate'}
                onClick={() => toggleMut.mutate({ id: m.id, is_active: !m.is_active, method: m })}>
                {m.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
              </button>

              <div className="flex items-start gap-3 pr-8">
                {m.qr_image ? (
                  <img src={`/${m.qr_image}`} alt="QR" className="w-12 h-12 object-contain rounded-lg border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                    {typeInfo.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{m.name}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.location ? (LOC_BADGE[m.location] || 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-500'}`}>
                      {m.location ? (LOCATIONS.find(l => l.value === m.location)?.label || m.location) : '🛡️ General (fallback)'}
                    </span>
                  </div>
                </div>
              </div>

              {m.instructions && (
                <p className="text-xs text-gray-500 mt-3 line-clamp-3 whitespace-pre-line bg-gray-50 rounded-lg p-2.5">
                  {m.instructions}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-400">Priority: {m.sort_order}</span>
                <div className="flex gap-1">
                  <button className="btn-outline btn-sm" onClick={() => setModal(m)}>
                    <Edit size={12} /> Edit
                  </button>
                  <button className="btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-2 transition-colors"
                    onClick={() => { if (confirm(`Deactivate "${m.name}"?`)) deleteMut.mutate(m.id) }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <MethodModal
          method={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={fd => saveMut.mutate({ id: modal !== 'new' ? modal.id : null, fd })}
        />
      )}
    </div>
  )
}

// ── Credit in INR Modal ─────────────────────────────────────────────────────
const DEFAULT_RATES = { USD: 83, AED: 22.6, EUR: 90, GBP: 106, SGD: 61 }

function CreditInrModal({ payment, onClose, onConfirm, pending }) {
  const defaultRate  = DEFAULT_RATES[payment.currency] || 83
  const [rate,  setRate]  = useState(String(defaultRate))
  const [final, setFinal] = useState(() => String(Math.round(Number(payment.amount) * defaultRate)))
  const [notes, setNotes] = useState('')
  const [autoSync, setAutoSync] = useState(true)

  function handleRateChange(v) {
    setRate(v)
    if (autoSync) setFinal(String(Math.round(Number(payment.amount) * Number(v || 0))))
  }
  function handleFinalChange(v) {
    setFinal(v)
    setAutoSync(false)  // user override
  }

  const convertedDisplay = Math.round(Number(payment.amount) * Number(rate || 0))

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-indigo-600"/>
            <h3 className="font-semibold text-gray-900">Credit Payment in INR</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="card-body space-y-4">
          {/* Member info */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Member</span>
              <span className="font-medium text-gray-900">{payment.applicant_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-600 text-xs">{payment.applicant_email || '—'}</span>
            </div>
            {payment.membership_id && (
              <div className="flex justify-between">
                <span className="text-gray-500">Membership ID</span>
                <span className="font-mono font-bold text-primary-700 text-xs">{payment.membership_id}</span>
              </div>
            )}
          </div>

          {/* Original payment details */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Original Payment</p>
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono text-xs text-gray-700">{payment.transaction_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Original Amount</span>
              <span className="font-bold text-gray-900">{fmtAmount(payment.amount, payment.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="text-gray-700">{payment.method_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted</span>
              <span className="text-gray-700">{payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-IN') : '—'}</span>
            </div>
          </div>

          {/* Conversion section */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Convert &amp; Credit in INR</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Exchange Rate (1 {payment.currency} = ₹)</label>
                <input
                  className="input text-sm"
                  type="number"
                  min="0" step="0.01"
                  value={rate}
                  onChange={e => handleRateChange(e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Auto-calculated</label>
                <div className="input bg-gray-100 text-gray-600 text-sm select-none">
                  ₹{convertedDisplay.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div>
              <label className="label text-xs">Final Credited INR Amount <span className="text-gray-400 font-normal">(editable)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                <input
                  className="input pl-6 text-sm font-semibold"
                  type="number"
                  min="0"
                  value={final}
                  onChange={e => handleFinalChange(e.target.value)}
                />
              </div>
              {!autoSync && (
                <p className="text-[11px] text-amber-600 mt-1">⚠ Manually overridden from auto-calculated value</p>
              )}
            </div>

            <div className="text-xs text-indigo-800 bg-indigo-100 rounded-lg px-3 py-2 space-y-0.5">
              <p>Original: <strong>{fmtAmount(payment.amount, payment.currency)}</strong></p>
              <p>Converted: <strong>₹{convertedDisplay.toLocaleString('en-IN')}</strong></p>
              <p>Final Credit: <strong>₹{Number(final || 0).toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input text-sm" rows={2} placeholder="Add remarks…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={pending || !final || Number(final) <= 0}
              onClick={() => onConfirm({ id: payment.id, credited_inr_amount: final, exchange_rate: rate, notes })}
            >
              {pending && <Loader2 size={13} className="animate-spin" />}
              <ArrowRightLeft size={13} /> Credit &amp; Approve
            </button>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Transaction Action Dropdown ───────────────────────────────────────────────
function TransactionActionMenu({ row, onView, onVerify, onReject, onInvoice, invoiceLoading, verifyPending, onCreditInr }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const openUpward = useDropdownPlacement(open, buttonRef, menuRef)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button ref={buttonRef} onClick={() => setOpen(o => !o)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div ref={menuRef} className={`absolute right-0 z-30 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <Eye size={13} /> View Details
          </button>
          {row.submission_id && (
            <button onClick={() => { setOpen(false); onInvoice() }} disabled={invoiceLoading} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {invoiceLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              Download Invoice
            </button>
          )}
          {row.status === 'pending' && (
            <>
              <div className="border-t border-gray-100 my-1" />
              {row.currency && row.currency !== 'INR' ? (
                <button onClick={() => { setOpen(false); onCreditInr() }} disabled={verifyPending} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                  <ArrowRightLeft size={13} /> Credit in INR &amp; Approve
                </button>
              ) : (
                <button onClick={() => { setOpen(false); onVerify() }} disabled={verifyPending} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50">
                  <ShieldCheck size={13} /> Verify Payment
                </button>
              )}
              <button onClick={() => { setOpen(false); onReject() }} disabled={verifyPending} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                <XCircle size={13} /> Reject Payment
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Payment Action Confirm Modal ──────────────────────────────────────────────
function PaymentActionConfirm({ action, payment, onClose, onConfirm, pending }) {
  const [notes, setNotes] = useState('')
  const isVerify = action === 'verify'
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {isVerify
            ? <ShieldCheck size={18} className="text-green-600" />
            : <XCircle size={18} className="text-red-500" />}
          <h3 className="font-bold text-gray-900">{isVerify ? 'Verify Payment' : 'Reject Payment'}</h3>
        </div>
        <p className="text-sm text-gray-600">
          {isVerify ? 'Approve payment from ' : 'Reject payment from '}
          <strong>{payment.applicant_name}</strong>?
          {isVerify && ' This will activate their membership.'}
        </p>
        <div>
          <label className="label">{isVerify ? 'Notes (optional)' : 'Rejection Reason (optional)'}</label>
          <textarea
            className="input text-sm"
            rows={2}
            placeholder={isVerify ? 'Add admin notes…' : 'Enter reason for rejection…'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(payment.id, notes)}
            disabled={pending}
            className={`flex-1 ${isVerify ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {pending && <Loader2 size={13} className="animate-spin" />}
            {isVerify ? 'Approve' : 'Reject'}
          </button>
          <button className="btn-outline flex-1" onClick={onClose}>Cancel</button>
        </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function daysAgoStr(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function TransactionsTab() {
  const qc = useQueryClient()
  const [q, setQ]                     = useState('')
  const [status, setStatus]           = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFrom, setDateFrom]       = useState(() => daysAgoStr(30))
  const [dateTo, setDateTo]           = useState(() => todayStr())
  const [page, setPage]               = useState(1)
  const [viewPayment, setViewPayment]     = useState(null)
  const [paymentAction, setPaymentAction] = useState(null)  // { type: 'verify'|'reject', payment }
  const [creditInrPayment, setCreditInrPayment] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(null)

  function clearDateFilter() {
    setDateFrom(daysAgoStr(30))
    setDateTo(todayStr())
  }

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { q, status, page }],
    queryFn: () => api.get('/payments', { params: { q, status, page, per_page: 20 } }).then(r => r.data.data),
  })

  const creditInrMut = useMutation({
    mutationFn: ({ id, credited_inr_amount, exchange_rate, notes }) =>
      api.patch(`/payments/${id}/credit-inr`, { credited_inr_amount, exchange_rate, notes }),
    onSuccess: () => {
      qc.invalidateQueries(['payments'])
      qc.invalidateQueries(['approvals-all'])
      qc.invalidateQueries(['approval-counts'])
      toast.success('Payment credited in INR & verified')
      setCreditInrPayment(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Credit action failed'),
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, action, notes }) => api.patch(`/payments/${id}/verify`, { action, notes }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['payments'])
      qc.invalidateQueries(['approvals-all'])
      qc.invalidateQueries(['approval-counts'])
      toast.success(vars.action === 'verify' ? '✅ Payment approved & membership activated' : 'Payment rejected')
      setViewPayment(null)
      setPaymentAction(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Action failed'),
  })

  async function generateAndDownloadInvoice(row) {
    setInvoiceLoading(row.id)
    try {
      const res = await api.post(`/invoices/member/${row.submission_id}/generate`, { payment_id: row.id })
      const invId = res.data.data?.id
      if (!invId) { toast.error('Invoice ID not returned'); return }
      // Download with auth token so the protected PDF route works
      const token = sessionStorage.getItem('forti_token')
      const resp = await fetch(`${API_BASE}/api/invoices/${invId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error('Download failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${row.transaction_id || invId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invoice generation failed')
    } finally {
      setInvoiceLoading(null)
    }
  }

  const allRows = data?.data || []
  const total   = data?.total || 0

  // Unique payment methods for filter dropdown
  const methodNames = useMemo(
    () => [...new Set(allRows.map(r => r.method_name).filter(Boolean))].sort(),
    [allRows],
  )

  // Client-side method + date filters
  const rows = useMemo(() => {
    let list = allRows.filter(r => !methodFilter || r.method_name === methodFilter)
    if (dateFrom) list = list.filter(r => r.created_at && new Date(r.created_at) >= new Date(dateFrom))
    if (dateTo)   list = list.filter(r => r.created_at && new Date(r.created_at) <= new Date(dateTo + 'T23:59:59'))
    return list
  }, [allRows, methodFilter, dateFrom, dateTo])

  const STATUS_BADGE = {
    pending:   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Under Review</span>,
    approved:  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved</span>,
    verified:  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>,
    rejected:  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>,
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search transaction ID, member name, email…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="pending">Under Review</option>
          <option value="approved">Approved</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input w-44" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="">All Methods</option>
          {methodNames.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <DatePicker value={dateFrom} onChange={v => { setDateFrom(v); setPage(1) }} max={dateTo || todayStr()} placeholder="From date" />
        <DatePicker value={dateTo}   onChange={v => { setDateTo(v);   setPage(1) }} max={todayStr()}           placeholder="To date" />
        <button className="btn-outline btn-sm whitespace-nowrap" onClick={clearDateFilter} title="Reset to last 30 days">
          Reset Dates
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Transaction</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method / Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2"/>Loading…
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No payments found</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[120px] truncate">
                    {row.transaction_id || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{row.applicant_name || '—'}</div>
                    <div className="text-xs text-gray-400">{row.membership_id || row.applicant_email || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-700">{row.method_name || '—'}</div>
                    {row.package_name && <div className="text-xs text-gray-400 mt-0.5">{row.package_name}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {fmtAmount(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3">{STATUS_BADGE[row.status] || <span className="text-xs text-gray-500">{row.status}</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TransactionActionMenu
                      row={row}
                      verifyPending={verifyMut.isPending || creditInrMut.isPending}
                      invoiceLoading={invoiceLoading === row.id}
                      onView={() => setViewPayment(row)}
                      onVerify={() => setPaymentAction({ type: 'verify', payment: row })}
                      onReject={() => setPaymentAction({ type: 'reject', payment: row })}
                      onInvoice={() => generateAndDownloadInvoice(row)}
                      onCreditInr={() => setCreditInrPayment(row)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <button className="btn-outline btn-sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Payment View Modal */}
      {viewPayment && (
        <PaymentViewModal
          payment={viewPayment}
          onClose={() => setViewPayment(null)}
          verifyPending={verifyMut.isPending}
          onVerify={(id, notes) => verifyMut.mutate({ id, action: 'verify', notes })}
          onReject={(id, notes) => verifyMut.mutate({ id, action: 'reject', notes })}
        />
      )}

      {/* Verify / Reject Confirm Modal */}
      {paymentAction && (
        <PaymentActionConfirm
          action={paymentAction.type}
          payment={paymentAction.payment}
          onClose={() => setPaymentAction(null)}
          onConfirm={(id, notes) => verifyMut.mutate({ id, action: paymentAction.type === 'verify' ? 'verify' : 'reject', notes })}
          pending={verifyMut.isPending}
        />
      )}

      {/* Credit in INR Modal */}
      {creditInrPayment && (
        <CreditInrModal
          payment={creditInrPayment}
          onClose={() => setCreditInrPayment(null)}
          onConfirm={data => creditInrMut.mutate(data)}
          pending={creditInrMut.isPending}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaymentsList({ initialTab = 'transactions' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  const tabs = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'methods',      label: 'Payment Methods' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-500 text-sm">Manage payment transactions and payment methods</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'transactions' && <TransactionsTab />}
      {activeTab === 'methods'      && <PaymentMethodsTab />}
    </div>
  )
}

