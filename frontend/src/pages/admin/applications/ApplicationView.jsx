import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Package, CreditCard, User,
  MapPin, FileText, ExternalLink, Receipt, X, AlertCircle, Loader2,
  MessageSquare, Send, Trash2, ShieldCheck, ShieldX, Zap, Users
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { useAuth } from '../../../contexts/AuthContext'
import MemberOrgPanel from '../../../components/admin/MemberOrgPanel'
import { assetUrl as resolveAssetUrl } from '../../../utils/assetUrl'
import CopyMembershipId from '../../../components/admin/CopyMembershipId'

function fmtAmount(amount, currency) {
  if (!amount && amount !== 0) return '—'
  const sym = { INR: '₹', USD: '$', AED: 'AED ', EUR: '€', GBP: '£', SGD: 'S$' }[currency] || (currency ? currency + ' ' : '₹')
  if (currency && currency !== 'INR') return `${sym}${Number(amount).toLocaleString()}`
  return `${sym}${Number(amount).toLocaleString('en-IN')}`
}

const STATUS_COLORS = {
  submitted:         'bg-blue-100 text-blue-700',
  under_review:      'bg-yellow-100 text-yellow-700',
  payment_pending:   'bg-orange-100 text-orange-700',
  payment_submitted: 'bg-indigo-100 text-indigo-700',
  payment_verified:  'bg-emerald-100 text-emerald-700',
  approved:          'bg-green-100 text-green-700',
  rejected:          'bg-red-100 text-red-700',
  active:            'bg-green-100 text-green-800',
  expired:           'bg-gray-100 text-gray-500',
}

const SECTION_ICONS = {
  'Personal Details':   <User size={15}/>,
  'Location Details':   <MapPin size={15}/>,
  'Membership Details': <FileText size={15}/>,
  'Payment Details':    <CreditCard size={15}/>,
}

function FieldValue({ field, onOpenImage }) {
  const [showAadhaar, setShowAadhaar] = useState(false)
  if (!field.value && !field.file_path) return <span className="text-gray-400">—</span>
  if (field.type === 'file' || field.file_path) {
    const path = field.file_path || field.value
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
    const url = resolveAssetUrl(path)
    return isImage
      ? <button type="button" onClick={() => (onOpenImage ? onOpenImage(path) : window.open(url, '_blank'))} className="text-left">
          <img src={url} alt={field.label} className="w-28 h-28 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity shadow-sm"/>
          <span className="block text-[11px] text-primary-600 mt-1">Click to enlarge</span>
        </button>
      : <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm">
          <ExternalLink size={12}/> View File
        </a>
  }
  const isAadhaar = /aadhaar/i.test(field.label || '')
  if (isAadhaar && field.value) {
    const digits = String(field.value).replace(/\D/g, '')
    const masked = digits.length >= 4
      ? `XXXX XXXX ${digits.slice(-4)}`
      : 'XXXX XXXX ****'
    return (
      <span className="inline-flex items-center gap-2 text-sm text-gray-900">
        <span className="font-mono tracking-wide">{showAadhaar ? digits : masked}</span>
        <button
          type="button"
          onClick={() => setShowAadhaar(v => !v)}
          className="text-[11px] font-semibold text-primary-600 hover:underline"
        >
          {showAadhaar ? 'Hide' : 'Show'}
        </button>
      </span>
    )
  }
  if (typeof field.value === 'string' && field.value.includes('\n')) {
    return (
      <div className="space-y-0.5">
        {field.value.split('\n').map((line, i) => <p key={i} className="text-gray-900 text-sm">{line}</p>)}
      </div>
    )
  }
  return <span className="text-gray-900 text-sm">{String(field.value)}</span>
}

function SectionCard({ section, onOpenImage }) {
  const icon = SECTION_ICONS[section.title] || <FileText size={15}/>
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-500">{icon}</span>
        <h3 className="font-semibold text-gray-800 text-sm">{section.title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {section.fields.map((field, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 px-5 py-3">
            <span className="col-span-2 text-gray-500 text-sm font-medium self-start pt-0.5">{field.label}</span>
            <div className="col-span-3"><FieldValue field={field} onOpenImage={onOpenImage}/></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenshotModal({ src, onClose }) {
  if (!src) return null
  const url = resolveAssetUrl(src)
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10">
            <X size={18} className="text-gray-600"/>
          </button>
          <img src={url} alt="Payment Screenshot" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white"/>
        </div>
      </div>
    </AdminModalPortal>
  )
}

const REJECTION_REASON_OPTIONS = [
  'Invalid Information',
  'Payment Issue',
  'Invalid Payment Proof',
  'Duplicate Application',
  'Eligibility Issue',
  'Documents Incomplete',
  'Other',
]

const WORKFLOW_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'payment_verified', label: 'Payment Verified' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
]

function workflowStepIndex(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'payment_submitted' || s === 'submitted') return 0
  if (s === 'under_review' || s === 'payment_pending' || s === 'pending_info') return 1
  if (s === 'payment_verified') return 2
  if (s === 'approved') return 3
  if (s === 'active') return 4
  if (s === 'rejected') return -1
  return 0
}

/* ── Action Confirm Dialog with optional notes / mandatory rejection reasons ── */
function ActionDialog({ action, onConfirm, onCancel, pending }) {
  const [reasonChoice, setReasonChoice] = useState('')
  const [otherText, setOtherText] = useState('')
  const [optionalNote, setOptionalNote] = useState('')

  useEffect(() => {
    setReasonChoice('')
    setOtherText('')
    setOptionalNote('')
  }, [action?.status, action?.title])

  if (!action) return null

  const needsReason = action.requireReason
  const resolvedReason = needsReason
    ? (reasonChoice === 'Other' ? otherText.trim() : reasonChoice.trim())
    : optionalNote.trim()
  const canSubmit = !needsReason
    ? true
    : reasonChoice && (reasonChoice !== 'Other' ? true : otherText.trim().length > 0)

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={() => !pending && onCancel()}>
        <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className={needsReason ? 'text-red-500' : 'text-gray-500'}/>
              <h3 className="font-semibold text-gray-900">{action.title}</h3>
            </div>
            <p className="text-sm text-gray-600">{action.message}</p>

            {needsReason && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={reasonChoice}
                    onChange={e => setReasonChoice(e.target.value)}
                    autoFocus
                  >
                    <option value="">Select a reason…</option>
                    {REJECTION_REASON_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                {reasonChoice === 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Please specify <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="input w-full text-sm resize-none"
                      rows={3}
                      placeholder="Enter the rejection reason (shared with the applicant)…"
                      value={otherText}
                      onChange={e => setOtherText(e.target.value)}
                    />
                  </div>
                )}
                {reasonChoice && reasonChoice !== 'Other' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional note (optional)</label>
                    <textarea
                      className="input w-full text-sm resize-none"
                      rows={2}
                      placeholder="Optional details…"
                      value={otherText}
                      onChange={e => setOtherText(e.target.value)}
                    />
                  </div>
                )}
                {!canSubmit && (
                  <p className="text-xs text-red-500">Rejection reason is required.</p>
                )}
              </div>
            )}

            {action.showNotes && !needsReason && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Note (optional)</label>
                <textarea
                  className="input w-full text-sm resize-none"
                  rows={2}
                  placeholder="Add an optional note…"
                  value={optionalNote}
                  onChange={e => setOptionalNote(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${action.confirmColor}`}
                disabled={pending || !canSubmit}
                onClick={() => {
                  if (pending || !canSubmit) return
                  if (needsReason && reasonChoice && reasonChoice !== 'Other' && otherText.trim()) {
                    onConfirm(`${reasonChoice}: ${otherText.trim()}`)
                  } else {
                    onConfirm(resolvedReason)
                  }
                }}
              >
                {pending && <Loader2 size={14} className="animate-spin"/>}
                {action.confirmLabel}
              </button>
              <button className="btn-outline text-sm" disabled={pending} onClick={onCancel}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

/* ── Internal Notes Panel ── */
function StaffNotesPanel({ submissionId, currentUserId, role }) {
  const qc = useQueryClient()
  const [noteText, setNoteText] = useState('')
  const isSuperAdmin = role === 'super_admin'

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['app-notes', submissionId],
    queryFn: () => api.get(`/approvals/${submissionId}/notes`).then(r => r.data.data),
  })

  const addMut = useMutation({
    mutationFn: (note) => api.post(`/approvals/${submissionId}/notes`, { note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-notes', submissionId] }); setNoteText(''); toast.success('Note added') },
    onError: err => toast.error(err.response?.data?.message || 'Failed to add note'),
  })

  const delMut = useMutation({
    mutationFn: (noteId) => api.delete(`/approvals/${submissionId}/notes/${noteId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-notes', submissionId] }); toast.success('Note deleted') },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete note'),
  })

  const ROLE_BADGE = {
    super_admin:    { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700' },
    admin:          { label: 'Admin',       cls: 'bg-blue-100 text-blue-700' },
    branch_manager: { label: 'Manager',     cls: 'bg-green-100 text-green-700' },
    office_staff:   { label: 'Staff',       cls: 'bg-orange-100 text-orange-700' },
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-amber-600"/>
          <h3 className="font-semibold text-amber-800 text-sm">Internal Notes</h3>
          <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">Not visible to applicant</span>
        </div>
        {notes.length > 0 && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{notes.length}</span>}
      </div>
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400"/></div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">No notes yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {notes.map(n => {
              const badge = ROLE_BADGE[n.author_role] || { label: n.author_role, cls: 'bg-gray-100 text-gray-600' }
              const canDelete = isSuperAdmin || n.created_by === currentUserId
              return (
                <div key={n.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5 group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
                        {(n.author_name || 'U')[0].toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-gray-800">{n.author_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                      {canDelete && (
                        <button onClick={() => delMut.mutate(n.id)} disabled={delMut.isPending}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed ml-8">{n.note}</p>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <textarea className="input text-sm flex-1 resize-none" rows={2}
            placeholder="Add an internal note… (Ctrl+Enter to submit)"
            value={noteText} onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && noteText.trim()) { e.preventDefault(); addMut.mutate(noteText.trim()) } }}
          />
          <button className="btn-primary px-3 self-end" disabled={!noteText.trim() || addMut.isPending}
            onClick={() => addMut.mutate(noteText.trim())}>
            {addMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationView() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [screenshotModal, setScreenshotModal] = useState(null)
  const [activeAction, setActiveAction] = useState(null)

  const role = user?.role || ''
  const isStaff    = role === 'office_staff'
  const isBM       = role === 'branch_manager'
  const isAdmin    = role === 'super_admin' || role === 'admin'
  const canApprove = isAdmin || isBM
  const canReview  = isAdmin || isBM || isStaff

  const { data: sub, isLoading, isError, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.get(`/submissions/detail/${id}`).then(r => r.data.data),
    retry: 1,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['app-activity', id],
    queryFn: () => api.get(`/approvals/${id}/activity`).then(r => r.data.data || []),
    enabled: !!id,
  })

  const statusMut = useMutation({
    mutationFn: ({ status, notes }) => api.patch(`/approvals/${id}/status`, { status, notes }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['submission', id] })
      qc.invalidateQueries({ queryKey: ['app-activity', id] })
      qc.invalidateQueries({ queryKey: ['approvals-all'] })
      qc.invalidateQueries({ queryKey: ['members'] })
      const msg = res?.data?.message
      toast.success(msg || 'Status updated')
      setActiveAction(null)
    },
    onError: err => {
      toast.error(err.response?.data?.message || 'Error')
    },
  })

  const invoiceMut = useMutation({
    mutationFn: () => api.post(`/invoices/member/${id}/generate`).then(r => r.data.data),
    onSuccess: async (data) => {
      toast.success('Invoice generated')
      try {
        const resp = await api.get(`/invoices/${data.id}/download`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
        const a = document.createElement('a'); a.href = url
        a.download = `invoice-${data.invoice_number || data.id}.pdf`
        document.body.appendChild(a); a.click()
        document.body.removeChild(a); window.URL.revokeObjectURL(url)
      } catch { toast.error('Download failed') }
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to generate invoice'),
  })

  function triggerAction(action) { setActiveAction(action) }

  function handleConfirm(reason) {
    if (!activeAction || statusMut.isPending) return
    statusMut.mutate({ status: activeAction.status, notes: reason || '' })
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"/>
    </div>
  )
  if (isError) return (
    <div className="text-center py-20 space-y-3">
      <p className="text-red-500 font-medium">{error?.response?.data?.message || 'Failed to load application'}</p>
      <button onClick={() => nav(-1)} className="btn-outline btn-sm">Go Back</button>
    </div>
  )
  if (!sub) return <p className="text-center text-gray-400 py-20">Application not found.</p>

  const statusLabel   = (sub.status || '').replace(/_/g, ' ')
  const paymentStatus = String(sub.payment?.status || sub.payment_status || '').toLowerCase()
  const paymentVerified = paymentStatus === 'verified' || paymentStatus === 'approved' || sub.status === 'payment_verified'
  const paymentRejected = paymentStatus === 'rejected'
  const hasPayment    = !!sub.payment
  const screenshotPath = sub.payment?.screenshot_path || sub.data?.payment_screenshot || null
  const isTerminalRejected = sub.status === 'rejected'
  const isMembershipActive = sub.status === 'active'
  const isApprovedOnly = sub.status === 'approved'
  const isInitialSubmitted = ['submitted', 'payment_submitted'].includes(sub.status)
  const isInReview = ['under_review', 'payment_pending'].includes(sub.status)
  const curStepIdx = workflowStepIndex(sub.status)
  const actionBusy = statusMut.isPending

  const ACTION_EVENT_LABELS = {
    application_submitted: 'Application Submitted',
    payment_submitted: 'Payment Submitted',
    marked_under_review: 'Marked Under Review',
    payment_verified: 'Payment Verified',
    payment_rejected: 'Payment Rejected',
    application_approved: 'Application Approved',
    application_rejected: 'Application Rejected',
    membership_activated: 'Membership Activated',
    payment_pending: 'Payment Pending',
    info_requested: 'Information Requested',
    plan_changed: 'Plan Changed',
  }

  const rejectApplicationAction = {
    status: 'rejected',
    title: 'Reject Application',
    message: 'This will reject the application and notify the applicant. A reason is required.',
    confirmLabel: 'Reject Application',
    confirmColor: 'bg-red-600 hover:bg-red-700',
    requireReason: true,
  }

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Page Header ── */}
      <div className="flex items-start gap-3">
        <button className="btn-outline btn-sm mt-1" onClick={() => nav('/applications')}>
          <ArrowLeft size={14}/> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900">
              {sub.applicant_name || `Application #${sub.id}`}
            </h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabel}
            </span>
            {sub.membership_id && (
              <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-full">
                <CopyMembershipId id={sub.membership_id}/>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
            {sub.applicant_email && <span>{sub.applicant_email}</span>}
            {sub.applicant_phone && <span>{sub.applicant_phone}</span>}
            {sub.submitted_at && <span>Submitted {new Date(sub.submitted_at).toLocaleString()}</span>}
            {sub.reviewed_at && <span>Last reviewed {new Date(sub.reviewed_at).toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* ── Workflow stepper ── */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2 text-xs overflow-x-auto pb-0.5">
          {WORKFLOW_STEPS.map((step, idx) => {
            const done = !isTerminalRejected && curStepIdx > idx
            const active = !isTerminalRejected && curStepIdx === idx
            return (
              <div key={step.key} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                  active
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-200'
                    : done
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? <CheckCircle size={12}/> : active ? <Clock size={12}/> : null}
                  {step.label}
                </span>
                {idx < WORKFLOW_STEPS.length - 1 && <span className="text-gray-300">→</span>}
              </div>
            )
          })}
        </div>
        {isTerminalRejected && (
          <p className="text-xs text-red-600 mt-2 font-medium">Workflow stopped — application rejected.</p>
        )}
      </div>

      {/* ── PROMINENT ACTION BAR ── */}
      {canReview && !isMembershipActive && !isTerminalRejected && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gray-800">Application Actions</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Submitted → Under Review → Payment Verified → Approved → Active
              </p>
            </div>
            {paymentVerified && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle size={13}/> Payment Verified
              </span>
            )}
            {paymentRejected && !paymentVerified && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
                <ShieldX size={13}/> Payment Rejected
              </span>
            )}
          </div>

          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">

              {/* Submitted / Payment Submitted → Mark Under Review only (Reject in More Actions) */}
              {isInitialSubmitted && (
                <button
                  type="button"
                  onClick={() => triggerAction({
                    status: 'under_review',
                    title: 'Mark Under Review',
                    message: 'Move this application to Under Review so the team can check details and payment proof.',
                    confirmLabel: 'Mark Under Review',
                    confirmColor: 'bg-yellow-500 hover:bg-yellow-600',
                    showNotes: true,
                  })}
                  disabled={actionBusy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionBusy ? <Loader2 size={15} className="animate-spin"/> : <Clock size={15}/>}
                  Mark Under Review
                </button>
              )}

              {/* Under Review / Payment Pending → Verify / Reject Payment / Reject App */}
              {isInReview && (
                <>
                  {(isStaff || isAdmin) && !paymentVerified && (
                    <>
                      <button
                        type="button"
                        onClick={() => triggerAction({
                          status: 'payment_verified',
                          title: 'Verify Payment',
                          message: 'Confirm the payment method, reference and uploaded receipt are valid. Application will move to Payment Verified.',
                          confirmLabel: 'Verify Payment',
                          confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
                          showNotes: true,
                        })}
                        disabled={actionBusy}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        {actionBusy ? <Loader2 size={15} className="animate-spin"/> : <ShieldCheck size={15}/>}
                        Verify Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerAction({
                          status: 'reject_payment',
                          title: 'Reject Payment',
                          message: 'Payment will be marked Rejected. The applicant must submit a new valid payment receipt.',
                          confirmLabel: 'Reject Payment',
                          confirmColor: 'bg-orange-500 hover:bg-orange-600',
                          requireReason: true,
                        })}
                        disabled={actionBusy}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                        <ShieldX size={15}/> Reject Payment
                      </button>
                    </>
                  )}
                  {(isStaff || isAdmin) && paymentVerified && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-medium">
                      Payment already verified — proceed to approval when ready.
                    </span>
                  )}
                  {canApprove && (
                    <button
                      type="button"
                      onClick={() => triggerAction(rejectApplicationAction)}
                      disabled={actionBusy}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      <XCircle size={15}/> Reject Application
                    </button>
                  )}
                </>
              )}

              {/* Payment Verified → Approve (requires verified payment) + Reject */}
              {sub.status === 'payment_verified' && canApprove && (
                <>
                  <button
                    type="button"
                    onClick={() => triggerAction({
                      status: 'approved',
                      title: 'Approve Application',
                      message: 'Approve this application and assign a Membership ID. Activation is a separate next step.',
                      confirmLabel: 'Approve Application',
                      confirmColor: 'bg-primary-600 hover:bg-primary-700',
                      showNotes: true,
                    })}
                    disabled={actionBusy || !paymentVerified}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    {actionBusy ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle size={15}/>}
                    Approve Application
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerAction(rejectApplicationAction)}
                    disabled={actionBusy}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    <XCircle size={15}/> Reject Application
                  </button>
                </>
              )}

              {/* Approved → Activate Membership */}
              {isApprovedOnly && (isAdmin || isBM) && (
                <button
                  type="button"
                  onClick={() => triggerAction({
                    status: 'activate',
                    title: 'Activate Membership',
                    message: 'Activate the membership account now? This creates/activates the member record, enables login, and generates certificate/card. Safe to retry if already active.',
                    confirmLabel: 'Activate Membership',
                    confirmColor: 'bg-emerald-600 hover:bg-emerald-700',
                  })}
                  disabled={actionBusy || !paymentVerified}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                  {actionBusy ? <Loader2 size={15} className="animate-spin"/> : <Zap size={15}/>}
                  Activate Membership
                </button>
              )}

              {isStaff && !canApprove && (
                <p className="w-full text-xs text-gray-400 mt-1">
                  Staff can mark under review and verify payments. Approval and activation require a Branch Manager or Admin.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active — member management (workflow actions hidden) */}
      {isMembershipActive && (
        <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-5 py-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-600 shrink-0"/>
            <div>
              <p className="font-bold text-sm text-green-800">Membership Active</p>
              {sub.activated_at && <p className="text-xs text-gray-500 mt-0.5">Activated {new Date(sub.activated_at).toLocaleString()}</p>}
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => nav(`/members/${id}/full`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition shadow-sm">
              <Users size={15}/> View Member Profile
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition disabled:opacity-50"
              disabled={invoiceMut.isPending}
              onClick={() => invoiceMut.mutate()}>
              {invoiceMut.isPending ? <Loader2 size={15} className="animate-spin"/> : <Receipt size={15}/>}
              {invoiceMut.isPending ? 'Generating…' : 'Download Invoice'}
            </button>
            <button
              type="button"
              onClick={() => nav('/members')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 transition">
              <Users size={15}/> Open Members List
            </button>
          </div>
        </div>
      )}

      {isTerminalRejected && (
        <div className="rounded-2xl border px-5 py-4 flex items-center gap-3 bg-red-50 border-red-200">
          <XCircle size={20} className="text-red-500 shrink-0"/>
          <div>
            <p className="font-bold text-sm text-red-700">Application Rejected</p>
            {sub.reviewed_at && <p className="text-xs text-gray-500 mt-0.5">{new Date(sub.reviewed_at).toLocaleString()}</p>}
            {sub.review_notes && <p className="text-xs text-gray-600 mt-1 italic">&quot;{sub.review_notes}&quot;</p>}
          </div>
        </div>
      )}

      {/* Approved helper note (Activate is also in the action bar) */}
      {isApprovedOnly && (isAdmin || isBM) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-xs text-emerald-800">
              Application is <strong>Approved</strong>. Use <strong>Activate Membership</strong> above to create/activate the member account. Activation is idempotent — repeated clicks will not create duplicates.
            </p>
          </div>
      )}

      {/* ── Main content + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {(sub.sections || []).length > 0
            ? sub.sections.map((section, i) => (
              <SectionCard key={i} section={section} onOpenImage={(src) => setScreenshotModal(src)}/>
            ))
            : (
              <div className="card p-8 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-40"/>
                <p>No structured data available.</p>
              </div>
            )
          }

          {sub.package && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
                <Package size={15} className="text-primary-600"/>
                <h3 className="font-semibold text-primary-800 text-sm">Selected Package</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Package Name</p><p className="font-semibold text-gray-900">{sub.package.name}</p></div>
                  <div><p className="text-gray-500 text-xs">Fee</p><p className="font-semibold text-primary-700">{fmtAmount(sub.package.price, sub.package.currency)}</p></div>
                  <div>
                    <p className="text-gray-500 text-xs">Location</p>
                    <p className="text-gray-900">{sub.package.location ? sub.package.location.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : '—'}</p>
                  </div>
                  {sub.package.membership_type && <div><p className="text-gray-500 text-xs">Type</p><p className="text-gray-900 capitalize">{sub.package.membership_type}</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Clock size={15} className="text-gray-500"/>
              <h3 className="font-semibold text-gray-800 text-sm">Activity Timeline</h3>
            </div>
            <div className="p-5">
              {(!activity || activity.length === 0) ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <ol className="relative border-l border-gray-200 space-y-4 ml-2">
                  {activity.map((ev, i) => (
                    <li key={ev.id || i} className="ml-4">
                      <div className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary-500 border-2 border-white"/>
                      <p className="text-sm font-semibold text-gray-900">
                        {ACTION_EVENT_LABELS[ev.event_type] || String(ev.event_type || '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ev.acted_by_name || 'System'}
                        {ev.created_at ? ` · ${new Date(ev.created_at).toLocaleString()}` : ''}
                      </p>
                      {ev.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2.5 py-1.5 italic">&quot;{ev.notes}&quot;</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {canReview && <StaffNotesPanel submissionId={id} currentUserId={user?.id} role={role}/>}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 text-sm space-y-2.5">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Details</h4>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 shrink-0">Form</span>
              <span className="text-right text-gray-900">{sub.form_name || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 shrink-0">Created</span>
              <span className="text-gray-900">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}</span>
            </div>
            {sub.reviewed_at && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">Reviewed</span>
                <span className="text-gray-900">{new Date(sub.reviewed_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Payment Details card */}
          <div className="card p-4 space-y-3">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard size={12}/> Payment Details
            </h4>
            {hasPayment ? (
              <>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize
                    ${paymentVerified ? 'bg-emerald-100 text-emerald-700' : paymentRejected ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {paymentStatus || 'pending'}
                  </span>
                </div>
                {sub.payment.method_name && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-900 text-right">{sub.payment.method_name}</span>
                  </div>
                )}
                {(sub.payment.amount != null) && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-gray-900">{fmtAmount(sub.payment.amount, sub.payment.currency)}</span>
                  </div>
                )}
                {sub.payment.transaction_id && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-mono text-xs text-gray-800">{sub.payment.transaction_id}</span>
                  </div>
                )}
                {screenshotPath && (
                  <button type="button" onClick={() => setScreenshotModal(screenshotPath)} className="w-full text-left">
                    <img
                      src={resolveAssetUrl(screenshotPath)}
                      alt="Payment proof"
                      className="w-full h-36 object-cover rounded-lg border border-gray-200 hover:opacity-95"
                    />
                    <span className="text-[11px] text-primary-600 mt-1 inline-block">Click to view full size</span>
                  </button>
                )}
                {paymentRejected && sub.payment.notes && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
                    Reject reason: {sub.payment.notes}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">No payment record yet.</p>
            )}
          </div>

          {['approved', 'active'].includes(sub.status) && (
            <div className="card p-4">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">Invoice</h4>
              <button className="btn-outline w-full text-sm flex items-center justify-center gap-2"
                disabled={invoiceMut.isPending} onClick={() => invoiceMut.mutate()}>
                <Receipt size={14}/>
                {invoiceMut.isPending ? 'Generating…' : 'Download Invoice'}
              </button>
            </div>
          )}

          {['active', 'approved'].includes(sub.status) && (
            <MemberOrgPanel memberId={id} canManage={isAdmin || isBM}/>
          )}
        </div>
      </div>

      {screenshotModal && <ScreenshotModal src={screenshotModal} onClose={() => setScreenshotModal(null)}/>}

      <ActionDialog
        action={activeAction}
        onConfirm={handleConfirm}
        onCancel={() => !statusMut.isPending && setActiveAction(null)}
        pending={statusMut.isPending}
      />
    </div>
  )
}
