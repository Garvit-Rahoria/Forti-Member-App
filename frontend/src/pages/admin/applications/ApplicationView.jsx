import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, CreditCard, User, MapPin, FileText, ExternalLink, Receipt, X, Image, AlertCircle, Loader2, MessageSquare, Send, Trash2, Edit2, Save } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { useAuth } from '../../../contexts/AuthContext'
import MemberOrgPanel from '../../../components/admin/MemberOrgPanel'

import { assetUrl as resolveAssetUrl } from '../../../utils/assetUrl'

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
  'Personal Details':  <User size={15}/>,
  'Location Details':  <MapPin size={15}/>,
  'Membership Details': <FileText size={15}/>,
  'Payment Details':   <CreditCard size={15}/>,
}

function FieldValue({ field }) {
  if (!field.value && !field.file_path) return <span className="text-gray-400">—</span>

  if (field.type === 'file' || field.file_path) {
    const path = field.file_path || field.value
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
    const url = resolveAssetUrl(path)
    return isImage
      ? <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={field.label} className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"/>
        </a>
      : <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm">
          <ExternalLink size={12}/> View File
        </a>
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

function SectionCard({ section }) {
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
            <div className="col-span-3">
              <FieldValue field={field} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Screenshot Modal ── */
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

/* ── Confirm Dialog ── */
function ConfirmDialog({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, pending }) {
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onCancel}>
        <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-gray-500"/>
              <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-600">{message}</p>
            <div className="flex gap-3 pt-1">
              <button className={`px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 ${confirmColor}`} disabled={pending} onClick={onConfirm}>
                {pending && <Loader2 size={14} className="animate-spin"/>}
                {confirmLabel}
              </button>
              <button className="btn-outline text-sm" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

/* ── Staff / Manager Internal Notes Panel ── */
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-notes', submissionId] })
      setNoteText('')
      toast.success('Note added')
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to add note'),
  })

  const delMut = useMutation({
    mutationFn: (noteId) => api.delete(`/approvals/${submissionId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-notes', submissionId] })
      toast.success('Note deleted')
    },
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
          <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">
            Not visible to applicant
          </span>
        </div>
        {notes.length > 0 && (
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{notes.length}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Notes list */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-gray-400"/>
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">No notes yet. Add the first one below.</p>
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
                        <button
                          onClick={() => delMut.mutate(n.id)}
                          disabled={delMut.isPending}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                          title="Delete note"
                        >
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

        {/* Add note */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <textarea
            className="input text-sm flex-1 resize-none"
            rows={2}
            placeholder="Add an internal note…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && noteText.trim()) {
                e.preventDefault()
                addMut.mutate(noteText.trim())
              }
            }}
          />
          <button
            className="btn-primary px-3 self-end"
            disabled={!noteText.trim() || addMut.isPending}
            onClick={() => addMut.mutate(noteText.trim())}
            title="Add note (Ctrl+Enter)"
          >
            {addMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
          </button>
        </div>
        <p className="text-xs text-gray-400">Ctrl+Enter to submit. Notes are internal only.</p>
      </div>
    </div>
  )
}

export default function ApplicationView() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [notes, setNotes] = useState('')
  const [screenshotModal, setScreenshotModal] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const role = user?.role || ''
  const isStaff   = role === 'office_staff'
  const isBM      = role === 'branch_manager'
  const isAdmin   = role === 'super_admin' || role === 'admin'
  const canApprove = isAdmin || isBM
  const canReview  = isAdmin || isBM || isStaff

  const { data: sub, isLoading, isError, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.get(`/submissions/detail/${id}`).then(r => r.data.data),
    retry: 1,
  })

  const statusMut = useMutation({
    mutationFn: ({ status }) => api.patch(`/approvals/${id}/status`, { status, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submission', id] }); toast.success('Status updated'); setConfirmDialog(null) },
    onError: err => { toast.error(err.response?.data?.message || 'Error'); setConfirmDialog(null) },
  })

  const invoiceMut = useMutation({
    mutationFn: () => api.post(`/invoices/member/${id}/generate`).then(r => r.data.data),
    onSuccess: async (data) => {
      toast.success('Invoice generated')
      try {
        const resp = await api.get(`/invoices/${data.id}/download`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${data.invoice_number || data.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch { toast.error('Download failed') }
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to generate invoice'),
  })

  function openConfirm(status, title, message, confirmLabel, confirmColor) {
    setConfirmDialog({ status, title, message, confirmLabel, confirmColor })
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  )
  if (isError) return (
    <div className="text-center py-20 space-y-3">
      <p className="text-red-500 font-medium">{error?.response?.data?.message || 'Failed to load application'}</p>
      <button onClick={() => nav(-1)} className="btn-outline btn-sm">Go Back</button>
    </div>
  )
  if (!sub) return <p className="text-center text-gray-400 py-20">Application not found.</p>

  const statusLabel = (sub.status || '').replace(/_/g, ' ')

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button className="btn-outline btn-sm mt-1" onClick={() => nav(-1)}>
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
                {sub.membership_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
            {sub.applicant_email && <span>{sub.applicant_email}</span>}
            {sub.applicant_phone && <span>{sub.applicant_phone}</span>}
            {sub.submitted_at && <span>Submitted {new Date(sub.submitted_at).toLocaleString()}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Sections */}
          {(sub.sections || []).length > 0
            ? sub.sections.map((section, i) => <SectionCard key={i} section={section}/>)
            : (
              <div className="card p-8 text-center text-gray-400">
                <FileText size={32} className="mx-auto mb-2 opacity-40"/>
                <p>No structured data available for this submission.</p>
              </div>
            )
          }

          {/* Package card */}
          {sub.package && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-2">
                <Package size={15} className="text-primary-600"/>
                <h3 className="font-semibold text-primary-800 text-sm">Selected Package</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Package Name</p>
                    <p className="font-semibold text-gray-900">{sub.package.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Fee</p>
                    <p className="font-semibold text-primary-700">{fmtAmount(sub.package.price, sub.package.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Location</p>
                    <p className="text-gray-900">{sub.package.location ? sub.package.location.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</p>
                  </div>
                  {sub.package.membership_type && (
                    <div>
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="text-gray-900 capitalize">{sub.package.membership_type}</p>
                    </div>
                  )}
                  {(sub.package.duration || sub.package.plan_type) && (
                    <div>
                      <p className="text-gray-500 text-xs">Duration</p>
                      <p className="text-gray-900">{(() => {
                        const raw = String(sub.package.duration || sub.package.plan_type || '').trim().toLowerCase()
                        if (!raw) return '—'
                        if (raw === 'lifetime') return 'Lifetime'
                        const m = raw.match(/^(\d+)years?$/)
                        if (m) { const y = Number(m[1]); return `${y} Year${y === 1 ? '' : 's'}` }
                        if (raw === '1year' || raw === 'yearly') return '1 Year'
                        if (raw === '3years' || raw === '3_years') return '3 Years'
                        return raw.charAt(0).toUpperCase() + raw.slice(1)
                      })()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes Panel — staff & manager & admin */}
          {canReview && <StaffNotesPanel submissionId={id} currentUserId={user?.id} role={role} />}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Meta info */}
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

          {/* Review panel — role-gated */}
          {canReview && ['submitted', 'under_review', 'payment_pending', 'payment_submitted', 'payment_verified'].includes(sub.status) && (
            <div className="card p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm">Review Application</h4>
              <textarea className="input text-sm" rows={3} placeholder="Add review notes (optional)…"
                value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex flex-col gap-2">
                {/* Approve — admin + branch_manager only */}
                {canApprove && (
                  <button className="btn-primary w-full text-sm" onClick={() => openConfirm('approved', 'Approve Application', 'This will approve the application, create a member account, and send a welcome email. Continue?', 'Approve Application', 'bg-green-600 hover:bg-green-700')} disabled={statusMut.isPending}>
                    <CheckCircle size={14}/> Approve Application
                  </button>
                )}
                {/* Reject — admin + branch_manager only */}
                {canApprove && (
                  <button className="w-full text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    onClick={() => openConfirm('rejected', 'Reject Application', 'This will permanently reject this application and send a rejection email. Continue?', 'Reject Application', 'bg-red-600 hover:bg-red-700')} disabled={statusMut.isPending}>
                    <XCircle size={14}/> Reject Application
                  </button>
                )}
                {/* Verify Payment — office_staff + admin (only when payment is NOT yet verified) */}
                {(isStaff || isAdmin) && sub.payment && !['verified'].includes(sub.payment.status) && sub.status !== 'payment_verified' && (
                  <button
                    className="w-full text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    onClick={() => openConfirm('payment_verified', 'Verify Payment', 'Mark this payment as verified. Branch manager can then approve the application.', 'Verify Payment', 'bg-emerald-600 hover:bg-emerald-700')}
                    disabled={statusMut.isPending}>
                    <CheckCircle size={14}/> Verify Payment
                  </button>
                )}
                {/* Payment verified badge — shown once payment is verified */}
                {(isStaff || isAdmin) && (sub.payment?.status === 'verified' || sub.status === 'payment_verified') && (
                  <div className="w-full text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium">
                    <CheckCircle size={14}/> Payment Verified
                  </div>
                )}
                {/* Reject Payment — office_staff + admin (only when payment is NOT yet verified) */}
                {(isStaff || isAdmin) && sub.payment && !['verified'].includes(sub.payment.status) && sub.status !== 'payment_verified' && (
                  <button
                    className="w-full text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    onClick={() => openConfirm('payment_pending', 'Reject Payment', 'Mark payment as needing resubmission. Applicant will be asked to re-upload proof.', 'Reject Payment', 'bg-orange-500 hover:bg-orange-600')}
                    disabled={statusMut.isPending}>
                    <XCircle size={14}/> Reject Payment
                  </button>
                )}
                {/* Under Review — all review roles */}
                <button className="btn-outline w-full text-sm" onClick={() => openConfirm('under_review', 'Mark Under Review', 'This will move the application to Under Review status. Continue?', 'Mark Under Review', 'bg-yellow-500 hover:bg-yellow-600')} disabled={statusMut.isPending}>
                  <Clock size={14}/> Mark Under Review
                </button>
                {/* Staff hint */}
                {isStaff && (
                  <p className="text-xs text-gray-400 text-center">Staff can verify payments &amp; mark Under Review. Approval requires a Branch Manager.</p>
                )}
              </div>
            </div>
          )}

          {/* Approved / rejected status panel */}
          {['approved', 'rejected', 'active'].includes(sub.status) && (
            <div className={`card p-4 ${sub.status === 'rejected' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                {sub.status === 'rejected'
                  ? <XCircle size={16} className="text-red-500"/>
                  : <CheckCircle size={16} className="text-green-600"/>}
                <span className={`font-semibold text-sm capitalize ${sub.status === 'rejected' ? 'text-red-600' : 'text-green-700'}`}>
                  {statusLabel}
                </span>
              </div>
              {sub.reviewed_at && <p className="text-xs text-gray-500">{new Date(sub.reviewed_at).toLocaleString()}</p>}
            </div>
          )}

          {/* Activate Membership — shown when status is approved and user is admin/BM */}
          {sub.status === 'approved' && (isAdmin || isBM) && (() => {
            const paymentVerified = sub.payment?.status === 'verified' || sub.payment?.status === 'approved'
            return (
              <div className="card p-4 space-y-3 border-emerald-200 bg-emerald-50">
                <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-600"/> Activate Membership
                </h4>
                {paymentVerified ? (
                  <p className="text-xs text-gray-500">
                    Payment has been verified. Click below to activate the membership account.
                  </p>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 font-medium">
                    ⚠ Payment must be verified before activating membership.
                    <br/>
                    <span className="text-yellow-600 font-normal">
                      Current payment status: <strong>{sub.payment?.status || 'No payment submitted'}</strong>
                    </span>
                  </div>
                )}
                <div className="bg-white rounded-lg p-3 text-xs text-emerald-800 space-y-0.5 border border-emerald-100">
                  <p className="font-medium mb-1">This will:</p>
                  <p>• Assign Membership ID (if not yet assigned)</p>
                  <p>• Create / update member login account</p>
                  <p>• Send membership confirmation email</p>
                  <p>• Generate Certificate and Membership Card (background)</p>
                  <p>• Set application status to Active</p>
                </div>
                <button
                  className="w-full text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => openConfirm('activate', 'Activate Membership', 'This will activate the membership account, assign a Membership ID, and send the welcome email. Continue?', 'Activate Membership', 'bg-emerald-600 hover:bg-emerald-700')}
                  disabled={statusMut.isPending || !paymentVerified}>
                  {statusMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                  Activate Membership
                </button>
              </div>
            )
          })()}

          {/* Download Invoice – for approved/active members */}
          {['approved', 'active'].includes(sub.status) && (
            <div className="card p-4">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-3">Invoice</h4>
              <button
                className="btn-outline w-full text-sm flex items-center justify-center gap-2"
                disabled={invoiceMut.isPending}
                onClick={() => invoiceMut.mutate()}
              >
                <Receipt size={14} />
                {invoiceMut.isPending ? 'Generating…' : 'Download Invoice'}
              </button>
            </div>
          )}

          {/* Wing, positions, public profile */}
          {['active', 'approved'].includes(sub.status) && (
            <MemberOrgPanel memberId={id} canManage={isAdmin || isBM} />
          )}

          {/* Review notes */}
          {sub.review_notes && (
            <div className="card p-4 text-sm">
              <p className="font-medium text-gray-700 mb-1 text-xs uppercase tracking-wide">Review Notes</p>
              <p className="text-gray-600">{sub.review_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {screenshotModal && (
        <ScreenshotModal src={screenshotModal} onClose={() => setScreenshotModal(null)} />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmColor={confirmDialog.confirmColor}
          pending={statusMut.isPending}
          onConfirm={() => statusMut.mutate({ status: confirmDialog.status })}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
