import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import api from '../../../api/client'
import {
  BarChart2, Users, TrendingUp, DollarSign, AlertTriangle,
  MapPin, Package, Calendar, Clock
} from 'lucide-react'

function StatCard({ title, value, icon: Icon, color = 'primary', sub }) {
  const colorMap = {
    primary: 'from-indigo-500 to-indigo-600',
    green:   'from-emerald-500 to-emerald-600',
    amber:   'from-amber-500 to-orange-500',
    blue:    'from-blue-500 to-blue-600',
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[color]} p-5 text-white`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-6 -mt-6"/>
      <div className="relative">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
          <Icon size={18}/>
        </div>
        <p className="text-3xl font-bold">{value ?? 0}</p>
        <p className="text-sm text-white/70 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-white/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:       'bg-green-100 text-green-700',
    approved:     'bg-blue-100 text-blue-700',
    submitted:    'bg-yellow-100 text-yellow-700',
    under_review: 'bg-purple-100 text-purple-700',
    rejected:     'bg-red-100 text-red-700',
    pending_info: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export default function ManagerReports() {
  const { user } = useAuth()

  const { data: region } = useQuery({
    queryKey: ['manager-region'],
    queryFn: () => api.get('/manager/region').then(r => r.data.data),
  })

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: () => api.get('/manager/dashboard').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const { data: reports, isLoading: rptLoading } = useQuery({
    queryKey: ['manager-reports'],
    queryFn: () => api.get('/manager/reports').then(r => r.data.data),
  })

  const isLoading = dashLoading || rptLoading

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"/>
    </div>
  )

  const d = dash || {}
  const r = reports || {}

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Region Reports</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin size={14} className="text-green-600"/>
            <span className="text-sm text-gray-500">
              Scope: <strong className="text-green-700">{region?.region_name || 'Your Region'}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
          Live data
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Members"      value={d.total_members}      icon={Users}         color="primary"/>
        <StatCard title="Active Members"     value={d.active_members}     icon={Users}         color="green"/>
        <StatCard title="Pending Reviews"    value={d.pending_applications} icon={Clock}       color="amber"/>
        <StatCard title="Total Revenue"
          value={`₹${Number(d.total_revenue || 0).toLocaleString('en-IN')}`}
          icon={DollarSign}  color="blue"
          sub={`₹${Number(d.this_month_revenue || 0).toLocaleString('en-IN')} this month`}/>
      </div>

      {/* Expiring Soon alert */}
      {d.expiring_soon > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0"/>
          <p className="text-sm text-amber-800 font-medium">
            <strong>{d.expiring_soon}</strong> membership{d.expiring_soon !== 1 ? 's' : ''} expiring within 30 days
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status breakdown */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <BarChart2 size={15} className="text-gray-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Application Status Breakdown</h3>
          </div>
          <div className="p-4 space-y-2">
            {(d.status_breakdown || []).map(row => (
              <div key={row.status} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <StatusBadge status={row.status}/>
                <span className="font-bold text-gray-900">{row.cnt}</span>
              </div>
            ))}
            {!(d.status_breakdown?.length) && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>

        {/* Package distribution */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <Package size={15} className="text-gray-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Members by Package</h3>
          </div>
          <div className="p-4 space-y-2">
            {(r.byPackage || []).map(row => (
              <div key={row.package_name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{row.package_name || 'Unknown'}</span>
                <span className="font-bold text-gray-900">{row.count}</span>
              </div>
            ))}
            {!(r.byPackage?.length) && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>

        {/* Monthly registrations */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <TrendingUp size={15} className="text-gray-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Monthly Registrations (12 months)</h3>
          </div>
          <div className="p-4">
            {(r.monthly || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            ) : (
              <div className="space-y-2">
                {[...(r.monthly || [])].reverse().slice(0, 8).map(row => {
                  const max = Math.max(...(r.monthly || []).map(m => m.count), 1)
                  const pct = Math.round((row.count / max) * 100)
                  return (
                    <div key={row.month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{row.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-6 text-right">{row.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <DollarSign size={15} className="text-gray-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Monthly Revenue (6 months)</h3>
          </div>
          <div className="p-4">
            {(r.monthly_revenue || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No revenue data</p>
            ) : (
              <div className="space-y-2">
                {[...(r.monthly_revenue || [])].reverse().map(row => {
                  const max = Math.max(...(r.monthly_revenue || []).map(m => Number(m.revenue)), 1)
                  const pct = Math.round((Number(row.revenue) / max) * 100)
                  return (
                    <div key={row.month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16 shrink-0">{row.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-20 text-right">
                        ₹{Number(row.revenue).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expiring Memberships table */}
      {(r.expiring || []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600"/>
            <h3 className="font-semibold text-amber-800 text-sm">Expiring Memberships (next 60 days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Membership ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.expiring.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.applicant_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary-700">{row.membership_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        row.days_left <= 7 ? 'bg-red-100 text-red-700' :
                        row.days_left <= 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
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

      {/* Recent pending applications */}
      {(d.recent_pending || []).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b flex items-center gap-2">
            <Clock size={15} className="text-gray-500"/>
            <h3 className="font-semibold text-gray-700 text-sm">Pending Applications (oldest first)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Applicant</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Package</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.recent_pending.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.applicant_name}</p>
                      <p className="text-xs text-gray-400">{row.applicant_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.package_name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status}/></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}
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
