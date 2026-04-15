import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, MapPin, Building2, Globe } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

// ── Generic simple modal ──────────────────────────────────────────────────────
function SimpleModal({ title, fields, initial, onClose, onSave }) {
  const [d, setD] = useState(initial || {})
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="card-body space-y-3" onSubmit={e => { e.preventDefault(); onSave(d) }}>
          {fields.map(f => (
            <div key={f.key}>
              <label className="label">{f.label}{f.required && ' *'}</label>
              <input
                className="input"
                required={f.required}
                placeholder={f.placeholder}
                value={d[f.key] || ''}
                onChange={e => setD(x => ({ ...x, [f.key]: f.uppercase ? e.target.value.toUpperCase() : e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Cities list under a state ─────────────────────────────────────────────────
function CitiesList({ stateId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['cities', stateId],
    queryFn: () => api.get(`/locations/cities?state_id=${stateId}`).then(r => r.data.data || []),
  })

  const saveMut = useMutation({
    mutationFn: d => d.id
      ? api.put(`/locations/cities/${d.id}`, d)
      : api.post('/locations/cities', { ...d, state_id: stateId }),
    onSuccess: () => { qc.invalidateQueries(['cities', stateId]); toast.success('Saved'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const delMut = useMutation({
    mutationFn: id => api.delete(`/locations/cities/${id}`),
    onSuccess: () => { qc.invalidateQueries(['cities', stateId]); toast.success('Deleted') },
  })

  if (isLoading) return <p className="text-xs text-gray-400 px-3 py-1">Loading cities…</p>

  return (
    <div className="pl-4 pr-2 pb-2 space-y-1">
      <div className="flex items-center justify-between py-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cities / Districts ({cities.length})</span>
        <button className="btn-outline btn-sm" onClick={() => setModal('new')}><Plus size={11}/> Add City</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {cities.map(city => (
          <div key={city.id} className="flex items-center justify-between bg-white border border-gray-100 rounded px-2 py-1.5 text-xs group">
            <span className="text-gray-700">{city.name}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-gray-400 hover:text-primary-600" onClick={() => setModal(city)}><Edit size={11}/></button>
              <button className="text-gray-400 hover:text-red-500"
                onClick={() => { if (confirm(`Delete "${city.name}"?`)) delMut.mutate(city.id) }}><Trash2 size={11}/></button>
            </div>
          </div>
        ))}
      </div>
      {cities.length === 0 && <p className="text-xs text-gray-400 py-1">No cities added yet</p>}

      {modal && (
        <SimpleModal
          title={modal === 'new' ? 'Add City' : 'Edit City'}
          fields={[{ key: 'name', label: 'City Name', required: true, placeholder: 'e.g. Mumbai' }]}
          initial={modal === 'new' ? {} : modal}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
        />
      )}
    </div>
  )
}

// ── States list under a country ───────────────────────────────────────────────
function StatesList({ countryId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [expandedState, setExpandedState] = useState({})

  const { data: states = [], isLoading } = useQuery({
    queryKey: ['admin-states', countryId],
    queryFn: () => api.get(`/locations/states?country_id=${countryId}`).then(r => r.data.data || []),
  })

  const saveMut = useMutation({
    mutationFn: d => d.id
      ? api.put(`/locations/states/${d.id}`, d)
      : api.post('/locations/states', { ...d, country_id: countryId }),
    onSuccess: () => { qc.invalidateQueries(['admin-states', countryId]); toast.success('Saved'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const delMut = useMutation({
    mutationFn: id => api.delete(`/locations/states/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-states', countryId]); toast.success('Deleted') },
  })

  if (isLoading) return <p className="text-xs text-gray-400 p-3">Loading states…</p>

  const toggleState = id => setExpandedState(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="px-4 pb-4 space-y-2">
      <div className="flex items-center justify-between pt-3 mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">States / Provinces ({states.length})</span>
        <button className="btn-outline btn-sm" onClick={() => setModal('new')}><Plus size={12}/> Add State</button>
      </div>

      {states.length === 0 && <p className="text-xs text-gray-400 py-2">No states added yet</p>}

      {states.map(s => (
        <div key={s.id} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <button
              className="flex items-center gap-2 flex-1 text-left text-sm font-medium text-gray-700 hover:text-primary-600"
              onClick={() => toggleState(s.id)}>
              {expandedState[s.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
              {s.name}
              {s.code && <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded ml-1">{s.code}</span>}
            </button>
            <div className="flex gap-1 shrink-0">
              <button className="btn-outline btn-sm" onClick={() => setModal(s)}><Edit size={11}/></button>
              <button
                className="btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1.5"
                onClick={() => { if (confirm(`Delete state "${s.name}"? Cities will also be removed.`)) delMut.mutate(s.id) }}>
                <Trash2 size={11}/>
              </button>
            </div>
          </div>
          {expandedState[s.id] && (
            <div className="border-t border-gray-200 bg-white">
              <CitiesList stateId={s.id} />
            </div>
          )}
        </div>
      ))}

      {modal && (
        <SimpleModal
          title={modal === 'new' ? 'Add State' : 'Edit State'}
          fields={[
            { key: 'name', label: 'State Name', required: true, placeholder: 'e.g. Maharashtra' },
            { key: 'code', label: 'State Code', placeholder: 'e.g. MH', uppercase: true },
          ]}
          initial={modal === 'new' ? {} : modal}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
        />
      )}
    </div>
  )
}

// ── Country modal ─────────────────────────────────────────────────────────────
function CountryModal({ country, onClose, onSave }) {
  const [d, setD] = useState(country || { name: '', iso2: '', phone_code: '', currency: '' })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{country ? 'Edit Country' : 'Add Country'}</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form className="card-body space-y-3" onSubmit={e => { e.preventDefault(); onSave(d) }}>
          <div>
            <label className="label">Country Name *</label>
            <input className="input" required value={d.name} onChange={e => setD(x => ({ ...x, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">ISO2</label>
              <input className="input" maxLength="2" placeholder="IN" value={d.iso2 || ''}
                onChange={e => setD(x => ({ ...x, iso2: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label">Phone Code</label>
              <input className="input" placeholder="+91" value={d.phone_code || ''}
                onChange={e => setD(x => ({ ...x, phone_code: e.target.value }))} />
            </div>
            <div>
              <label className="label">Currency</label>
              <input className="input" placeholder="INR" value={d.currency || ''}
                onChange={e => setD(x => ({ ...x, currency: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LocationsManager() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [search, setSearch] = useState('')

  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get('/locations/countries').then(r => r.data.data || []),
  })

  const saveMut = useMutation({
    mutationFn: d => d.id ? api.put(`/locations/countries/${d.id}`, d) : api.post('/locations/countries', d),
    onSuccess: () => { qc.invalidateQueries(['countries']); toast.success('Saved'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const filtered = search
    ? countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : countries

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location Management</h2>
          <p className="text-gray-500 text-sm">Country → State → City hierarchy for form dropdowns</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>
          <Plus size={16}/> Add Country
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Globe size={20} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{countries.length}</p>
            <p className="text-xs text-gray-500">Countries</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-purple-600"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">States</p>
            <p className="text-xs text-gray-500">Expand country to manage</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-green-600"/>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">Cities</p>
            <p className="text-xs text-gray-500">Expand state to manage</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div>
        <input className="input" placeholder="Search countries…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tree */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"/>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggle(c.id)}>
                <div className="flex items-center gap-3">
                  {expanded[c.id]
                    ? <ChevronDown size={16} className="text-gray-400"/>
                    : <ChevronRight size={16} className="text-gray-400"/>}
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {c.iso2 || c.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {[c.iso2, c.phone_code, c.currency].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button className="btn-outline btn-sm" onClick={() => setModal(c)}>
                    <Edit size={12}/> Edit
                  </button>
                </div>
              </div>
              {expanded[c.id] && (
                <div className="border-t border-gray-100 bg-gray-50">
                  <StatesList countryId={c.id} />
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {search ? `No countries match "${search}"` : 'No countries added yet.'}
            </div>
          )}
        </div>
      )}

      {modal && (
        <CountryModal
          country={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
        />
      )}
    </div>
  )
}
