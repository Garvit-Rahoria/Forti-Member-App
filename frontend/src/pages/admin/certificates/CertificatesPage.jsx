import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, CreditCard, Download, Search, RefreshCw } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function downloadFile(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export default function CertificatesPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  // Members: ACTIVE (status=approved) + payment_status=verified
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['certs-members', q, page],
    queryFn: () => api.get('/certificates/list', { params: { q, page, per_page: 20 } }).then(r => r.data.data),
  })

  const members = data?.data || []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  const genCert = (m) => downloadFile(`${API_BASE}/api/certificates/${m.id}`, `certificate-${m.membership_id || m.id}.pdf`)
  const genCard = (m) => downloadFile(`${API_BASE}/api/certificates/card/${m.id}`, `idcard-${m.membership_id || m.id}.pdf`)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Award className="text-primary-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Certificates & ID Cards</h2>
            <p className="text-sm text-gray-500">
              {total} active members with verified payment · Generate and download PDFs
            </p>
          </div>
        </div>
        <button className="btn-outline flex items-center gap-1.5 text-sm" onClick={() => refetch()}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search name, email, membership ID…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
        />
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        Only showing members with <strong>status = Active</strong> and <strong>payment = Verified</strong>.
        Certificates & ID Cards are auto-generated when payment is verified.
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Membership ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Package</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Approved</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Expiry</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 min-w-[260px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No active members with verified payment found.
                  </td>
                </tr>
              ) : members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{m.applicant_name || '—'}</div>
                    <div className="text-xs text-gray-400">{m.applicant_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {m.membership_id
                      ? <span className="font-mono text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-1 rounded">{m.membership_id}</span>
                      : <span className="text-gray-400 text-xs">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{m.package_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.approved_at ? new Date(m.approved_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {/* Certificate */}
                      {m.cert_generated && m.certificate_pdf ? (
                        <>
                          <button className="btn-sm bg-green-100 text-green-700 rounded-lg px-2 text-xs flex items-center gap-1"
                            onClick={() => genCert(m)} title="Download Certificate">
                            <Download size={11} /> Cert
                          </button>
                          <button className="btn-sm bg-gray-100 text-gray-600 rounded-lg px-2 text-xs flex items-center gap-1"
                            onClick={() => genCert(m)} title="Regenerate Certificate">
                            <RefreshCw size={11} /> Re-Cert
                          </button>
                        </>
                      ) : (
                        <button className="btn-sm bg-primary-100 text-primary-700 rounded-lg px-2 text-xs flex items-center gap-1"
                          onClick={() => genCert(m)} title="Generate Certificate">
                          <Award size={11} /> Cert
                        </button>
                      )}

                      {/* ID Card */}
                      {m.card_generated && m.id_card_pdf ? (
                        <>
                          <button className="btn-sm bg-indigo-100 text-indigo-700 rounded-lg px-2 text-xs flex items-center gap-1"
                            onClick={() => genCard(m)} title="Download ID Card">
                            <Download size={11} /> Card
                          </button>
                          <button className="btn-sm bg-gray-100 text-gray-600 rounded-lg px-2 text-xs flex items-center gap-1"
                            onClick={() => genCard(m)} title="Regenerate ID Card">
                            <RefreshCw size={11} /> Re-Card
                          </button>
                        </>
                      ) : (
                        <button className="btn-sm bg-blue-100 text-blue-700 rounded-lg px-2 text-xs flex items-center gap-1"
                          onClick={() => genCard(m)} title="Generate ID Card">
                          <CreditCard size={11} /> Card
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
