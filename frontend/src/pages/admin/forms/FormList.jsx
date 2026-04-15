import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Copy } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

function FormModal({ form, onClose, onSave }) {
  const [data, setData] = useState(form || {
    name: '', slug: '', description: '', form_type: 'membership_application',
    is_multi_step: 1, allow_draft: 1, submit_button_label: 'Submit', success_message: ''
  })
  const handleSubmit = e => { e.preventDefault(); onSave(data) }
  const autoSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{form ? 'Edit Form' : 'New Form'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div>
            <label className="label">Form Name *</label>
            <input className="input" value={data.name} required
              onChange={e => setData(d => ({ ...d, name: e.target.value, slug: d.slug || autoSlug(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Slug (URL key) *</label>
            <input className="input font-mono text-sm" value={data.slug} required
              onChange={e => setData(d => ({ ...d, slug: e.target.value }))} />
          </div>
          <div>
            <label className="label">Form Type</label>
            <select className="input" value={data.form_type} onChange={e => setData(d => ({ ...d, form_type: e.target.value }))}>
              <option value="membership_application">Membership Application</option>
              <option value="renewal">Renewal</option>
              <option value="upgrade">Upgrade</option>
              <option value="event_registration">Event Registration</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={data.description || ''}
              onChange={e => setData(d => ({ ...d, description: e.target.value }))} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!data.is_multi_step}
                onChange={e => setData(d => ({ ...d, is_multi_step: e.target.checked ? 1 : 0 }))} />
              Multi-step
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!data.allow_draft}
                onChange={e => setData(d => ({ ...d, allow_draft: e.target.checked ? 1 : 0 }))} />
              Allow Draft Save
            </label>
          </div>
          <div>
            <label className="label">Success Message</label>
            <textarea className="input" rows={2} value={data.success_message || ''}
              onChange={e => setData(d => ({ ...d, success_message: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save Form</button>
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FormList() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'new' | form-obj

  const { data, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => api.get('/forms').then(r => r.data.data),
  })

  const createMut = useMutation({
    mutationFn: body => api.post('/forms', body),
    onSuccess: (res) => {
      qc.invalidateQueries(['forms'])
      toast.success('Form created!')
      setModal(null)
      nav(`/forms/${res.data.data.id}/builder`)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/forms/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Updated'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/forms/${id}`),
    onSuccess: () => { qc.invalidateQueries(['forms']); toast.success('Deleted') },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const handleSave = formData => {
    if (formData.id) updateMut.mutate(formData)
    else createMut.mutate(formData)
  }

  const statusBadge = f => f.is_active
    ? <span className="badge-green">Active</span>
    : <span className="badge-gray">Inactive</span>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Builder</h2>
          <p className="text-gray-500 text-sm">Manage your membership application form</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data || []).map(form => (
            <div key={form.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{form.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-gray-400 font-mono">/apply/{form.slug}</span>
                    <button
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                      title="Copy public form link"
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/apply/${form.slug}`); toast.success('Link copied!') }}
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                </div>
                {statusBadge(form)}
              </div>
              <div className="text-xs text-gray-500 space-y-1 mb-4">
                <div className="flex gap-4">
                  <span>{form.section_count ?? 0} sections</span>
                  <span>{form.field_count ?? 0} fields</span>
                  <span>{form.submission_count ?? 0} submissions</span>
                </div>
                <span className="capitalize">{form.form_type?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex gap-2">
                <Link to={`/forms/${form.id}/builder`} className="btn-primary btn-sm flex-1 text-center">
                  <Edit size={13} /> Build
                </Link>
                <a
                  href={`/apply/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline btn-sm"
                  title="Preview public form"
                >
                  <Eye size={13} />
                </a>
                <button className="btn-outline btn-sm" onClick={() => setModal(form)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
          {(data || []).length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <p className="text-lg mb-2">No forms found</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <FormModal
          form={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
