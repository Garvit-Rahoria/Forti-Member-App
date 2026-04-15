import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MemberProvider, useMember } from './contexts/MemberContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/auth/Login'
import ResetPassword from './pages/auth/ResetPassword'
import Dashboard from './pages/admin/Dashboard'
import FormList from './pages/admin/forms/FormList'
import FormBuilder from './pages/admin/forms/FormBuilder'
import DropdownManager from './pages/admin/forms/DropdownManager'
import ApplicationFieldsPage from './pages/admin/forms/ApplicationFieldsPage'
import ApplicationsList from './pages/admin/applications/ApplicationsList'
import ApplicationView from './pages/admin/applications/ApplicationView'
import MembersList from './pages/admin/members/MembersList'
import PackagesList from './pages/admin/packages/PackagesList'
import PaymentsHub from './pages/admin/payments/PaymentsHub'
import Reports from './pages/admin/reports/Reports'
import Settings from './pages/admin/settings/Settings'
import UsersList from './pages/admin/users/UsersList'
import AuditLog from './pages/admin/audit/AuditLog'
import RenewalsPage from './pages/admin/renewals/RenewalsPage'
import InvoicesPage from './pages/admin/invoices/InvoicesPage'
import EmailTemplatesPage from './pages/admin/email-templates/EmailTemplatesPage'
import ApplyForm from './pages/public/ApplyForm'
import MembershipPage from './pages/public/MembershipPage'
import LandingPage from './pages/public/LandingPage'
import AboutPage from './pages/public/AboutPage'
import PlansPage from './pages/public/PlansPage'
import VerifyMembership from './pages/public/VerifyMembership'
import NewsPage from './pages/public/NewsPage'
import GalleryPage from './pages/public/GalleryPage'
import ContactPage from './pages/public/ContactPage'
import MemberLogin from './pages/member/MemberLogin'
import MemberDashboard from './pages/member/MemberDashboard'
import TrackApplication from './pages/public/TrackApplication'
import CurrencySettings from './pages/admin/currency/CurrencySettings'
import ManagerReports from './pages/admin/reports/ManagerReports'

function PrivateRoute() {
  const { token, loading } = useAuth()
  console.log('[PrivateRoute] loading:', loading, '| token:', token ? 'SET' : 'NULL', '| localStorage:', localStorage.getItem('forti_token') ? 'SET' : 'NULL')
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  const hasToken = token || localStorage.getItem('forti_token')
  return hasToken ? <Outlet /> : <Navigate to="/login" replace />
}

// RoleRoute — only allow specified roles; others redirect to /dashboard
function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function MemberRoute({ children }) {
  const { token, member, loading, logout } = useMember()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!token) return <Navigate to="/member/login" replace />
  if (member && member.member_status && member.member_status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Membership Not Active Yet</h2>
          <p className="text-gray-500 text-sm">Your application is currently under review. You'll get access once your membership is approved and active.<br/><br/>Current status: <strong className="capitalize">{String(member.member_status || '').replace(/_/g, ' ')}</strong></p>
          <div className="flex gap-3 justify-center">
            <a href="/track" className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition">Track Status</a>
            <button onClick={logout} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition">Sign Out</button>
          </div>
        </div>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <MemberProvider>
          <Routes>
            {/* ── Public Website ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/apply/:slug" element={<ApplyForm />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/verify" element={<VerifyMembership />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* ── Member Portal ── */}
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/dashboard" element={<MemberRoute><MemberDashboard /></MemberRoute>} />
            <Route path="/track" element={<TrackApplication />} />

            {/* ── Admin Login ── */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Admin Routes ── */}
            <Route element={<PrivateRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<Dashboard />} />

                {/* Hidden form-builder routes (accessible via URL, not in nav) */}
                <Route path="forms" element={<RoleRoute roles={['super_admin','admin']}><FormList /></RoleRoute>} />
                <Route path="forms/new" element={<RoleRoute roles={['super_admin','admin']}><FormBuilder /></RoleRoute>} />
                <Route path="forms/:id/builder" element={<RoleRoute roles={['super_admin','admin']}><FormBuilder /></RoleRoute>} />
                <Route path="forms/dropdowns" element={<RoleRoute roles={['super_admin','admin']}><DropdownManager /></RoleRoute>} />
                <Route path="application-fields" element={<RoleRoute roles={['super_admin','admin']}><ApplicationFieldsPage /></RoleRoute>} />

                {/* Applications (merged with Approvals workflow) */}
                <Route path="applications" element={<ApplicationsList />} />
                <Route path="applications/:id" element={<ApplicationView />} />

                {/* Approvals redirects to Applications (backward compat) */}
                <Route path="approvals" element={<Navigate to="/applications" replace />} />

                {/* Members */}
                <Route path="members" element={<MembersList />} />

                {/* Plans */}
                <Route path="packages" element={<RoleRoute roles={['super_admin','admin']}><PackagesList /></RoleRoute>} />

                {/* Payments Hub — Transactions + Payment Methods tabs */}
                <Route path="payments" element={<PaymentsHub />} />
                {/* Old payment-methods route redirects to Payments Hub */}
                <Route path="payment-methods" element={<Navigate to="/payments?tab=methods" replace />} />

                <Route path="renewals" element={<RenewalsPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="email-templates" element={<RoleRoute roles={['super_admin','admin']}><EmailTemplatesPage /></RoleRoute>} />
                <Route path="reports" element={<Reports />} />
                <Route path="manager-reports" element={<RoleRoute roles={['branch_manager']}><ManagerReports /></RoleRoute>} />
                <Route path="audit" element={<RoleRoute roles={['super_admin']}><AuditLog /></RoleRoute>} />
                <Route path="settings" element={<RoleRoute roles={['super_admin','admin']}><Settings /></RoleRoute>} />
                <Route path="users" element={<RoleRoute roles={['super_admin']}><UsersList /></RoleRoute>} />
                <Route path="currency-settings" element={<RoleRoute roles={['super_admin','admin']}><CurrencySettings /></RoleRoute>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </MemberProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
