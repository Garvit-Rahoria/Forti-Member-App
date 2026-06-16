import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  Eye, CheckCircle, XCircle, RotateCcw, Search,
  CreditCard, Shield, X, Loader2, FileText, MessageSquare, MoreVertical
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import api from "../../../api/client"
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from "react-hot-toast"
import { useAuth } from "../../../contexts/AuthContext"

import { assetUrl as resolveAssetUrl } from '../../../utils/assetUrl'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "all",      label: "All"      },
  { key: "pending",  label: "Pending"  },
  { key: "verified", label: "Verified" },
  { key: "active",   label: "Active"   },
  { key: "rejected", label: "Rejected" },
]

// Map UI tab keys → real DB statuses
const TAB_STATUSES = {
  all:      null,
  pending:  ["submitted", "under_review", "payment_pending", "payment_submitted", "pending_info"],
  verified: ["payment_verified", "approved"],
  active:   ["active"],
  rejected: ["rejected"],
}

const STATUS_COLORS = {
  draft:              "bg-gray-100 text-gray-500",
  submitted:          "bg-blue-100 text-blue-700",
  under_review:       "bg-amber-100 text-amber-700",
  payment_pending:    "bg-orange-100 text-orange-700",
  payment_submitted:  "bg-purple-100 text-purple-700",
  payment_verified:   "bg-teal-100 text-teal-700",
  approved:           "bg-teal-100 text-teal-700",
  active:             "bg-emerald-100 text-emerald-800",
  rejected:           "bg-red-100 text-red-700",
  expired:            "bg-gray-100 text-gray-400",
  pending_info:       "bg-sky-100 text-sky-700",
}

const STATUS_LABELS = {
  draft:              "Draft",
  submitted:          "Submitted",
  under_review:       "Under Review",
  payment_pending:    "Pmt Pending",
  payment_submitted:  "Pmt Submitted",
  payment_verified:   "Pmt Verified",
  approved:           "Approved",
  active:             "Active",
  rejected:           "Rejected",
  expired:            "Expired",
  pending_info:       "Pending Info",
}

// Currency symbol helper
function currencySymbol(currency) {
  const map = { INR: "₹", USD: "$", AED: "AED", EUR: "€", GBP: "£", SGD: "S$" }
  return map[currency] || (currency ? currency + " " : "₹")
}

function formatAmount(amount, currency) {
  if (!amount || Number(amount) === 0) return null
  const sym = currencySymbol(currency)
  if (currency && currency !== "INR") return `${sym}${Number(amount).toLocaleString()}`
  return `${sym}${Number(amount).toLocaleString("en-IN")}`
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function mkBtn(label, icon, onClick, color) {
  const MAP = {
    yellow: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    green:  "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
    red:    "bg-red-100 text-red-600 hover:bg-red-200",
    teal:   "bg-teal-100 text-teal-700 hover:bg-teal-200",
    blue:   "bg-blue-100 text-blue-700 hover:bg-blue-200",
  }
  return { label, icon, onClick, cls: `rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors ${MAP[color] || MAP.blue}` }
}

function getPaymentLabel(row) {
  const s  = row.status
  const ps = row.pmt_status || row.payment_status
  const currency = row.package_currency || "INR"
  if (row.payment_amount && ps) {
    const label = ps === "verified" ? "Verified" : ps === "pending" ? "Submitted" : (ps[0].toUpperCase() + ps.slice(1))
    const color = ps === "verified" ? "bg-emerald-100 text-emerald-700" : ps === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
    return { label, color, currency }
  }
  if (s === "active" || s === "approved")      return { label: row.payment_amount ? "Verified" : "Not Required", color: row.payment_amount ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500", currency }
  if (s === "rejected")                        return { label: "—", color: "bg-gray-100 text-gray-400", currency }
  if (s === "payment_submitted")               return { label: "Submitted", color: "bg-amber-100 text-amber-700", currency }
  if (s === "payment_pending")                 return { label: "Pending",   color: "bg-orange-100 text-orange-700", currency }
  if (s === "payment_verified")                return { label: "Verified",  color: "bg-emerald-100 text-emerald-700", currency }
  return { label: "—", color: "bg-gray-100 text-gray-500", currency }
}

// ── Action Modal ──────────────────────────────────────────────────────────────
function InlineActions({ row, actions, nav }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)} 
        className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-100 rounded-lg shadow-lg z-50 py-1 flex flex-col">
          {actions.map((a, i) => {
            const isRed = a.label === 'Reject'
            return (
              <button 
                key={i} 
                onClick={() => { setOpen(false); a.onClick(); }} 
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-left hover:bg-gray-50 transition-colors ${isRed ? 'text-red-600' : 'text-gray-700'}`}
              >
                {a.icon} {a.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
function ActionModal({ row, action, onClose, onConfirm, pending }) {
  const [notes, setNotes] = useState("")

  const CONFIG = {
    under_review:      { title: "Mark Under Review",    icon: <RotateCcw size={18} className="text-yellow-600" />, btnCls: "bg-yellow-500 hover:bg-yellow-600 text-white", label: "Move to Under Review" },
    payment_verified:  { title: "Verify Payment",       icon: <CreditCard size={18} className="text-teal-600" />,  btnCls: "bg-teal-600 hover:bg-teal-700 text-white",      label: "Mark Payment Verified" },
    approved:          { title: "Approve Application",  icon: <CheckCircle size={18} className="text-green-600" />, btnCls: "bg-green-600 hover:bg-green-700 text-white",   label: "Approve Application" },
    active:            { title: "Activate Membership",  icon: <Shield size={18} className="text-green-600" />,     btnCls: "bg-green-600 hover:bg-green-700 text-white",    label: "Activate Membership" },
    activate:          { title: "Approve & Activate Membership",  icon: <Shield size={18} className="text-emerald-600" />,   btnCls: "bg-emerald-600 hover:bg-emerald-700 text-white", label: "Approve & Activate" },
    rejected:          { title: "Reject Application",   icon: <XCircle size={18} className="text-red-600" />,      btnCls: "bg-red-600 hover:bg-red-700 text-white",        label: "Reject" },
    pending_info:      { title: "Request Information",  icon: <MessageSquare size={18} className="text-blue-600" />, btnCls: "bg-blue-500 hover:bg-blue-600 text-white",     label: "Request Info" },
  }
  const cfg = CONFIG[action] || { title: action, label: action, btnCls: "bg-primary-600 text-white" }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <div className="flex items-center gap-2">{cfg.icon}<h3 className="font-semibold">{cfg.title}</h3></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="card-body space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-800">{row.applicant_name}</p>
            <p className="text-gray-500 text-xs">{row.applicant_email}</p>
            {row.membership_id && <p className="text-xs font-mono text-primary-600 mt-1">{row.membership_id}</p>}
          </div>

          {action === "payment_verified" && row.screenshot_path && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Payment Proof</p>
              <a href={resolveAssetUrl(row.screenshot_path)} target="_blank" rel="noreferrer">
                <img src={resolveAssetUrl(row.screenshot_path)} alt="Payment proof"
                  className="max-h-48 w-full object-contain rounded border border-gray-200 hover:opacity-90 transition"
                  onError={e => {
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18">Payment screenshot unavailable</text></svg>'
                  }} />
              </a>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                {(row.pmt_transaction_id || row.transaction_id) && <span>Txn: <span className="font-mono text-gray-700">{row.pmt_transaction_id || row.transaction_id}</span></span>}
                {row.payment_amount > 0 && <span>Fee: <strong>{Number(row.payment_amount).toLocaleString("en-IN")}</strong></span>}
                {row.payment_method_name && <span className="col-span-2">via {row.payment_method_name}</span>}
              </div>
            </div>
          )}

          {action === "approved" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-0.5">
              <p className="font-medium mb-1">This will:</p>
              <p>• Mark application as Approved</p>
              <p>• Generate Membership ID (if not yet assigned)</p>
              <p>• Send approval notification email</p>
              <p className="pt-1 text-green-600 font-medium">Note: Activation is a separate step after approval.</p>
            </div>
          )}
          {(action === "active" || action === "activate") && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 space-y-0.5">
              <p className="font-medium mb-1">This will:</p>
              <p>• Create / update member login account</p>
              <p>• Send membership welcome email</p>
              <p>• Generate Certificate and Membership Card (background)</p>
              <p>• Set membership status to Active</p>
            </div>
          )}

          {action === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              This will permanently reject the application. A rejection notification email will be sent.
            </div>
          )}

          <div>
            <label className="label">
              Notes {action === "rejected"
                ? <span className="text-red-500 text-xs"> — reason required</span>
                : <span className="text-gray-400 font-normal"> (optional)</span>}
            </label>
            <textarea className="input" rows={3}
              placeholder={action === "rejected" ? "Reason for rejection…" : "Add remarks…"}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1 border-t border-gray-100">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${cfg.btnCls}`}
              disabled={pending}
              onClick={() => onConfirm(action, notes)}>
              {pending && <Loader2 size={14} className="animate-spin" />}
              {cfg.label}
            </button>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ApplicationsList() {
  const qc  = useQueryClient()
  const nav = useNavigate()
  const { user } = useAuth()
  const role = user?.role || "office_staff"

  const [tab,         setTab]         = useState("all")
  const [page,        setPage]        = useState(1)
  const [qInput,      setQInput]      = useState("")
  const [q,           setQ]           = useState("")
  const [actionModal, setActionModal] = useState(null)

  // Raw status counts from backend
  const { data: counts = {} } = useQuery({
    queryKey: ["approval-counts"],
    queryFn: () => api.get("/approvals/counts").then(r => r.data.data),
    refetchInterval: 30_000,
  })

  // Tab counts: aggregate counts for grouped tabs
  const tabCounts = {
    all:      counts.all || 0,
    pending:  (counts.submitted || 0) + (counts.under_review || 0) + (counts.payment_pending || 0) + (counts.payment_submitted || 0) + (counts.pending_info || 0),
    verified: (counts.payment_verified || 0) + (counts.approved || 0),
    active:   counts.active || 0,
    rejected: counts.rejected || 0,
  }

  // Rows — pass tab key directly; backend handles "pending"/"verified" as grouped keys
  const { data, isLoading } = useQuery({
    queryKey: ["approvals-all", tab, page, q],
    queryFn: () => api.get("/approvals/all", {
      params: { status: tab, page, per_page: 20, q: q || undefined },
    }).then(r => r.data.data),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status, notes }) => api.patch(`/approvals/${id}/status`, { status, notes }),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ["approvals-all"] })
      qc.invalidateQueries({ queryKey: ["approval-counts"] })
      const s = res.data?.data?.status
      toast.success(`Status updated: ${STATUS_LABELS[s] || s || "done"}`)
      setActionModal(null)
    },
    onError: err => {
      toast.error(err.response?.data?.message || "Action failed")
      setActionModal(null)
    },
  })

  const rows       = data?.data || []
  const pagination = data || {}
  const isPending  = statusMut.isPending

  function handleTabChange(key) { setTab(key); setPage(1); setQ(""); setQInput("") }
  function handleSearch(e)      { e.preventDefault(); setQ(qInput); setPage(1) }
  function openAction(row, action) { setActionModal({ row, action }) }
  function confirmAction(action, notes) {
    if (!actionModal) return
    statusMut.mutate({ id: actionModal.row.id, status: action, notes })
  }

  // Per-row action buttons filtered by role
  function getActions(row) {
    const s       = row.status
    const btns    = []
    const isAdmin = role === "super_admin" || role === "admin"
    const isBM    = role === "branch_manager"
    const isStaff = role === "office_staff"

    btns.push({ label: "View", icon: <Eye size={12} />, onClick: () => nav(`/applications/${row.id}`), cls: "btn-outline btn-sm" })

    const pmtVerified = (row.pmt_status === 'verified' || row.payment_status === 'verified' ||
      s === 'payment_verified' || s === 'approved' || s === 'active')

    if (s === "submitted") {
      if (isAdmin || isStaff)       btns.push(mkBtn("Review",      <RotateCcw size={12} />,    () => openAction(row, "under_review"),    "yellow"))
      if (isAdmin || isBM)          btns.push(mkBtn("Reject",      <XCircle size={12} />,      () => openAction(row, "rejected"),        "red"))
      if (isBM)                     btns.push(mkBtn("Req Info",    <MessageSquare size={12} />,() => openAction(row, "pending_info"),    "blue"))
    }
    if (s === "under_review") {
      if (isAdmin || isBM)          btns.push(mkBtn("Reject",      <XCircle size={12} />,      () => openAction(row, "rejected"),        "red"))
      if (isBM)                     btns.push(mkBtn("Req Info",    <MessageSquare size={12} />,() => openAction(row, "pending_info"),    "blue"))
    }
    if (s === "payment_pending" || s === "payment_submitted") {
      if (isAdmin || isStaff) {
                                    btns.push(mkBtn("Verify Pmt",  <CreditCard size={12} />,   () => openAction(row, "payment_verified"),"teal"))
                                    btns.push(mkBtn("Reject",      <XCircle size={12} />,      () => openAction(row, "rejected"),        "red"))
      }
    }
    if (s === "payment_verified") {
      // Single-click Approve = Approve + Activate directly
      if (isAdmin || isBM) {
                                    btns.push(mkBtn("Approve",     <CheckCircle size={12} />,  () => openAction(row, "activate"),         "green"))
                                    btns.push(mkBtn("Reject",      <XCircle size={12} />,      () => openAction(row, "rejected"),        "red"))
      }
    }
    if (s === "pending_info") {
      if (isAdmin || isStaff)       btns.push(mkBtn("Review",      <RotateCcw size={12} />,   () => openAction(row, "under_review"),    "yellow"))
      if (isAdmin || isBM)          btns.push(mkBtn("Reject",      <XCircle size={12} />,      () => openAction(row, "rejected"),        "red"))
    }
    if (s === "approved") {
      // Already activated via single-click approve — no extra activate button needed
    }
    return btns
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Applications</h2>
          <p className="text-gray-500 text-sm">Review, approve and manage all membership applications</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input className="input flex-1 sm:w-56" placeholder="Search name, email, ID…"
            value={qInput} onChange={e => setQInput(e.target.value)} />
          <button type="submit" className="btn-outline shrink-0"><Search size={14} /></button>
        </form>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map(t => {
          const cnt = tabCounts[t.key] ?? 0
          return (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
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
                const pmt = getPaymentLabel(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{row.applicant_name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.applicant_email || ""}</p>
                      {row.membership_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 inline-block capitalize">
                          {row.membership_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${row.membership_id ? "text-primary-700 font-bold" : "text-gray-400"}`}>
                        {row.membership_id || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.package_name ? (
                        <div>
                          <p className="font-medium">{row.package_name}</p>
                          {row.package_total > 0 && <p className="text-gray-400">₹{Number(row.package_total).toLocaleString("en-IN")}</p>}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pmt.color}`}>{pmt.label}</span>
                      {row.payment_amount > 0 && <p className="text-xs text-gray-500 mt-0.5">{formatAmount(row.payment_amount, row.package_currency)}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <InlineActions row={row} actions={actions} nav={nav} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination.lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm">
            <span className="text-gray-500">Page {pagination.page} of {pagination.lastPage} — {pagination.total} total</span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-outline btn-sm" disabled={page >= pagination.lastPage} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {actionModal && (
        <ActionModal
          row={actionModal.row}
          action={actionModal.action}
          onClose={() => setActionModal(null)}
          onConfirm={confirmAction}
          pending={isPending}
        />
      )}
    </div>
  )
}
