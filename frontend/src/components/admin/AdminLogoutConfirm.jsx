import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Shared Super Admin logout — clears session and redirects to login.
 * Used by header icon and Settings → Account & Security.
 */
export function performAdminLogout({ logout, navigate }) {
  sessionStorage.clear()
  localStorage.clear()
  logout()
  navigate('/login', { replace: true })
}

export function AdminLogoutConfirmModal({ open, onCancel, onConfirm, panelLabel = 'Super Admin Panel' }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-logout-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <LogOut size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 id="admin-logout-title" className="text-base font-bold text-gray-900">
                  Confirm Logout
                </h3>
                <button type="button" onClick={onCancel}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Are you sure you want to logout from the Super Admin Panel?
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition">
              Cancel
            </button>
            <button type="button" onClick={onConfirm}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition inline-flex items-center gap-1.5">
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Hook for Settings / layout — same logout + confirm modal flow */
export function useAdminLogoutConfirm(panelLabel) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const label = panelLabel
    || (user?.role === 'super_admin' ? 'Super Admin Panel' : 'Admin Panel')

  const confirmAndLogout = () => {
    performAdminLogout({ logout, navigate })
  }

  return { confirmAndLogout, panelLabel: label }
}
