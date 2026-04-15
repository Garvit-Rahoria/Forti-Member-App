import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fmtAmount } from '../../../utils/currency'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  Download, TrendingUp, TrendingDown, Users, DollarSign, Clock,
  FileText, CheckCircle, XCircle, AlertTriangle, Search, Filter,
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown
} from 'lucide-react'
import api from '../../../api/client'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUS_COLORS = {
  active: '#10B981', approved: '#3B82F6', submitted: '#F59E0B',
  under_review: '#8B5CF6', rejected: '#EF4444', expired: '#6B7280',
  payment_submitted: '#F97316', payment_pending: '#FBBF24',
}
const PIE_COLORS = ['#6C3EAB', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

function downloadExcel(endpoint, filename) {
  const token = localStorage.getItem('forti_token')
  const url = `${BASE}/api/reports/${endpoint}`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const bUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = bUrl; a.download = filename; a.click()
      URL.revokeObjectURL(bUrl)
    })
}

function StatusDot({ status }) {
  const color = STATUS_COLORS[status] || '#9CA3AF'
  return <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
}

export default function Reports() {
  const [period, setPeriod] = useState('12m')
  const [location, setLocation] = useState('')
  const [membershipType, setMembershipType] = useState('')
  const [duration, setDuration] = useState('')
  const [pkgSearch, setPkgSearch] = useState('')
  const [sortCol, setSortCol] = useState('total_members')
  const [sortDir, setSortDir] = useState('desc')

  const { data, isLoading } = useQuery({
    queryKey: ['reports-advanced', period, location, membershipType, duration],
    queryFn: () => api.get('/reports/advanced', {
      params: { period, location: location || undefined, membership_type: membershipType || undefined, duration: duration || undefined }
    }).then(r => r.data.data),
    refetchInterval: 60000,
  })

  const stats = data?.summary || {}
  const registrations = data?.registrations || []
  const statusSummary = data?.statusSummary || []
  const pkgPerf = data?.packagePerformance || []
  const topPkgs = data?.topPackages || []
  const leastPkgs = data?.leastPackages || []
  const recentApps = data?.recentApps || []
  const recentPayments = data?.recentPayments || []
  const expiring = data?.expiring || []
  const revenueTrend = data?.revenueTrend || []
  const filterOpts = data?.filterOptions || {}

  // Status summary helpers
  const totalApps = statusSummary.reduce((a, b) => a + b.cnt, 0) || 1
  const pendingCount = statusSummary.filter(s => ['submitted', 'under_review', 'payment_pending', 'payment_submitted'].includes(s.status)).reduce((a, b) => a + b.cnt, 0)
  const approvedCount = statusSummary.find(s => s.status === 'approved')?.cnt || 0
  const rejectedCount = statusSummary.find(s => s.status === 'rejected')?.cnt || 0
  const activeCount = statusSummary.find(s => s.status === 'active')?.cnt || 0

  // Payment analytics helpers
  const paymentPendingCount = statusSummary.filter(s => ['payment_submitted', 'payment_pending'].includes(s.status)).reduce((a, b) => a + b.cnt, 0)
  const paymentRejectedCount = statusSummary.find(s => s.status === 'rejected')?.cnt || 0

  // Sortable + searchable packages
  const filteredPkgs = useMemo(() => {
    let list = [...pkgPerf]
    if (pkgSearch) {
      const q = pkgSearch.toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [pkgPerf, pkgSearch, sortCol, sortDir])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary-600" /> : <ChevronDown size={12} className="text-primary-600" />
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Analyze system performance and membership insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline btn-sm flex items-center gap-1"
            onClick={() => downloadExcel('export/members', 'members.xlsx')}>
            <Download size={14} /> Members
          </button>
          <button className="btn-outline btn-sm flex items-center gap-1"
            onClick={() => downloadExcel('export/payments/excel', 'payments.xlsx')}>
            <Download size={14} /> Payments
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Filter size={15} /> Filters
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="input w-36 text-sm" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <select className="input w-40 text-sm" value={location} onChange={e => setLocation(e.target.value)}>
            <option value="">All Locations</option>
            {(filterOpts.locations || []).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="input w-40 text-sm" value={membershipType} onChange={e => setMembershipType(e.target.value)}>
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
          </select>
          <select className="input w-36 text-sm" value={duration} onChange={e => setDuration(e.target.value)}>
            <option value="">All Durations</option>
            {(filterOpts.durations || []).map(d => <option key={d} value={d}>{d === 'lifetime' ? 'Lifetime' : d === '1year' ? '1 Year' : d}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 text-white/80"><Users size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Total Members</span></div>
          <p className="text-3xl font-extrabold">{stats.total_members ?? 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 text-white/80"><CheckCircle size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Active Members</span></div>
          <p className="text-3xl font-extrabold">{stats.active_members ?? 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 text-white/80"><DollarSign size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Total Revenue</span></div>
          <p className="text-3xl font-extrabold">{Number(stats.total_revenue || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-white/60 mt-1">{Number(stats.this_month_revenue || 0).toLocaleString('en-IN')} this month</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 text-white/80"><Clock size={18} /><span className="text-xs font-semibold uppercase tracking-wide">Expiring Soon</span></div>
          <p className="text-3xl font-extrabold">{expiring.length}</p>
          <p className="text-xs text-white/60 mt-1">Next 60 days</p>
        </div>
      </div>

      {/* Payment Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Collected This Month</p>
            <p className="text-xl font-bold text-gray-900">{Number(stats.this_month_revenue || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending Payments</p>
            <p className="text-xl font-bold text-gray-900">{paymentPendingCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rejected Applications</p>
            <p className="text-xl font-bold text-gray-900">{paymentRejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Application Status + Registration Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Application Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-500" /><span className="text-sm font-medium text-yellow-800">Pending</span></div>
              <span className="text-lg font-bold text-yellow-700">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /><span className="text-sm font-medium text-green-800">Approved</span></div>
              <span className="text-lg font-bold text-green-700">{approvedCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2"><Users size={16} className="text-blue-500" /><span className="text-sm font-medium text-blue-800">Active</span></div>
              <span className="text-lg font-bold text-blue-700">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /><span className="text-sm font-medium text-red-800">Rejected</span></div>
              <span className="text-lg font-bold text-red-700">{rejectedCount}</span>
            </div>
          </div>
          {/* Pie */}
          {statusSummary.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusSummary} dataKey="cnt" nameKey="status"
                    cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={3} strokeWidth={0}>
                    {statusSummary.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name.replace(/_/g, ' ')]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Registration Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-500" /> Registration Trend
            </h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
              {period === '7d' ? 'Daily' : period === '30d' ? 'Daily' : 'Monthly'}
            </span>
          </div>
          {registrations.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={registrations} barSize={period === '12m' || period === '90d' ? 36 : 20}>
                <defs>
                  <linearGradient id="regBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6C3EAB" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false}
                  interval={period === '30d' ? 4 : 0} angle={period === '30d' || period === '7d' ? -45 : 0}
                  textAnchor={period === '30d' || period === '7d' ? 'end' : 'middle'} height={period === '30d' || period === '7d' ? 60 : 30} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="count" fill="url(#regBarGrad)" radius={[6, 6, 0, 0]} name="Registrations" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-gray-400">No data for this period</div>
          )}
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-green-500" /> Revenue Trend (Last 6 Months)
        </h3>
        {revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(val) => [Number(val).toLocaleString('en-IN'), 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 600 }} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revGrad)" strokeWidth={2.5}
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">No revenue data yet</div>
        )}
      </div>

      {/* Package Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-700">Package Performance</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 py-1.5 text-sm w-48" placeholder="Search packages…"
              value={pkgSearch} onChange={e => setPkgSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  { key: 'name', label: 'Package Name' },
                  { key: 'location', label: 'Location' },
                  { key: 'membership_type', label: 'Type' },
                  { key: 'duration', label: 'Duration' },
                  { key: 'price', label: 'Price' },
                  { key: 'total_members', label: 'Members' },
                  { key: 'total_revenue', label: 'Revenue' },
                  { key: 'is_active', label: 'Status' },
                ].map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-1">{col.label} <SortIcon col={col.key} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPkgs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No packages found</td></tr>
              ) : filteredPkgs.map(pkg => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{pkg.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{pkg.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      pkg.membership_type === 'corporate' ? 'bg-purple-100 text-purple-700' :
                      pkg.membership_type === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{pkg.membership_type || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{pkg.duration === 'lifetime' ? 'Lifetime' : pkg.duration === '1year' ? '1 Year' : pkg.duration || '—'}</td>
                  <td className="px-4 py-3 font-medium">{Number(pkg.price || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 font-bold text-primary-700">{pkg.total_members}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{Number(pkg.total_revenue || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top & Least Performing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-green-500" /> Top Performing Packages
          </h3>
          <div className="space-y-2">
            {topPkgs.length === 0 ? <p className="text-sm text-gray-400">No data</p> : topPkgs.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-green-50/50 border border-green-100">
                <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.membership_type} · {p.duration === 'lifetime' ? 'Lifetime' : '1 Year'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-700">{p.total_members} members</p>
                  <p className="text-xs text-gray-400">{Number(p.total_revenue || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ArrowDownRight size={16} className="text-orange-500" /> Least Used Packages
          </h3>
          <div className="space-y-2">
            {leastPkgs.length === 0 ? <p className="text-sm text-gray-400">No data</p> : leastPkgs.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-orange-50/50 border border-orange-100">
                <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.membership_type} · {p.duration === 'lifetime' ? 'Lifetime' : '1 Year'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-orange-700">{p.total_members} members</p>
                  <p className="text-xs text-gray-400">{Number(p.total_revenue || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={16} className="text-primary-500" /> Recent Applications
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentApps.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent applications</p>
            ) : recentApps.map(app => (
              <div key={app.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {(app.applicant_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{app.applicant_name}</p>
                  <p className="text-xs text-gray-400">{app.package_name || app.membership_type}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={app.status} />
                    <span className="text-xs capitalize text-gray-600">{app.status?.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(app.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Recent Payments
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent payments</p>
            ) : recentPayments.map(pay => (
              <div key={pay.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                  <DollarSign size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{pay.applicant_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{pay.membership_id || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">{fmtAmount(pay.amount, pay.currency)}</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <StatusDot status={pay.status} />
                    <span className="text-xs capitalize text-gray-500">{pay.status?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring Memberships */}
      {expiring.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-700">Expiring Within 60 Days ({expiring.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Package</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiring.slice(0, 10).map((row, i) => (
                  <tr key={i} className={row.days_left <= 7 ? 'bg-red-50' : row.days_left <= 30 ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{row.applicant_name}</div>
                      <div className="text-xs text-gray-400">{row.membership_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.package_name || '—'}</td>
                    <td className="px-4 py-3">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${row.days_left <= 7 ? 'text-red-600' : row.days_left <= 30 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {row.days_left} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
