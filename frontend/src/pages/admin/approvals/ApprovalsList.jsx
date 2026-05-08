import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Eye, CheckCircle, XCircle, RotateCcw, Search, Clock,
  CreditCard, Shield, X, Loader2, FileText, DollarSign, Image, MessageSquare,
} from "lucide-react"
import { useState } from "react"
import api from "../../../api/client"
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from "react-hot-toast"
import { useAuth } from "../../../contexts/AuthContext"

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "all",               label: "All",             color: "gray"   },
  { key: "submitted",         label: "Submitted",       color: "blue"   },
  { key: "under_review",      label: "Under Review",    color: "yellow" },
  { key: "payment_pending",   label: "Pmt Pending",     color: "orange" },
  { key: "payment_submitted", label: "Pmt Submitted",   color: "purple" },
  { key: "payment_verified",  label: "Pmt Verified",    color: "teal"   },
  { key: "approved",          label: "Approved",        color: "green"  },
  { key: "active",            label: "Active",          color: "green"  },
  { key: "rejected",          label: "Rejected",        color: "red"    },
  { key: "pending_info",      label: "Pending Info",    color: "blue"   },
]

const STATUS_COLORS = {
  draft:              "bg-gray-100 text-gray-600",
  submitted:          "bg-blue-100 text-blue-700",
  under_review:       "bg-yellow-100 text-yellow-700",
  payment_pending:    "bg-orange-100 text-orange-700",
  payment_submitted:  "bg-purple-100 text-purple-700",
  payment_verified:   "bg-teal-100 text-teal-700",
  approved:           "bg-green-100 text-green-700",
  active:             "bg-emerald-100 text-emerald-700",
  rejected:           "bg-red-100 text-red-700",
  expired:            "bg-gray-100 text-gray-500",
  pending_info:       "bg-blue-100 text-blue-700",
  verified:           "bg-teal-100 text-teal-700",
  pending:            "bg-yellow-100 text-yellow-700",
}

const STATUS_LABELS = {
  draft:              "Draft",
  submitted:          "Submitted",
  under_review:       "Under Review",
  payment_pending:    "Payment Pending",
  payment_submitted:  "Payment Submitted",
  payment_verified:   "Payment Verified",
  approved:           "Approved",
  active:             "Active",
  rejected:           "Rejected",
  expired:            "Expired",
  pending_info:       "Pending Info",
  verified:           "Verified",
  pending:            "Pending",
}

// ── Helper: build action button ───────────────────────────────────────────────
function mkBtn(label, icon, onClick, color) {
  const COLOR_MAP = {
    yellow: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    green:  "bg-green-100 text-green-700 hover:bg-green-200",
    red:    "bg-red-100 text-red-600 hover:bg-red-200",
    teal:   "bg-teal-100 text-teal-700 hover:bg-teal-200",
    orange: "bg-orange-100 text-orange-700 hover:bg-orange-200",
    blue:   "bg-blue-100 text-blue-700 hover:bg-blue-200",
  }
  return {
    label,
    icon,
    onClick,
    cls: `rounded-lg px-2 py-1 text-xs font-medium flex items-center gap-1 ${COLOR_MAP[color] || COLOR_MAP.blue}`,
  }
}

// ── Action Modal ──────────────────────────────────────────────────────────────
function ActionModal({ row, action, onClose, onConfirm, pending }) {
  const [notes, setNotes] = useState("")

  const CONFIG = {
    under_review: {
      title: "Mark Under Review",
      icon: <Clock size={18} className="text-yellow-600" />,
      btn: "bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Move to Under Review",
    },
    payment_verified: {
      title: "Mark as Verified",
      icon: <CreditCard size={18} className="text-teal-600" />,
      btn: "bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Mark as Verified",
    },
    approved: {
      title: "Approve Application",
      icon: <CheckCircle size={18} className="text-green-600" />,
      btn: "bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Approve and Activate",
    },
    active: {
      title: "Activate Membership",
      icon: <Shield size={18} className="text-green-600" />,
      btn: "bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Activate",
    },
    rejected: {
      title: "Reject Application",
      icon: <XCircle size={18} className="text-red-600" />,
      btn: "bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Reject",
    },
    pending_info: {
      title: "Request Information",
      icon: <MessageSquare size={18} className="text-blue-600" />,
      btn: "bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
      label: "Request Info",
    },
  }
  const cfg = CONFIG[action] || { title: action, label: action, btn: "btn-primary" }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <h3 className="font-semibold">{cfg.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="card-body space-y-4">
          {/* Applicant info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-800">{row.applicant_name}</p>
            <p className="text-gray-500 text-xs">{row.applicant_email}</p>
            {row.membership_id && (
              <p className="text-xs font-mono text-primary-600 mt-1">{row.membership_id}</p>
            )}
          </div>

          {/* Payment proof preview (for verification) */}
          {action === "payment_verified" && (
            <div>
              {row.screenshot_path ? (
                <>
                  <p className="text-xs font-medium text-gray-600 mb-1">Payment Proof</p>
                  <a href={row.screenshot_path} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={row.screenshot_path}
                      alt="Payment proof"
                      className="max-h-48 w-full object-contain rounded border border-gray-200 hover:opacity-90 transition"
                      onError={e => { e.target.style.display = "none" }}
                    />
                  </a>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                    {(row.pmt_transaction_id || row.transaction_id) && <span>Txn: <span className="font-mono text-gray-700">{row.pmt_transaction_id || row.transaction_id}</span></span>}
                    {row.payment_amount  && <span>Fee: <strong>{Number(row.payment_amount).toLocaleString('en-IN')}</strong></span>}
                    {row.payment_method_name && <span className="col-span-2">via {row.payment_method_name}</span>}
                  </div>
                  <a href={row.screenshot_path} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                    <FileText size={10} /> Open full image
                  </a>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-700">
                  No payment proof uploaded by applicant yet.
                </div>
              )}
            </div>
          )}

          {/* Approval checklist */}
          {action === "approved" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium mb-1">This will:</p>
              <ul className="space-y-0.5 text-xs">
                <li>Generate Membership ID (if not yet assigned)</li>
                <li>Create member login account</li>
                <li>Send approval and welcome emails</li>
                <li>Generate Certificate and Membership Card (background)</li>
                <li>Set application status to Active</li>
              </ul>
            </div>
          )}

          {/* Rejection warning */}
          {action === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              This will permanently reject this application. A rejection notification email will be sent.
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">
              Notes {action === "rejected"
                ? <span className="text-red-500 text-xs">- reason required</span>
                : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder={action === "rejected" ? "Reason for rejection..." : "Add remarks..."}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button type="button" className={cfg.btn} disabled={pending} onClick={() => onConfirm(action, notes)}>
              {pending && <Loader2 size={14} className="animate-spin" />}
              {cfg.label}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Screenshot Modal ──────────────────────────────────────────────────────────
function ScreenshotModal({ src, onClose }) {
  if (!src) return null
  const url = src.startsWith('http') ? src : src.startsWith('/') ? src : `/${src}`
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 z-10">
            <X size={18} className="text-gray-600" />
          </button>
          <img src={url} alt="Payment Screenshot" className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-white" />
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Payment status helper ─────────────────────────────────────────────────────
function getPaymentLabel(row) {
  const s = row.status
  const ps = row.pmt_status || row.payment_status

  if (row.payment_amount && ps) {
    return { label: ps === 'verified' ? 'Verified' : ps === 'pending' ? 'Submitted' : (ps.charAt(0).toUpperCase() + ps.slice(1)), color: ps === 'verified' ? 'bg-green-100 text-green-700' : ps === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600' }
  }
  if (s === 'active' || s === 'approved') return { label: row.payment_amount ? 'Verified' : 'Not Required', color: row.payment_amount ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }
  if (s === 'rejected') return { label: 'Not Applicable', color: 'bg-gray-100 text-gray-400' }
  if (s === 'payment_submitted') return { label: 'Submitted', color: 'bg-yellow-100 text-yellow-700' }
  if (s === 'payment_pending') return { label: 'Pending', color: 'bg-orange-100 text-orange-700' }
  if (s === 'payment_verified') return { label: 'Verified', color: 'bg-green-100 text-green-700' }
  if (s === 'under_review' || s === 'submitted') return { label: 'Not Required', color: 'bg-gray-100 text-gray-500' }
  return { label: 'Not Required', color: 'bg-gray-100 text-gray-500' }
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ApprovalsList() {
  const qc  = useQueryClient()
  const nav = useNavigate()
  const { user } = useAuth()
  const role = user?.role || 'office_staff'
  const [tab,      setTab]      = useState("submitted")
  const [page,     setPage]     = useState(1)
  const [q,        setQ]        = useState("")
  const [qInput,   setQInput]   = useState("")
  const [actionModal, setActionModal] = useState(null)
  const [screenshotModal, setScreenshotModal] = useState(null)

  // Tab counts
  const { data: counts = {} } = useQuery({
    queryKey: ["approval-counts"],
    queryFn: () => api.get("/approvals/counts").then(r => r.data.data),
    refetchInterval: 30_000,
  })

  // Main table data (filtered by current tab)
  const { data, isLoading } = useQuery({
    queryKey: ["approvals-all", tab, page, q],
    queryFn: () =>
      api.get("/approvals/all", {
        params: { status: tab, page, per_page: 20, q: q || undefined },
      }).then(r => r.data.data),
  })

  // Status change mutation
  const statusMut = useMutation({
    mutationFn: ({ id, status, notes }) =>
      api.patch(`/approvals/${id}/status`, { status, notes }),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ["approvals-all"] })
      qc.invalidateQueries({ queryKey: ["approval-counts"] })
      const s = res.data?.data?.status
      toast.success(`Updated to: ${STATUS_LABELS[s] || s || "done"}`)
      setActionModal(null)
    },
    onError: err => toast.error(err.response?.data?.message || "Action failed"),
  })

  const rows      = data?.data || []
  const pagination = data || {}
  const isPending = statusMut.isPending

  function handleTabChange(key) { setTab(key); setPage(1); setQ(""); setQInput("") }
  function handleSearch(e)      { e.preventDefault(); setQ(qInput); setPage(1) }
  function openAction(row, action) { setActionModal({ row, action }) }
  function confirmAction(action, notes) {
    if (!actionModal) return
    statusMut.mutate({ id: actionModal.row.id, status: action, notes })
  }

  // Button set per row status — filtered by user role
  function getActions(row) {
    const s    = row.status
    const btns = []
    const isAdmin = role === 'super_admin' || role === 'admin'
    const isBM    = role === 'branch_manager'
    const isStaff = role === 'office_staff'

    btns.push({
      label: "View",
      icon: <Eye size={12} />,
      onClick: () => nav(`/applications/${row.id}`),
      cls: "btn-outline btn-sm",
    })

    if (s === "submitted") {
      // Staff & admin can mark under review
      if (isAdmin || isStaff)
        btns.push(mkBtn("Review",  <RotateCcw size={12} />,   () => openAction(row, "under_review"),    "yellow"))
      // Admin & BM can approve/reject
      if (isAdmin || isBM) {
        btns.push(mkBtn("Approve", <CheckCircle size={12} />, () => openAction(row, "approved"),        "green"))
        btns.push(mkBtn("Reject",  <XCircle size={12} />,     () => openAction(row, "rejected"),        "red"))
      }
      // BM can request info
      if (isBM)
        btns.push(mkBtn("Req Info", <MessageSquare size={12} />, () => openAction(row, "pending_info"), "blue"))
    }
    if (s === "under_review") {
      if (isAdmin || isBM) {
        btns.push(mkBtn("Approve", <CheckCircle size={12} />, () => openAction(row, "approved"),        "green"))
        btns.push(mkBtn("Reject",  <XCircle size={12} />,     () => openAction(row, "rejected"),        "red"))
      }
      if (isBM)
        btns.push(mkBtn("Req Info", <MessageSquare size={12} />, () => openAction(row, "pending_info"), "blue"))
    }
    if (s === "payment_pending" || s === "payment_submitted") {
      // Staff can verify/reject payment
      if (isAdmin || isStaff) {
        btns.push(mkBtn("Verify Pmt", <CreditCard size={12} />, () => openAction(row, "payment_verified"), "teal"))
        btns.push(mkBtn("Reject Pmt", <XCircle size={12} />,    () => openAction(row, "rejected"),          "red"))
      }
      if (isStaff)
        btns.push(mkBtn("Review",  <RotateCcw size={12} />,   () => openAction(row, "under_review"),    "yellow"))
    }
    if (s === "payment_verified") {
      // Only admin & BM can approve when payment is verified
      if (isAdmin || isBM) {
        btns.push(mkBtn("Approve", <CheckCircle size={12} />, () => openAction(row, "approved"), "green"))
        btns.push(mkBtn("Reject",  <XCircle size={12} />,     () => openAction(row, "rejected"), "red"))
      }
    }
    if (s === "pending_info") {
      if (isAdmin || isStaff)
        btns.push(mkBtn("Review",  <RotateCcw size={12} />, () => openAction(row, "under_review"), "yellow"))
      if (isAdmin || isBM) {
        btns.push(mkBtn("Approve", <CheckCircle size={12} />, () => openAction(row, "approved"), "green"))
        btns.push(mkBtn("Reject",  <XCircle size={12} />,     () => openAction(row, "rejected"), "red"))
      }
    }
    // Safety fallback
    if (s === "approved" && isAdmin) {
      btns.push(mkBtn("Activate", <Shield size={12} />, () => openAction(row, "active"), "green"))
    }

    return btns
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approvals</h2>
          <p className="text-gray-500 text-sm">Review and manage membership applications</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="input w-56" placeholder="Search name, email, ID…"
            value={qInput} onChange={e => setQInput(e.target.value)} />
          <button type="submit" className="btn-outline"><Search size={14} /></button>
        </form>
      </div>

      {/* Status Tabs — each tab queries GET /approvals/all?status=<key> */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map(t => {
          const cnt = counts[t.key] ?? 0
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.key ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
              {cnt > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${tab === t.key ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"}`}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Applications table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Applicant</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Membership ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Loader2 size={20} className="animate-spin mx-auto mb-2" />Loading…
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  No applications found
                  {tab !== "all" && <p className="text-xs mt-1">with status: <strong>{STATUS_LABELS[tab] || tab}</strong></p>}
                </td></tr>
              ) : rows.map(row => {
                const actions = getActions(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {/* Applicant */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.applicant_name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.applicant_email || ""}</p>
                      {row.membership_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {row.membership_type}
                        </span>
                      )}
                    </td>

                    {/* Membership ID */}
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${row.membership_id ? "text-primary-700 font-bold" : "text-gray-400"}`}>
                        {row.membership_id || "—"}
                      </span>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.package_name ? (
                        <div>
                          <p className="font-medium">{row.package_name}</p>
                          {row.package_total > 0 && (
                            <p className="text-gray-400">Fee: {Number(row.package_total).toLocaleString('en-IN')}</p>
                          )}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3">
                      {(() => {
                        const pmt = getPaymentLabel(row)
                        return (
                          <div className="space-y-0.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${pmt.color}`}>
                              {pmt.label}
                            </span>
                            {row.payment_amount > 0 && (
                              <p className="text-xs text-gray-600">Fee: {Number(row.payment_amount).toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        )
                      })()}
                    </td>

                    {/* Submitted date */}
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString("en-IN") : "—"}
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center flex-wrap">
                        {actions.map((a, i) => (
                          <button key={i} className={a.cls} title={a.label} onClick={a.onClick}>
                            {a.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm">
            <span className="text-gray-500">
              Page {pagination.page} of {pagination.lastPage} — {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-outline btn-sm" disabled={page >= pagination.lastPage} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Action confirmation modal */}
      {actionModal && (
        <ActionModal
          row={actionModal.row}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onConfirm={confirmAction}
          pending={isPending}
        />
      )}

      {/* Screenshot modal */}
      {screenshotModal && (
        <ScreenshotModal src={screenshotModal} onClose={() => setScreenshotModal(null)} />
      )}
    </div>
  )
}
