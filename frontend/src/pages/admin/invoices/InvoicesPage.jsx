import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Receipt, Download } from 'lucide-react'
import api from '../../../api/client'
import { fmtAmount } from '../../../utils/currency'

export default function InvoicesPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { q, type, page }],
    queryFn: () => api.get('/invoices', { params: { q, type, page, per_page: 20 } }).then(r => r.data.data),
  })

  const rows  = data?.data  || []
  const total = data?.total || 0

  const TYPE_BADGE = {
    membership: <span className="badge-blue">Membership</span>,
    renewal:    <span className="badge-green">Renewal</span>,
    upgrade:    <span className="badge-yellow">Upgrade</span>,
  }

  const downloadPdf = (id) => {
    const token = localStorage.getItem('token')
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    const url = `${apiBase}/api/invoices/${id}/download`
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={22} className="text-primary-600" /> Invoices
          </h2>
          <p className="text-gray-500 text-sm">{total} invoices</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search invoice #, member…" value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }} />
        </div>
        <select className="input w-40" value={type} onChange={e => { setType(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          <option value="membership">Membership</option>
          <option value="renewal">Renewal</option>
          <option value="upgrade">Upgrade</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Package</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No invoices found</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{row.invoice_number}</td>
                  <td className="px-4 py-3">{TYPE_BADGE[row.invoice_type] || row.invoice_type}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.member_name}</div>
                    <div className="text-xs text-gray-400">{row.member_id_str || row.member_email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.package_name || '—'}</td>
                  <td className="px-4 py-3 font-semibold">
                    {row.currency || '₹'}&nbsp;{Number(row.total_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {row.issued_at ? new Date(row.issued_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="btn-sm bg-primary-100 text-primary-700 rounded-lg px-3 text-xs flex items-center gap-1"
                      onClick={() => downloadPdf(row.id)}
                    >
                      <Download size={12} /> PDF
                    </button>
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
    </div>
  )
}
