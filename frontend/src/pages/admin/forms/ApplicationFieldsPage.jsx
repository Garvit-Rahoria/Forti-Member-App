import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit, Trash2, X, Loader2, ChevronUp, ChevronDown,
  ClipboardList, MapPin, Users, Package, CreditCard,
} from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

// ── Step definitions ────────────────────────────────────────────────────
const STEPS = [
  { step: 1, title: 'Basic Details',    description: 'Personal information collected from the applicant', icon: ClipboardList, color: 'primary' },
  { step: 2, title: 'Location',         description: 'Member selects their region',                      icon: MapPin,        color: 'emerald' },
  { step: 3, title: 'Membership Type',  description: 'Member selects individual or corporate',           icon: Users,         color: 'violet' },
  { step: 4, title: 'Plan & Package',   description: 'Member chooses a plan; package is matched',        icon: Package,       color: 'amber' },
  { step: 5, title: 'Payment',          description: 'Member completes payment and uploads proof',       icon: CreditCard,    color: 'rose' },
]

// ── Simplified field types ──────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'text',           label: 'Text' },
  { value: 'email',          label: 'Email' },
  { value: 'phone',          label: 'Phone' },
  { value: 'number',         label: 'Number' },
  { value: 'date',           label: 'Date' },
  { value: 'dropdown',       label: 'Dropdown' },
  { value: 'textarea',       label: 'Text Area' },
  { value: 'image',          label: 'File Upload' },
  { value: 'file',           label: 'File' },
  { value: 'checkbox',       label: 'Checkbox' },
  { value: 'card_select',    label: 'Card Select' },
  { value: 'social_links',   label: 'Social Links' },
  { value: 'country_select', label: 'Country Selector' },
  { value: 'payment_method', label: 'Payment Method' },
]

const TYPE_LABEL = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t.label]))

// ── Field Modal ──────────────────────────────────────────────────────────
function FieldModal({ field, stepNum, onClose, onSave, saving }) {
  const isEdit = !!field
  const [d, setD] = useState(() => {
    if (field) return {
      ...field,
      options: Array.isArray(field.options) ? field.options : [],
    }
    return { field_key: '', label: '', field_type: 'text', is_required: 0, placeholder: '', options: [], step: stepNum }
  })
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))

  function handleLabelChange(label) {
    setD(prev => ({
      ...prev,
      label,
      field_key: isEdit ? prev.field_key : label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    }))
  }

  const needsOptions = ['dropdown', 'card_select'].includes(d.field_type)
  const isCardSelect = d.field_type === 'card_select'

  function addOption() {
    if (isCardSelect) {
      set('options', [...d.options, { value: '', label: '', description: '', icon: '' }])
    } else {
      set('options', [...d.options, ''])
    }
  }
  function updateOption(i, v)  { set('options', d.options.map((o, idx) => idx === i ? v : o)) }
  function removeOption(i)     { set('options', d.options.filter((_, idx) => idx !== i)) }
  function updateCardOption(i, key, val) {
    set('options', d.options.map((o, idx) => idx === i ? { ...o, [key]: val } : o))
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Edit Field' : 'Add New Field'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={e => {
          e.preventDefault()
          if (!d.label.trim()) return toast.error('Label is required')
          onSave({ ...d, step: stepNum })
        }}>
          <div>
            <label className="label">Label *</label>
            <input className="input" required value={d.label}
              placeholder="e.g. Full Name, Date of Birth"
              onChange={e => handleLabelChange(e.target.value)} />
          </div>

          <div>
            <label className="label">Field Type *</label>
            <select className="input" value={d.field_type} onChange={e => set('field_type', e.target.value)}>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {!['image', 'file', 'checkbox', 'card_select', 'country_select', 'payment_method'].includes(d.field_type) && (
            <div>
              <label className="label">Placeholder <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" value={d.placeholder || ''} placeholder="Hint text shown inside the field"
                onChange={e => set('placeholder', e.target.value)} />
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-600"
              checked={!!d.is_required}
              onChange={e => set('is_required', e.target.checked ? 1 : 0)} />
            <span className="text-sm text-gray-700 font-medium">Required field</span>
          </label>

          {needsOptions && !isCardSelect && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Dropdown Options *</label>
                <button type="button" className="text-primary-600 text-xs hover:underline" onClick={addOption}>
                  + Add Option
                </button>
              </div>
              {d.options.length === 0 && <p className="text-xs text-amber-600">Add at least one option</p>}
              <div className="space-y-2">
                {d.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                    <input className="input flex-1 text-sm" placeholder={`Option ${i + 1}`}
                      value={typeof opt === 'string' ? opt : opt.label || ''} onChange={e => updateOption(i, e.target.value)} />
                    <button type="button" onClick={() => removeOption(i)}
                      className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCardSelect && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Card Options *</label>
                <button type="button" className="text-primary-600 text-xs hover:underline" onClick={addOption}>
                  + Add Card
                </button>
              </div>
              {d.options.length === 0 && <p className="text-xs text-amber-600">Add at least one card option</p>}
              <div className="space-y-3">
                {d.options.map((opt, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Card {i + 1}</span>
                      <button type="button" onClick={() => removeOption(i)}
                        className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input text-sm" placeholder="Label (shown)"
                        value={opt.label || ''} onChange={e => updateCardOption(i, 'label', e.target.value)} />
                      <input className="input text-sm" placeholder="Value (stored)"
                        value={opt.value || ''} onChange={e => updateCardOption(i, 'value', e.target.value)} />
                    </div>
                    <input className="input text-sm" placeholder="Description (optional)"
                      value={opt.description || ''} onChange={e => updateCardOption(i, 'description', e.target.value)} />
                    <input className="input text-sm" placeholder="Icon / Emoji (optional)"
                      value={opt.icon || ''} onChange={e => updateCardOption(i, 'icon', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Field' : 'Add Field'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Step Section ────────────────────────────────────────────────────────
function StepSection({ stepDef, fields, onAdd, onEdit, onDelete, onMove, isLoading }) {
  const Icon = stepDef.icon
  const colorMap = {
    primary: { bg: 'bg-primary-50', border: 'border-primary-200', badge: 'bg-primary-600', text: 'text-primary-700' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700' },
    violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  badge: 'bg-violet-600',  text: 'text-violet-700' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-600',   text: 'text-amber-700' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    badge: 'bg-rose-600',    text: 'text-rose-700' },
  }
  const c = colorMap[stepDef.color] || colorMap.primary
  const activeFields = fields.filter(f => f.is_active)
  const inactiveFields = fields.filter(f => !f.is_active)

  return (
    <div className={`bg-white rounded-xl border ${c.border} overflow-hidden`}>
      <div className={`${c.bg} px-5 py-3 border-b ${c.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`w-7 h-7 rounded-full ${c.badge} text-white text-xs font-bold flex items-center justify-center`}>
            {stepDef.step}
          </span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Icon size={14} className={c.text} />
              {stepDef.title}
            </h3>
            <p className="text-xs text-gray-500">{stepDef.description}</p>
          </div>
        </div>
        <button className="btn-primary btn-sm flex items-center gap-1.5" onClick={onAdd}>
          <Plus size={14} /> Add Field
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : activeFields.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-400">No fields yet. Click "Add Field" to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {activeFields.map((field, idx) => (
            <div key={field.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex flex-col gap-0.5">
                  <button className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                    disabled={idx === 0} onClick={() => onMove(field, -1)}>
                    <ChevronUp size={14} />
                  </button>
                  <button className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                    disabled={idx === activeFields.length - 1} onClick={() => onMove(field, 1)}>
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{field.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{TYPE_LABEL[field.field_type] || field.field_type}</span>
                    {field.is_required
                      ? <span className="text-xs font-medium text-red-500">• Required</span>
                      : <span className="text-xs text-gray-300">• Optional</span>
                    }
                    {field.placeholder && <span className="text-xs text-gray-300 truncate max-w-[200px]">• {field.placeholder}</span>}
                    {Array.isArray(field.options) && field.options.length > 0 && (
                      <span className="text-xs text-gray-300 truncate max-w-[250px]">
                        • {field.options.map(o => typeof o === 'string' ? o : o.label).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                  title="Edit" onClick={() => onEdit(field)}>
                  <Edit size={14} />
                </button>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove" onClick={() => { if (window.confirm(`Remove "${field.label}"?`)) onDelete(field.id) }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveFields.length > 0 && (
        <div className="px-5 py-2.5 bg-gray-50 border-t text-xs text-gray-400">
          {inactiveFields.length} hidden field{inactiveFields.length > 1 ? 's' : ''}: {inactiveFields.map(f => f.label).join(', ')}
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function ApplicationFieldsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)   // null | { step, field? }

  const { data: allFields = [], isLoading } = useQuery({
    queryKey: ['application-fields'],
    queryFn: () => api.get('/application-fields').then(r => r.data.data),
  })

  const saveMut = useMutation({
    mutationFn: d => {
      const payload = {
        step: d.step,
        field_key: d.field_key,
        label: d.label,
        field_type: d.field_type,
        is_required: d.is_required ? 1 : 0,
        placeholder: d.placeholder || '',
        options: d.options || [],
        is_active: d.is_active !== undefined ? d.is_active : 1,
      }
      return d.id
        ? api.put(`/application-fields/${d.id}`, payload)
        : api.post('/application-fields', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries(['application-fields'])
      toast.success('Field saved')
      setModal(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/application-fields/${id}`),
    onSuccess: () => { qc.invalidateQueries(['application-fields']); toast.success('Field removed') },
  })

  const reorderMut = useMutation({
    mutationFn: orders => api.patch('/application-fields/reorder', { orders }),
    onSuccess: () => qc.invalidateQueries(['application-fields']),
  })

  function getStepFields(stepNum) {
    return allFields.filter(f => f.step === stepNum)
  }

  function moveField(stepNum, field, dir) {
    const stepFields = getStepFields(stepNum).filter(f => f.is_active)
    const idx = stepFields.findIndex(f => f.id === field.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= stepFields.length) return
    const arr = [...stepFields]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    reorderMut.mutate(arr.map((f, i) => ({ id: f.id, field_order: i })))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Form Builder</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage the fields in each step of the membership application form.
          The 5 steps are fixed but you can add, edit, reorder, or remove fields within each step.
        </p>
      </div>

      {STEPS.map(stepDef => (
        <StepSection
          key={stepDef.step}
          stepDef={stepDef}
          fields={getStepFields(stepDef.step)}
          isLoading={isLoading}
          onAdd={() => setModal({ step: stepDef.step })}
          onEdit={field => setModal({ step: stepDef.step, field })}
          onDelete={id => deleteMut.mutate(id)}
          onMove={(field, dir) => moveField(stepDef.step, field, dir)}
        />
      ))}

      {modal && (
        <FieldModal
          stepNum={modal.step}
          field={modal.field || null}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
          saving={saveMut.isPending}
        />
      )}
    </div>
  )
}
