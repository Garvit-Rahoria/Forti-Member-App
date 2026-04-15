import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, CheckCircle, XCircle, Clock, Plus, Eye, X, MoreVertical } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import { fmtAmount } from '../../../utils/currency'

const STATUS_BADGE = {
  pending:           <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Submitted</span>,
  payment_submitted: <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Under Review</span>,
  under_review:      <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Under Review</span>,
  verified:          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Verified</span>,
  completed:         <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Completed</span>,
  rejected:          <span className="bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">Rejected</span>,
}

function extensionLabel(row) {
  if (row.old_expiry_date && row.new_expiry_date) {
    const days   = Math.round((new Date(row.new_expiry_date) - new Date(row.old_expiry_date)) / 86400000)
    const months = Math.round(days / 30)
    if (months >= 36) return '+3 Years'
    if (months >= 24) return '+2 Years'
    if (months >= 12) return '+1 Year'
    if (months >= 6)  return '+6 Months'
    if (months > 0)   return `+${months}m`
  }
  const name = (row.package_name || '').toLowerCase()
  if (name.includes('3 year') || name.includes('3year')) return '+3 Years'
  if (name.includes('2 year') || name.includes('2year')) return '+2 Years'
  if (name.includes('year')) return '+1 Year'
  return '—'
}

function RenewalActionMenu({ row, onView, onVerify, onReject }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const canAct = ['pending', 'payment_submitted', 'under_review'].includes(row.status)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
          <button onClick={() => { setOpen(false); onView() }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
            <Eye size={13} /> View Details
          </button>
          {canAct && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { setOpen(false); onVerify() }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50">
                <CheckCircle size={13} /> Approve
              </button>
              <button onClick={() => { setOpen(false); onReject() }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                <XCircle size={13} /> Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function RenewalsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showVerifyModal, setShowVerifyModal] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [verifyForm, setVerifyForm] = useState({ action: 'approve', new_expiry_date: '', notes: '' })
  const [newForm, setNewForm] = useState({ submission_id: '', new_expiry_date: '', amount: '', notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['renewals', { q, status, page }],
    queryFn: () => api.get('/renewals', { params: { q, status, page, per_page: 20 } }).then(r => r.data.data),
  })

  const { data: expiring } = useQuery({
    queryKey: ['renewals-expiring'],
    queryFn: () => api.get('/renewals/expiring', { params: { days: 30 } }).then(r => r.data.data),
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/renewals/${id}/verify`, body),
    onSuccess: () => {
      qc.invalidateQueries(['renewals'])
      qc.invalidateQueries(['renewals-expiring'])
      setShowVerifyModal(null)
      toast.success('Renewal updated')
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const newMut = useMutation({
    mutationFn: body => api.post('/renewals', body),
    onSuccess: () => {
      qc.invalidateQueries(['renewals'])
      setShowNewModal(false)
      setNewForm({ submission_id: '', new_expiry_date: '', amount: '', notes: '' })
      toast.success('Renewal created')
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const rows    = data?.data  || []
  const total   = data?.total || 0
  const expRows = expiring    || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw size={22} className="text-primary-600" /> Renewals
          </h2>
          <p className="text-gray-500 text-sm">{total} renewal records</p>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-2" onClick={() => setShowNewModal(true)}>
          <Plus size={14} /> New Renewal
        </button>
      </div>

      {/* Expiring soon alert */}
      {expRows.length > 0 && (
        <div className="card p-4 border-l-4 border-yellow-400 bg-yellow-50">
          <p className="font-semibold text-yellow-800 flex items-center gap-2">
            <Clock size={16} /> {expRows.length} member(s) expiring within 30 days
          </p>
          <div className="mt-2 space-y-1">
            {expRows.slice(0, 5).map(m => (
              <p key={m.id} className="text-sm text-yellow-700">
                <span className="font-medium">{m.applicant_name}</span> ({m.membership_id}) —
                expires {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—'} ({m.days_left} days)
              </p>
            ))}
            {expRows.length > 5 && <p className="text-xs text-yellow-600">+{expRows.length - 5} more…</p>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search member, transaction ID…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-44" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="pending">Submitted</option>
          <option value="payment_submitted">Under Review</option>
          <option value="verified">Verified</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Package / Duration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Transaction ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Current Expiry</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Extension</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">New Expiry Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">No renewals found</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.applicant_name}</div>
                    <div className="text-xs text-gray-400">{row.membership_id}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <p>{row.package_name || '—'}</p>
                    {row.payment_method_name && <p className="text-gray-400">{row.payment_method_name}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmtAmount(row.amount, row.currency)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{row.payment_method_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.transaction_id || '—'}</td>
                  {/* Current Expiry */}
                  <td className="px-4 py-3 text-xs">
                    {row.old_expiry_date
                      ? <span className="text-gray-600">{new Date(row.old_expiry_date).toLocaleDateString('en-IN')}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  {/* Extension */}
                  <td className="px-4 py-3 text-xs font-semibold text-blue-700">{extensionLabel(row)}</td>
                  {/* New Expiry */}
                  <td className="px-4 py-3 text-xs">
                    {row.new_expiry_date
                      ? <span className="text-green-600 font-semibold">{new Date(row.new_expiry_date).toLocaleDateString('en-IN')}</span>
                      : <span className="text-gray-400">Pending</span>}
                  </td>
                  <td className="px-4 py-3">{STATUS_BADGE[row.status] || <span className="text-xs text-gray-500">{row.status}</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <RenewalActionMenu
                      row={row}
                      onView={() => { setShowVerifyModal(row); setVerifyForm({ action: 'approve', new_expiry_date: row.new_expiry_date || '', notes: '' }) }}
                      onVerify={() => { setShowVerifyModal(row); setVerifyForm({ action: 'approve', new_expiry_date: '', notes: '' }) }}
                      onReject={() => { setShowVerifyModal(row); setVerifyForm({ action: 'reject', new_expiry_date: '', notes: '' }) }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-500">
            <span>{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <button className="btn-outline btn-sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Renewal Details</h3>
              <button onClick={() => setShowVerifyModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>
            <p className="text-sm text-gray-600">
              Member: <strong>{showVerifyModal.applicant_name}</strong> ({showVerifyModal.membership_id})
            </p>
            {showVerifyModal.screenshot_path && (
              <a href={showVerifyModal.screenshot_path} target="_blank" rel="noreferrer"
                className="text-primary-600 text-sm underline block">View Payment Screenshot</a>
            )}
            <div>
              <label className="label">Action</label>
              <select className="input" value={verifyForm.action}
                onChange={e => setVerifyForm(f => ({ ...f, action: e.target.value }))}>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            {verifyForm.action === 'approve' && (
              <div>
                <label className="label">New Expiry Date *</label>
                <input type="date" className="input" value={verifyForm.new_expiry_date}
                  onChange={e => setVerifyForm(f => ({ ...f, new_expiry_date: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={verifyForm.notes}
                onChange={e => setVerifyForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-outline" onClick={() => setShowVerifyModal(null)}>Cancel</button>
              <button
                className={verifyForm.action === 'approve' ? 'btn-primary' : 'bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium'}
                disabled={verifyMut.isPending}
                onClick={() => verifyMut.mutate({ id: showVerifyModal.id, ...verifyForm })}
              >
                {verifyMut.isPending ? 'Saving…' : verifyForm.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Renewal Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg">Create Renewal</h3>
            <div>
              <label className="label">Submission / Member ID *</label>
              <input className="input" placeholder="Submission row ID (number)" value={newForm.submission_id}
                onChange={e => setNewForm(f => ({ ...f, submission_id: e.target.value }))} />
            </div>
            <div>
              <label className="label">New Expiry Date *</label>
              <input type="date" className="input" value={newForm.new_expiry_date}
                onChange={e => setNewForm(f => ({ ...f, new_expiry_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Amount Paid</label>
              <input type="number" className="input" value={newForm.amount}
                onChange={e => setNewForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={newForm.notes}
                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-outline" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={newMut.isPending}
                onClick={() => newMut.mutate(newForm)}>
                {newMut.isPending ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
