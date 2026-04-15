import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Settings, ChevronDown, ChevronRight, Eye, Hammer, ExternalLink, Wand2 } from 'lucide-react'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import FieldSettingsPanel from '../../../components/form-builder/FieldSettingsPanel'
import FieldTypePanel from '../../../components/form-builder/FieldTypePanel'
import DynamicFormRenderer from '../../../components/dynamic-form/DynamicFormRenderer'

// ─── Sortable Section ─────────────────────────────────────────────────────────
function SortableSection({ section, onAddField, onDeleteSection, onEditSection, onDeleteField, onEditField, expandedSections, toggleSection }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `section-${section.id}` })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const isOpen = expandedSections.has(section.id)

  return (
    <div ref={setNodeRef} style={style} className="card border-l-4 border-l-primary-400">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggleSection(section.id)}>
        <button className="drag-handle text-gray-400 hover:text-gray-600" {...attributes} {...listeners} onClick={e => e.stopPropagation()}>
          <GripVertical size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{section.title}</p>
          {section.description && <p className="text-xs text-gray-500 truncate">{section.description}</p>}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {section.fields?.length ?? 0} fields
        </span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn-outline btn-sm" onClick={() => onEditSection(section)}><Settings size={12} /></button>
          <button className="btn-danger btn-sm" onClick={() => onDeleteSection(section.id)}><Trash2 size={12} /></button>
        </div>
        {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </div>

      {/* Fields */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          <SortableContext items={(section.fields || []).map(f => `field-${f.id}`)} strategy={verticalListSortingStrategy}>
            {(section.fields || []).map(field => (
              <SortableField key={field.id} field={field} onDelete={onDeleteField} onEdit={onEditField} />
            ))}
          </SortableContext>
          {(section.fields || []).length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
              No fields yet – click "Add Field" below
            </p>
          )}
          <button className="btn-outline btn-sm w-full mt-2" onClick={() => onAddField(section.id)}>
            <Plus size={13} /> Add Field
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Sortable Field ───────────────────────────────────────────────────────────
function SortableField({ field, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `field-${field.id}` })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const typeColors = {
    text: 'bg-blue-100 text-blue-700', email: 'bg-indigo-100 text-indigo-700',
    phone: 'bg-cyan-100 text-cyan-700', number: 'bg-teal-100 text-teal-700',
    dropdown: 'bg-yellow-100 text-yellow-700', radio: 'bg-orange-100 text-orange-700',
    checkbox: 'bg-rose-100 text-rose-700', file: 'bg-purple-100 text-purple-700',
    textarea: 'bg-gray-100 text-gray-700', date: 'bg-green-100 text-green-700',
    heading: 'bg-slate-100 text-slate-700', paragraph: 'bg-slate-100 text-slate-600',
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 group">
      <button className="drag-handle text-gray-300 group-hover:text-gray-500 transition-colors" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{field.label}</span>
          {field.is_required ? <span className="text-red-500 text-xs">*</span> : null}
          {field.has_condition ? <span className="badge-yellow text-xs">conditional</span> : null}
        </div>
        <p className="text-xs text-gray-400 font-mono">{field.field_key}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${typeColors[field.field_type] || 'bg-gray-100 text-gray-600'}`}>
        {field.field_type}
      </span>
      <span className="text-xs text-gray-400">{field.col_width}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="btn-outline btn-sm" onClick={() => onEdit(field)}>edit</button>
        <button className="btn-danger btn-sm" onClick={() => onDelete(field.id)}><Trash2 size={11} /></button>
      </div>
    </div>
  )
}

// ─── Section Modal ────────────────────────────────────────────────────────────
function SectionModal({ section, formId, onClose, onSaved }) {
  const [data, setData] = useState(section || { form_id: formId, title: '', description: '', icon: '' })
  const mut = useMutation({
    mutationFn: d => d.id ? api.put(`/sections/${d.id}`, d) : api.post('/sections', d),
    onSuccess: () => { toast.success('Section saved'); onSaved() },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{section ? 'Edit Section' : 'New Section'}</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <form className="card-body space-y-3" onSubmit={e => { e.preventDefault(); mut.mutate(data) }}>
          <div>
            <label className="label">Section Title *</label>
            <input className="input" value={data.title} required onChange={e => setData(d => ({ ...d, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={data.description || ''} onChange={e => setData(d => ({ ...d, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={mut.isPending}>Save</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── FormBuilder main ─────────────────────────────────────────────────────────
export default function FormBuilder() {
  const { id: formId } = useParams()
  const qc = useQueryClient()
  const [view, setView] = useState('build') // 'build' | 'preview'
  const [expandedSections, setExpandedSections] = useState(new Set())
  const [sectionModal, setSectionModal] = useState(null)
  const [fieldPanel, setFieldPanel] = useState(null) // { sectionId, field? }
  const [activeId, setActiveId] = useState(null)
  const [showFieldTypePanel, setShowFieldTypePanel] = useState(false)
  const [targetSection, setTargetSection] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => api.get(`/forms/${formId}`).then(r => r.data.data),
    enabled: !!formId,
    onSuccess: data => {
      // Auto-expand all sections when form loads
      const ids = (data?.sections || []).map(s => s.id)
      setExpandedSections(new Set(ids))
    },
  })

  const deleteSectionMut = useMutation({
    mutationFn: id => api.delete(`/sections/${id}`),
    onSuccess: () => { qc.invalidateQueries(['form', formId]); toast.success('Section deleted') },
  })

  const deleteFieldMut = useMutation({
    mutationFn: id => api.delete(`/fields/${id}`),
    onSuccess: () => { qc.invalidateQueries(['form', formId]); toast.success('Field deleted') },
  })

  const reorderSectionsMut = useMutation({
    mutationFn: orders => api.patch('/sections/reorder', { orders }),
  })

  const reorderFieldsMut = useMutation({
    mutationFn: orders => api.patch('/fields/reorder', { orders }),
  })

  const seedTemplateMut = useMutation({
    mutationFn: () => api.post(`/forms/${formId}/seed-sections`),
    onSuccess: () => {
      toast.success('Template seeded! 5 sections created.')
      qc.invalidateQueries(['form', formId])
    },
    onError: err => toast.error(err.response?.data?.message || 'Seed failed'),
  })

  const toggleSection = id => setExpandedSections(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleDragEnd = useCallback(event => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sections = form?.sections || []

    if (active.id.startsWith('section-') && over.id.startsWith('section-')) {
      const oldIdx = sections.findIndex(s => `section-${s.id}` === active.id)
      const newIdx = sections.findIndex(s => `section-${s.id}` === over.id)
      const reordered = arrayMove(sections, oldIdx, newIdx)
      reorderSectionsMut.mutate(reordered.map((s, i) => ({ id: s.id, section_order: i })))
      qc.setQueryData(['form', formId], old => old ? { ...old, sections: reordered } : old)
    } else if (active.id.startsWith('field-') && over.id.startsWith('field-')) {
      // Find which section the fields belong to
      for (const section of sections) {
        const fields = section.fields || []
        const oldIdx = fields.findIndex(f => `field-${f.id}` === active.id)
        const newIdx = fields.findIndex(f => `field-${f.id}` === over.id)
        if (oldIdx !== -1 && newIdx !== -1) {
          const reordered = arrayMove(fields, oldIdx, newIdx)
          reorderFieldsMut.mutate(reordered.map((f, i) => ({ id: f.id, field_order: i })))
          qc.setQueryData(['form', formId], old => {
            if (!old) return old
            return {
              ...old,
              sections: old.sections.map(s =>
                s.id === section.id ? { ...s, fields: reordered } : s
              )
            }
          })
          break
        }
      }
    }
    setActiveId(null)
  }, [form, formId, qc])

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!form) return <p className="text-center text-gray-500 py-20">Form not found.</p>

  const sections = form.sections || []
  const sectionIds = sections.map(s => `section-${s.id}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{form.name}</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">/{form.slug} · {sections.length} sections · {sections.reduce((n,s)=>n+(s.fields?.length||0),0)} fields</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Build / Preview tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5 transition-all ${
                view === 'build' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setView('build')}>
              <Hammer size={13} /> Build
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5 transition-all ${
                view === 'preview' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setView('preview')}>
              <Eye size={13} /> Preview
            </button>
          </div>
          {view === 'build' && (
            <button className="btn-outline btn-sm" onClick={() => setSectionModal('new')}>
              <Plus size={14} /> Add Section
            </button>
          )}
          <a href={`/apply/${form.slug}`} target="_blank" className="btn-secondary btn-sm">
            <ExternalLink size={13} /> Live Form
          </a>
        </div>
      </div>

      {/* ── Preview mode ── */}
      {view === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Eye size={16} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Preview Mode</p>
              <p className="text-xs text-amber-600">This is exactly how the form appears to applicants. Actions in preview are disabled.</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <DynamicFormRenderer formData={form} previewMode />
          </div>
        </div>
      )}

      {/* ── Build mode ── */}
      {view === 'build' && (
        <div className="space-y-3">
          {sections.length === 0 && (
            <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl space-y-4">
              <p className="text-gray-500 font-medium">No sections yet.</p>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Start from scratch or load the standard 5-step Membership Application template (Basic Details, Location, Membership Type, Plan &amp; Package, Payment).
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  className="btn-outline flex items-center gap-2"
                  onClick={() => setSectionModal('new')}>
                  <Plus size={16} /> Add Section Manually
                </button>
                <button
                  className="btn-primary flex items-center gap-2"
                  disabled={seedTemplateMut.isPending}
                  onClick={() => {
                    if (confirm('This will create 5 sections with all standard membership application fields. Continue?')) {
                      seedTemplateMut.mutate()
                    }
                  }}>
                  <Wand2 size={16} />
                  {seedTemplateMut.isPending ? 'Seeding…' : 'Load Membership Template'}
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop context */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={e => setActiveId(e.active.id)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sections.map(section => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    onAddField={secId => {
                      setTargetSection(secId)
                      setShowFieldTypePanel(true)
                      setFieldPanel(null)
                    }}
                    onDeleteSection={id => { if (confirm('Delete this section and all its fields?')) deleteSectionMut.mutate(id) }}
                    onEditSection={s => setSectionModal(s)}
                    onDeleteField={id => { if (confirm('Delete this field?')) deleteFieldMut.mutate(id) }}
                    onEditField={field => { setFieldPanel({ sectionId: field.section_id, field }); setShowFieldTypePanel(false) }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Field type picker panel (build mode only) */}
      {view === 'build' && showFieldTypePanel && (
        <FieldTypePanel
          sectionId={targetSection}
          formId={form.id}
          onClose={() => setShowFieldTypePanel(false)}
          onPicked={fieldType => {
            setShowFieldTypePanel(false)
            setFieldPanel({ sectionId: targetSection, field: null, fieldType })
          }}
        />
      )}

      {/* Field settings panel (build mode only) */}
      {view === 'build' && fieldPanel && (
        <FieldSettingsPanel
          formId={form.id}
          sectionId={fieldPanel.sectionId}
          field={fieldPanel.field}
          initialType={fieldPanel.fieldType}
          allFields={sections.flatMap(s => s.fields || [])}
          onClose={() => setFieldPanel(null)}
          onSaved={() => {
            setFieldPanel(null)
            qc.invalidateQueries(['form', formId])
          }}
        />
      )}

      {/* Section modal */}
      {sectionModal && (
        <SectionModal
          section={sectionModal === 'new' ? null : sectionModal}
          formId={form.id}
          onClose={() => setSectionModal(null)}
          onSaved={() => {
            setSectionModal(null)
            qc.invalidateQueries(['form', formId]).then(() => {
              // Auto-expand the newly added section (will be last)
              const secs = qc.getQueryData(['form', formId])?.sections || []
              if (secs.length) setExpandedSections(s => new Set([...s, secs[secs.length - 1].id]))
            })
          }}
        />
      )}
    </div>
  )
}
