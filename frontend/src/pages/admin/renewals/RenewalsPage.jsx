import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownUp,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  FileSearch,
  ImageOff,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { fmtAmount } from '../../../utils/currency'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const VERIFY_DEFAULT = { action: 'approve', newExpiryDate: '', notes: '' }
const NEW_DEFAULT = { submission_id: '', new_expiry_date: '', amount: '', notes: '' }
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest requests' },
  { value: 'amount_desc', label: 'Amount' },
  { value: 'expiry_asc', label: 'Expiry date' },
  { value: 'status', label: 'Status' },
]
const RENEWAL_MODAL_BASE_WIDTH = 930
const RENEWAL_MODAL_VIEWPORT_GUTTER = 16
const STATUS_BADGE_BASE = 'inline-flex min-h-[30px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold leading-none ring-1'
const NEEDS_ACTION_BADGE = 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-200/80'

function resolveAssetUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`
}

function formatDate(value) {
  if (!value) return ' - '
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN')
}

function normalizeDateInput(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const displayMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (displayMatch) {
    const [, day, month, year] = displayMatch
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayIso() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString().slice(0, 10)
}

function addYears(dateString, years = 1) {
  const normalized = normalizeDateInput(dateString) || todayIso()
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return todayIso()
  parsed.setFullYear(parsed.getFullYear() + years)
  return parsed.toISOString().slice(0, 10)
}

function isFutureDate(value) {
  const normalized = normalizeDateInput(value)
  if (!normalized) return false
  return normalized > todayIso()
}

function extensionLabel(row) {
  if (row.old_expiry_date && row.new_expiry_date) {
    const days = Math.round((new Date(row.new_expiry_date) - new Date(row.old_expiry_date)) / 86400000)
    const months = Math.round(days / 30)
    if (months >= 36) return '+3 years'
    if (months >= 24) return '+2 years'
    if (months >= 12) return '+1 year'
    if (months >= 6) return '+6 months'
    if (months > 0) return `+${months} months`
  }

  const name = (row.package_name || '').toLowerCase()
  if (name.includes('3 year') || name.includes('3year')) return '+3 years'
  if (name.includes('2 year') || name.includes('2year')) return '+2 years'
  if (name.includes('year')) return '+1 year'
  return 'Pending review'
}

function statusConfig(status) {
  switch (status) {
    case 'verified':
    case 'completed':
      return { label: status === 'completed' ? 'Completed' : 'Approved', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/90', tone: 'done' }
    case 'rejected':
      return { label: 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-200/90', tone: 'done' }
    case 'payment_submitted':
      return { label: 'Payment Pending', cls: 'bg-blue-50 text-blue-700 ring-blue-200/90', tone: 'attention' }
    case 'under_review':
      return { label: 'Pending Review', cls: 'bg-amber-50 text-amber-700 ring-amber-200/90', tone: 'attention' }
    default:
      return { label: 'Pending Review', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-200/90', tone: 'attention' }
  }
}

function rowTone(status) {
  return ['pending', 'payment_submitted', 'under_review'].includes(status)
    ? 'border-l-4 border-l-amber-200 bg-amber-50/30'
    : 'border-l-4 border-l-transparent bg-white'
}

function isProcessed(status) {
  return ['verified', 'completed', 'rejected'].includes(status)
}

function needsAction(status) {
  return ['pending', 'payment_submitted', 'under_review'].includes(status)
}

function validateVerifyForm(form) {
  const errors = {}

  if (!form.action) errors.action = 'Select an action.'

  if (form.action === 'approve') {
    const normalizedDate = normalizeDateInput(form.newExpiryDate)
    if (!normalizedDate) {
      errors.newExpiryDate = 'Select a new expiry date.'
    } else if (!isFutureDate(normalizedDate)) {
      errors.newExpiryDate = 'Expiry date must be in the future.'
    }
  }

  return errors
}

function validateNewRenewal(form) {
  const errors = {}
  if (!String(form.submission_id || '').trim()) errors.submission_id = 'Submission ID is required.'

  const normalizedDate = normalizeDateInput(form.new_expiry_date)
  if (!normalizedDate) {
    errors.new_expiry_date = 'Select a new expiry date.'
  } else if (!isFutureDate(normalizedDate)) {
    errors.new_expiry_date = 'Expiry date must be in the future.'
  }

  if (form.amount && Number(form.amount) < 0) errors.amount = 'Amount cannot be negative.'
  return errors
}

function SummaryCard({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function getInitials(name) {
  return String(name || 'Member')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'M'
}

function getStatusIcon(status) {
  if (status === 'rejected') return XCircle
  if (status === 'verified' || status === 'completed') return BadgeCheck
  return Clock3
}

function StatusBadge({ status, className = '' }) {
  const badge = statusConfig(status)
  const Icon = getStatusIcon(status)

  return (
    <span className={`${STATUS_BADGE_BASE} gap-1.5 px-4 ${badge.cls} ${className}`}>
      <Icon size={12} />
      {badge.label}
    </span>
  )
}

function InfoTile({ label, icon: Icon, tone = 'slate', children, className = '' }) {
  const tones = {
    emerald: 'border-emerald-100/80 bg-white shadow-sm shadow-emerald-100/40',
    violet: 'border-violet-100/80 bg-white shadow-sm shadow-violet-100/40',
    blue: 'border-blue-100/80 bg-white shadow-sm shadow-blue-100/40',
    amber: 'border-amber-100/80 bg-white shadow-sm shadow-amber-100/40',
    slate: 'border-slate-100 bg-white shadow-sm shadow-slate-200/40',
  }

  const iconTones = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  }

  return (
    <div className={`rounded-[22px] border p-3.5 sm:p-4 ${tones[tone] || tones.slate} ${className}`}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${iconTones[tone] || iconTones.slate}`}>
            <Icon size={15} />
          </div>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  )
}

function ReceiptEmptyState() {
  return (
    <div className="flex min-h-[136px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-5 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <ImageOff size={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">No receipt uploaded</p>
      <p className="mt-1.5 max-w-[200px] text-xs leading-5 text-slate-500">This renewal request does not include a payment proof file.</p>
    </div>
  )
}

function WorkflowMetaCard({ icon: Icon, label, tone = 'slate', children }) {
  const tones = {
    blue: 'bg-blue-50/55 ring-blue-100',
    violet: 'bg-violet-50/55 ring-violet-100',
    amber: 'bg-amber-50/55 ring-amber-100',
    slate: 'bg-slate-50/80 ring-slate-100',
  }

  const iconTones = {
    blue: 'bg-white text-blue-600',
    violet: 'bg-white text-violet-600',
    amber: 'bg-white text-amber-600',
    slate: 'bg-white text-slate-600',
  }

  return (
    <div className={`rounded-[22px] p-3.5 ring-1 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${iconTones[tone] || iconTones.slate}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <div className="mt-1.5">{children}</div>
        </div>
      </div>
    </div>
  )
}

function WorkflowStatusPanel({ row }) {
  const processor = row?.processed_by_name || row?.processed_by_email || 'System'

  return (
    <div className="rounded-[24px] border border-rose-100/80 bg-gradient-to-br from-white via-rose-50/40 to-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow status</p>
          <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600">Review the final outcome and audit trail for this request.</p>
        </div>
        <StatusBadge status={row?.status} className="min-h-[28px] min-w-[118px] px-3 text-[11px]" />
      </div>

      <div className="mt-3 space-y-2.5">
        <WorkflowMetaCard icon={CalendarDays} label="Processed date" tone="blue">
          <p className="text-[22px] font-semibold leading-none text-slate-900">{row?.processed_at ? formatDate(row.processed_at) : 'Not processed yet'}</p>
        </WorkflowMetaCard>
        <WorkflowMetaCard icon={User} label="Processed by" tone="violet">
          <p className="text-base font-semibold leading-6 text-slate-900">{row?.processed_at ? processor : 'Awaiting review'}</p>
          {row?.processed_by_email && row?.processed_by_name && (
            <p className="mt-0.5 text-xs text-slate-500">{row.processed_by_email}</p>
          )}
        </WorkflowMetaCard>
        <WorkflowMetaCard icon={FileText} label="Audit notes" tone="amber">
          <p className="text-sm leading-6 text-slate-700">{row?.notes || 'No audit notes were added for this request.'}</p>
        </WorkflowMetaCard>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return Array.from({ length: 5 }).map((_, index) => (
    <tr key={index} className="border-l-4 border-l-transparent bg-white">
      <td className="px-4 py-4"><div className="h-4 w-40 animate-pulse rounded bg-gray-100" /><div className="mt-2 h-3 w-52 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-4"><div className="h-4 w-32 animate-pulse rounded bg-gray-100" /><div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-4"><div className="h-4 w-20 animate-pulse rounded bg-gray-100" /><div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-4"><div className="h-4 w-28 animate-pulse rounded bg-gray-100" /><div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-4"><div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" /></td>
      <td className="px-4 py-4 text-right"><div className="ml-auto h-9 w-9 animate-pulse rounded-lg bg-gray-100" /></td>
    </tr>
  ))
}

function MobileSkeleton() {
  return Array.from({ length: 3 }).map((_, index) => (
    <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-3 w-44 animate-pulse rounded bg-gray-100" />
      <div className="mt-4 h-16 animate-pulse rounded-2xl bg-gray-50" />
    </div>
  ))
}

function RenewalActionMenu({ row, onView, onApprove, onReject }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const canAct = ['pending', 'payment_submitted', 'under_review'].includes(row.status)
  const receiptUrl = resolveAssetUrl(row.screenshot_path)

  useEffect(() => {
    function handler(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200/80 text-gray-400 transition duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={() => { setOpen(false); onView() }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye size={13} /> View Renewal
          </button>
          {receiptUrl && (
            <>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye size={13} /> View Receipt
              </a>
              <a
                href={receiptUrl}
                download
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download size={13} /> Download Receipt
              </a>
            </>
          )}
          {canAct && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => { setOpen(false); onApprove() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle2 size={13} /> Approve
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onReject() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RenewalTableRow({ row, onView, onApprove, onReject }) {
  const badge = statusConfig(row.status)

  return (
    <tr key={row.id} className={`${rowTone(row.status)} align-top transition-colors duration-150 hover:bg-gray-50/80`}>
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold leading-5 text-gray-900">{row.applicant_name || 'Unknown member'}</p>
            {needsAction(row.status) && (
              <span className={NEEDS_ACTION_BADGE}>Needs Action</span>
            )}
          </div>
          <div className="space-y-0.5 text-[11px] leading-5 text-gray-400/95">
            <p>{row.membership_id || 'No membership ID'}</p>
            <p className="truncate">{row.applicant_email || 'No email on file'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <p className="font-semibold leading-5 text-gray-900">{row.package_name || 'Current membership package'}</p>
          <p className="text-xs font-medium text-primary-700">{extensionLabel(row)}</p>
          <p className="text-[11px] leading-5 text-gray-400/95">Request ID #{row.id}</p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <p className="text-[15px] font-semibold leading-5 text-gray-900">{fmtAmount(row.amount, row.currency)}</p>
          <p className="text-xs leading-5 text-gray-500">{row.payment_method_name || 'Payment method not specified'}</p>
          <p className="break-all font-mono text-[10px] leading-5 text-gray-400/95">#{row.transaction_id || 'No transaction ID'}</p>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Current</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800">{formatDate(row.old_expiry_date || row.current_expiry)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Requested</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800">{row.new_expiry_date ? formatDate(row.new_expiry_date) : 'Pending approval'}</p>
          </div>
          <p className="pt-0.5 text-[10px] leading-5 text-gray-400/95">Submitted {formatDate(row.created_at)}</p>
        </div>
      </td>
      <td className="px-5 py-4 align-middle">
        <div className="space-y-2">
          <span className={`${STATUS_BADGE_BASE} min-w-[118px] ${badge.cls}`}>
            {badge.label}
          </span>
          {row.processed_at && <p className="text-[10px] leading-5 text-gray-400/95">Processed {formatDate(row.processed_at)}</p>}
        </div>
      </td>
      <td className="px-5 py-4 text-right align-middle">
        <RenewalActionMenu row={row} onView={onView} onApprove={onApprove} onReject={onReject} />
      </td>
    </tr>
  )
}

function RenewalMobileCard({ row, onView, onApprove, onReject }) {
  const badge = statusConfig(row.status)

  return (
    <div className={`${rowTone(row.status)} rounded-2xl border border-gray-200 p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-gray-900">{row.applicant_name || 'Unknown member'}</p>
            {needsAction(row.status) && (
              <span className={NEEDS_ACTION_BADGE}>Needs Action</span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-5 text-gray-400/95">{row.membership_id || 'No membership ID'} <span className="text-gray-300">•</span> {row.applicant_email || 'No email on file'}</p>
        </div>
        <RenewalActionMenu row={row} onView={onView} onApprove={onApprove} onReject={onReject} />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-gray-50 p-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Renewal</p>
          <p className="mt-1 font-medium text-gray-900">{row.package_name || 'Current membership package'}</p>
          <p className="mt-1 text-xs font-medium text-primary-700">{extensionLabel(row)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Payment</p>
          <p className="mt-1 font-semibold text-gray-900">{fmtAmount(row.amount, row.currency)}</p>
          <p className="text-xs text-gray-500">{row.payment_method_name || 'Payment method not specified'}</p>
          <p className="font-mono text-[11px] text-gray-400">#{row.transaction_id || 'No transaction ID'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Dates</p>
          <p className="mt-1 text-xs text-gray-600"><span className="font-medium text-gray-900">Current:</span> {formatDate(row.old_expiry_date || row.current_expiry)}</p>
          <p className="text-xs text-gray-600"><span className="font-medium text-gray-900">Requested:</span> {row.new_expiry_date ? formatDate(row.new_expiry_date) : 'Pending approval'}</p>
          <p className="mt-1 text-[11px] text-gray-400">Submitted {formatDate(row.created_at)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Status</p>
          <span className={`mt-1 ${STATUS_BADGE_BASE} min-w-[118px] ${badge.cls}`}>
            {badge.label}
          </span>
          {row.processed_at && <p className="mt-1 text-[11px] text-gray-400">Processed {formatDate(row.processed_at)}</p>}
        </div>
      </div>
    </div>
  )
}

function ConfirmationModal({ action, loading, onCancel, onConfirm, expiryDate }) {
  if (!action) return null

  const isApprove = action === 'approve'

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className={`inline-flex rounded-2xl p-3 ${isApprove ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {isApprove ? <BadgeCheck size={20} /> : <CircleAlert size={20} />}
        </div>
        <h4 className="mt-4 text-lg font-semibold text-gray-900">
          {isApprove ? 'Approve this renewal?' : 'Reject this renewal?'}
        </h4>
        <p className="mt-2 text-sm text-gray-500">
          {isApprove
            ? 'This will mark the renewal as approved, refresh the member status, and extend the expiry date.'
            : 'This will reject the renewal request and keep the membership unchanged.'}
        </p>
        {isApprove && expiryDate && (
          <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            New expiry date: <span className="font-semibold text-gray-900">{formatDate(expiryDate)}</span>
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            type="button"
            className={isApprove ? 'btn-primary inline-flex items-center justify-center gap-2' : 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Processing...' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

export default function RenewalsPage() {
  const queryClient = useQueryClient()
  const modalSurfaceRef = useRef(null)
  const modalScaleContentRef = useRef(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('latest')
  const [page, setPage] = useState(1)
  const [renewalModal, setRenewalModal] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [verifyForm, setVerifyForm] = useState(VERIFY_DEFAULT)
  const [verifyErrors, setVerifyErrors] = useState({})
  const [newForm, setNewForm] = useState(NEW_DEFAULT)
  const [newErrors, setNewErrors] = useState({})
  const [modalScale, setModalScale] = useState(1)
  const [modalScaledHeight, setModalScaledHeight] = useState(null)
  const deferredSearch = useDeferredValue(q)

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['renewals', { q: deferredSearch, status, sort, page }],
    queryFn: () => api.get('/renewals', {
      params: {
        q: deferredSearch,
        status,
        sort,
        page,
        per_page: 20,
      },
    }).then(response => response.data.data),
    placeholderData: previous => previous,
  })

  const { data: expiring = [] } = useQuery({
    queryKey: ['renewals-expiring'],
    queryFn: () => api.get('/renewals/expiring', { params: { days: 30 } }).then(response => response.data.data),
  })

  const { data: renewalDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['renewal-detail', renewalModal?.id],
    enabled: Boolean(renewalModal?.id),
    queryFn: () => api.get(`/renewals/${renewalModal.id}`).then(response => response.data.data),
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/renewals/${id}/verify`, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
      queryClient.invalidateQueries({ queryKey: ['renewals-expiring'] })
      setRenewalModal(null)
      setConfirmAction(null)
      setVerifyForm(VERIFY_DEFAULT)
      setVerifyErrors({})
      toast.success(variables.action === 'approve' ? 'Renewal approved successfully' : 'Renewal rejected successfully')
    },
    onError: err => toast.error(err.response?.data?.message || 'Unable to update renewal.'),
  })

  const newMut = useMutation({
    mutationFn: body => api.post('/renewals', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals'] })
      setShowNewModal(false)
      setNewForm(NEW_DEFAULT)
      setNewErrors({})
      toast.success('Renewal created successfully')
    },
    onError: err => toast.error(err.response?.data?.message || 'Unable to create renewal.'),
  })

  const rows = data?.data || []
  const total = data?.total || 0
  const pendingCount = rows.filter(row => ['pending', 'payment_submitted', 'under_review'].includes(row.status)).length
  const modalRow = renewalDetail || renewalModal
  const canReviewModal = modalRow && ['pending', 'payment_submitted', 'under_review'].includes(modalRow.status)
  const modalIsReadOnly = modalRow && isProcessed(modalRow.status)

  useEffect(() => {
    if (!renewalModal && !confirmAction) return undefined

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      if (confirmAction && !verifyMut.isPending) {
        setConfirmAction(null)
        return
      }
      if (renewalModal && !verifyMut.isPending) {
        closeRenewalModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [renewalModal, confirmAction, verifyMut.isPending])

  useEffect(() => {
    if (!renewalModal) return undefined

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [renewalModal])

  useEffect(() => {
    if (!renewalModal || !modalScaleContentRef.current) {
      setModalScale(1)
      setModalScaledHeight(null)
      return undefined
    }

    function measureModalFit() {
      if (!modalScaleContentRef.current) return

      const contentHeight = modalScaleContentRef.current.scrollHeight
      const availableWidth = Math.max(window.innerWidth - RENEWAL_MODAL_VIEWPORT_GUTTER * 2, 320)
      const availableHeight = Math.max(window.innerHeight - RENEWAL_MODAL_VIEWPORT_GUTTER * 2, 320)
      const widthScale = availableWidth / RENEWAL_MODAL_BASE_WIDTH
      const heightScale = availableHeight / contentHeight
      const nextScale = Math.min(1, widthScale, heightScale)

      setModalScale(nextScale)
      setModalScaledHeight(contentHeight * nextScale)
    }

    measureModalFit()

    const resizeObserver = new ResizeObserver(() => {
      measureModalFit()
    })

    resizeObserver.observe(modalScaleContentRef.current)
    window.addEventListener('resize', measureModalFit)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measureModalFit)
    }
  }, [renewalModal, detailLoading, modalIsReadOnly, verifyForm.action])

  function openRenewalModal(row, mode, action = 'approve') {
    setRenewalModal({ ...row, mode })
    setVerifyForm({
      action,
      newExpiryDate: normalizeDateInput(row.new_expiry_date) || addYears(row.current_expiry || row.old_expiry_date, 1),
      notes: row.notes || '',
    })
    setVerifyErrors({})
  }

  function closeRenewalModal() {
    if (verifyMut.isPending) return
    setRenewalModal(null)
    setConfirmAction(null)
    setVerifyForm(VERIFY_DEFAULT)
    setVerifyErrors({})
  }

  function submitVerification() {
    if (!modalRow?.id) return

    const errors = validateVerifyForm(verifyForm)
    if (Object.keys(errors).length > 0) {
      setVerifyErrors(errors)
      return
    }
    setConfirmAction({
      action: verifyForm.action,
      payload: {
        id: modalRow.id,
        renewalId: modalRow.id,
        memberId: modalRow.submission_id,
        action: verifyForm.action,
        newExpiryDate: normalizeDateInput(verifyForm.newExpiryDate),
        notes: verifyForm.notes.trim(),
      },
    })
  }

  function confirmVerification() {
    if (!confirmAction?.payload) return
    verifyMut.mutate(confirmAction.payload)
  }

  function submitNewRenewal() {
    const errors = validateNewRenewal(newForm)
    if (Object.keys(errors).length > 0) {
      setNewErrors(errors)
      return
    }

    newMut.mutate({
      submission_id: String(newForm.submission_id).trim(),
      new_expiry_date: normalizeDateInput(newForm.new_expiry_date),
      amount: newForm.amount === '' ? 0 : Number(newForm.amount),
      notes: String(newForm.notes || '').trim(),
    })
  }

  function clearSearch() {
    setQ('')
    setPage(1)
  }

  function resetFilters() {
    setQ('')
    setStatus('')
    setSort('latest')
    setPage(1)
  }

  function updateStatus(value) {
    setStatus(value)
    setPage(1)
  }

  function updateSort(value) {
    setSort(value)
    setPage(1)
  }

  function renderEmpty() {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto max-w-sm space-y-2">
          <p className="text-sm font-semibold text-gray-900">No renewal requests found</p>
          <p className="text-sm text-gray-500">Try changing the status, sorting, or search term.</p>
        </div>
      </div>
    )
  }

  function renderError() {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <CircleAlert className="text-red-500" size={24} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Unable to load renewals</p>
          <p className="mt-1 text-sm text-gray-500">{error?.response?.data?.message || 'The renewals list could not be loaded.'}</p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={() => refetch()}>Try Again</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <RefreshCw size={22} className="text-primary-600" />
            Renewals
          </h2>
          <p className="mt-1 text-sm text-gray-500">A workflow-first queue for reviewing receipts, approving renewals, and extending memberships.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-outline btn-sm inline-flex items-center gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching && <Loader2 size={14} className="animate-spin" />}
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="btn-primary btn-sm flex items-center gap-2" onClick={() => setShowNewModal(true)}>
            <Plus size={14} /> New Renewal
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard icon={RefreshCw} label="Total Requests" value={total} />
        <SummaryCard icon={BadgeCheck} label="Pending Review" value={pendingCount} tone="blue" />
        <SummaryCard icon={Clock3} label="Expiring in 30 Days" value={expiring.length} tone="amber" />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(240px,0.9fr)_minmax(240px,0.9fr)_auto]">
            <div className="relative min-w-0">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input h-11 pl-10 pr-10"
                placeholder="Search member, membership ID, or transaction ID"
                value={q}
                onChange={event => {
                  setQ(event.target.value)
                  setPage(1)
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <label className="flex min-w-0 items-center gap-2.5 text-sm text-gray-500">
              <Filter size={15} className="shrink-0 text-gray-400" />
              <select className="input h-11 min-w-0 flex-1" value={status} onChange={event => updateStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending Review</option>
                <option value="payment_submitted">Payment Pending</option>
                <option value="verified">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="flex min-w-0 items-center gap-2.5 text-sm text-gray-500">
              <ArrowDownUp size={15} className="shrink-0 text-gray-400" />
              <select className="input h-11 min-w-0 flex-1" value={sort} onChange={event => updateSort(event.target.value)}>
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-start lg:justify-end">
              {(q || status || sort !== 'latest') && (
                <button type="button" className="text-sm font-medium text-gray-500 transition hover:text-gray-700" onClick={resetFilters}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {isError ? renderError() : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full table-fixed text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/90 text-[11px] uppercase tracking-[0.18em] text-gray-600">
                  <tr>
                    <th className="w-[24%] px-5 py-3.5 text-left font-semibold">Member</th>
                    <th className="w-[22%] px-5 py-3.5 text-left font-semibold">Renewal</th>
                    <th className="w-[15%] px-5 py-3.5 text-left font-semibold">Payment</th>
                    <th className="w-[18%] px-5 py-3.5 text-left font-semibold">Dates</th>
                    <th className="w-[13%] px-5 py-3.5 text-left font-semibold">Status</th>
                    <th className="w-[8%] px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <TableSkeleton />
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6}>{renderEmpty()}</td></tr>
                  ) : rows.map(row => (
                    <RenewalTableRow
                      key={row.id}
                      row={row}
                      onView={() => openRenewalModal(row, 'view', row.status === 'rejected' ? 'reject' : 'approve')}
                      onApprove={() => openRenewalModal(row, 'review', 'approve')}
                      onReject={() => openRenewalModal(row, 'review', 'reject')}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {isLoading ? (
                <MobileSkeleton />
              ) : rows.length === 0 ? renderEmpty() : rows.map(row => (
                <RenewalMobileCard
                  key={row.id}
                  row={row}
                  onView={() => openRenewalModal(row, 'view', row.status === 'rejected' ? 'reject' : 'approve')}
                  onApprove={() => openRenewalModal(row, 'review', 'approve')}
                  onReject={() => openRenewalModal(row, 'review', 'reject')}
                />
              ))}
            </div>

            {total > 20 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 text-xs text-gray-500">
                <span>{(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
                  <button type="button" className="btn-outline btn-sm" disabled={page * 20 >= total} onClick={() => setPage(value => value + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {renewalModal && (
        <AdminModalPortal>
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-slate-950/55 p-4 backdrop-blur-[2px]"
            onMouseDown={event => {
              if (event.target === event.currentTarget && !verifyMut.isPending) closeRenewalModal()
            }}
          >
            <div className="relative flex items-start justify-center" style={{ width: `${RENEWAL_MODAL_BASE_WIDTH * modalScale}px`, height: modalScaledHeight ? `${modalScaledHeight}px` : 'auto' }}>
          <div ref={modalSurfaceRef} className="absolute left-0 top-0 flex w-[930px] flex-col overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.06),_transparent_24%),linear-gradient(to_bottom,_#ffffff,_#fbfcff)] shadow-2xl ring-1 ring-slate-200/80" style={{ transform: `scale(${modalScale})`, transformOrigin: 'top left' }}>
            <div ref={modalScaleContentRef}>
            <div className="shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Renewal workflow</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950">{renewalModal.mode === 'review' ? 'Review renewal request' : 'Renewal details'}</h3>
                  {modalRow && (
                    <StatusBadge status={modalRow.status} className="min-h-[28px] min-w-[118px] px-3 text-[11px]" />
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {modalIsReadOnly
                    ? 'This request has already been processed and is now available in read-only mode.'
                    : 'Verify payment proof, confirm the expiry extension, and apply the decision.'}
                </p>
              </div>
              <button type="button" onClick={closeRenewalModal} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-600">
                <X size={18} />
              </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-6 py-16 text-sm text-gray-500 sm:px-7">
                <Loader2 size={16} className="animate-spin" /> Loading renewal details...
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 px-5 pb-3 pt-4 sm:px-6">
                  <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className="space-y-3">
                  <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/25 to-slate-50/40 p-4 shadow-sm shadow-slate-200/60">
                    <div className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/70 p-3.5 shadow-sm shadow-indigo-100/40 backdrop-blur-sm">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-lg font-semibold text-violet-700">
                        {getInitials(modalRow?.applicant_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[16px] font-semibold tracking-[-0.02em] text-slate-950">{modalRow?.applicant_name || 'Unknown member'}</h4>
                          {needsAction(modalRow?.status) && (
                            <span className={NEEDS_ACTION_BADGE}>Needs Action</span>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">{modalRow?.membership_id || 'No membership ID'} <span className="mx-1 text-slate-300">•</span> {modalRow?.applicant_email || 'No email on file'}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <InfoTile label="Payment" icon={CreditCard} tone="emerald">
                        <p className="text-[16px] font-semibold text-slate-950">{fmtAmount(modalRow?.amount, modalRow?.currency)}</p>
                        <p className="mt-2 text-sm text-slate-600">{modalRow?.payment_method_name || 'Payment method not specified'}</p>
                        <p className="mt-1.5 font-mono text-xs text-slate-400">#{modalRow?.transaction_id || 'No transaction ID'}</p>
                      </InfoTile>
                      <InfoTile label="Renewal" icon={RefreshCw} tone="violet">
                        <p className="text-[16px] font-semibold leading-7 text-slate-950">{modalRow?.package_name || 'Current membership package'}</p>
                        <p className="mt-2 text-sm font-medium text-primary-700">{extensionLabel(modalRow || {})}</p>
                        <p className="mt-1.5 text-xs text-slate-400">Request ID #{modalRow?.id}</p>
                      </InfoTile>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <InfoTile label="Dates" icon={CalendarDays} tone="blue" className="text-sm text-slate-700">
                        <div className="space-y-2.5">
                          <p className="text-sm"><span className="font-semibold text-slate-900">Current:</span> {formatDate(modalRow?.current_expiry || modalRow?.old_expiry_date)}</p>
                          <p className="text-sm"><span className="font-semibold text-slate-900">Requested:</span> {modalRow?.new_expiry_date ? formatDate(modalRow.new_expiry_date) : 'Pending approval'}</p>
                          <p className="pt-0.5 text-xs text-slate-400">Submitted {formatDate(modalRow?.created_at)}</p>
                        </div>
                      </InfoTile>
                      <InfoTile label="Receipt" icon={FileSearch} tone="amber" className="min-h-[190px]">
                        {modalRow?.screenshot_path ? (
                          <div className="mt-1 flex flex-wrap gap-2.5">
                            <a href={resolveAssetUrl(modalRow.screenshot_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2 text-sm font-medium text-primary-700 shadow-sm shadow-primary-100/50 transition hover:bg-primary-100">
                              <Eye size={14} /> View Receipt
                            </a>
                            <a href={resolveAssetUrl(modalRow.screenshot_path)} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                              <Download size={14} /> Download
                            </a>
                          </div>
                        ) : (
                          <ReceiptEmptyState />
                        )}
                      </InfoTile>
                    </div>
                  </div>
                    </div>

                    <div className="space-y-3">
                      {renewalModal.mode === 'review' && canReviewModal && !modalIsReadOnly ? (
                        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm">
                          <p className="text-sm font-semibold text-slate-950">Decision</p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-500">Confirm the action and add any internal notes for the audit trail.</p>
                          <div className="mt-4 space-y-4">
                            <div>
                              <label className="label">Action</label>
                              <select
                                className="input"
                                value={verifyForm.action}
                                onChange={event => {
                                  setVerifyForm(current => ({ ...current, action: event.target.value }))
                                  setVerifyErrors(current => ({ ...current, action: '', newExpiryDate: '' }))
                                }}
                              >
                                <option value="approve">Approve</option>
                                <option value="reject">Reject</option>
                              </select>
                              {verifyErrors.action && <p className="mt-2 text-xs font-medium text-red-600">{verifyErrors.action}</p>}
                            </div>

                            {verifyForm.action === 'approve' && (
                              <div>
                                <label className="label">New Expiry Date</label>
                                <input
                                  type="date"
                                  min={todayIso()}
                                  className="input"
                                  value={verifyForm.newExpiryDate}
                                  onChange={event => {
                                    setVerifyForm(current => ({ ...current, newExpiryDate: event.target.value }))
                                    setVerifyErrors(current => ({ ...current, newExpiryDate: '' }))
                                  }}
                                />
                                {verifyErrors.newExpiryDate && <p className="mt-2 text-xs font-medium text-red-600">{verifyErrors.newExpiryDate}</p>}
                              </div>
                            )}

                            <div>
                              <label className="label">Admin Notes</label>
                              <textarea
                                rows={4}
                                className="input"
                                placeholder="Optional notes for internal review"
                                value={verifyForm.notes}
                                onChange={event => setVerifyForm(current => ({ ...current, notes: event.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <WorkflowStatusPanel row={modalRow} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t border-slate-100 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
                  <div className="flex flex-col-reverse gap-2.5 rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 sm:flex-row sm:justify-end">
                    <button type="button" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" onClick={closeRenewalModal} disabled={verifyMut.isPending}>
                      {modalIsReadOnly ? 'Close' : 'Cancel'}
                    </button>
                    {renewalModal.mode === 'review' && canReviewModal && !modalIsReadOnly && (
                      <button
                        type="button"
                        className={verifyForm.action === 'approve' ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-200 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60' : 'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'}
                        onClick={submitVerification}
                        disabled={verifyMut.isPending || Boolean(confirmAction)}
                      >
                        {verifyMut.isPending && <Loader2 size={16} className="animate-spin" />}
                        {verifyMut.isPending ? 'Processing...' : verifyForm.action === 'approve' ? 'Approve Renewal' : 'Reject Renewal'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            </div>
            </div>
            </div>
          </div>
        </AdminModalPortal>
      )}

      <ConfirmationModal
        action={confirmAction?.action}
        loading={verifyMut.isPending}
        expiryDate={confirmAction?.payload?.newExpiryDate}
        onCancel={() => !verifyMut.isPending && setConfirmAction(null)}
        onConfirm={confirmVerification}
      />

      {showNewModal && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Manual renewal</p>
                <h3 className="mt-1 text-xl font-semibold text-gray-900">Create renewal record</h3>
              </div>
              <button type="button" onClick={() => setShowNewModal(false)} className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 pt-5">
              <div>
                <label className="label">Submission ID</label>
                <input
                  className="input"
                  placeholder="Enter the member submission ID"
                  value={newForm.submission_id}
                  onChange={event => {
                    setNewForm(current => ({ ...current, submission_id: event.target.value }))
                    setNewErrors(current => ({ ...current, submission_id: '' }))
                  }}
                />
                {newErrors.submission_id && <p className="mt-2 text-xs font-medium text-red-600">{newErrors.submission_id}</p>}
              </div>

              <div>
                <label className="label">New Expiry Date</label>
                <input
                  type="date"
                  min={todayIso()}
                  className="input"
                  value={newForm.new_expiry_date}
                  onChange={event => {
                    setNewForm(current => ({ ...current, new_expiry_date: event.target.value }))
                    setNewErrors(current => ({ ...current, new_expiry_date: '' }))
                  }}
                />
                {newErrors.new_expiry_date && <p className="mt-2 text-xs font-medium text-red-600">{newErrors.new_expiry_date}</p>}
              </div>

              <div>
                <label className="label">Amount Paid</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={newForm.amount}
                  onChange={event => {
                    setNewForm(current => ({ ...current, amount: event.target.value }))
                    setNewErrors(current => ({ ...current, amount: '' }))
                  }}
                />
                {newErrors.amount && <p className="mt-2 text-xs font-medium text-red-600">{newErrors.amount}</p>}
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  rows={4}
                  className="input"
                  placeholder="Optional internal notes"
                  value={newForm.notes}
                  onChange={event => setNewForm(current => ({ ...current, notes: event.target.value }))}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" className="btn-outline" onClick={() => setShowNewModal(false)} disabled={newMut.isPending}>Cancel</button>
              <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" disabled={newMut.isPending} onClick={submitNewRenewal}>
                {newMut.isPending && <Loader2 size={16} className="animate-spin" />}
                {newMut.isPending ? 'Creating...' : 'Create Renewal'}
              </button>
            </div>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  )
}
