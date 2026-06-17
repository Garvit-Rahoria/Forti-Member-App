import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Download, Eye, FileText, Award, UserX, UserCheck,
  Loader2, X, MoreVertical, ChevronUp, ChevronDown, Shield
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function MembersList() {
  const qc = useQueryClient()
  const [q, setQ]                           = useState('')
  const [memberStatus, setMemberStatus]     = useState('active')
  const [typeFilter, setTypeFilter]         = useState('')
  const [pkgFilter, setPkgFilter]           = useState('')
  const [wingFilter, setWingFilter]         = useState('')
  const [page, setPage]                     = useState(1)
  const [sortBy, setSortBy]                 = useState(null)   // 'name' | 'expiry'
  const [sortDir, setSortDir]               = useState('asc')
  
  const navigate = useNavigate()

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
                  <tr 
                    key={row.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/members/${row.id}/full`)}
                  >

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
    </div>
  )
}
