import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import {
  LayoutDashboard, FileText, Users, CreditCard, Package,
  BarChart2, Settings, LogOut, ChevronDown, Menu, X,
  UserCog, ClipboardList, RefreshCw, Mail, BookOpen,
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
    { label: 'Blog & Content',  icon: BookOpen,        to: '/blog' },
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
    { label: 'Blog & Content', icon: BookOpen,      to: '/blog' },
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
  const location = useLocation()

  const normalizePath = value => {
    if (!value) return '/'
    return value !== '/' && value.endsWith('/') ? value.slice(0, -1) : value
  }

  const currentPath = normalizePath(location.pathname)
  const itemPath = normalizePath(item.to)
  const isItemActive = currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)

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
    <NavLink to={item.to} className={`sidebar-link ${isItemActive ? 'active' : ''}`}>
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

  const handleLogout = () => {
    // Clear all auth data from storage
    sessionStorage.clear()
    localStorage.clear()
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {sidebarOpen && (
      <aside className="w-64 flex-shrink-0 bg-gradient-sidebar border-r border-white/10 flex flex-col transition-all duration-200 shadow-soft-lg">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-cta flex items-center justify-center text-white font-display font-bold text-sm shadow-glow">
            F
          </div>
          <span className="font-display font-bold text-white text-lg flex-1 tracking-tight">FORTI</span>
          <button onClick={() => setSidebarOpen(false)} className="text-primary-200/60 hover:text-white transition-colors" title="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="px-3.5 pt-3 pb-2.5 border-b border-white/10">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-gold text-white flex items-center justify-center text-sm font-bold shrink-0">
                {(user?.full_name || user?.name)?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || user?.name}</p>
                <span className={`inline-flex mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.cls}`}>{roleBadge.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 px-2.5 py-3 flex flex-col">
          <div className="space-y-0.5">
          {navItems.map(item => <NavItem key={item.label} item={item} />)}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-link w-full mt-auto"
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>

        <div className="px-4 pb-3 pt-1">
          <p className="text-center text-[10px] leading-4 text-primary-300/50">
            Developed by{' '}
            <a href="https://kaitensoftware.com/" target="_blank" rel="noopener noreferrer"
              className="font-medium text-primary-200/60 hover:text-accent-gold transition-colors">
              Kaiten Software
            </a>
          </p>
        </div>
      </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-primary-100/50 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-ink-muted hover:text-primary-600 p-1 rounded-lg hover:bg-primary-50 transition">
            <Menu size={20} />
          </button>
          <h1 className="text-sm text-ink-muted font-semibold font-display">{panelLabel}</h1>
          {role === 'branch_manager' && regionData?.region_name && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
              {regionData.region_name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
            <button onClick={handleLogout} title="Logout" className="ml-1 flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-section">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
