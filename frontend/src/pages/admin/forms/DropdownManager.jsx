import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

function GroupModal({ group, onClose, onSave }) {
  const [d, setD] = useState(group || { name: '', slug: '', description: '' })
  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header"><h3 className="font-semibold">{group ? 'Edit Group' : 'New Dropdown Group'}</h3><button onClick={onClose} className="text-gray-400">✕</button></div>
        <form className="card-body space-y-3" onSubmit={e => { e.preventDefault(); onSave(d) }}>
          <div><label className="label">Name *</label><input className="input" value={d.name} required onChange={e => setD(x=>({...x,name:e.target.value,slug:x.slug||e.target.value.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}))} /></div>
          <div><label className="label">Slug *</label><input className="input" value={d.slug} required onChange={e => setD(x=>({...x,slug:e.target.value}))} /></div>
          <div><label className="label">Description</label><input className="input" value={d.description||''} onChange={e => setD(x=>({...x,description:e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

function ItemsEditor({ groupId }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dropdown-items', groupId],
    queryFn: () => api.get(`/dropdowns/groups/${groupId}/items`).then(r => r.data.data || [])
  })

  const [items, setItems] = useState(null)
  const itemList = items !== null ? items : (data || [])

  const saveMut = useMutation({
    mutationFn: list => api.put(`/dropdowns/groups/${groupId}/items/bulk`, { items: list }),
    onSuccess: () => { qc.invalidateQueries(['dropdown-items', groupId]); toast.success('Items saved'); setItems(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error')
  })

  const addRow = () => setItems(it => [...(it||itemList), { label: '', value: '', sort_order: (it||itemList).length }])
  const removeRow = i => setItems(it => (it||itemList).filter((_,idx)=>idx!==i))
  const updateRow = (i, key, val) => setItems(it => (it||itemList).map((r,idx)=>idx===i?{...r,[key]:val}:r))

  if (isLoading) return <p className="text-xs text-gray-400 py-2">Loading items…</p>

  return (
    <div className="space-y-2 mt-3">
      <div className="space-y-1">
        {itemList.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="input text-sm flex-1" placeholder="Label" value={item.label} onChange={e=>updateRow(i,'label',e.target.value)} />
            <input className="input text-sm flex-1" placeholder="Value (optional)" value={item.value||''} onChange={e=>updateRow(i,'value',e.target.value)} />
            <button className="text-red-400 hover:text-red-600 p-1" onClick={()=>removeRow(i)}><Trash2 size={12}/></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-outline btn-sm" onClick={addRow}><Plus size={12}/> Add</button>
        {items !== null && <button className="btn-primary btn-sm" onClick={()=>saveMut.mutate(itemList)}>Save Items</button>}
        {items !== null && <button className="btn-outline btn-sm" onClick={()=>setItems(null)}>Cancel</button>}
      </div>
    </div>
  )
}

export default function DropdownManager() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [expanded, setExpanded] = useState({})

  const { data: groups, isLoading } = useQuery({
    queryKey: ['dropdown-groups'],
    queryFn: () => api.get('/dropdowns/groups').then(r => r.data.data || [])
  })

  const saveMut = useMutation({
    mutationFn: d => d.id ? api.put(`/dropdowns/groups/${d.id}`, d) : api.post('/dropdowns/groups', d),
    onSuccess: () => { qc.invalidateQueries(['dropdown-groups']); toast.success('Group saved'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error')
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/dropdowns/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries(['dropdown-groups']); toast.success('Group deleted') }
  })

  const toggle = id => setExpanded(e => ({...e, [id]: !e[id]}))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dropdown Manager</h2>
        <button className="btn-primary" onClick={() => setModal('new')}><Plus size={16}/> New Group</button>
      </div>

      {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : (
        <div className="space-y-3">
          {(Array.isArray(groups) ? groups : []).map(g => (
            <div key={g.id} className="card">
              <div className="card-header cursor-pointer" onClick={()=>toggle(g.id)}>
                <div>
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-2 text-xs text-gray-400 font-mono">{g.slug}</span>
                  {g.description && <p className="text-xs text-gray-400 mt-0.5">{g.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-outline btn-sm" onClick={e=>{e.stopPropagation();setModal(g)}}><Edit size={12}/></button>
                  <button className="btn-danger btn-sm" onClick={e=>{e.stopPropagation();if(confirm('Delete this group and all its items?'))deleteMut.mutate(g.id)}}><Trash2 size={12}/></button>
                  {expanded[g.id]?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                </div>
              </div>
              {expanded[g.id] && (
                <div className="px-4 pb-4">
                  <ItemsEditor groupId={g.id} />
                </div>
              )}
            </div>
          ))}
          {(!groups || groups.length === 0) && <p className="text-gray-400 text-sm py-8 text-center">No dropdown groups yet.</p>}
        </div>
      )}

      {modal && <GroupModal group={modal==='new'?null:modal} onClose={()=>setModal(null)} onSave={saveMut.mutate} />}
    </div>
  )
}
