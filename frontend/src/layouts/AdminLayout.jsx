import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import {
  LayoutDashboard, FileText, Users, CreditCard, Package,
  BarChart2, Settings, LogOut, ChevronDown, Menu, X,
  UserCog, ClipboardList, RefreshCw, Mail,
} from 'lucide-react'

// Role-specific navigation trees
// - Form Builder removed (hidden from nav, files kept)
// - Approvals merged into Applications
// - Payments + Payment Methods merged into one Payments entry
const NAV_BY_ROLE = {
  super_admin: [
    { label: 'Dashboard',       icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications',    icon: FileText,        to: '/applications' },
    { label: 'Members',         icon: Users,           to: '/members' },
    { label: 'Plans',           icon: Package,         to: '/packages' },
    { label: 'Payments',        icon: CreditCard,      to: '/payments' },
    { label: 'Renewals',        icon: RefreshCw,       to: '/renewals' },
    { label: 'Reports',         icon: BarChart2,       to: '/reports' },
    { label: 'Email Templates', icon: Mail,            to: '/email-templates' },
    { label: 'Audit Log',       icon: ClipboardList,   to: '/audit' },
    { label: 'Users',           icon: UserCog,         to: '/users' },
    { label: 'Settings',        icon: Settings,        to: '/settings' },
  ],
  admin: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications', icon: FileText,        to: '/applications' },
    { label: 'Members',      icon: Users,           to: '/members' },
    { label: 'Plans',        icon: Package,         to: '/packages' },
    { label: 'Payments',     icon: CreditCard,      to: '/payments' },
    { label: 'Renewals',     icon: RefreshCw,       to: '/renewals' },
    { label: 'Reports',      icon: BarChart2,       to: '/reports' },
    { label: 'Settings',     icon: Settings,        to: '/settings' },
  ],
  branch_manager: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications', icon: FileText,        to: '/applications' },
    { label: 'Members',      icon: Users,           to: '/members' },
    { label: 'Renewals',     icon: RefreshCw,       to: '/renewals' },
    { label: 'Reports',      icon: BarChart2,       to: '/manager-reports' },
  ],
  office_staff: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications', icon: FileText,        to: '/applications' },
    { label: 'Payments',     icon: CreditCard,      to: '/payments' },
    { label: 'Members',      icon: Users,           to: '/members' },
  ],
}

const PANEL_LABEL = {
  super_admin:     'Super Admin Panel',
  admin:           'Admin Panel',
  branch_manager:  'Branch Manager Panel',
  office_staff:    'Office Staff Panel',
}

const ROLE_BADGE = {
  super_admin:     { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700' },
  admin:           { label: 'Admin',       cls: 'bg-blue-100 text-blue-700' },
  branch_manager:  { label: 'Branch Mgr', cls: 'bg-green-100 text-green-700' },
  office_staff:    { label: 'Staff',      cls: 'bg-orange-100 text-orange-700' },
}

function NavItem({ item }) {
  const [open, setOpen] = useState(false)
  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="sidebar-link w-full justify-between"
        >
          <span className="flex items-center gap-3">
            <item.icon size={18} />
            {item.label}
          </span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map(c => (
              <NavLink key={c.to} to={c.to} className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
              }>
                {c.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <NavLink to={item.to} className={({ isActive }) =>
      `sidebar-link ${isActive ? 'active' : ''}`
    }>
      <item.icon size={18} />
      {item.label}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const role = user?.role || 'admin'

  const { data: regionData } = useQuery({
    queryKey: ['manager-region'],
    queryFn: () => api.get('/manager/region').then(r => r.data.data),
    enabled: role === 'branch_manager',
    staleTime: 10 * 60 * 1000,
  })
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin
  const panelLabel = PANEL_LABEL[role] || 'Admin Panel'
  const roleBadge = ROLE_BADGE[role] || { label: role, cls: 'bg-gray-100 text-gray-600' }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      {sidebarOpen && (
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-20">
        {/* Logo + close */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <span className="font-bold text-gray-900 text-lg flex-1">FORTI Portal</span>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Close sidebar">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => <NavItem key={item.label} item={item} />)}
        </nav>

        {/* User info */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
              {(user?.full_name || user?.name)?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || user?.name}</p>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${roleBadge.cls}`}>{roleBadge.label}</span>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>
          <h1 className="text-sm text-gray-600 font-medium">{panelLabel}</h1>
          {role === 'branch_manager' && regionData?.region_name && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
              {regionData.region_name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            Live
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
