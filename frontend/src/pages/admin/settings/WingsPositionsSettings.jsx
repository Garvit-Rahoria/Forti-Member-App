import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Award, Plus, Pencil, Loader2, Save, X } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

function EditRow({ initial, fields, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <tr className="bg-primary-50/40">
      {fields.map(f => (
        <td key={f.key} className="px-3 py-2">
          {f.type === 'checkbox' ? (
            <input type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} className="w-4 h-4 accent-primary-600" />
          ) : (
            <input className="input input-sm" value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
          )}
        </td>
      ))}
      <td className="px-3 py-2 whitespace-nowrap">
        <button className="btn-primary btn-sm mr-1" disabled={saving} onClick={() => onSave(form)}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        </button>
        <button className="btn-outline btn-sm" onClick={onCancel}><X size={12} /></button>
      </td>
    </tr>
  )
}

export default function WingsPositionsSettings() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('wings')
  const [editingWing, setEditingWing] = useState(null)
  const [editingPos, setEditingPos] = useState(null)
  const [newWing, setNewWing] = useState({ name: '', slug: '', description: '', sort_order: 0 })
  const [newPos, setNewPos] = useState({ title: '', slug: '', level: 50, sort_order: 0 })

  const { data: wings = [], isLoading: wingsLoading } = useQuery({
    queryKey: ['wings', 'all'],
    queryFn: () => api.get('/wings?active=0').then(r => r.data.data),
  })

  const { data: positions = [], isLoading: posLoading } = useQuery({
    queryKey: ['positions', 'all'],
    queryFn: () => api.get('/positions?active=0').then(r => r.data.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wings'] })
    qc.invalidateQueries({ queryKey: ['positions'] })
  }

  const wingCreate = useMutation({
    mutationFn: body => api.post('/wings', body),
    onSuccess: () => { invalidate(); setNewWing({ name: '', slug: '', description: '', sort_order: 0 }); toast.success('Wing created') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const wingUpdate = useMutation({
    mutationFn: ({ id, body }) => api.put(`/wings/${id}`, body),
    onSuccess: () => { invalidate(); setEditingWing(null); toast.success('Wing updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const posCreate = useMutation({
    mutationFn: body => api.post('/positions', body),
    onSuccess: () => { invalidate(); setNewPos({ title: '', slug: '', level: 50, sort_order: 0 }); toast.success('Position created') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const posUpdate = useMutation({
    mutationFn: ({ id, body }) => api.put(`/positions/${id}`, body),
    onSuccess: () => { invalidate(); setEditingPos(null); toast.success('Position updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const wingFields = [
    { key: 'name', type: 'text' },
    { key: 'slug', type: 'text' },
    { key: 'sort_order', type: 'text' },
    { key: 'is_active', type: 'checkbox' },
  ]
  const posFields = [
    { key: 'title', type: 'text' },
    { key: 'slug', type: 'text' },
    { key: 'level', type: 'text' },
    { key: 'sort_order', type: 'text' },
    { key: 'is_active', type: 'checkbox' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button type="button" onClick={() => setTab('wings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'wings' ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Layers size={16} /> Wings
        </button>
        <button type="button" onClick={() => setTab('positions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'positions' ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Award size={16} /> Positions
        </button>
      </div>

      {tab === 'wings' && (
        <div className="space-y-4">
          <div className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
            <div><label className="label">Name</label><input className="input" value={newWing.name} onChange={e => setNewWing(w => ({ ...w, name: e.target.value }))} /></div>
            <div><label className="label">Slug</label><input className="input" value={newWing.slug} onChange={e => setNewWing(w => ({ ...w, slug: e.target.value }))} placeholder="main" /></div>
            <div><label className="label">Sort</label><input className="input" type="number" value={newWing.sort_order} onChange={e => setNewWing(w => ({ ...w, sort_order: Number(e.target.value) }))} /></div>
            <button type="button" className="btn-primary flex items-center justify-center gap-2" disabled={wingCreate.isPending || !newWing.name || !newWing.slug}
              onClick={() => wingCreate.mutate(newWing)}>
              {wingCreate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add wing
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Sort</th><th className="px-3 py-2">Active</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wingsLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400"><Loader2 className="animate-spin inline" /></td></tr>
                ) : wings.map(w => editingWing === w.id ? (
                  <EditRow key={w.id} initial={w} fields={wingFields}
                    saving={wingUpdate.isPending}
                    onCancel={() => setEditingWing(null)}
                    onSave={form => wingUpdate.mutate({ id: w.id, body: { ...form, sort_order: Number(form.sort_order) } })} />
                ) : (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{w.name}</td>
                    <td className="px-3 py-2 text-gray-500">{w.slug}</td>
                    <td className="px-3 py-2">{w.sort_order}</td>
                    <td className="px-3 py-2">{w.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2"><button type="button" className="text-primary-600" onClick={() => setEditingWing(w.id)}><Pencil size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'positions' && (
        <div className="space-y-4">
          <div className="card p-4 grid sm:grid-cols-5 gap-3 items-end">
            <div><label className="label">Title</label><input className="input" value={newPos.title} onChange={e => setNewPos(p => ({ ...p, title: e.target.value }))} /></div>
            <div><label className="label">Slug</label><input className="input" value={newPos.slug} onChange={e => setNewPos(p => ({ ...p, slug: e.target.value }))} /></div>
            <div><label className="label">Level</label><input className="input" type="number" value={newPos.level} onChange={e => setNewPos(p => ({ ...p, level: Number(e.target.value) }))} /></div>
            <div><label className="label">Sort</label><input className="input" type="number" value={newPos.sort_order} onChange={e => setNewPos(p => ({ ...p, sort_order: Number(e.target.value) }))} /></div>
            <button type="button" className="btn-primary flex items-center justify-center gap-2" disabled={posCreate.isPending || !newPos.title || !newPos.slug}
              onClick={() => posCreate.mutate(newPos)}>
              {posCreate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add position
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Level</th><th className="px-3 py-2">Sort</th><th className="px-3 py-2">Active</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400"><Loader2 className="animate-spin inline" /></td></tr>
                ) : positions.map(p => editingPos === p.id ? (
                  <EditRow key={p.id} initial={p} fields={posFields}
                    saving={posUpdate.isPending}
                    onCancel={() => setEditingPos(null)}
                    onSave={form => posUpdate.mutate({ id: p.id, body: { ...form, level: Number(form.level), sort_order: Number(form.sort_order) } })} />
                ) : (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{p.title}</td>
                    <td className="px-3 py-2 text-gray-500">{p.slug}</td>
                    <td className="px-3 py-2">{p.level}</td>
                    <td className="px-3 py-2">{p.sort_order}</td>
                    <td className="px-3 py-2">{p.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2"><button type="button" className="text-primary-600" onClick={() => setEditingPos(p.id)}><Pencil size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
