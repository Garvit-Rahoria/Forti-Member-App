import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, UserCheck, DollarSign, Clock, FileText, AlertTriangle,
  ArrowUpRight, ArrowRight, TrendingUp, Package, CreditCard,
  RefreshCw, Eye
} from 'lucide-react'
import api from '../../api/client'

function StatusBadge({ status }) {
  const map = {
    active: 'bg-green-100 text-green-700', approved: 'bg-blue-100 text-blue-700',
    submitted: 'bg-yellow-100 text-yellow-700', under_review: 'bg-purple-100 text-purple-700',
    rejected: 'bg-red-100 text-red-700', verified: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700', payment_submitted: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
    </div>
  )

  const stats = data || {}

  const statCards = [
    { title: 'Total Members', value: stats.total_members || 0, icon: Users, bg: 'from-indigo-500 to-indigo-600', link: '/members' },
    { title: 'Active Members', value: stats.active_members || 0, icon: UserCheck, bg: 'from-emerald-500 to-emerald-600', link: '/members' },
    { title: 'Pending Reviews', value: stats.pending_submissions || 0, icon: Clock, bg: 'from-amber-500 to-orange-500', link: '/approvals' },
    { title: 'Total Revenue', value: Number(stats.total_revenue || 0).toLocaleString('en-IN'), icon: DollarSign, bg: 'from-blue-500 to-blue-600', sub: `${Number(stats.this_month_revenue || 0).toLocaleString('en-IN')} this month`, link: '/payments' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back! Here's your portal overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          Overview
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link key={card.title} to={card.link}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bg} p-5 text-white hover:shadow-lg hover:scale-[1.02] transition-all group`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <card.icon size={20} />
                </div>
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm text-white/70 mt-1">{card.title}</p>
              {card.sub && <p className="text-xs text-white/50 mt-0.5">{card.sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
            <AlertTriangle size={16} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.expiring_soon || 0}</p>
            <p className="text-xs text-gray-500">Expiring Soon</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
            <FileText size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.total_submissions || 0}</p>
            <p className="text-xs text-gray-500">Applications</p>
          </div>
        </div>
        {(stats.type_breakdown || []).slice(0, 2).map(t => (
          <div key={t.membership_type} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.membership_type === 'corporate' ? 'bg-blue-100' : 'bg-green-100'}`}>
              {t.membership_type === 'corporate'
                ? <Package size={16} className="text-blue-600" />
                : <UserCheck size={16} className="text-green-600" />}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{t.cnt}</p>
              <p className="text-xs text-gray-500 capitalize">{t.membership_type}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Recent Applications</h3>
            <Link to="/applications" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats.recent_applications || []).map(app => (
              <Link key={app.id} to={`/applications/${app.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {(app.applicant_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{app.applicant_name}</p>
                  <p className="text-xs text-gray-400 truncate">{app.package_name || app.membership_type}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge status={app.status} />
                  <p className="text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                <Eye size={14} className="text-gray-300 group-hover:text-primary-500 transition shrink-0" />
              </Link>
            ))}
            {(stats.recent_applications || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No recent applications</p>
            )}
          </div>
        </div>

        {/* Right: Recent Payments */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Payments</h3>
            <Link to="/payments" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(stats.recent_payments || []).map(pay => (
              <div key={pay.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  pay.status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <CreditCard size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{pay.applicant_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate">{pay.membership_id || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">{Number(pay.amount || 0).toLocaleString('en-IN')}</p>
                  <StatusBadge status={pay.status} />
                </div>
              </div>
            ))}
            {(stats.recent_payments || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No recent payments</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Applications', to: '/applications', icon: FileText, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          { label: 'Members', to: '/members', icon: Users, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
          { label: 'Renewals', to: '/renewals', icon: RefreshCw, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { label: 'Reports', to: '/reports', icon: TrendingUp, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
        ].map(q => (
          <Link key={q.to} to={q.to}
            className={`rounded-xl p-4 flex items-center gap-3 transition-colors ${q.color}`}>
            <q.icon size={18} />
            <span className="text-sm font-medium">{q.label}</span>
            <ArrowRight size={14} className="ml-auto opacity-50" />
          </Link>
        ))}
      </div>
    </div>
  )
}
