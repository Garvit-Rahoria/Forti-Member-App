import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
// NewsPage kept for reference; /news redirects to content hub
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MemberProvider, useMember } from './contexts/MemberContext'
import ErrorBoundary from './components/ErrorBoundary'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/auth/Login'
import ResetPassword from './pages/auth/ResetPassword'
import NotFound from './pages/NotFound'
import Dashboard from './pages/admin/Dashboard'
import FormList from './pages/admin/forms/FormList'
import FormBuilder from './pages/admin/forms/FormBuilder'
import DropdownManager from './pages/admin/forms/DropdownManager'
import ApplicationFieldsPage from './pages/admin/forms/ApplicationFieldsPage'
import ApplicationsList from './pages/admin/applications/ApplicationsList'
import ApplicationView from './pages/admin/applications/ApplicationView'
import MembersList from './pages/admin/members/MembersList'
import AdminMemberFullProfile from './pages/admin/members/AdminMemberFullProfile'
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
import GalleryPage from './pages/public/GalleryPage'
import ContactPage from './pages/public/ContactPage'
import MemberLogin from './pages/member/MemberLogin'
import MemberDashboard from './pages/member/MemberDashboard'
import MemberStatus from './pages/member/MemberStatus'
import TrackApplication from './pages/public/TrackApplication'
import PublicProfilePage from './pages/public/PublicProfilePage'
import ContentHubPage from './pages/public/ContentHubPage'
import ContentCategoryPage from './pages/public/ContentCategoryPage'
import BlogPostPage from './pages/public/BlogPostPage'
import BlogManagerPage from './pages/admin/blog/BlogManagerPage'
import ContentTagPage from './pages/public/ContentTagPage'
import CurrencySettings from './pages/admin/currency/CurrencySettings'
import ManagerReports from './pages/admin/reports/ManagerReports'
import { getMemberLandingPath, hasMemberDashboardAccess } from './utils/memberAccess'

function PrivateRoute() {
  const { token, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  // Only trust server-validated token from AuthContext — never read localStorage directly
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

// RoleRoute — only allow specified roles; others redirect to /dashboard
function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function MemberRoute({ children }) {
  const { token, member, loading } = useMember()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!token) return <Navigate to="/member/login" replace />
  if (member && !hasMemberDashboardAccess(member)) {
    return <Navigate to={getMemberLandingPath(member)} replace />
  }
  return children
}

function MemberStatusRoute({ children }) {
  const { token, member, loading } = useMember()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!token) return <Navigate to="/member/login" replace />
  if (member && hasMemberDashboardAccess(member)) return <Navigate to="/member/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
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
            <Route path="/news" element={<Navigate to="/content/insights" replace />} />
            <Route path="/tags/:tagSlug" element={<ContentTagPage />} />
            <Route path="/content/:menuSlug/posts/:postSlug" element={<BlogPostPage />} />
            <Route path="/content/:menuSlug/:categorySlug" element={<ContentCategoryPage />} />
            <Route path="/content/:menuSlug" element={<ContentHubPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* ── Member Portal ── */}
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/dashboard" element={<MemberRoute><MemberDashboard /></MemberRoute>} />
            <Route path="/member/status" element={<MemberStatusRoute><MemberStatus /></MemberStatusRoute>} />
            <Route path="/track" element={<TrackApplication />} />
            <Route path="/m/:slug" element={<PublicProfilePage />} />

            {/* ── Admin Login ── */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
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
                <Route path="members/:id/full" element={<AdminMemberFullProfile />} />

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
                <Route path="blog" element={<RoleRoute roles={['super_admin','admin']}><BlogManagerPage /></RoleRoute>} />
                <Route path="settings" element={<RoleRoute roles={['super_admin','admin']}><Settings /></RoleRoute>} />
                <Route path="users" element={<RoleRoute roles={['super_admin']}><UsersList /></RoleRoute>} />
                <Route path="currency-settings" element={<RoleRoute roles={['super_admin','admin']}><CurrencySettings /></RoleRoute>} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemberProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
