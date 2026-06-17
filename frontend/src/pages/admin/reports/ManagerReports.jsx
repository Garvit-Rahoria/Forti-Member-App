import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  MapPin,
} from 'lucide-react'
import api from '../../../api/client'
import { fmtAmount } from '../../../utils/currency'

const DEFAULT_FILTERS = {
  period: '30d',
  membershipType: '',
}

const KPI_CARDS = [
  {
    key: 'total_members',
    title: 'Total Members',
    icon: Users,
    iconClass: 'bg-slate-100 text-slate-700',
    formatter: (value) => Number(value || 0).toLocaleString('en-IN'),
  },
  {
    key: 'active_members',
    title: 'Active Members',
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-700',
    formatter: (value) => Number(value || 0).toLocaleString('en-IN'),
  },
  {
    key: 'total_revenue',
    title: 'Total Revenue',
    icon: DollarSign,
    iconClass: 'bg-blue-100 text-blue-700',
    formatter: (value) => '₹' + Number(value || 0).toLocaleString('en-IN'),
  },
  {
    key: 'pending_payments',
    title: 'Pending Payments',
    icon: CreditCard,
    iconClass: 'bg-amber-100 text-amber-700',
    formatter: (value) => Number(value || 0).toLocaleString('en-IN'),
  },
]

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <select className="input w-full text-sm" value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  )
}

function KpiCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function EmptyChartState({ message }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      {message}
    </div>
  )
}

function StatusPill({ status }) {
  const styles = {
    verified: 'bg-emerald-100 text-emerald-700',
    approved: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    submitted: 'bg-blue-100 text-blue-700',
    payment_pending: 'bg-amber-100 text-amber-700',
    payment_submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-violet-100 text-violet-700',
    rejected: 'bg-rose-100 text-rose-700',
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {(status || 'unknown').replace(/_/g, ' ')}
    </span>
  )
}

export default function ManagerReports() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)

  const reportParams = useMemo(() => ({
    period: appliedFilters.period,
    membership_type: appliedFilters.membershipType || undefined,
  }), [appliedFilters])

  const { data: region } = useQuery({
    queryKey: ['manager-region'],
    queryFn: () => api.get('/manager/region').then(r => r.data.data),
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reports-advanced', reportParams],
    queryFn: () => api.get('/reports/advanced', { params: reportParams }).then((response) => response.data.data),
    refetchInterval: 60000,
  })

  const stats = data?.summary || {}
  const registrations = (data?.registrations || []).map(item => ({
    ...item,
    count: Number(item.count || 0)
  }))
  const revenueTrend = (data?.revenueTrend || []).map(item => ({
    ...item,
    revenue: Number(item.revenue || 0)
  }))
  const topPackages = (data?.topPackages || []).slice(0, 3)
  const recentApplications = (data?.recentApps || []).slice(0, 5)
  const recentPayments = (data?.recentPayments || []).slice(0, 5)
  const statusSummary = data?.statusSummary || []
  const pendingPayments = statusSummary
    .filter((item) => ['payment_pending', 'payment_submitted'].includes(item.status))
    .reduce((total, item) => total + Number(item.cnt || 0), 0)
  const noAnalyticsData = Boolean(data?.noData)

  const kpiValues = {
    ...stats,
    pending_payments: pendingPayments,
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function applyFilters() {
    setAppliedFilters(filters)
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Region Reports</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin size={14} className="text-green-600"/>
            <span className="text-sm text-gray-500">
              Scope: <strong className="text-green-700">{region?.region_name || 'Your Region'}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${isFetching ? 'bg-amber-400' : 'bg-slate-400'}`} />
          {isFetching ? 'Refreshing' : 'Regional overview'}
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={15} /> Filters
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Date Range" value={filters.period} onChange={(event) => updateFilter('period', event.target.value)}>
            <option value="today">Today</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </FilterSelect>

          <FilterSelect label="Membership Type" value={filters.membershipType} onChange={(event) => updateFilter('membershipType', event.target.value)}>
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
          </FilterSelect>

          <div className="ml-auto flex items-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="btn-outline btn-sm flex items-center gap-1"
            >
              <RefreshCw size={13} /> Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </section>

      {noAnalyticsData ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">No regional analytics data available</p>
          <p className="mt-2 text-sm text-gray-500">Try a different date range or membership type.</p>
        </section>
      ) : (
        <>
          {/* KPI Row */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_CARDS.map((card) => (
              <KpiCard
                key={card.key}
                title={card.title}
                icon={card.icon}
                iconClass={card.iconClass}
                value={card.formatter(kpiValues[card.key])}
              />
            ))}
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel title="Revenue Trend">
              {revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="managerRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value}
                    />
                    <Tooltip
                      formatter={(value) => [Number(value || 0).toLocaleString('en-IN'), 'Revenue']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#managerRevenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No regional revenue data available" />
              )}
            </Panel>

            <Panel title="Registration Trend">
              {registrations.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={registrations} barSize={22}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [Number(value || 0), 'Registrations']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No regional registration data available" />
              )}
            </Panel>
          </section>

          {/* Bottom Row */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Panel title="Top Packages">
              <div className="space-y-3">
                {topPackages.length === 0 ? (
                  <p className="text-sm text-gray-500">No package analytics available</p>
                ) : topPackages.map((pkg, index) => (
                  <div key={pkg.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-700 shadow-sm">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{pkg.name}</p>
                      <p className="text-xs text-gray-500">{pkg.membership_type || 'general'} · {pkg.duration || 'standard'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{Number(pkg.total_members || 0)}</p>
                      <p className="text-xs text-gray-500">members</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Recent Applications"
              action={
                <Link to="/applications" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
                  View All <ArrowRight size={12} />
                </Link>
              }
            >
              <div className="space-y-3">
                {recentApplications.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent applications</p>
                ) : recentApplications.map((application) => (
                  <div key={application.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {(application.applicant_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{application.applicant_name}</p>
                      <p className="truncate text-xs text-gray-500">{application.package_name || application.membership_type || 'Application'}</p>
                    </div>
                    <div className="text-right">
                      <StatusPill status={application.status} />
                      <p className="mt-1 text-xs text-gray-400">{new Date(application.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Recent Payments">
              <div className="space-y-3">
                {recentPayments.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent payments</p>
                ) : recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <DollarSign size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{payment.applicant_name || 'Unknown'}</p>
                      <p className="truncate text-xs text-gray-500">{payment.membership_id || 'Payment record'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmtAmount(payment.amount, payment.currency)}</p>
                      <div className="mt-1">
                        <StatusPill status={payment.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </>
      )}
    </div>
  )
}
