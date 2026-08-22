import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import {
  LayoutDashboard, FileText, Users, CreditCard, Package,
  BarChart2, Settings, LogOut, ChevronDown, Menu, X,
  UserCog, ClipboardList, RefreshCw, Mail, BookOpen,
  MailOpen, MapPin, Banknote
} from 'lucide-react'
import {
  AdminLogoutConfirmModal,
  performAdminLogout,
} from '../components/admin/AdminLogoutConfirm'
import { SITE_LOGO } from '../data/siteAssets'

// Role-specific navigation trees
// - Form Builder removed (hidden from nav, files kept)
// - Approvals merged into Applications
// - Payments + Payment Methods merged into one Payments entry
const NAV_BY_ROLE = {
  super_admin: [
    { label: 'Dashboard',       icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications',    icon: FileText,        to: '/applications' },
    { label: 'Members',         icon: Users,           to: '/members' },
    { label: 'Messages',        icon: Mail,            to: '/messages' },
    { label: 'Plans',           icon: Package,         to: '/packages' },
    { label: 'Transactions',    icon: CreditCard,      to: '/payments' },
    { label: 'Payment Methods', icon: Banknote,        to: '/payment-methods' },
    { label: 'Renewals',        icon: RefreshCw,       to: '/renewals' },
    { label: 'Reports',         icon: BarChart2,       to: '/reports' },
    { label: 'Blog & Content',  icon: BookOpen,        to: '/blog' },
    { label: 'Email Templates', icon: Mail,            to: '/email-templates' },
    { label: 'SMTP Delivery',   icon: MailOpen,        to: '/smtp-settings' },
    { label: 'Audit Log',       icon: ClipboardList,   to: '/audit' },
    { label: 'Branches',        icon: MapPin,          to: '/branches' },
    // { label: 'Users',           icon: UserCog,         to: '/users' },
    { label: 'Settings',        icon: Settings,        to: '/settings' },
  ],
  admin: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Applications', icon: FileText,        to: '/applications' },
    { label: 'Members',      icon: Users,           to: '/members' },
    { label: 'Messages',     icon: Mail,            to: '/messages' },
    { label: 'Plans',        icon: Package,         to: '/packages' },
    { label: 'Transactions', icon: CreditCard,      to: '/payments' },
    { label: 'Payment Methods', icon: Banknote,        to: '/payment-methods' },
    { label: 'Renewals',     icon: RefreshCw,       to: '/renewals' },
    { label: 'Reports',      icon: BarChart2,       to: '/reports' },
    { label: 'Blog & Content', icon: BookOpen,      to: '/blog' },
    { label: 'Settings',     icon: Settings,        to: '/settings' },
  ],
  /*
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
    { label: 'Messages',     icon: Mail,            to: '/messages' },
  ],
  */
}

const PANEL_LABEL = {
  super_admin:     'Super Admin Panel',
  admin:           'Admin Panel',
  // branch_manager:  'Branch Manager Panel',
  // office_staff:    'Office Staff Panel',
}

const ROLE_BADGE = {
  super_admin:     { label: 'Super Admin', cls: 'bg-purple-100 text-purple-700' },
  admin:           { label: 'Admin',       cls: 'bg-blue-100 text-blue-700' },
  // branch_manager:  { label: 'Branch Mgr', cls: 'bg-green-100 text-green-700' },
  // office_staff:    { label: 'Staff',      cls: 'bg-orange-100 text-orange-700' },
}

function NavItem({ item, unreadCount }) {
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
    <NavLink to={item.to} className={`sidebar-link ${isItemActive ? 'active' : ''} flex items-center justify-between`}>
      <span className="flex items-center gap-3">
        <item.icon size={18} />
        {item.label}
      </span>
      {item.to === '/messages' && unreadCount > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[18px] text-center animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
          {unreadCount}
        </span>
      )}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const role = user?.role || 'admin'

  const [showPopup, setShowPopup] = useState(false)
  const [alertShown, setAlertShown] = useState(() => {
    return sessionStorage.getItem('contact_alert_shown') === 'true'
  })
  const [prevCount, setPrevCount] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  const { data: regionData } = useQuery({
    queryKey: ['manager-region'],
    queryFn: () => api.get('/manager/region').then(r => r.data.data),
    enabled: role === 'branch_manager',
    staleTime: 10 * 60 * 1000,
  })

  const { data: staffRegionData } = useQuery({
    queryKey: ['staff-region'],
    queryFn: () => api.get('/staff/region').then(r => r.data.data),
    enabled: role === 'office_staff',
    staleTime: 10 * 60 * 1000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => api.get('/contact/unread-count').then(r => r.data.data),
    refetchInterval: 15000,
  })

  useEffect(() => {
    if (unreadData?.count > 0 && !alertShown) {
      setShowPopup(true)
      setAlertShown(true)
      sessionStorage.setItem('contact_alert_shown', 'true')
    }
  }, [unreadData?.count, alertShown])

  useEffect(() => {
    if (unreadData) {
      const currentCount = unreadData.count
      if (prevCount !== null && currentCount > prevCount) {
        setToastMessage('New message received')
      }
      setPrevCount(currentCount)
    }
  }, [unreadData?.count, prevCount])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin
  const panelLabel = PANEL_LABEL[role] || 'Admin Panel'
  const roleBadge = ROLE_BADGE[role] || { label: role, cls: 'bg-gray-100 text-gray-600' }

  const handleLogoutConfirm = () => {
    setLogoutConfirmOpen(false)
    performAdminLogout({ logout, navigate })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:relative z-50 w-64 h-full flex-shrink-0 bg-gradient-sidebar border-r border-white/10 flex flex-col shadow-soft-lg transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full md:w-0 md:overflow-hidden'}
        `}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 min-w-0">
          <img
            src={SITE_LOGO}
            alt="FORTI"
            className="h-auto w-auto max-h-10 max-w-full flex-1 object-contain object-left"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-primary-200/60 hover:text-white transition-colors shrink-0" title="Close sidebar">
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

        {/* Navigation — scrollable so all items visible at 100% zoom */}
        <nav className="flex-1 min-h-0 px-2.5 py-3 flex flex-col gap-2">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain space-y-0.5 pr-1 admin-sidebar-nav">
            {navItems.map(item => <NavItem key={item.label} item={item} unreadCount={unreadData?.count || 0} />)}
          </div>
        </nav>

        <div className="px-4 pb-3 pt-1 shrink-0">
          <p className="text-center text-[10px] leading-4 text-primary-300/50">
            Developed by{' '}
            <a href="https://kaitensoftware.com/" target="_blank" rel="noopener noreferrer"
              className="font-medium text-primary-200/60 hover:text-accent-gold transition-colors">
              Kaiten Software
            </a>
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-primary-100/50 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-ink-muted hover:text-primary-600 p-1 rounded-lg hover:bg-primary-50 transition">
            <Menu size={20} />
          </button>
          <h1 className="text-sm text-ink-muted font-semibold font-display">{panelLabel}</h1>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              title="Logout"
              className="ml-1 flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-gradient-section">
          <Outlet />
        </main>
      </div>

      <AdminLogoutConfirmModal
        open={logoutConfirmOpen}
        panelLabel={panelLabel}
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogoutConfirm}
      />

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-primary-100/50 overflow-hidden transform scale-100 transition-all duration-300">
            {/* Gradient Top */}
            <div className="h-2 bg-gradient-to-r from-primary-500 to-indigo-500" />
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                  <Mail size={24} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 font-display">New Messages in Office Inbox</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    You have <span className="font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{unreadData?.count}</span> unread contact message{unreadData?.count > 1 ? 's' : ''} awaiting review.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setShowPopup(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setShowPopup(false)
                    navigate('/messages')
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5"
                >
                  <MailOpen size={14} />
                  Open Inbox
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-Right Real-Time Toast Notification */}
      {toastMessage && (
        <>
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translate3d(120%, 0, 0); opacity: 0; }
              to { transform: translate3d(0, 0, 0); opacity: 1; }
            }
            .animate-toast-slide-in {
              animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed top-5 right-5 z-[100] max-w-sm bg-slate-950/90 text-white rounded-2xl shadow-2xl border border-white/10 p-4.5 backdrop-blur-md animate-toast-slide-in flex items-start gap-3.5 transition-all">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 animate-bounce">
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Message Received</p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                A visitor submitted a new contact enquiry in the public portal.
              </p>
              <button
                onClick={() => {
                  setToastMessage(null)
                  navigate('/messages')
                }}
                className="mt-3.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition flex items-center gap-1"
              >
                Open Inbox &rarr;
              </button>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/5 transition" title="Dismiss">
              <X size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
