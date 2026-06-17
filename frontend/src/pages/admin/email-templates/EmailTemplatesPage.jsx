import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import { Edit3, Eye, X, Save, Loader2, Trash2, DownloadCloud } from 'lucide-react'

const EVENT_KEYS = [
  'otp_verification',
  'application_submitted',
  'admin_new_application',
  'application_under_review',
  'application_approved',
  'application_rejected',
  'payment_submitted',
  'admin_payment_submitted',
  'payment_confirmed',
  'membership_confirmed',
  'invoice_generated',
  'certificate_generated',
  'renewal_reminder',
]

const EVENT_VARIABLES = {
  otp_verification: ['name', 'otp', 'purpose', 'expiryTime'],
  application_submitted: ['name', 'membershipId', 'submissionUuid'],
  admin_new_application: ['name', 'email', 'membershipId'],
  application_under_review: ['name', 'membershipId'],
  application_approved: ['name', 'membershipId'],
  application_rejected: ['name', 'membershipId', 'reason'],
  payment_submitted: ['name', 'membershipId', 'amount', 'currency', 'transactionId'],
  admin_payment_submitted: ['name', 'email', 'membershipId', 'amount', 'currency', 'transactionId'],
  payment_confirmed: ['name', 'membershipId', 'amount', 'currency', 'transactionId'],
  membership_confirmed: ['name', 'membershipId', 'loginUrl'],
  invoice_generated: ['name', 'membershipId', 'invoiceNumber', 'amount', 'currency', 'invoiceUrl'],
  certificate_generated: ['name', 'membershipId', 'dashboardUrl'],
  renewal_reminder: ['name', 'membershipId', 'expiryDate', 'daysLeft', 'formattedDate'],
}

export default function EmailTemplatesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({ event_key: '', subject: '', body: '', is_active: 1 })

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get('/settings/email-templates').then(r => r.data.data),
  })

  const saveMut = useMutation({
    mutationFn: ({ id, ...data }) =>
      id ? api.put(`/settings/email-templates/${id}`, data) : api.post('/settings/email-templates', data),
    onSuccess: () => {
      qc.invalidateQueries(['email-templates'])
      toast.success('Template saved')
      setEditing(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Save failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/settings/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['email-templates'])
      toast.success('Template deleted')
    },
    onError: err => toast.error(err.response?.data?.message || 'Delete failed'),
  })

  const seedMut = useMutation({
    mutationFn: () => api.post('/settings/email-templates/seed'),
    onSuccess: () => {
      qc.invalidateQueries(['email-templates'])
      toast.success('Default templates loaded successfully')
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed to load default templates'),
  })

  function openEdit(tpl) {
    setEditing(tpl)
    setForm({ ...tpl })
  }

  function handleSave() {
    saveMut.mutate(form)
  }

  function handleDelete(id) {
    if (window.confirm('Delete this template?')) deleteMut.mutate(id)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
        <p className="text-gray-500 text-sm mt-1">Manage automated email notifications sent to members</p>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <button className="btn-primary btn-sm" onClick={() => { setEditing({}); setForm({ event_key: '', subject: '', body: '', is_active: 1 }) }}>+ New Template</button>
        <button 
          className="btn-secondary btn-sm flex items-center gap-1.5" 
          onClick={() => {
            if (window.confirm('This will overwrite existing default templates and insert missing ones. Continue?')) {
              seedMut.mutate()
            }
          }}
          disabled={seedMut.isPending}
        >
          {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
          Load Default Templates
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading templates…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{tpl.event_key}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{tpl.subject || 'No subject set'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tpl.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <button onClick={() => openEdit(tpl)}
                  className="flex-1 btn-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1 py-2">
                  <Edit3 size={13} /> Edit
                </button>
                <button onClick={() => setPreview(tpl)}
                  className="flex-1 btn-sm bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1 py-2">
                  <Eye size={13} /> Preview
                </button>
                <button onClick={() => handleDelete(tpl.id)}
                  className="btn-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium flex items-center justify-center gap-1 py-2">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal — rendered via portal to document.body to avoid parent overflow/z-index issues */}
      {editing && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">{form.id ? 'Edit Template' : 'New Template'}</h3>
                {form.id && <p className="text-xs text-gray-500 mt-0.5">Event: <span className="font-mono text-primary-600">{form.event_key || ''}</span></p>}
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Key</label>
                {form.id ? (
                  <input className="input w-full bg-gray-50" value={form.event_key || ''} readOnly />
                ) : (
                  <select className="input w-full" value={form.event_key || ''} onChange={e => setForm(f => ({ ...f, event_key: e.target.value }))}>
                    <option value="">Select event…</option>
                    {EVENT_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                <input className="input w-full" value={form.subject || ''}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body
                </label>
                <textarea className="input w-full font-mono text-xs" rows={12} value={form.body || ''}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
                {form.event_key && EVENT_VARIABLES[form.event_key] && (
                  <p className="text-xs text-primary-600 mt-2 bg-primary-50 p-2 rounded border border-primary-100">
                    <span className="font-semibold text-primary-800">Available variables: </span>
                    {EVENT_VARIABLES[form.event_key].map(v => (
                      <span key={v} className="inline-block mr-2 mb-1 font-mono bg-white px-1 py-0.5 rounded shadow-sm border border-primary-100">
                        &#123;&#123;{v}&#125;&#125;
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="form-checkbox" checked={!!form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))} />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0 rounded-b-xl">
              <button onClick={() => setEditing(null)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleSave} disabled={saveMut.isPending}
                className="btn-primary btn-sm flex items-center gap-1">
                {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Template
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Preview Modal — also rendered via portal */}
      {preview && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Preview: {preview.event_key}</h3>
                <p className="text-xs text-gray-500">Subject: {preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
              {preview.body ? (
                <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                  {/* Mock Email Header */}
                  <div className="bg-gradient-to-br from-primary-700 to-primary-600 p-6 text-center text-white">
                    <div className="font-black text-2xl tracking-widest mb-1">FORTI</div>
                    <div className="text-[10px] font-semibold text-primary-200 tracking-widest uppercase">Federation of Rajasthan Trade & Industry</div>
                    <div className="w-10 h-[2px] bg-white/30 mx-auto my-3"></div>
                    <div className="text-sm font-semibold">{preview.subject}</div>
                  </div>
                  
                  {/* Actual User Template Content */}
                  <div className="p-6 prose prose-sm max-w-none whitespace-pre-line text-sm text-gray-800">
                    {preview.body}
                  </div>
                  
                  {/* Mock Email Footer */}
                  <div className="bg-gray-50 border-t p-6 text-center text-xs text-gray-400">
                    <div className="font-bold text-primary-700 mb-1">FORTI</div>
                    <div>Federation of Rajasthan Trade & Industry</div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      © {new Date().getFullYear()} FORTI. All rights reserved.<br/>
                      This is an automated email.
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No template body yet. Click Edit to add content.</p>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t bg-gray-50 flex-shrink-0 rounded-b-xl">
              <button onClick={() => { setPreview(null); openEdit(preview) }}
                className="btn-primary btn-sm flex items-center gap-1">
                <Edit3 size={14} /> Edit This Template
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
