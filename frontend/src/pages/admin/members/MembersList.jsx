import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, Eye, FileText, Award, UserX, UserCheck,
  Loader2, X, MoreVertical, ChevronUp, ChevronDown, Shield
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

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
  // fallback: use plan_type
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
  }
  const LABEL = { active: 'Active', suspended: 'Suspended', expired: 'Expired', inactive: 'Inactive' }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${MAP[status] || 'bg-gray-100 text-gray-500'}`}>
      {LABEL[status] || status || '—'}
    </span>
  )
}

// ── 3-dot action dropdown ─────────────────────────────────────────────────────
function ActionMenu({ row, onView, onCert, certLoading, onInvoice, invoiceLoading, onSuspend, onReactivate, statusPending, onAssignPosition }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
          <button
            onClick={() => { setOpen(false); onView() }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Eye size={13} /> Quick Details
          </button>
          <button
            onClick={() => { setOpen(false); window.open(`/members/${row.id}/full`, '_blank') }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-primary-700 font-medium hover:bg-primary-50"
          >
            <UserCheck size={13} /> Full 360° Profile
          </button>
          <button
            onClick={() => { setOpen(false); onCert() }}
            disabled={certLoading}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {certLoading ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
            Certificate PDF
          </button>
          <button
            onClick={() => { setOpen(false); onInvoice() }}
            disabled={invoiceLoading}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {invoiceLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Invoice PDF
          </button>
          <button
            onClick={() => { setOpen(false); onAssignPosition() }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-blue-700 font-medium hover:bg-blue-50"
          >
            <Shield size={13} /> Select Position
          </button>
          <div className="border-t border-gray-100 my-1" />
          {row.member_status === 'active' ? (
            <button
              onClick={() => { setOpen(false); onSuspend() }}
              disabled={statusPending}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <UserX size={13} /> Suspend Member
            </button>
          ) : row.member_status === 'suspended' ? (
            <button
              onClick={() => { setOpen(false); onReactivate() }}
              disabled={statusPending}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              <UserCheck size={13} /> Reactivate Member
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Suspend Confirm Modal ─────────────────────────────────────────────────────
function SuspendModal({ member, onClose, onConfirm, pending }) {
  const [reason, setReason] = useState('')
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-red-500" />
            <h3 className="font-bold text-gray-900">Suspend Member</h3>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to suspend <strong>{member.applicant_name}</strong>?{' '}
            They will lose portal access until reactivated.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for suspension <span className="text-red-500">*</span></label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              rows={3}
              placeholder="Enter reason for suspension…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(reason)}
              disabled={pending || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pending && <Loader2 size={13} className="animate-spin" />}
              Suspend
            </button>
            <button className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Position Modal ─────────────────────────────────────────────────────────────
function PositionModal({ member, onClose, onSave, pending }) {
  const [position, setPosition] = useState(member.position || '')
  
  const POSITIONS = [
    'President',
    'Vice President',
    'General Secretary',
    'Joint Secretary',
    'Treasurer',
    'Executive Member',
    'State President',
    'District President',
    'Regular Member',
  ]

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-900">Select Position</h3>
          </div>
          <p className="text-sm text-gray-600">
            Assign a position to <strong>{member.applicant_name}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Rank / Position <span className="text-red-500">*</span></label>
            <select
              className="input w-full"
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value="" disabled>Select a position</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onSave(position)}
              disabled={pending || !position}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pending && <Loader2 size={13} className="animate-spin" />}
              Save Position
            </button>
            <button className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MembersList() {
  const qc = useQueryClient()
  const [q, setQ]                           = useState('')
  const [memberStatus, setMemberStatus]     = useState('active')
  const [typeFilter, setTypeFilter]         = useState('')
  const [pkgFilter, setPkgFilter]           = useState('')
  const [wingFilter, setWingFilter]         = useState('')
  const [page, setPage]                     = useState(1)
  const [viewMember, setViewMember]         = useState(null)
  const [suspendTarget, setSuspendTarget]   = useState(null)
  const [assignPositionTarget, setAssignPositionTarget] = useState(null)
  const [certLoading, setCertLoading]       = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(null)
  const [sortBy, setSortBy]                 = useState(null)   // 'name' | 'expiry'
  const [sortDir, setSortDir]               = useState('asc')

  const { data: wings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: () => api.get('/wings').then(r => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['members', { q, memberStatus, wingFilter, page }],
    queryFn: () => api.get('/members', {
      params: {
        q,
        member_status: memberStatus || undefined,
        wing_id: wingFilter || undefined,
        page,
        per_page: 20,
      },
    }).then(r => r.data.data),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status, reason }) => api.patch(`/members/${id}/status`, { status, reason }),
    onSuccess: (_, vars) => {
      qc.getQueriesData({ queryKey: ['members'] }).forEach(([queryKey, old]) => {
        if (!old?.data || !Array.isArray(old.data)) return
        const filters = queryKey?.[1] || {}
        const nextData = old.data
          .map(row => row.id === vars.id ? { ...row, member_status: vars.status } : row)
          .filter(row => !filters.memberStatus || row.member_status === filters.memberStatus)
        qc.setQueryData(queryKey, { ...old, data: nextData, total: old.total })
      })
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success(vars.status === 'suspended' ? 'Member suspended' : 'Member reactivated')
      setSuspendTarget(null)
      setViewMember(current => current?.id === vars.id ? { ...current, member_status: vars.status } : current)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const positionMut = useMutation({
    mutationFn: ({ id, position }) => api.patch(`/members/${id}/position`, { position }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Position updated successfully')
      setAssignPositionTarget(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error updating position'),
  })

  async function handleCertificate(row) {
    setCertLoading(row.id)
    try {
      await downloadWithAuth(
        `/certificates/${row.id}`,
        `certificate_${row.membership_id || row.id}.pdf`,
      )
      toast.success('Certificate downloaded')
    } catch (err) { toast.error(err.message || 'Certificate generation failed') }
    finally { setCertLoading(null) }
  }

  async function handleInvoice(row) {
    setInvoiceLoading(row.id)
    try {
      const res = await api.post(`/invoices/member/${row.id}/generate`)
      const invId = res.data.data?.id
      if (!invId) throw new Error('Invoice ID not returned')
      await downloadWithAuth(
        `/invoices/${invId}/download`,
        `invoice_${row.membership_id || row.id}.pdf`,
      )
      toast.success('Invoice downloaded')
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Invoice failed') }
    finally { setInvoiceLoading(null) }
  }

  async function handleExportCsv() {
    try {
      await downloadWithAuth(`/reports/export/members`, 'members.csv')
      toast.success('CSV downloaded')
    } catch (err) {
      toast.error(err.message || 'Export failed')
    }
  }

  const allRows    = data?.data || []
  const total      = data?.total || 0
  const pagination = data || {}

  // Unique package names for the Package filter
  const packageNames = useMemo(
    () => [...new Set(allRows.map(r => r.package_name).filter(Boolean))].sort(),
    [allRows],
  )

  // Client-side type/package filter + optional sort
  const rows = useMemo(() => {
    let list = allRows
      .filter(r => !typeFilter || r.membership_type === typeFilter)
      .filter(r => !pkgFilter  || r.package_name === pkgFilter)

    if (sortBy) {
      list = [...list].sort((a, b) => {
        if (sortBy === 'name') {
          const cmp = (a.applicant_name || '').localeCompare(b.applicant_name || '')
          return sortDir === 'asc' ? cmp : -cmp
        }
        if (sortBy === 'expiry') {
          const da = a.expiry_date ? new Date(a.expiry_date) : new Date('2099-12-31')
          const db = b.expiry_date ? new Date(b.expiry_date) : new Date('2099-12-31')
          return sortDir === 'asc' ? da - db : db - da
        }
        return 0
      })
    }
    return list
  }, [allRows, typeFilter, pkgFilter, sortBy, sortDir])

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span className="text-gray-300 ml-0.5 text-[10px]">⇅</span>
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary-500" />
      : <ChevronDown size={12} className="text-primary-500" />
  }

  const TYPE_BADGE = {
    corporate:  'bg-purple-100 text-purple-700',
    individual: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <p className="text-gray-500 text-sm">Total: {total}</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="btn-outline btn-sm flex items-center gap-1"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search name, email, ID…"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input w-36" value={memberStatus} onChange={e => { setMemberStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="input w-36" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          <option value="individual">Individual</option>
          <option value="corporate">Corporate</option>
        </select>
        <select className="input w-48" value={pkgFilter} onChange={e => setPkgFilter(e.target.value)}>
          <option value="">All Packages</option>
          {packageNames.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input w-36" value={wingFilter} onChange={e => { setWingFilter(e.target.value); setPage(1) }}>
          <option value="">All Wings</option>
          {wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member ID</th>
                <th
                  className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
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
                  <span className="flex items-center gap-1">Expiry <SortIcon col="expiry" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">No members found</td>
                </tr>
              ) : rows.map(row => {
                const isExpiringSoon = row.days_to_expiry != null && row.days_to_expiry >= 0 && row.days_to_expiry <= 30
                const isExpired      = row.days_to_expiry != null && row.days_to_expiry < 0
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">

                    {/* Member ID */}
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-700">
                      {row.membership_id || <span className="text-gray-400">—</span>}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.applicant_name}</div>
                      {row.position && (
                        <div className="mt-0.5 mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold uppercase tracking-wider border border-blue-100">
                          <Shield size={10} /> {row.position}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">{row.applicant_email}</div>
                      {row.applicant_phone && (
                        <div className="text-xs text-gray-400">{row.applicant_phone}</div>
                      )}
                    </td>

                    {/* Organization */}
                    <td className="px-4 py-3 text-xs text-gray-600">{row.organisation_name || row.organization_name || '—'}</td>

                    <td className="px-4 py-3 text-xs text-gray-600">{row.wing_name || '—'}</td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {row.membership_type ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${TYPE_BADGE[row.membership_type.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                          {row.membership_type}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>

                    {/* Package */}
                    <td className="px-4 py-3 text-xs text-gray-600">{row.package_name || row.form_name || '—'}</td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-xs text-gray-600">{durationLabel(row)}</td>

                    {/* Start Date */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-IN') : '—'}
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3 text-xs">
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

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={row.member_status} /></td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <ActionMenu
                        row={row}
                        certLoading={certLoading === row.id}
                        invoiceLoading={invoiceLoading === row.id}
                        statusPending={statusMut.isPending}
                        onView={() => setViewMember(row)}
                        onCert={() => handleCertificate(row)}
                        onInvoice={() => handleInvoice(row)}
                        onSuspend={() => setSuspendTarget(row)}
                        onReactivate={() => statusMut.mutate({ id: row.id, status: 'active' })}
                        onAssignPosition={() => setAssignPositionTarget(row)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.lastPage > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-500">
            <span>Page {pagination.page} of {pagination.lastPage} — {total} total</span>
            <div className="flex gap-2">
              <button
                className="btn-outline btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn-outline btn-sm"
                disabled={page >= pagination.lastPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      {viewMember && (
        <AdminModalPortal>
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
            onClick={() => setViewMember(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">{viewMember.applicant_name}</h3>
                <p className="text-xs text-gray-500 font-mono">{viewMember.membership_id}</p>
              </div>
              <button onClick={() => setViewMember(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-2 overflow-y-auto max-h-[70vh]">
              {[
                ['Member ID',       viewMember.membership_id],
                ['Full Name',       viewMember.applicant_name],
                ['Email',           viewMember.applicant_email],
                ['Phone',           viewMember.applicant_phone],
                ['Organization',    viewMember.organisation_name || viewMember.organization_name],
                ['Membership Type', viewMember.membership_type?.toUpperCase()],
                ['Package',         viewMember.package_name || viewMember.form_name],
                ['Duration',        durationLabel(viewMember)],
                ['Status',          viewMember.member_status?.toUpperCase()],
                ['Start Date',      viewMember.submitted_at ? new Date(viewMember.submitted_at).toLocaleDateString('en-IN') : null],
                ['Expiry Date',     viewMember.expiry_date ? new Date(viewMember.expiry_date).toLocaleDateString('en-IN') : expiryDisplay(viewMember)],
                ['Days to Expiry',  viewMember.days_to_expiry != null ? `${viewMember.days_to_expiry} days` : null],
              ].filter(([, v]) => v != null && v !== '').map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="text-gray-900 text-right">{val}</span>
                </div>
              ))}
              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => { setViewMember(null); handleCertificate(viewMember) }}
                  className="flex-1 btn-outline btn-sm flex items-center justify-center gap-1"
                >
                  <Award size={13} /> Download Certificate
                </button>
                <button
                  onClick={() => { setViewMember(null); handleInvoice(viewMember) }}
                  className="flex-1 btn-outline btn-sm flex items-center justify-center gap-1"
                >
                  <FileText size={13} /> Download Invoice
                </button>
              </div>
            </div>
            </div>
          </div>
        </AdminModalPortal>
      )}

      {/* ── Suspend Confirm Modal ── */}
      {suspendTarget && (
        <SuspendModal
          member={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={(reason) => statusMut.mutate({ id: suspendTarget.id, status: 'suspended', reason })}
          pending={statusMut.isPending}
        />
      )}

      {/* ── Assign Position Modal ── */}
      {assignPositionTarget && (
        <PositionModal
          member={assignPositionTarget}
          pending={positionMut.isPending}
          onClose={() => setAssignPositionTarget(null)}
          onSave={(position) => positionMut.mutate({ id: assignPositionTarget.id, position })}
        />
      )}
    </div>
  )
}
