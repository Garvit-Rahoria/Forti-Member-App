import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

const NEEDS_OPTIONS = ['dropdown', 'radio', 'checkbox']
const NEEDS_NOTHING = ['heading', 'paragraph', 'divider', 'hidden']

function toSnakeCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function FieldSettingsPanel({ formId, sectionId, field, initialType, allFields, onClose, onSaved }) {
  const isNew = !field
  const [data, setData] = useState(() => field ? { ...field } : {
    form_id: formId,
    section_id: sectionId,
    field_key: '',
    label: '',
    field_type: initialType || 'text',
    placeholder: '',
    help_text: '',
    default_value: '',
    is_required: 0,
    is_active: 1,
    col_width: 'full',
    validation_rules: {},
    options_source: 'manual',
    options_table: '',
    options_group_id: '',
    options: [],
  })

  const { data: dropdownGroups } = useQuery({
    queryKey: ['dropdown-groups'],
    queryFn: () => api.get('/dropdowns/groups').then(r => r.data.data),
  })

  const mut = useMutation({
    mutationFn: d => isNew
      ? api.post('/fields', { ...d, options: NEEDS_OPTIONS.includes(d.field_type) ? d.options : [] })
      : api.put(`/fields/${field.id}`, { ...d, options: NEEDS_OPTIONS.includes(d.field_type) ? d.options : [] }),
    onSuccess: async (res) => {
      const fid = isNew ? res.data.data.id : field.id
      await api.put(`/fields/${fid}/conditions`, { conditions: [] })
      toast.success(`Field ${isNew ? 'created' : 'updated'}`)
      onSaved()
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  const fieldType = data.field_type
  const needsOptions = NEEDS_OPTIONS.includes(fieldType)
  const isLayout = NEEDS_NOTHING.includes(fieldType)
  const isFileType = ['file', 'image'].includes(fieldType)

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const addOption = () => set('options', [...(data.options || []), { label: '', value: '', is_default: 0 }])
  const removeOption = i => set('options', data.options.filter((_, idx) => idx !== i))
  const updateOption = (i, k, v) => set('options', data.options.map((o, idx) => idx === i ? { ...o, [k]: v } : o))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">{isNew ? 'Add Field' : 'Edit Field'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); mut.mutate(data) }}>
          {/* Field type (read-only) */}
          <div>
            <label className="label">Field Type</label>
            <input className="input bg-gray-50 font-mono text-sm" value={data.field_type} readOnly />
          </div>

          {/* Label */}
          {!isLayout && (
            <div>
              <label className="label">Label *</label>
              <input className="input" value={data.label} required
                onChange={e => {
                  const label = e.target.value
                  set('label', label)
                  if (isNew) set('field_key', toSnakeCase(label))
                }}
              />
            </div>
          )}

          {/* Heading text */}
          {fieldType === 'heading' && (
            <div>
              <label className="label">Heading Text *</label>
              <input className="input" value={data.label} required onChange={e => set('label', e.target.value)} />
            </div>
          )}

          {/* Paragraph text */}
          {fieldType === 'paragraph' && (
            <div>
              <label className="label">Paragraph Text</label>
              <textarea className="input" rows={3} value={data.help_text || ''} onChange={e => set('help_text', e.target.value)} />
            </div>
          )}

          {/* Field Key */}
          {!isLayout && (
            <div>
              <label className="label">Field Key (identifier) *</label>
              <input className="input font-mono text-sm" value={data.field_key} required
                onChange={e => set('field_key', e.target.value)} />
            </div>
          )}

          {/* Placeholder - only for text-like fields */}
          {!isLayout && !isFileType && !needsOptions && !['date', 'checkbox'].includes(fieldType) && (
            <div>
              <label className="label">Placeholder</label>
              <input className="input" value={data.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />
            </div>
          )}

          {/* Help Text - for file/image upload types */}
          {isFileType && (
            <div>
              <label className="label">Help Text</label>
              <input className="input" value={data.help_text || ''} onChange={e => set('help_text', e.target.value)}
                placeholder="e.g. Upload a clear profile photo" />
            </div>
          )}

          {/* Required + Width */}
          {!isLayout && (
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!data.is_required} onChange={e => set('is_required', e.target.checked ? 1 : 0)} />
                Required
              </label>
              <div className="flex-1">
                <label className="label">Width</label>
                <select className="input" value={data.col_width} onChange={e => set('col_width', e.target.value)}>
                  <option value="full">Full Width</option>
                  <option value="half">Half Width</option>
                  <option value="third">One Third</option>
                </select>
              </div>
            </div>
          )}

          {/* Options for dropdown/radio/checkbox */}
          {needsOptions && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Options Source</label>
                <select className="input w-40 text-xs" value={data.options_source}
                  onChange={e => set('options_source', e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="group">Dropdown Group</option>
                </select>
              </div>

              {data.options_source === 'group' && (
                <select className="input" value={data.options_group_id || ''}
                  onChange={e => set('options_group_id', e.target.value)}>
                  <option value="">-- Select Group --</option>
                  {(dropdownGroups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              {data.options_source === 'manual' && (
                <div className="space-y-2 mt-2">
                  {(data.options || []).map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className="input flex-1" placeholder="Label" value={opt.label}
                        onChange={e => updateOption(i, 'label', e.target.value)} />
                      <input className="input flex-1" placeholder="Value" value={opt.value}
                        onChange={e => updateOption(i, 'value', e.target.value)} />
                      <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-outline btn-sm w-full" onClick={addOption}>
                    <Plus size={13} /> Add Option
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t -mx-5 px-5 pb-5">
            <button type="submit" className="btn-primary flex-1" disabled={mut.isPending}>
              {mut.isPending ? 'Saving\u2026' : isNew ? 'Add Field' : 'Save Changes'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
