import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Plus, Edit2, Trash2, X, Loader2, Save,
  CheckCircle, Globe2, Star, ToggleLeft, ToggleRight, Info,
} from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'

const EMPTY = {
  country_id: '',
  currency_code: '',
  currency_symbol: '',
  currency_name: '',
  exchange_rate: 1,
  is_default: 0,
  is_active: 1,
}

function CurrencyModal({ item, countries, onClose, onSave, saving }) {
  const isEdit = !!item
  const [d, setD] = useState(() => item ? {
    country_id:     item.country_id   ?? '',
    currency_code:  item.currency_code  || '',
    currency_symbol: item.currency_symbol || '',
    currency_name:  item.currency_name  || '',
    exchange_rate:  item.exchange_rate  ?? 1,
    is_default:     Number(item.is_default),
    is_active:      Number(item.is_active),
  } : { ...EMPTY })

  const set = (k, v) => setD(p => ({ ...p, [k]: v }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!d.currency_code?.trim()) return toast.error('Currency code is required')
    onSave(d)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <DollarSign size={20} className="text-primary-600"/>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Currency' : 'Add Currency'}</h2>
              <p className="text-xs text-gray-500">{isEdit ? 'Update currency settings' : 'Configure a new currency'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Country */}
          <div>
            <label className="label">Country <span className="text-gray-400 font-normal text-xs">(leave blank for global default)</span></label>
            <select className="input" value={d.country_id} onChange={e => set('country_id', e.target.value)}>
              <option value="">— Global / Default —</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Code + Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Currency Code *</label>
              <input className="input uppercase" placeholder="e.g. USD, INR" maxLength={6}
                value={d.currency_code}
                onChange={e => set('currency_code', e.target.value.toUpperCase())}/>
            </div>
            <div>
              <label className="label">Symbol</label>
              <input className="input" placeholder="e.g. $, ₹, €" maxLength={5}
                value={d.currency_symbol}
                onChange={e => set('currency_symbol', e.target.value)}/>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">Currency Name</label>
            <input className="input" placeholder="e.g. Indian Rupee, US Dollar"
              value={d.currency_name}
              onChange={e => set('currency_name', e.target.value)}/>
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="label">Exchange Rate <span className="text-xs text-gray-400 font-normal ml-1">(relative to base)</span></label>
            <input className="input" type="number" min={0} step="0.0001" placeholder="1.0000"
              value={d.exchange_rate}
              onChange={e => set('exchange_rate', e.target.value)}/>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button type="button"
                onClick={() => set('is_default', d.is_default ? 0 : 1)}
                className={`transition-colors ${d.is_default ? 'text-amber-500' : 'text-gray-300'}`}>
                {d.is_default ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
              </button>
              <span className="text-sm text-gray-700 font-medium">Default Currency</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button type="button"
                onClick={() => set('is_active', d.is_active ? 0 : 1)}
                className={`transition-colors ${d.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                {d.is_active ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
              </button>
              <span className="text-sm text-gray-700 font-medium">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              {isEdit ? 'Save Changes' : 'Add Currency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CurrencySettings() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'create' | { ...row }
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['currency-settings'],
    queryFn: () => api.get('/currency-settings').then(r => r.data?.data ?? r.data ?? []),
  })

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get('/locations/countries').then(r => r.data?.data ?? r.data ?? []),
  })

  const createMut = useMutation({
    mutationFn: body => api.post('/currency-settings', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currency-settings'] }); toast.success('Currency added'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Failed to add currency'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/currency-settings/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currency-settings'] }); toast.success('Currency updated'); setModal(null) },
    onError: err => toast.error(err.response?.data?.message || 'Failed to update currency'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/currency-settings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currency-settings'] }); toast.success('Currency deleted'); setDeleteTarget(null) },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete currency'),
  })

  function handleSave(data) {
    if (modal === 'create') {
      createMut.mutate(data)
    } else {
      updateMut.mutate({ id: modal.id, ...data })
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={24} className="text-primary-600"/> Currency Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage currencies and exchange rates per country or global default.</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Add Currency
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0"/>
        <p className="text-blue-700 text-sm">
          Country-specific currencies override the global default for overseas members. Set a <strong>Global Default</strong> (no country) as the fallback.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-400"/>
          </div>
        ) : currencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign size={40} className="mb-3 opacity-40"/>
            <p className="font-medium text-gray-500">No currencies configured</p>
            <p className="text-sm mt-1">Add your first currency to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Country</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Currency</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Code</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Symbol</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-600">Rate</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Default</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Active</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currencies.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    {row.country_name ? (
                      <span className="flex items-center gap-1.5 font-medium text-gray-800">
                        <Globe2 size={14} className="text-gray-400"/>{row.country_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                        <Star size={10} className="fill-current"/> Global
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{row.currency_name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{row.currency_code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-lg font-medium text-gray-700">{row.currency_symbol || '—'}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-gray-600">{Number(row.exchange_rate).toFixed(4)}</td>
                  <td className="px-5 py-3.5 text-center">
                    {Number(row.is_default) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                        <Star size={10} className="fill-current"/> Yes
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {Number(row.is_active) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                        <CheckCircle size={10}/> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal(row)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit">
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => setDeleteTarget(row)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <CurrencyModal
          item={modal === 'create' ? null : modal}
          countries={countries}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-500"/>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Delete Currency?</h3>
              <p className="text-sm text-gray-500 mt-1">
                This will remove <strong>{deleteTarget.currency_code}</strong>
                {deleteTarget.country_name ? ` (${deleteTarget.country_name})` : ' (Global)'}. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="btn-danger flex-1 flex items-center justify-center gap-2">
                {deleteMut.isPending ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
