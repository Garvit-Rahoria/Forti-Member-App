import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit, Trash2, X, Loader2, ToggleLeft, ToggleRight, AlertCircle,
  DollarSign, Save, ChevronDown, ChevronUp, Globe2,
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'
import { getCurrencySymbol } from '../../../utils/currency'

const LOCATIONS = [
  { value: 'rajasthan',    label: 'Rajasthan' },
  { value: 'other_states', label: 'Other States' },
  { value: 'overseas',     label: 'Overseas' },
]

const MEMBERSHIP_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate',  label: 'Corporate' },
]

const LOC_CODE_MAP = { rajasthan: 'RAJ', other_states: 'OTH', overseas: 'OVSEA' }
const TYPE_CODE_MAP = { individual: 'IND', corporate: 'CORP' }
const DUR_CODE_MAP  = { '1year': '1Y', '3years': '3Y', lifetime: 'LFT' }

function generatePlanName(loc, type, dur, durations) {
  const locLabel  = LOCATIONS.find(l => l.value === loc)?.label || loc
  const typeLabel = MEMBERSHIP_TYPES.find(t => t.value === type)?.label || type
  const durLabel  = durations?.find(d => d.value === dur)?.label || dur
  return `${locLabel} ${typeLabel} - ${durLabel}`
}

function generatePlanCode(loc, type, dur) {
  return `${LOC_CODE_MAP[loc] || 'UNK'}-${TYPE_CODE_MAP[type] || 'UNK'}-${DUR_CODE_MAP[dur] || 'UNK'}`
}

function comboKey(loc, type, dur, countryId) {
  return `${loc}_${type}_${dur}_${countryId || ''}`.toUpperCase()
}

function formatDurationLabel(duration) {
  const raw = String(duration || '').trim()
  if (!raw) return ''
  if (raw.toLowerCase() === 'lifetime') return 'Lifetime'
  const yearsMatch = raw.match(/^(\d+)years?$/i)
  if (yearsMatch) {
    const years = Number(yearsMatch[1])
    return `${years} Year${years === 1 ? '' : 's'}`
  }
  return raw
}

// ── Plan Modal ──────────────────────────────────────────────────────────────
function PlanModal({ pkg, existingCombos, onClose, onSave, saving, countries, durations, wings }) {
  const isEdit = !!pkg

  // Detect if existing package has a custom duration (not in known durations list)
  const detectCustomDuration = (pkgDur) => {
    if (!pkgDur || pkgDur === 'lifetime') return { isCustom: false, customYears: '' }
    const known = (durations || []).map(d => d.value)
    if (!known.includes(pkgDur)) return { isCustom: true, customYears: pkgDur.replace('years','').replace('year','') || '' }
    return { isCustom: false, customYears: '' }
  }

  const { isCustom: initCustom, customYears: initYears } = detectCustomDuration(pkg?.duration)
  const [d, setD] = useState(() => {
    if (pkg) return {
      ...pkg,
      benefits: Array.isArray(pkg.benefits) ? pkg.benefits.join('\n') : (pkg.benefits || ''),
    }
    return {
      name: '', code: '', location: '', membership_type: '', duration: '',
      price: 0, description: '', benefits: '', is_active: 1, country_id: '', currency: 'INR', wing_id: '',
    }
  })
  const [isCustomDuration, setIsCustomDuration] = useState(initCustom)
  const [customYears, setCustomYears] = useState(initYears)

  // The effective duration value used in save/validation
  const effectiveDuration = isCustomDuration
    ? (customYears && Number(customYears) > 0
        ? (Number(customYears) === 1 ? '1year' : `${customYears}years`)
        : '')
    : d.duration

  const currencyLocked = !!d.location  // lock once location is selected
  const autoCurrencyForLoc = (loc) => loc === 'overseas' ? 'USD' : 'INR'

  function handleLocationChange(loc) {
    const type = d.membership_type
    const dur = effectiveDuration
    const cid = loc === 'overseas' ? d.country_id : ''
    const name = (loc && type && dur) ? generatePlanName(loc, type, dur, durations) : d.name
    const code = (loc && type && dur) ? generatePlanCode(loc, type, dur) : d.code
    const currency = autoCurrencyForLoc(loc)
    setD(x => ({ ...x, location: loc, name, code, country_id: loc === 'overseas' ? x.country_id : '', currency }))
  }

  function handleTypeChange(type) {
    const loc = d.location
    const dur = effectiveDuration
    const name = (loc && type && dur) ? generatePlanName(loc, type, dur, durations) : d.name
    const code = (loc && type && dur) ? generatePlanCode(loc, type, dur) : d.code
    setD(x => ({ ...x, membership_type: type, name, code }))
  }

  function handleDurationChange(dur) {
    if (dur === '__custom__') {
      setIsCustomDuration(true)
      // Don't set d.duration yet — wait for custom input
      const loc = d.location
      const type = d.membership_type
      setD(x => ({ ...x, duration: '' }))
      return
    }
    setIsCustomDuration(false)
    setCustomYears('')
    const loc = d.location
    const type = d.membership_type
    const name = (loc && type && dur) ? generatePlanName(loc, type, dur, durations) : d.name
    const code = (loc && type && dur) ? generatePlanCode(loc, type, dur) : d.code
    setD(x => ({ ...x, duration: dur, name, code }))
  }

  function handleCustomYearsChange(val) {
    setCustomYears(val)
    const yrs = Number(val)
    if (!yrs || yrs <= 0) return
    const durValue = yrs === 1 ? '1year' : `${yrs}years`
    const loc = d.location
    const type = d.membership_type
    const name = (loc && type) ? generatePlanName(loc, type, durValue, durations) : d.name
    const code = (loc && type) ? generatePlanCode(loc, type, durValue) : d.code
    setD(x => ({ ...x, name, code }))
  }

  function handleCountryChange(cid) {
    const country = countries.find(c => String(c.id) === String(cid))
    const loc = d.location
    const type = d.membership_type
    const dur = effectiveDuration
    let name = d.name
    let code = d.code
    if (loc && type && dur) {
      name = cid && country
        ? `${country.name} ${MEMBERSHIP_TYPES.find(t => t.value === type)?.label || type} - ${durations?.find(dd => dd.value === dur)?.label || dur}`
        : generatePlanName(loc, type, dur, durations)
      code = cid && country
        ? `${(country.code || country.name).substring(0,3).toUpperCase()}-${TYPE_CODE_MAP[type] || 'UNK'}-${DUR_CODE_MAP[dur] || 'UNK'}`
        : generatePlanCode(loc, type, dur)
    }
    setD(x => ({ ...x, country_id: cid, name, code }))
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/55 backdrop-blur-[2px]" onClick={onClose}>
        <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Package' : 'New Membership Package'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); onSave({ ...d, duration: effectiveDuration }) }}>
          {/* Location */}
          <div>
            <label className="label">Location *</label>
            <select className="input" value={d.location || ''} required onChange={e => handleLocationChange(e.target.value)}>
              <option value="">Select location...</option>
              {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Country (only for overseas) */}
          {d.location === 'overseas' && (
            <div>
              <label className="label flex items-center gap-2">
                <Globe2 size={14} className="text-emerald-500" />
                Country Override <span className="text-xs text-gray-400 font-normal">(optional — leave blank for base overseas package)</span>
              </label>
              <select className="input" value={d.country_id || ''} onChange={e => handleCountryChange(e.target.value)}>
                <option value="">Base Overseas (all countries)</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Type + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Membership Type *</label>
              <select className="input" value={d.membership_type || ''} required onChange={e => handleTypeChange(e.target.value)}>
                <option value="">Select type...</option>
                {MEMBERSHIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration *</label>
              <select className="input" value={isCustomDuration ? '__custom__' : (d.duration || '')} required onChange={e => handleDurationChange(e.target.value)}>
                <option value="">Select duration...</option>
                {(durations || []).map(dur => <option key={dur.value} value={dur.value}>{dur.label}</option>)}
                <option value="__custom__">Custom...</option>
              </select>
              {isCustomDuration && (
                <div className="mt-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="input"
                    placeholder="Enter number of years (e.g. 5)"
                    value={customYears}
                    onChange={e => handleCustomYearsChange(e.target.value)}
                    required
                  />
                  {customYears && Number(customYears) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Duration: {Number(customYears) === 1 ? '1 Year' : `${customYears} Years`}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Wing (Optional) */}
          <div>
            <label className="label">Wing <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
            <select className="input" value={d.wing_id || ''} onChange={e => setD(x => ({ ...x, wing_id: e.target.value }))}>
              <option value="">No Wing (General)</option>
              {(wings || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Auto-generated Plan Name & Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plan Name</label>
              <input className="input" value={d.name} onChange={e => setD(x => ({ ...x, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Plan Code</label>
              <input className="input font-mono uppercase" value={d.code}
                onChange={e => setD(x => ({ ...x, code: e.target.value.toUpperCase() }))} />
            </div>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price *</label>
              <input className="input" type="number" min="0" step="0.01" value={d.price} required
                onChange={e => setD(x => ({ ...x, price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={d.currency || 'INR'} disabled={currencyLocked}
                onChange={e => setD(x => ({ ...x, currency: e.target.value }))}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
              {currencyLocked && (
                <p className="text-xs text-gray-400 mt-1">
                  {d.location === 'overseas' ? 'Overseas plans use USD automatically' : 'India plans use INR automatically'}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={d.description || ''}
              onChange={e => setD(x => ({ ...x, description: e.target.value }))} />
          </div>

          {/* Benefits */}
          <div>
            <label className="label">Benefits (one per line)</label>
            <textarea className="input" rows={4} value={d.benefits || ''}
              placeholder="Digital membership card&#10;Access to all events&#10;Monthly newsletter"
              onChange={e => setD(x => ({ ...x, benefits: e.target.value }))} />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={!!d.is_active}
              onChange={e => setD(x => ({ ...x, is_active: e.target.checked ? 1 : 0 }))} />
            Active (visible to members)
          </label>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Package' : 'Create Package'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
        </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Location badge colors ─────────────────────────────────────────────────
const LOC_BADGE = {
  rajasthan:    'bg-orange-100 text-orange-700',
  other_states: 'bg-blue-100 text-blue-700',
  overseas:     'bg-green-100 text-green-700',
}

const LOC_LABELS = { rajasthan: 'Rajasthan', other_states: 'Other States', overseas: 'Overseas' }
const TYPE_LABELS = { individual: 'Individual', corporate: 'Corporate' }

// ── Pricing Rules Panel ──────────────────────────────────────────────────
function PricingRulesPanel() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState({})
  const [open, setOpen] = useState(false)

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => api.get('/pricing-rules').then(r => r.data.data),
  })

  const saveMut = useMutation({
    mutationFn: (rules) => api.put('/pricing-rules', { rules }),
    onSuccess: () => {
      qc.invalidateQueries(['pricing-rules'])
      toast.success('Pricing rules saved')
      setEditing({})
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving'),
  })

  function handleChange(id, field, value) {
    setEditing(prev => ({
      ...prev,
      [id]: { ...(prev[id] || rules.find(r => r.id === id)), [field]: value },
    }))
  }

  function handleSave() {
    const updated = rules.map(r => ({
      ...r,
      ...(editing[r.id] || {}),
    }))
    saveMut.mutate(updated)
  }

  const hasChanges = Object.keys(editing).length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <DollarSign size={16} className="text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 text-sm">Base Pricing Rules</h3>
            <p className="text-xs text-gray-500">Default prices by Location × Membership Type. 3 Years = Yearly × 3Y Multiplier. Lifetime = Yearly × Lifetime Multiplier.</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-200 p-5">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Location</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Yearly Price</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">3-Yr ×</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">3-Yr Price</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Lifetime ×</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Lifetime Price</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => {
                      const r = { ...rule, ...(editing[rule.id] || {}) }
                      const threeYearPrice = Number(r.yearly_price) * Number(r.three_year_multiplier ?? 3)
                      const lifetimePrice  = Number(r.yearly_price) * Number(r.lifetime_multiplier)
                      return (
                        <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LOC_BADGE[r.location] || 'bg-gray-100 text-gray-600'}`}>
                              {LOC_LABELS[r.location] || r.location}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {TYPE_LABELS[r.membership_type] || r.membership_type}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number" min="0" step="0.01"
                              className="input w-28 text-sm"
                              value={r.yearly_price}
                              onChange={e => handleChange(rule.id, 'yearly_price', e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number" min="1" step="0.5"
                              className="input w-20 text-sm"
                              value={r.three_year_multiplier ?? 3}
                              onChange={e => handleChange(rule.id, 'three_year_multiplier', e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-semibold text-indigo-700">
                              {threeYearPrice.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number" min="1" step="0.5"
                              className="input w-20 text-sm"
                              value={r.lifetime_multiplier}
                              onChange={e => handleChange(rule.id, 'lifetime_multiplier', e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {lifetimePrice.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              className="input w-20 text-sm"
                              value={r.currency}
                              onChange={e => handleChange(rule.id, 'currency', e.target.value)}
                            >
                              <option value="INR">INR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {hasChanges && (
                <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                  <button
                    className="btn-primary flex items-center gap-2 text-sm"
                    onClick={handleSave}
                    disabled={saveMut.isPending}
                  >
                    {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Pricing Rules
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">
                These base prices are used when auto-creating packages. Manually created packages can override these prices.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function PackagesList() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [filter, setFilter] = useState({ location: '', mt: '', dur: '' })
  const [countries, setCountries] = useState([])
  const [durations, setDurations] = useState([])
  const [wings, setWings] = useState([])

  useEffect(() => {
    api.get('/wings').then(r => setWings(r.data.data || [])).catch(() => {})
    api.get('/locations/countries').then(r => setCountries(r.data.data || [])).catch(() => {})
    api.get('/durations').then(r => {
      const rows = r.data.data || []
      setDurations(rows.map(d => ({
        ...d,
        value: d.type === 'lifetime' ? 'lifetime' : `${d.value}year${Number(d.value) === 1 ? '' : 's'}`,
        label: d.label || formatDurationLabel(d.type === 'lifetime' ? 'lifetime' : `${d.value}year${Number(d.value) === 1 ? '' : 's'}`),
      })))
    }).catch(() => {
      // fallback if migration not yet run
      setDurations([
        { id: 1, label: '1 Year',   value: '1year',    type: 'year' },
        { id: 2, label: '3 Years',  value: '3years',   type: 'year' },
        { id: 3, label: 'Lifetime', value: 'lifetime', type: 'lifetime' },
      ])
    })
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then(r => r.data.data),
  })

  const durationOptions = useMemo(() => {
    const map = new Map()
    durations.forEach(duration => {
      if (duration?.value) map.set(duration.value, duration.label || formatDurationLabel(duration.value))
    })
    ;(data || []).forEach(pkg => {
      if (pkg?.duration && !map.has(pkg.duration)) {
        map.set(pkg.duration, formatDurationLabel(pkg.duration))
      }
    })
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }))
  }, [durations, data])

  // Build existing combos set for duplicate checking (include country_id)
  const existingCombos = new Set(
    (data || []).filter(p => p.is_active).map(p => comboKey(p.location, p.membership_type, p.duration, p.country_id))
  )

  const saveMut = useMutation({
    mutationFn: d => {
      const payload = {
        name: d.name,
        code: d.code,
        location: d.location,
        membership_type: d.membership_type,
        duration: d.duration,
        price: Number(d.price) || 0,
        description: d.description || '',
        benefits: typeof d.benefits === 'string'
          ? JSON.stringify(d.benefits.split('\n').map(s => s.trim()).filter(Boolean))
          : JSON.stringify(d.benefits || []),
        is_active: d.is_active ? 1 : 0,
        country_id: d.country_id || null,
        currency: d.currency || 'INR',
        wing_id: d.wing_id || null,
      }
      return d.id
        ? api.put(`/packages/${d.id}`, payload)
        : api.post('/packages', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries(['packages'])
      toast.success('Package saved')
      setModal(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving package'),
  })

  const toggleMut = useMutation({
    mutationFn: pkg => api.put(`/packages/${pkg.id}`, { ...pkg, is_active: pkg.is_active ? 0 : 1 }),
    onSuccess: () => { qc.invalidateQueries(['packages']); toast.success('Status updated') },
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/packages/${id}`),
    onSuccess: () => { qc.invalidateQueries(['packages']); toast.success('Package deleted') },
    onError: err => toast.error(err.response?.data?.message || 'Failed to delete package'),
  })

  const filtered = (data || []).filter(pkg => {
    if (filter.location && pkg.location !== filter.location) return false
    if (filter.mt && pkg.membership_type !== filter.mt) return false
    if (filter.dur && pkg.duration !== filter.dur) return false
    return true
  })

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Membership Packages</h2>
          <p className="text-sm text-gray-500">{(data || []).length} packages &middot; Location + Type + Duration</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setModal('new')}>
          <Plus size={16} /> New Package
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
        <select className="input w-44 text-sm" value={filter.location} onChange={e => setFilter(f => ({ ...f, location: e.target.value }))}>
          <option value="">All Locations</option>
          {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className="input w-40 text-sm" value={filter.mt} onChange={e => setFilter(f => ({ ...f, mt: e.target.value }))}>
          <option value="">All Types</option>
          {MEMBERSHIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input w-40 text-sm" value={filter.dur} onChange={e => setFilter(f => ({ ...f, dur: e.target.value }))}>
          <option value="">All Durations</option>
          {durationOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        {(filter.location || filter.mt || filter.dur) && (
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setFilter({ location: '', mt: '', dur: '' })}>Clear</button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} shown</span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center space-y-3">
          <h3 className="font-semibold text-gray-800">No packages found</h3>
          <p className="text-sm text-gray-500">Create a package by selecting Location + Type + Duration.</p>
          <button className="btn-primary mx-auto flex items-center gap-2" onClick={() => setModal('new')}>
            <Plus size={16} /> New Package
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(pkg => (
            <div key={pkg.id} className={`bg-white rounded-xl border border-gray-200 p-5 ${!pkg.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-semibold text-sm leading-tight text-gray-900">{pkg.name}</h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{pkg.code}</p>
                </div>
                <button onClick={() => toggleMut.mutate(pkg)} title={pkg.is_active ? 'Deactivate' : 'Activate'}>
                  {pkg.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                </button>
              </div>

              <p className="text-2xl font-bold text-primary-600 mb-2">
                {getCurrencySymbol(pkg.currency)}{Number(pkg.price || 0).toLocaleString('en-IN')}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LOC_BADGE[pkg.location] || 'bg-gray-100 text-gray-600'}`}>
                  {LOCATIONS.find(l => l.value === pkg.location)?.label || pkg.location}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {pkg.membership_type === 'corporate' ? 'Corporate' : 'Individual'}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {durationOptions.find(d => d.value === pkg.duration)?.label || formatDurationLabel(pkg.duration)}
                </span>
                {pkg.location === 'overseas' && pkg.country_id && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {countries.find(c => c.id === pkg.country_id)?.name || `Country #${pkg.country_id}`}
                  </span>
                )}
                {pkg.wing_id && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                    {wings.find(w => w.id === pkg.wing_id)?.name || `Wing #${pkg.wing_id}`}
                  </span>
                )}
                {!!pkg.auto_created && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Auto-created</span>
                )}
              </div>

              {pkg.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{pkg.description}</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button className="btn-outline btn-sm flex-1 flex items-center justify-center gap-1.5" onClick={() => setModal(pkg)}>
                  <Edit size={12} /> Edit
                </button>
                <button className="btn-danger btn-sm"
                  onClick={() => { if (window.confirm('Permanently delete this package? This cannot be undone.')) deleteMut.mutate(pkg.id) }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PlanModal
          pkg={modal === 'new' ? null : modal}
          existingCombos={existingCombos}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
          saving={saveMut.isPending}
          countries={countries}
          durations={durations}
          wings={wings}
        />
      )}
    </div>
  )
}
