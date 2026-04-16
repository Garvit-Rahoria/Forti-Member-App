import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import FieldRenderer from './FieldRenderer'
import toast from 'react-hot-toast'
import { useMember } from '../../contexts/MemberContext'

/**
 * DynamicFormRenderer
 * Props:
 *   formSlug  – fetch form by slug
 *   formData  – or pass form data directly
 *   onSubmitSuccess(uuid) – called after final submit
 *   applicantUuid – identifies the user (e.g. email)
 *   submissionUuid – for resuming a draft
 */
export default function DynamicFormRenderer({ formSlug, formData: externalFormData, onSubmitSuccess, applicantUuid, submissionUuid: initSubmissionUuid, previewMode = false }) {
  const navigate = useNavigate()
  const { login } = useMember()
  const [form, setForm] = useState(externalFormData || null)
  const [loading, setLoading] = useState(!externalFormData)
  const [currentStep, setCurrentStep] = useState(0)
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [submissionUuid, setSubmissionUuid] = useState(initSubmissionUuid || null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Load form by slug
  useEffect(() => {
    if (!formSlug || externalFormData) return
    api.get(`/forms/slug/${formSlug}`)
      .then(r => setForm(r.data.data))
      .catch(() => toast.error('Form not found'))
      .finally(() => setLoading(false))
  }, [formSlug])

  // Resume draft
  useEffect(() => {
    if (!initSubmissionUuid) return
    api.get(`/submissions/${initSubmissionUuid}`)
      .then(r => {
        setValues(r.data.data?.data || {})
        setCurrentStep(Math.max(0, (r.data.data?.current_step || 1) - 1))
      })
      .catch(() => {})
  }, [initSubmissionUuid])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
  if (!form) return <p className="text-gray-500 text-center py-10">Form not available.</p>

  const sections = (form.sections || []).filter(s => s.is_active !== false)
  const isMultiStep = !!form.is_multi_step && sections.length > 1
  const totalSteps = isMultiStep ? sections.length : 1
  const activeSections = isMultiStep ? [sections[currentStep]] : sections
  const isLastStep  = currentStep >= sections.length - 1

  // ── Conditional field visibility ─────────────────────────────────────────
  function fieldVisible(field) {
    if (!field.has_condition || !field.conditions?.length) return true
    for (const cond of field.conditions) {
      const results = cond.rules.map(rule => {
        const watchVal = String(values[rule.watch_field_key] ?? '')
        switch (rule.operator) {
          case 'equals':     return watchVal === rule.value
          case 'not_equals': return watchVal !== rule.value
          case 'contains':   return watchVal.includes(rule.value)
          case 'is_empty':   return !watchVal
          case 'is_not_empty': return !!watchVal
          default: return true
        }
      })
      const match = cond.logic === 'OR' ? results.some(Boolean) : results.every(Boolean)
      if (cond.action === 'show' && !match) return false
      if (cond.action === 'hide' && match)  return false
    }
    return true
  }

  // ── Validate current step ────────────────────────────────────────────────
  function validate() {
    const errs = {}
    for (const section of activeSections) {
      for (const field of (section.fields || [])) {
        if (!fieldVisible(field)) continue
        const val = values[field.field_key]
        if (field.is_required && (!val || (Array.isArray(val) && !val.length))) {
          errs[field.field_key] = `${field.label} is required`
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Save draft ──────────────────────────────────────────────────────────
  async function saveDraft(step = currentStep) {
    setSaving(true)
    try {
      const fd = buildFormData(step + 1)
      const res = await api.post('/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const uuid = res.data.data.submission_uuid
      setSubmissionUuid(uuid)
      return uuid
    } catch (e) {
      toast.error('Error saving draft')
      return null
    } finally {
      setSaving(false)
    }
  }

  function buildFormData(step) {
    const fd = new FormData()
    fd.append('form_id', form.id)
    fd.append('current_step', step)
    if (submissionUuid) fd.append('submission_uuid', submissionUuid)
    if (applicantUuid) fd.append('applicant_uuid', applicantUuid)
    for (const [key, val] of Object.entries(values)) {
      if (val instanceof File) fd.append(key, val)
      else if (Array.isArray(val)) val.forEach(v => fd.append(`${key}[]`, v))
      else if (val !== undefined && val !== null) fd.append(`data[${key}]`, val)
    }
    return fd
  }

  // ── Next step ───────────────────────────────────────────────────────────
  async function handleNext() {
    if (!validate()) return
    if (form.allow_draft) await saveDraft(currentStep)
    setCurrentStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  // ── Final submit ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (previewMode) {
      toast('This is a preview. Submissions are disabled.', { icon: '👁' })
      return
    }
    if (!validate()) return
    setSubmitting(true)
    try {
      let uuid = submissionUuid
      if (!uuid) uuid = await saveDraft(currentStep)
      if (!uuid) return
      const res = await api.post(`/submissions/${uuid}/submit`)
      const { member_token, member } = res.data?.data || {}

      // Auto-login with the newly created member session
      if (member_token && member) {
        login(member_token, member)
        onSubmitSuccess?.(uuid)
        navigate('/member/dashboard', { replace: true })
      } else {
        setSubmitted(true)
        onSubmitSuccess?.(uuid)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted screen ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 mb-4">{form.success_message || 'Your application has been submitted successfully. We will review it and get back to you.'}</p>
        <p className="text-xs text-gray-400 font-mono">Reference: {submissionUuid}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Preview mode banner */}
      {previewMode && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-xl">👁</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Form Preview</p>
            <p className="text-xs text-amber-600">This is exactly how applicants see this form. Field inputs are interactive but submissions are disabled.</p>
          </div>
        </div>
      )}
      {/* Progress bar */}
      {isMultiStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step {currentStep + 1} of {totalSteps}</span>
            <span>{sections[currentStep]?.title}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-3">
            {sections.map((s, i) => (
              <div key={i} className={`flex flex-col items-center ${i <= currentStep ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-1 text-gray-500 hidden sm:block max-w-[80px] text-center truncate">{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {activeSections.map(section => (
          <div key={section.id} className="card mb-6">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                {section.description && <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>}
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4">
                {(section.fields || [])
                  .filter(f => f.is_active !== false)
                  .filter(fieldVisible)
                  .map(field => (
                    <div key={field.id} className={field.col_width === 'half' ? 'col-span-1' : field.col_width === 'third' ? '' : 'col-span-2'}>
                      <FieldRenderer
                        field={field}
                        value={values[field.field_key]}
                        onChange={val => setValues(v => ({ ...v, [field.field_key]: val }))}
                        error={errors[field.field_key]}
                      />
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        ))}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3 mt-4">
          {isMultiStep && currentStep > 0 ? (
            <button type="button" className="btn-outline" onClick={() => setCurrentStep(s => s - 1)}>← Previous</button>
          ) : <div />}

          <div className="flex gap-2">
            {form.allow_draft && (
              <button type="button" className="btn-secondary" disabled={saving}
                onClick={() => saveDraft().then(() => toast.success('Draft saved!'))}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            )}
            {isMultiStep && !isLastStep ? (
              <button type="button" className="btn-primary" onClick={handleNext}>
                Next Step →
              </button>
            ) : (
              <button type="submit" className={`btn-primary btn-lg ${previewMode ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={submitting || previewMode}>
                {previewMode ? '🔒 Preview Mode (Submit Disabled)' : submitting ? 'Submitting…' : (form.submit_button_label || 'Submit Application')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
