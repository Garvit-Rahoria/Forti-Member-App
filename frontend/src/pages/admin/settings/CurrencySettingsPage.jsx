import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, X, Check, Globe, Loader2, Star, ToggleLeft, ToggleRight } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

const COMMON_CURRENCIES = [
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee'       },
  { code: 'USD', symbol: '$',   name: 'US Dollar'           },
  { code: 'EUR', symbol: '€',   name: 'Euro'                },
  { code: 'GBP', symbol: '£',   name: 'British Pound'       },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham'          },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar'    },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar'   },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar'     },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen'        },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar'  },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc'         },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit'   },
]

const EMPTY = {
  country_id: '', currency_code: 'INR', currency_symbol: '₹',
  currency_name: 'Indian Rupee', exchange_rate: 1, is_default: 0, is_active: 1,
}

// ── Currency Modal ────────────────────────────────────────────────────────────
function CurrencyModal({ item, countries, onClose, onSave, saving }) {
  const [d, setD] = useState(() => item ? { ...item, country_id: item.country_id ?? '' } : { ...EMPTY })

  function pickCurrency(code) {
    const c = COMMON_CURRENCIES.find(x => x.code === code)
    if (c) setD(x => ({ ...x, currency_code: c.code, currency_symbol: c.symbol, currency_name: c.name }))
    else   setD(x => ({ ...x, currency_code: code }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(d)
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{item ? 'Edit Currency Setting' : 'Add Currency Setting'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <form className="card-body space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Country <span className="text-gray-400 font-normal">(leave blank for global/default)</span></label>
            <select className="input" value={d.country_id ?? ''} onChange={e => setD(x => ({ ...x, country_id: e.target.value }))}>
              <option value="">🌐 Global (applies to all countries without a specific setting)</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Currency</label>
              <select className="input" value={d.currency_code}
                onChange={e => pickCurrency(e.target.value)}>
                {COMMON_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} – {c.symbol} {c.name}</option>
                ))}
                <option value="OTHER">Other (custom)…</option>
              </select>
            </div>
            <div>
              <label className="label">Currency Code</label>
              <input className="input font-mono uppercase" value={d.currency_code}
                onChange={e => setD(x => ({ ...x, currency_code: e.target.value.toUpperCase() }))}
                placeholder="INR" required maxLength={10}/>
            </div>
            <div>
              <label className="label">Symbol</label>
              <input className="input" value={d.currency_symbol}
                onChange={e => setD(x => ({ ...x, currency_symbol: e.target.value }))}
                placeholder="₹" required />
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input" value={d.currency_name}
                onChange={e => setD(x => ({ ...x, currency_name: e.target.value }))}
                placeholder="Indian Rupee" required />
            </div>
          </div>

          <div>
            <label className="label">Exchange Rate (relative to base INR)</label>
            <input className="input" type="number" step="0.000001" min="0" value={d.exchange_rate}
              onChange={e => setD(x => ({ ...x, exchange_rate: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">
              E.g. 1 for INR, 0.012 for USD (1 INR = 0.012 USD). Used for display/reporting.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-600"
                checked={!!d.is_default}
                onChange={e => setD(x => ({ ...x, is_default: e.target.checked ? 1 : 0 }))} />
              Default for this scope
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-600"
                checked={!!d.is_active}
                onChange={e => setD(x => ({ ...x, is_active: e.target.checked ? 1 : 0 }))} />
              Active
            </label>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
              {item ? 'Save Changes' : 'Add Currency'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CurrencySettingsPage() {
  const qc = useQueryClient()
  const [modal, setModal]     = useState(null)
  const [editing, setEditing] = useState(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['currency-settings'],
    queryFn: () => api.get('/currency-settings').then(r => r.data.data),
  })
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: () => api.get('/locations/countries').then(r => r.data.data),
  })

  const saveMut = useMutation({
    mutationFn: d => d.id
      ? api.put(`/currency-settings/${d.id}`, d)
      : api.post('/currency-settings', d),
    onSuccess: () => {
      qc.invalidateQueries(['currency-settings'])
      toast.success('Currency setting saved')
      setModal(null); setEditing(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/currency-settings/${id}`),
    onSuccess: () => { qc.invalidateQueries(['currency-settings']); toast.success('Deleted') },
    onError: () => toast.error('Could not delete'),
  })

  const toggleActiveMut = useMutation({
    mutationFn: row => api.put(`/currency-settings/${row.id}`, { ...row, is_active: row.is_active ? 0 : 1 }),
    onSuccess: () => { qc.invalidateQueries(['currency-settings']); toast.success('Status updated') },
    onError: () => toast.error('Could not update status'),
  })

  // Group by country
  const global  = rows.filter(r => !r.country_id)
  const byCountry = rows.filter(r => !!r.country_id)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe size={22} className="text-primary-600"/> Currency Settings
          </h2>
          <p className="text-sm text-gray-500">Country-wise currency configuration for membership pricing</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(null); setModal('new') }}>
          <Plus size={16}/> Add Currency
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>How it works:</strong> Currencies marked as <strong>Global</strong> apply to all countries unless a country-specific entry exists.
        The <Star size={12} className="inline"/> <strong>Default</strong> currency is used when no plan has an explicit currency set.
      </div>

      {/* Global currencies */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Globe size={16} className="text-blue-500"/> Global / Default Currencies
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Symbol</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Exchange Rate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : global.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No global currencies. Add one.</td></tr>
              ) : global.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-900">{row.currency_code}</td>
                  <td className="px-4 py-3 text-lg">{row.currency_symbol}</td>
                  <td className="px-4 py-3 text-gray-700">{row.currency_name}</td>
                  <td className="px-4 py-3 text-gray-600">{Number(row.exchange_rate).toFixed(6)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.is_default ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                          <Star size={10}/> Default
                        </span>
                      ) : null}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button title={row.is_active ? 'Deactivate' : 'Activate'}
                        className="text-gray-400 hover:text-primary-600"
                        onClick={() => toggleActiveMut.mutate(row)}>
                        {row.is_active
                          ? <ToggleRight size={20} className="text-green-500"/>
                          : <ToggleLeft size={20} className="text-gray-400"/>}
                      </button>
                      <button className="btn-outline btn-sm" onClick={() => { setEditing(row); setModal('edit') }}>
                        <Edit size={12}/>
                      </button>
                      <button className="btn-danger btn-sm"
                        onClick={() => { if (window.confirm('Delete this currency setting?')) deleteMut.mutate(row.id) }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Country-specific currencies */}
      {byCountry.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Country-Specific Currencies</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Country</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Symbol</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Exchange Rate</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byCountry.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.country_name || `Country #${row.country_id}`}</td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{row.currency_code}</td>
                    <td className="px-4 py-3 text-lg">{row.currency_symbol}</td>
                    <td className="px-4 py-3 text-gray-700">{row.currency_name}</td>
                    <td className="px-4 py-3 text-gray-600">{Number(row.exchange_rate).toFixed(6)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                            <Star size={10}/> Default
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button title={row.is_active ? 'Deactivate' : 'Activate'}
                          className="text-gray-400 hover:text-primary-600"
                          onClick={() => toggleActiveMut.mutate(row)}>
                          {row.is_active
                            ? <ToggleRight size={20} className="text-green-500"/>
                            : <ToggleLeft size={20} className="text-gray-400"/>}
                        </button>
                        <button className="btn-outline btn-sm" onClick={() => { setEditing(row); setModal('edit') }}>
                          <Edit size={12}/>
                        </button>
                        <button className="btn-danger btn-sm"
                          onClick={() => { if (window.confirm('Delete this currency setting?')) deleteMut.mutate(row.id) }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(modal === 'new' || modal === 'edit') && (
        <CurrencyModal
          item={modal === 'edit' ? editing : null}
          countries={countries}
          onClose={() => { setModal(null); setEditing(null) }}
          onSave={saveMut.mutate}
          saving={saveMut.isPending}
        />
      )}
    </div>
  )
}
