import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, Eye, Loader2, X, MoreVertical, ChevronUp, ChevronDown, Shield,
  Edit2, XCircle, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import CopyMembershipId from '../../../components/admin/CopyMembershipId'

async function downloadWithAuth(url, filename) {
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Download failed')
  }
}

function durationLabel(row) {
  const name = (row.package_name || '').toLowerCase()
  if (name.includes('lifetime')) return 'Lifetime'
  if (name.includes('3 year') || name.includes('3year')) return '3 Years'
  if (name.includes('2 year') || name.includes('2year')) return '2 Years'
  if (name.includes('year')) return '1 Year'
  const pt = (row.plan_type || '').toLowerCase()
  if (pt === 'lifetime') return 'Lifetime'
  if (pt === '3years')   return '3 Years'
  if (pt === '2years')   return '2 Years'
  if (pt === 'yearly')   return '1 Year'
  if (row.expiry_date)   return '1 Year'
  return '—'
}

function expiryDisplay(row) {
  if (row.expiry_date) return new Date(row.expiry_date).toLocaleDateString('en-IN')
  const name = (row.package_name || '').toLowerCase()
  if (name.includes('lifetime')) return 'Lifetime'
  return '—'
}

function StatusBadge({ status }) {
  const MAP = {
    active:    'bg-emerald-100 text-emerald-700',
    suspended: 'bg-red-100 text-red-600',
    expired:   'bg-yellow-100 text-yellow-700',
    inactive:  'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-700',
  }
  const LABEL = { active: 'Active', suspended: 'Suspended', expired: 'Expired', inactive: 'Inactive', cancelled: 'Cancelled' }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${MAP[status] || 'bg-gray-100 text-gray-500'}`}>
      {LABEL[status] || status || '—'}
    </span>
  )
}

function buildPageItems(current, lastPage) {
  if (lastPage <= 1) return [1]
  const pages = new Set([1, lastPage, current, current - 1, current + 1, current - 2, current + 2])
  const sorted = [...pages].filter(p => p >= 1 && p <= lastPage).sort((a, b) => a - b)
  const items = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push('…')
    items.push(sorted[i])
  }
  return items
}

// ── Cancel Membership Modal ───────────────────────────────────────────────────
function CancelMembershipModal({ member, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await api.patch(`/members/${member.id}/status`, {
        status: 'cancelled',
        reason: reason.trim(),
        note: note.trim() || null,
      })
      toast.success(`Membership cancelled for ${member.applicant_name}`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel membership')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="bg-red-50 border-b border-red-200 px-5 py-4 rounded-t-2xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle size={18} className="text-red-600"/>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base">Cancel Membership?</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Are you sure you want to cancel the membership of <strong>{member.applicant_name}</strong>?
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X size={18}/>
            </button>
          </div>

          <div className="px-5 pt-4 pb-2">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1 border border-gray-100">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Member ID</span>
                <span className="font-mono font-semibold text-primary-700">{member.membership_id || '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-800 truncate">{member.applicant_email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Package</span>
                <span className="text-gray-800">{member.package_name || '—'}</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input w-full text-sm resize-none"
                rows={3}
                placeholder="Enter the reason for cancellation…"
                value={reason}
                onChange={e => setReason(e.target.value)}
                autoFocus
              />
              {!reason.trim() && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11}/> Cancellation reason is required.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Admin Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input w-full text-sm resize-none"
                rows={2}
                placeholder="Internal note for admin records (not sent to member)…"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">This action will:</p>
              <p>• Set membership status to <strong>Cancelled</strong></p>
              <p>• Record the cancellation date and reason</p>
              <p>• Remove member portal access</p>
              <p>• Keep the member record for history and audit</p>
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || !reason.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>}
              Cancel Membership
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
            >
              Keep Membership
            </button>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Actions Dropdown (portal so sticky/scroll containers do not clip it) ─────
function ActionsMenu({ row, onCancelClick }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    function handler(e) {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  function toggle() {
    if (open) { setOpen(false); return }
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const menuHeight = 140
    const openUp = rect.bottom + menuHeight > window.innerHeight - 12
    setPos({
      top: openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    })
    setOpen(true)
  }

  return (
    <div className="relative inline-flex justify-end" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={15}/>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[1200] bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 w-44 text-sm"
          style={{ top: pos.top, right: pos.right }}
          role="menu"
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 font-medium"
            onClick={() => { setOpen(false); navigate(`/members/${row.id}/full`) }}
          >
            <Eye size={14} className="text-primary-500"/> View Profile
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 font-medium"
            onClick={() => { setOpen(false); navigate(`/members/${row.id}/full`) }}
          >
            <Edit2 size={14} className="text-blue-500"/> Edit Member
          </button>
          {row.member_status === 'active' && (
            <>
              <div className="border-t border-gray-100 my-1"/>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2.5 text-red-600 font-medium"
                onClick={() => { setOpen(false); onCancelClick(row) }}
              >
                <XCircle size={14}/> Cancel Membership
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

const TYPE_BADGE = {
  corporate:  'bg-purple-100 text-purple-700',
  individual: 'bg-blue-100 text-blue-700',
}

const PER_PAGE = 20

// ── Main Component ────────────────────────────────────────────────────────────
export default function MembersList() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const [qInput, setQInput]                 = useState('')
  const [q, setQ]                           = useState('')
  const [memberStatus, setMemberStatus]     = useState('active')
  const [typeFilter, setTypeFilter]         = useState('')
  const [pkgFilter, setPkgFilter]           = useState('') // package_id as string
  const [wingFilter, setWingFilter]         = useState('')
  const [page, setPage]                     = useState(1)
  const [sortBy, setSortBy]                 = useState(null)
  const [sortDir, setSortDir]               = useState('asc')
  const [cancelTarget, setCancelTarget]     = useState(null)

  // Debounce search — only push q when value actually changes
  useEffect(() => {
    const next = qInput.trim()
    const t = setTimeout(() => {
      setQ(prev => {
        if (prev === next) return prev
        setPage(1)
        return next
      })
    }, 300)
    return () => clearTimeout(t)
  }, [qInput])

  const { data: filterOptions, isLoading: filtersLoading } = useQuery({
    queryKey: ['members-filter-options'],
    queryFn: () => api.get('/members/filter-options').then(r => r.data.data || {}),
  })

  const packageOptions = useMemo(() => {
    const list = filterOptions?.packages || []
    if (!typeFilter) return list
    return list.filter(p => {
      if (!p.membership_type) return true
      return String(p.membership_type).toLowerCase() === typeFilter.toLowerCase()
    })
  }, [filterOptions, typeFilter])

  const wingOptions = filterOptions?.wings || []
  const typeOptions = filterOptions?.types?.length
    ? filterOptions.types
    : [
        { value: 'individual', label: 'Individual' },
        { value: 'corporate', label: 'Corporate' },
      ]
  const statusOptions = filterOptions?.statuses?.length
    ? filterOptions.statuses
    : [
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'cancelled', label: 'Cancelled' },
      ]

  // If selected package is incompatible with type filter, clear it
  useEffect(() => {
    if (!pkgFilter || !typeFilter) return
    const stillValid = packageOptions.some(p => String(p.id) === String(pkgFilter))
    if (!stillValid) {
      setPkgFilter('')
      setPage(1)
    }
  }, [typeFilter, packageOptions, pkgFilter])

  const membersQueryKey = [
    'members',
    q || '',
    memberStatus || '',
    typeFilter || '',
    pkgFilter || '',
    wingFilter || '',
    page,
    sortBy || '',
    sortDir || 'asc',
  ]

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: membersQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, qq, status, type, pkg, wing, pg, sort, dir] = queryKey
      const res = await api.get('/members', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        params: {
          q: qq || undefined,
          member_status: status || undefined,
          membership_type: type || undefined,
          package_id: pkg || undefined,
          wing_id: wing || undefined,
          sort_by: sort || undefined,
          sort_dir: sort ? dir : undefined,
          page: pg,
          per_page: PER_PAGE,
          _ts: Date.now(), // bust HTTP/proxy cache
        },
      })
      // Support both shapes: { data: [], total } or accidental nested wrappers
      const payload = res?.data?.data
      if (Array.isArray(payload)) {
        return { data: payload, total: payload.length, page: Number(pg) || 1, lastPage: 1, perPage: PER_PAGE }
      }
      if (payload && Array.isArray(payload.data)) return payload
      return { data: [], total: 0, page: 1, lastPage: 1, perPage: PER_PAGE }
    },
  })

  // HARD GUARANTEE: even if API/cache returns extra rows, UI only shows matching filters
  const rows = useMemo(() => {
    const list = Array.isArray(data?.data) ? data.data : []
    return list.filter(row => {
      if (memberStatus) {
        if (memberStatus === 'expired') {
          const expiredByStatus = String(row.member_status || '').toLowerCase() === 'expired'
          const expiredByDate = row.days_to_expiry != null && Number(row.days_to_expiry) < 0
          if (!expiredByStatus && !expiredByDate) return false
        } else if (String(row.member_status || '').toLowerCase() !== memberStatus.toLowerCase()) {
          return false
        }
      }
      if (typeFilter && String(row.membership_type || '').toLowerCase() !== typeFilter.toLowerCase()) {
        return false
      }
      if (pkgFilter && String(row.package_id ?? '') !== String(pkgFilter)) {
        return false
      }
      if (wingFilter && String(row.wing_id ?? '') !== String(wingFilter)) {
        return false
      }
      if (q) {
        const qq = q.toLowerCase()
        const hay = `${row.applicant_name || ''} ${row.applicant_email || ''} ${row.membership_id || ''}`.toLowerCase()
        if (!hay.includes(qq)) return false
      }
      return true
    })
  }, [data, memberStatus, typeFilter, pkgFilter, wingFilter, q])

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (memberStatus) params.set('member_status', memberStatus)
      if (typeFilter) params.set('membership_type', typeFilter)
      if (pkgFilter) params.set('package_id', pkgFilter)
      if (wingFilter) params.set('wing_id', wingFilter)
      const qs = params.toString()
      await downloadWithAuth(`/reports/export/members${qs ? `?${qs}` : ''}`, 'members.csv')
      toast.success('CSV downloaded')
    } catch (err) {
      toast.error(err.message || 'Export failed')
    }
  }

  const total       = typeof data?.total === 'number' ? data.total : rows.length
  const lastPage    = Math.max(1, data?.lastPage || 1)
  const currentPage = data?.page || page
  const pageItems   = buildPageItems(currentPage, lastPage)
  const from        = total === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1
  const to          = Math.min(currentPage * PER_PAGE, total)
  const showLoading = isLoading || (isFetching && !data)

  const selectedPackageName = packageOptions.find(p => String(p.id) === String(pkgFilter))?.name
  const selectedWingName = wingOptions.find(w => String(w.id) === String(wingFilter))?.name
  const filterSummary = [
    memberStatus && `Status: ${memberStatus}`,
    typeFilter && `Type: ${typeFilter}`,
    pkgFilter && `Package: ${selectedPackageName || `#${pkgFilter}`}`,
    wingFilter && `Wing: ${selectedWingName || `#${wingFilter}`}`,
    q && `Search: “${q}”`,
  ].filter(Boolean)

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span className="text-gray-300 ml-0.5 text-[10px]">⇅</span>
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary-500" />
      : <ChevronDown size={12} className="text-primary-500" />
  }

  function applyFilter(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setQInput('')
    setQ('')
    setMemberStatus('')
    setTypeFilter('')
    setPkgFilter('')
    setWingFilter('')
    setSortBy(null)
    setSortDir('asc')
    setPage(1)
  }

  const hasActiveFilters = !!(q || memberStatus || typeFilter || pkgFilter || wingFilter)

  return (
    <div className="space-y-5 min-w-0 max-w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <p className="text-gray-500 text-sm">
            {showLoading ? 'Loading…' : (
              <>
                Showing <strong className="text-gray-800">{rows.length}</strong>
                {hasActiveFilters ? ' matching filter' : ' member'}{rows.length === 1 ? '' : 's'}
                {typeof data?.total === 'number' && data.total !== rows.length && (
                  <span className="text-gray-400"> (server total {data.total})</span>
                )}
              </>
            )}
            {isFetching && !showLoading && <span className="ml-2 text-primary-500">Updating…</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="btn-outline btn-sm">
              Clear Filters
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-outline btn-sm flex items-center gap-1"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-3 sm:p-4 flex flex-wrap gap-3 min-w-0">
        <div className="flex-1 min-w-[180px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search name, email, ID…"
            value={qInput}
            onChange={e => setQInput(e.target.value)}
          />
        </div>
        <select className="input w-full sm:w-40" value={memberStatus} onChange={applyFilter(setMemberStatus)}>
          <option value="">All Status</option>
          {statusOptions.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}{s.member_count != null ? ` (${s.member_count})` : ''}
            </option>
          ))}
        </select>
        <select className="input w-full sm:w-40" value={typeFilter} onChange={applyFilter(setTypeFilter)}>
          <option value="">All Types</option>
          {typeOptions.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}{t.member_count != null ? ` (${t.member_count})` : ''}
            </option>
          ))}
        </select>
        <select
          className="input w-full sm:w-56"
          value={pkgFilter}
          onChange={applyFilter(setPkgFilter)}
          disabled={filtersLoading}
        >
          <option value="">All Packages</option>
          {packageOptions.map(p => (
            <option key={p.id} value={String(p.id)}>
              {p.name}{p.member_count != null ? ` (${p.member_count})` : ''}
            </option>
          ))}
        </select>
        <select className="input w-full sm:w-40" value={wingFilter} onChange={applyFilter(setWingFilter)}>
          <option value="">All Wings</option>
          {wingOptions.map(w => (
            <option key={w.id} value={String(w.id)}>
              {w.name}{w.member_count != null ? ` (${w.member_count})` : ''}
            </option>
          ))}
        </select>
      </div>

      {filterSummary.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filterSummary.map(item => (
            <span key={item} className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 border border-primary-100 px-2.5 py-1 font-medium">
              {item}
            </span>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load members{error?.response?.data?.message ? `: ${error.response.data.message}` : '.'} Try again.
        </div>
      )}

      {/* ── Mobile / tablet cards (no squeeze) ── */}
      <div className="md:hidden space-y-3">
        {showLoading ? (
          <div className="card p-8 text-center text-gray-400">
            <Loader2 size={20} className="animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 space-y-2">
            <p className="font-medium text-gray-700">No members match these filters</p>
            {filterSummary.length > 0 && (
              <p className="text-sm text-gray-400">{filterSummary.join(' · ')}</p>
            )}
            <button type="button" onClick={clearFilters} className="btn-outline btn-sm mt-2">
              Clear Filters
            </button>
          </div>
        ) : rows.map(row => {
          const isExpiringSoon = row.days_to_expiry != null && row.days_to_expiry >= 0 && row.days_to_expiry <= 30
          const isExpired      = row.days_to_expiry != null && row.days_to_expiry < 0
          return (
            <div
              key={row.id}
              className="card p-4 space-y-3 cursor-pointer hover:border-primary-200 transition"
              onClick={() => navigate(`/members/${row.id}/full`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{row.applicant_name}</div>
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <CopyMembershipId id={row.membership_id} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={row.member_status} />
                  <ActionsMenu row={row} onCancelClick={setCancelTarget} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Organization</p>
                  <p className="text-gray-700 truncate">{row.organisation_name || row.organization_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Wing</p>
                  <p className="text-gray-700 truncate">{row.wing_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Package</p>
                  <p className="text-gray-700 truncate">{row.package_name || row.form_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Expiry</p>
                  <p className={isExpiringSoon ? 'text-yellow-700 font-semibold' : 'text-gray-700'}>
                    {expiryDisplay(row)}
                    {isExpiringSoon && <span className="ml-1 text-[10px] text-orange-600">Soon</span>}
                    {isExpired && <span className="ml-1 text-[10px] text-red-600">Expired</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {row.membership_type && (
                  <span className={`font-semibold px-2 py-0.5 rounded-full uppercase ${TYPE_BADGE[row.membership_type.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                    {row.membership_type}
                  </span>
                )}
                <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{durationLabel(row)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop / tablet table: internal horizontal scroll only ── */}
      <div className="hidden md:block card overflow-hidden min-w-0 max-w-full">
        <div className="members-table-scroll">
          <table className="members-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky-id px-4 py-3 text-left font-medium text-gray-600">Member ID</th>
                <th
                  className="sticky-name px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Organization</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Wing</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Package</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Start Date</th>
                <th
                  className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleSort('expiry')}
                >
                  <span className="flex items-center gap-1">Expiry Date <SortIcon col="expiry" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="sticky-actions px-3 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {showLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-500">
                    <p className="font-medium text-gray-700">No members match these filters</p>
                    {filterSummary.length > 0 && (
                      <p className="text-sm text-gray-400 mt-1">{filterSummary.join(' · ')}</p>
                    )}
                    <button type="button" onClick={clearFilters} className="btn-outline btn-sm mt-3">
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : rows.map(row => {
                const isExpiringSoon = row.days_to_expiry != null && row.days_to_expiry >= 0 && row.days_to_expiry <= 30
                const isExpired      = row.days_to_expiry != null && row.days_to_expiry < 0
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/members/${row.id}/full`)}
                  >
                    <td className="sticky-id px-4 py-3 font-mono text-xs font-bold text-primary-700">
                      <div onClick={e => e.stopPropagation()}>
                        <CopyMembershipId id={row.membership_id} />
                      </div>
                    </td>

                    <td className="sticky-name px-4 py-3 whitespace-normal">
                      <div className="font-medium text-gray-900 leading-snug">{row.applicant_name}</div>
                      {row.position && (
                        <div className="mt-0.5 mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider border border-blue-100">
                          <Shield size={10} /> {row.position}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 truncate max-w-[220px]">{row.applicant_email}</div>
                      {row.applicant_phone && (
                        <div className="text-xs text-gray-400">{row.applicant_phone}</div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                      {row.organisation_name || row.organization_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.wing_name || '—'}</td>

                    <td className="px-4 py-3">
                      {row.membership_type ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${TYPE_BADGE[row.membership_type.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                          {row.membership_type}
                        </span>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">
                      {row.package_name || row.form_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{durationLabel(row)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-IN') : '—'}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      <div>
                        <span className={isExpiringSoon ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                          {expiryDisplay(row)}
                        </span>
                        {isExpiringSoon && (
                          <span className="block mt-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full w-fit whitespace-nowrap">
                            Expiring Soon
                          </span>
                        )}
                        {isExpired && (
                          <span className="block mt-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full w-fit">
                            Expired
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3"><StatusBadge status={row.member_status} /></td>

                    <td className="sticky-actions px-3 py-3 text-right">
                      <ActionsMenu row={row} onCancelClick={setCancelTarget}/>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-gray-500 bg-gray-50/60">
            <span>
              Showing <strong className="text-gray-700">{from}-{to}</strong> of{' '}
              <strong className="text-gray-700">{total.toLocaleString('en-IN')}</strong>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                className="btn-outline btn-sm inline-flex items-center gap-1"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              {pageItems.map((item, idx) => (
                item === '…' ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-semibold transition ${
                      item === currentPage
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              ))}
              <button
                type="button"
                className="btn-outline btn-sm inline-flex items-center gap-1"
                disabled={currentPage >= lastPage}
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile pagination */}
      {total > 0 && (
        <div className="md:hidden card px-4 py-3 flex items-center justify-between gap-2 text-sm text-gray-500">
          <span>{from}-{to} / {total}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="self-center text-xs font-semibold text-gray-700">
              {currentPage}/{lastPage}
            </span>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={currentPage >= lastPage}
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelMembershipModal
          member={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['members'] })}
        />
      )}
    </div>
  )
}
