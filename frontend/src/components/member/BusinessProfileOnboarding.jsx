import { useEffect, useMemo, useState } from 'react'
import {
  Building2, Tags, Package, Globe2, Image as ImageIcon, Trophy,
  Handshake, MapPin, CheckCircle, ChevronLeft, ChevronRight,
  Plus, Trash2, Loader2, Upload, X, AlertCircle, Percent,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { assetUrl } from '../../utils/assetUrl'

const STEPS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'category', label: 'Category', icon: Tags },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'presence', label: 'Online', icon: Globe2 },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'achievements', label: 'Awards', icon: Trophy },
  { id: 'networking', label: 'Networking', icon: Handshake },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

const EMPLOYEE_OPTIONS = ['1–10', '11–50', '51–100', '101–250', '251–500', '500+']
const LOOKING_FOR = [
  'Business Partnerships', 'New Customers', 'Suppliers', 'Vendors', 'Distributors',
  'Investors', 'Referrals', 'Collaborations', 'Joint Ventures', 'Business Services', 'Other',
]
const OFFERING = [
  'Member Discount', 'Special Pricing', 'Referral Benefits', 'Business Services',
  'Free Consultation', 'Partnership Opportunities', 'Product Offers', 'Other',
]
const SOCIAL_PLATFORMS = ['Website', 'LinkedIn', 'Instagram', 'Facebook', 'X/Twitter', 'YouTube', 'Other']
const OFFER_TYPES = [
  { value: 'percentage', label: 'Percentage Discount' },
  { value: 'flat', label: 'Flat Discount' },
  { value: 'special_price', label: 'Special Price' },
  { value: 'free_service', label: 'Free Service' },
  { value: 'other', label: 'Other Benefit' },
]

const CURRENT_YEAR = new Date().getFullYear()

function calcFormCompletion(form) {
  let score = 0
  const total = 10
  if (form.description?.trim()) score += 1
  if (form.primary_category_id) score += 1
  if ((form.keywords || []).length > 0) score += 1
  if ((form.products || []).some(p => p.name?.trim())) score += 1
  if ((form.social_links || []).some(l => l.url?.trim()) || form.website?.trim()) score += 1
  if (form.cover_image || form.logo_path || (form.gallery || []).length > 0) score += 1
  if ((form.achievements || []).some(a => a.title?.trim())) score += 1
  if ((form.looking_for || []).length > 0) score += 1
  if ((form.offers || []).some(o => o.title?.trim()) || (form.offering || []).length > 0) score += 1
  if (form.city || form.state || form.address) score += 1
  return Math.round((score / total) * 100)
}

function statusLabel(status, completion) {
  if (status === 'published' || status === 'submitted') {
    return { text: 'Published', className: 'bg-green-100 text-green-700' }
  }
  if (status === 'pending_review') {
    return { text: 'Pending Review', className: 'bg-amber-100 text-amber-800' }
  }
  if (completion > 0) {
    return { text: 'In Progress', className: 'bg-blue-100 text-blue-700' }
  }
  return { text: 'Draft', className: 'bg-gray-100 text-gray-600' }
}

function OfferValueFields({ offer, onChange }) {
  const type = offer.offer_type || 'percentage'
  if (type === 'percentage') {
    return (
      <div>
        <label className="label">Discount Percentage</label>
        <div className="relative">
          <input className="input pr-10" type="number" min="1" max="100" step="1"
            placeholder="e.g. 20"
            value={String(offer.discount_value || '').replace(/%/g, '')}
            onChange={e => {
              const n = e.target.value
              onChange(n === '' ? '' : `${n}%`)
            }} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">%</span>
        </div>
      </div>
    )
  }
  if (type === 'flat') {
    return (
      <div>
        <label className="label">Discount Amount</label>
        <input className="input" placeholder="e.g. ₹500" value={offer.discount_value || ''}
          onChange={e => onChange(e.target.value)} />
      </div>
    )
  }
  if (type === 'free_service') {
    return (
      <div>
        <label className="label">Service / Benefit</label>
        <input className="input" placeholder="e.g. Free 1-hour consultation" value={offer.discount_value || ''}
          onChange={e => onChange(e.target.value)} />
      </div>
    )
  }
  if (type === 'special_price') {
    return (
      <div>
        <label className="label">Special Price</label>
        <input className="input" placeholder="e.g. ₹999 for members" value={offer.discount_value || ''}
          onChange={e => onChange(e.target.value)} />
      </div>
    )
  }
  return (
    <div>
      <label className="label">Benefit Details</label>
      <input className="input" placeholder="Describe the benefit" value={offer.discount_value || ''}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
        <button type="button" onClick={onEdit}
          className="text-xs font-semibold text-primary-700 hover:underline">Edit</button>
      </div>
      <div className="text-sm text-gray-600 space-y-1">{children}</div>
    </div>
  )
}

function SectionCard({ icon: Icon, title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function ToggleChip({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
        ${selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
      {children}
    </button>
  )
}

export default function BusinessProfileOnboarding({ apiClient, member, onComplete, onCancel }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [profile, setProfile] = useState(null)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    description: '',
    established_year: '',
    employee_count: '',
    website: '',
    business_email: '',
    business_phone: '',
    primary_category_id: '',
    sub_category_id: '',
    keywords: [],
    keywordInput: '',
    products: [],
    social_links: [],
    looking_for: [],
    offering: [],
    offers: [],
    achievements: [],
    gallery: [],
    address: '',
    city: '',
    state: '',
    country: '',
    pin_code: '',
    show_address_publicly: false,
    logo_path: '',
    cover_image: '',
  })

  const memberData = useMemo(() => {
    try {
      return typeof member?.data === 'string' ? JSON.parse(member.data) : (member?.data || {})
    } catch { return {} }
  }, [member])

  const orgName = profile?.organisation_name || memberData.organisation_name || memberData.company_name || ''
  const orgType = profile?.organisation_type || memberData.organisation_type || ''
  const orgLogo = form.logo_path || profile?.logo_path || profile?.organisation_logo || memberData.organisation_logo || ''

  const subCategories = useMemo(() => {
    const parent = categories.find(c => String(c.id) === String(form.primary_category_id))
    return parent?.children || []
  }, [categories, form.primary_category_id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [catRes, profRes] = await Promise.all([
          apiClient().get('/member/business-profile/categories'),
          apiClient().get('/member/business-profile'),
        ])
        if (cancelled) return
        setCategories(catRes.data.data || [])
        const p = profRes.data.data
        setProfile(p)

        const membershipLinks = Array.isArray(p.membership_social_links) ? p.membership_social_links : []
        const businessLinks = Array.isArray(p.social_links) && p.social_links.length
          ? p.social_links
          : membershipLinks.map(l => ({ platform: l.platform, url: l.url }))

        setForm(f => ({
          ...f,
          description: p.description || '',
          established_year: p.established_year || '',
          employee_count: p.employee_count || '',
          website: p.website || '',
          business_email: p.business_email || '',
          business_phone: p.business_phone || '',
          primary_category_id: p.primary_category_id || '',
          sub_category_id: p.sub_category_id || '',
          keywords: (p.keywords || []).map(k => k.keyword || k),
          products: (p.products || []).map(x => ({
            name: x.name, item_type: x.item_type || 'service', description: x.description || '',
          })),
          social_links: businessLinks.length
            ? businessLinks
            : [{ platform: 'Website', url: '' }],
          looking_for: p.looking_for || [],
          offering: p.offering || [],
          offers: (p.offers || []).map(o => ({
            title: o.title,
            offer_type: o.offer_type || 'percentage',
            discount_value: o.discount_value || '',
            description: o.description || '',
            valid_until: o.valid_until ? String(o.valid_until).slice(0, 10) : '',
            terms: o.terms || '',
            status: o.status || 'active',
          })),
          achievements: (p.achievements || []).map(a => ({
            title: a.title,
            year: a.year || '',
            issued_by: a.issued_by || '',
            description: a.description || '',
            image_path: a.image_path || '',
          })),
          gallery: p.gallery || [],
          address: p.address || '',
          city: p.city || memberData.city || '',
          state: p.state || memberData.state || '',
          country: p.country || memberData.country_name || '',
          pin_code: p.pin_code || memberData.pin_code || '',
          show_address_publicly: !!p.show_address_publicly,
          logo_path: p.logo_path || '',
          cover_image: p.cover_image || '',
        }))
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load business profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiClient, memberData.city, memberData.state, memberData.country_name, memberData.pin_code])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function toggleMulti(key, value) {
    setForm(f => {
      const arr = Array.isArray(f[key]) ? f[key] : []
      return {
        ...f,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }

  function addKeyword() {
    const kw = form.keywordInput.trim()
    if (!kw) return
    if (form.keywords.some(k => k.toLowerCase() === kw.toLowerCase())) {
      setField('keywordInput', '')
      return
    }
    setForm(f => ({ ...f, keywords: [...f.keywords, kw], keywordInput: '' }))
  }

  function startEditKeyword(kw) {
    setForm(f => ({
      ...f,
      keywords: f.keywords.filter(k => k !== kw),
      keywordInput: kw,
    }))
  }

  function validateStep(idx) {
    const next = {}
    if (idx === 0 && !form.description.trim()) next.description = 'Business description is required'
    if (idx === 1 && !form.primary_category_id) next.primary_category_id = 'Select a primary category'
    if (idx === 0 && form.business_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.business_email)) {
      next.business_email = 'Enter a valid email'
    }
    if (idx === 0 && form.website && !/^https?:\/\//i.test(form.website) && form.website.trim()) {
      next.website = 'Website should start with http:// or https://'
    }
    if (idx === 2) {
      const incomplete = form.products.some(p => !String(p.name || '').trim() && String(p.description || '').trim())
      if (incomplete) next.products = 'Each product/service needs a name'
      const namedEmptyType = form.products.some(p => String(p.name || '').trim() && !p.item_type)
      if (namedEmptyType) next.products = 'Select product or service type'
    }
    if (idx === 3) {
      const bad = form.social_links.some(l => l.url?.trim() && !/^https?:\/\//i.test(l.url.trim()))
      if (bad) next.social_links = 'Social URLs should start with http:// or https://'
    }
    if (idx === 5) {
      form.achievements.forEach((a, i) => {
        if (!String(a.title || '').trim() && (a.year || a.issued_by || a.description)) {
          next[`achievement_${i}`] = 'Achievement name is required'
        }
        if (a.year !== '' && a.year != null) {
          const y = Number(a.year)
          if (!Number.isFinite(y) || y < 1900 || y > CURRENT_YEAR) {
            next[`achievement_year_${i}`] = `Year must be between 1900 and ${CURRENT_YEAR}`
          }
        }
      })
    }
    if (idx === 6) {
      form.offers.forEach((o, i) => {
        if (!String(o.title || '').trim() && (o.discount_value || o.description)) {
          next[`offer_${i}`] = 'Offer title is required'
        }
        if (o.offer_type === 'percentage' && o.discount_value) {
          const n = Number(String(o.discount_value).replace(/%/g, ''))
          if (!Number.isFinite(n) || n < 1 || n > 100) {
            next[`offer_value_${i}`] = 'Percentage must be 1–100'
          }
        }
      })
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function saveProgress(opts = {}) {
    setSaving(true)
    try {
      await apiClient().put('/member/business-profile', {
        description: form.description,
        established_year: form.established_year || null,
        employee_count: form.employee_count || null,
        website: form.website || null,
        business_email: form.business_email || null,
        business_phone: form.business_phone || null,
        primary_category_id: form.primary_category_id ? Number(form.primary_category_id) : null,
        sub_category_id: form.sub_category_id ? Number(form.sub_category_id) : null,
        keywords: form.keywords,
        social_links: form.social_links.filter(l => l.platform && l.url?.trim()),
        looking_for: form.looking_for,
        offering: form.offering,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        pin_code: form.pin_code,
        show_address_publicly: form.show_address_publicly,
      })
      await apiClient().put('/member/business-profile/products', { items: form.products })
      await apiClient().put('/member/business-profile/achievements', { items: form.achievements })
      await apiClient().put('/member/business-profile/offers', { items: form.offers })

      if (!opts.silent) toast.success('Progress saved')
      const refreshed = await apiClient().get('/member/business-profile')
      setProfile(refreshed.data.data)
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function goNext() {
    if (!validateStep(step)) {
      toast.error('Please fix the highlighted fields')
      return
    }
    const okSave = await saveProgress({ silent: true })
    if (!okSave) return
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  async function handleSubmit() {
    if (!validateStep(0) || !validateStep(1)) {
      setStep(!form.description.trim() ? 0 : 1)
      toast.error('Please complete required fields')
      return
    }
    // Re-validate later steps that may have bad data
    for (const s of [2, 3, 5, 6]) {
      if (!validateStep(s)) {
        setStep(s)
        toast.error('Please fix the highlighted fields before submitting')
        return
      }
    }
    const okSave = await saveProgress({ silent: true })
    if (!okSave) return
    setSaving(true)
    try {
      const res = await apiClient().post('/member/business-profile/submit')
      setProfile(res.data.data)
      toast.success(
        'Business Profile Published Successfully! Your business profile is now available for other FORTI members to discover.',
        { duration: 6000 }
      )
      onComplete?.(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed')
    } finally {
      setSaving(false)
    }
  }

  async function uploadFile(endpoint, field, file, onDone) {
    if (!file) return
    const fd = new FormData()
    fd.append(field, file)
    try {
      const res = await apiClient().post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onDone(res.data.data)
      toast.success('Uploaded')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="animate-spin text-primary-600" size={22} /> Loading business profile…
      </div>
    )
  }

  const completion = calcFormCompletion(form)
  const status = statusLabel(profile?.status || 'draft', completion)
  const isPublished = profile?.status === 'published' || profile?.status === 'submitted'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-primary-100 text-xs font-semibold uppercase tracking-wide">My Organization</p>
            <h2 className="text-xl font-black mt-1">
              {isPublished ? 'Edit Business Profile' : 'Business Profile Onboarding'}
            </h2>
            <p className="text-sm text-primary-100 mt-1">
              Help other FORTI members discover your business, services, achievements and special offers.
            </p>
          </div>
          <div className="bg-white/15 rounded-xl px-4 py-2 text-right">
            <p className="text-xs text-primary-100">Profile completion</p>
            <p className="text-2xl font-black">{completion}%</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-accent-gold rounded-full transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {/* Org reuse strip */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        {orgLogo ? (
          <img src={assetUrl(orgLogo)} alt="" className="w-12 h-12 rounded-xl object-cover border" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
            {(orgName || 'B').charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{orgName || 'Your Organization'}</p>
          <p className="text-xs text-gray-500">{orgType || 'Organization type from membership'} · reused from membership</p>
        </div>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.className}`}>
          {status.text}
        </span>
      </div>

      {/* Steps */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const active = i === step
          const done = i < step
          return (
            <button key={s.id} type="button" onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition
                ${active ? 'bg-primary-600 text-white border-primary-600' : done ? 'bg-primary-50 text-primary-700 border-primary-100' : 'bg-white text-gray-500 border-gray-200'}`}>
              <Icon size={13} />{s.label}
            </button>
          )
        })}
      </div>

      {/* Step bodies */}
      {step === 0 && (
        <SectionCard icon={Building2} title="Business Overview" desc="Describe your business. Organization name and type come from your membership.">
          <div>
            <label className="label">Business Description *</label>
            <textarea className={`input min-h-[120px] ${errors.description ? 'border-red-300' : ''}`}
              placeholder="Tell us about your business, what you do, and what makes your business unique."
              value={form.description} onChange={e => setField('description', e.target.value)} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Established Year</label>
              <input className="input" type="number" min="1900" max={new Date().getFullYear()}
                value={form.established_year} onChange={e => setField('established_year', e.target.value)} />
            </div>
            <div>
              <label className="label">Number of Employees</label>
              <select className="input" value={form.employee_count} onChange={e => setField('employee_count', e.target.value)}>
                <option value="">Select…</option>
                {EMPLOYEE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Business Website</label>
              <input className={`input ${errors.website ? 'border-red-300' : ''}`} placeholder="https://"
                value={form.website} onChange={e => setField('website', e.target.value)} />
              {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website}</p>}
            </div>
            <div>
              <label className="label">Business Email</label>
              <input className={`input ${errors.business_email ? 'border-red-300' : ''}`}
                value={form.business_email} onChange={e => setField('business_email', e.target.value)} />
              {errors.business_email && <p className="text-xs text-red-500 mt-1">{errors.business_email}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Business Contact Number</label>
              <input className="input" value={form.business_phone} onChange={e => setField('business_phone', e.target.value)} />
            </div>
          </div>
        </SectionCard>
      )}

      {step === 1 && (
        <SectionCard icon={Tags} title="Category & Keywords" desc="Used for search, filtering and matching with other FORTI businesses.">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Primary Category *</label>
              <select className={`input ${errors.primary_category_id ? 'border-red-300' : ''}`}
                value={form.primary_category_id}
                onChange={e => setForm(f => ({ ...f, primary_category_id: e.target.value, sub_category_id: '' }))}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.primary_category_id && <p className="text-xs text-red-500 mt-1">{errors.primary_category_id}</p>}
            </div>
            <div>
              <label className="label">Sub-category</label>
              <select className="input" value={form.sub_category_id}
                onChange={e => setField('sub_category_id', e.target.value)}
                disabled={!subCategories.length}>
                <option value="">Select sub-category…</option>
                {subCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Business Keywords / Tags</label>
            <div className="flex gap-2">
              <input className="input" placeholder="e.g. Web Development"
                value={form.keywordInput}
                onChange={e => setField('keywordInput', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }} />
              <button type="button" className="btn-primary shrink-0" onClick={addKeyword}><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                  <button type="button" className="hover:underline" title="Click to edit"
                    onClick={() => startEditKeyword(kw)}>{kw}</button>
                  <button type="button" aria-label={`Remove ${kw}`}
                    onClick={() => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Click a tag to edit it. Use × to remove.</p>
          </div>
        </SectionCard>
      )}

      {step === 2 && (
        <SectionCard icon={Package} title="Products & Services" desc="Add what your business sells or delivers.">
          {form.products.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
              <Package className="mx-auto text-gray-400 mb-2" size={28} />
              <p className="text-sm font-semibold text-gray-700">No products or services yet</p>
              <p className="text-xs text-gray-500 mt-1">Add at least one item to help members understand your offerings.</p>
            </div>
          )}
          {errors.products && <p className="text-xs text-red-500">{errors.products}</p>}
          {form.products.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item {idx + 1}</p>
                <button type="button" className="text-red-500 text-xs inline-flex items-center gap-1"
                  onClick={() => setField('products', form.products.filter((_, i) => i !== idx))}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Name</label>
                  <input className="input" placeholder="e.g. Web Development" value={item.name}
                    onChange={e => {
                      const products = [...form.products]
                      products[idx] = { ...item, name: e.target.value }
                      setField('products', products)
                    }} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={item.item_type}
                    onChange={e => {
                      const products = [...form.products]
                      products[idx] = { ...item, item_type: e.target.value }
                      setField('products', products)
                    }}>
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Short description" value={item.description}
                  onChange={e => {
                    const products = [...form.products]
                    products[idx] = { ...item, description: e.target.value }
                    setField('products', products)
                  }} />
              </div>
            </div>
          ))}
          <button type="button" className="btn-outline"
            onClick={() => setField('products', [...form.products, { name: '', item_type: 'service', description: '' }])}>
            <Plus size={14} className="inline mr-1" /> Add Product / Service
          </button>
        </SectionCard>
      )}

      {step === 3 && (
        <SectionCard icon={Globe2} title="Online Presence" desc="Membership social links are preloaded — edit or add more.">
          {errors.social_links && <p className="text-xs text-red-500">{errors.social_links}</p>}
          {form.social_links.map((link, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Link {idx + 1}</p>
                <button type="button" className="text-red-500 text-xs inline-flex items-center gap-1"
                  onClick={() => setField('social_links', form.social_links.filter((_, i) => i !== idx))}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Platform</label>
                  <select className="input" value={link.platform}
                    onChange={e => {
                      const social_links = [...form.social_links]
                      social_links[idx] = { ...link, platform: e.target.value }
                      setField('social_links', social_links)
                    }}>
                    {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">URL</label>
                  <input className="input" placeholder="https://" value={link.url}
                    onChange={e => {
                      const social_links = [...form.social_links]
                      social_links[idx] = { ...link, url: e.target.value }
                      setField('social_links', social_links)
                    }} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn-outline"
            onClick={() => setField('social_links', [...form.social_links, { platform: 'Website', url: '' }])}>
            <Plus size={14} className="inline mr-1" /> Add Link
          </button>
        </SectionCard>
      )}

      {step === 4 && (
        <SectionCard icon={ImageIcon} title="Photos & Gallery" desc="Logo, cover banner and business gallery.">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Business Logo</label>
              <div className="flex items-center gap-3">
                {orgLogo ? <img src={assetUrl(orgLogo)} alt="" className="w-16 h-16 rounded-xl object-cover border" /> : null}
                <label className="btn-outline cursor-pointer inline-flex items-center gap-2">
                  <Upload size={14} /> {orgLogo ? 'Replace Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => uploadFile('/member/business-profile/upload/logo', 'logo', e.target.files?.[0],
                      (d) => setField('logo_path', d.logo_path))} />
                </label>
              </div>
            </div>
            <div>
              <label className="label">Cover Image</label>
              <div className="flex items-center gap-3">
                {form.cover_image ? <img src={assetUrl(form.cover_image)} alt="" className="w-24 h-14 rounded-lg object-cover border" /> : null}
                <label className="btn-outline cursor-pointer inline-flex items-center gap-2">
                  <Upload size={14} /> Upload Cover
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => uploadFile('/member/business-profile/upload/cover', 'cover_image', e.target.files?.[0],
                      (d) => setField('cover_image', d.cover_image))} />
                </label>
              </div>
            </div>
          </div>
          <div>
            <label className="label">Business Gallery</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {form.gallery.map(g => (
                <div key={g.id} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={assetUrl(g.image_path)} alt="" className="w-full h-full object-cover" />
                  <button type="button"
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                    onClick={async () => {
                      await apiClient().delete(`/member/business-profile/gallery/${g.id}`)
                      setField('gallery', form.gallery.filter(x => x.id !== g.id))
                    }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <label className="btn-outline cursor-pointer inline-flex items-center gap-2">
              <Upload size={14} /> Add Gallery Photos
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={async e => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return
                  const fd = new FormData()
                  files.forEach(f => fd.append('gallery', f))
                  try {
                    const res = await apiClient().post('/member/business-profile/upload/gallery', fd, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                    setField('gallery', [...form.gallery, ...(res.data.data || [])])
                    toast.success('Gallery updated')
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Upload failed')
                  }
                }} />
            </label>
          </div>
        </SectionCard>
      )}

      {step === 5 && (
        <SectionCard icon={Trophy} title="Achievements" desc="Awards, certifications and milestones.">
          {form.achievements.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Achievement {idx + 1}</p>
                <button type="button" className="text-red-500 text-xs shrink-0"
                  onClick={() => setField('achievements', form.achievements.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Achievement / Award Name</label>
                  <input className="input" placeholder="e.g. Best Startup Award" value={item.title}
                    onChange={e => {
                      const achievements = [...form.achievements]
                      achievements[idx] = { ...item, title: e.target.value }
                      setField('achievements', achievements)
                    }} />
                </div>
                <div>
                  <label className="label">Year</label>
                  <input className={`input ${errors[`achievement_year_${idx}`] ? 'border-red-300' : ''}`}
                    type="number" min="1900" max={CURRENT_YEAR} placeholder={`e.g. ${CURRENT_YEAR}`} value={item.year}
                    onChange={e => {
                      const achievements = [...form.achievements]
                      achievements[idx] = { ...item, year: e.target.value }
                      setField('achievements', achievements)
                    }} />
                  {errors[`achievement_year_${idx}`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`achievement_year_${idx}`]}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Issued By / Organization</label>
                <input className="input" placeholder="e.g. Chamber of Commerce" value={item.issued_by}
                  onChange={e => {
                    const achievements = [...form.achievements]
                    achievements[idx] = { ...item, issued_by: e.target.value }
                    setField('achievements', achievements)
                  }} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} placeholder="Brief details about this achievement" value={item.description}
                  onChange={e => {
                    const achievements = [...form.achievements]
                    achievements[idx] = { ...item, description: e.target.value }
                    setField('achievements', achievements)
                  }} />
              </div>
              <div>
                <label className="label">Certificate Image</label>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {item.image_path ? (
                    <div className="relative shrink-0">
                      <img
                        src={assetUrl(item.image_path)}
                        alt="Certificate"
                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-gray-50"
                      />
                      <button
                        type="button"
                        title="Remove certificate image"
                        className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                        onClick={() => {
                          const achievements = [...form.achievements]
                          achievements[idx] = { ...achievements[idx], image_path: '' }
                          setField('achievements', achievements)
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                      <ImageIcon size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">
                      {item.image_path ? 'Image uploaded' : 'Optional — upload certificate or award photo'}
                    </p>
                    <label className="mt-1 text-xs text-primary-700 font-semibold cursor-pointer inline-flex items-center gap-1 hover:underline">
                      <Upload size={12} /> {item.image_path ? 'Replace image' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          uploadFile('/member/business-profile/upload/achievement', 'achievement_image', file,
                            (d) => {
                              setForm(f => {
                                const achievements = [...f.achievements]
                                achievements[idx] = { ...achievements[idx], image_path: d.image_path }
                                return { ...f, achievements }
                              })
                            })
                        }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn-outline"
            onClick={() => setField('achievements', [...form.achievements, { title: '', year: '', issued_by: '', description: '', image_path: '' }])}>
            <Plus size={14} className="inline mr-1" /> Add Achievement
          </button>
        </SectionCard>
      )}

      {step === 6 && (
        <SectionCard icon={Handshake} title="Networking & FORTI Deals" desc="What you seek and what you offer to FORTI members.">
          <div>
            <label className="label">What is your business looking for?</label>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR.map(v => (
                <ToggleChip key={v} selected={form.looking_for.includes(v)} onClick={() => toggleMulti('looking_for', v)}>{v}</ToggleChip>
              ))}
            </div>
          </div>
          <div>
            <label className="label">What can your business offer to FORTI members?</label>
            <div className="flex flex-wrap gap-2">
              {OFFERING.map(v => (
                <ToggleChip key={v} selected={form.offering.includes(v)} onClick={() => toggleMulti('offering', v)}>{v}</ToggleChip>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-primary-600" />
              <p className="font-bold text-gray-900">FORTI Member Special Offers</p>
            </div>
            {form.offers.map((offer, idx) => (
              <div key={idx} className="border border-primary-100 bg-primary-50/40 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Offer {idx + 1}</p>
                  <button type="button" className="text-red-500 text-xs"
                    onClick={() => setField('offers', form.offers.filter((_, i) => i !== idx))}>Remove offer</button>
                </div>
                <div>
                  <label className="label">Offer Title</label>
                  <input className="input" placeholder='e.g. "20% Off Web Development"'
                    value={offer.title}
                    onChange={e => {
                      const offers = [...form.offers]
                      offers[idx] = { ...offer, title: e.target.value }
                      setField('offers', offers)
                    }} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Offer Type</label>
                    <select className="input" value={offer.offer_type}
                      onChange={e => {
                        const offers = [...form.offers]
                        offers[idx] = { ...offer, offer_type: e.target.value, discount_value: '' }
                        setField('offers', offers)
                      }}>
                      {OFFER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <OfferValueFields
                      offer={offer}
                      onChange={val => {
                        const offers = [...form.offers]
                        offers[idx] = { ...offer, discount_value: val }
                        setField('offers', offers)
                      }}
                    />
                    {errors[`offer_value_${idx}`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`offer_value_${idx}`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Valid Until</label>
                    <input className="input" type="date" value={offer.valid_until}
                      onChange={e => {
                        const offers = [...form.offers]
                        offers[idx] = { ...offer, valid_until: e.target.value }
                        setField('offers', offers)
                      }} />
                  </div>
                </div>
                {errors[`offer_${idx}`] && <p className="text-xs text-red-500">{errors[`offer_${idx}`]}</p>}
                <div>
                  <label className="label">Offer Description</label>
                  <textarea className="input" rows={2} placeholder="Describe the offer" value={offer.description}
                    onChange={e => {
                      const offers = [...form.offers]
                      offers[idx] = { ...offer, description: e.target.value }
                      setField('offers', offers)
                    }} />
                </div>
                <div>
                  <label className="label">Terms & Conditions</label>
                  <textarea className="input" rows={2} placeholder="Optional terms" value={offer.terms}
                    onChange={e => {
                      const offers = [...form.offers]
                      offers[idx] = { ...offer, terms: e.target.value }
                      setField('offers', offers)
                    }} />
                </div>
                <div className="w-full sm:w-40">
                  <label className="label">Status</label>
                  <select className="input" value={offer.status}
                    onChange={e => {
                      const offers = [...form.offers]
                      offers[idx] = { ...offer, status: e.target.value }
                      setField('offers', offers)
                    }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            ))}
            <button type="button" className="btn-outline"
              onClick={() => setField('offers', [...form.offers, {
                title: '', offer_type: 'percentage', discount_value: '', description: '', valid_until: '', terms: '', status: 'active',
              }])}>
              <Plus size={14} className="inline mr-1" /> Add Member Offer
            </button>
          </div>
        </SectionCard>
      )}

      {step === 7 && (
        <SectionCard icon={MapPin} title="Business Location" desc="Actual business location for local discovery (separate from membership region).">
          <div>
            <label className="label">Business Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={e => setField('address', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => setField('city', e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.state} onChange={e => setField('state', e.target.value)} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={form.country} onChange={e => setField('country', e.target.value)} />
            </div>
            <div>
              <label className="label">PIN / Postal Code</label>
              <input className="input" value={form.pin_code} onChange={e => setField('pin_code', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.show_address_publicly}
              onChange={e => setField('show_address_publicly', e.target.checked)} />
            Show exact address publicly
          </label>
        </SectionCard>
      )}

      {step === 8 && (
        <SectionCard icon={CheckCircle} title="Review & Submit" desc="Check every section before publishing. Use Edit to jump back and fix anything.">
          <div className="space-y-3">
            <ReviewBlock title="Overview" onEdit={() => setStep(0)}>
              <p className="whitespace-pre-wrap">{form.description || <span className="text-gray-400">No description</span>}</p>
              <p>Established: {form.established_year || '—'} · Employees: {form.employee_count || '—'}</p>
              <p>Website: {form.website || '—'} · Email: {form.business_email || '—'} · Phone: {form.business_phone || '—'}</p>
            </ReviewBlock>

            <ReviewBlock title="Category & Keywords" onEdit={() => setStep(1)}>
              <p>
                {[categories.find(c => String(c.id) === String(form.primary_category_id))?.name,
                  subCategories.find(c => String(c.id) === String(form.sub_category_id))?.name].filter(Boolean).join(' → ') || 'No category'}
              </p>
              <p>{form.keywords.length ? form.keywords.join(', ') : 'No keywords'}</p>
            </ReviewBlock>

            <ReviewBlock title="Products & Services" onEdit={() => setStep(2)}>
              {form.products.filter(p => p.name?.trim()).length
                ? form.products.filter(p => p.name?.trim()).map((p, i) => (
                  <p key={i}>• {p.name} <span className="text-gray-400">({p.item_type})</span></p>
                ))
                : <p className="text-gray-400">None added</p>}
            </ReviewBlock>

            <ReviewBlock title="Online Presence" onEdit={() => setStep(3)}>
              {form.social_links.filter(l => l.url?.trim()).length
                ? form.social_links.filter(l => l.url?.trim()).map((l, i) => (
                  <p key={i}>• {l.platform}: {l.url}</p>
                ))
                : <p className="text-gray-400">No links</p>}
            </ReviewBlock>

            <ReviewBlock title="Photos & Gallery" onEdit={() => setStep(4)}>
              <p>Logo: {orgLogo ? 'Uploaded' : 'Not set'} · Cover: {form.cover_image ? 'Uploaded' : 'Not set'} · Gallery: {form.gallery.length} photo(s)</p>
            </ReviewBlock>

            <ReviewBlock title="Achievements" onEdit={() => setStep(5)}>
              {form.achievements.filter(a => a.title?.trim()).length
                ? form.achievements.filter(a => a.title?.trim()).map((a, i) => (
                  <p key={i}>• {a.title}{a.year ? ` (${a.year})` : ''}{a.issued_by ? ` — ${a.issued_by}` : ''}</p>
                ))
                : <p className="text-gray-400">None added</p>}
            </ReviewBlock>

            <ReviewBlock title="Networking & Member Offers" onEdit={() => setStep(6)}>
              <p>Looking for: {form.looking_for.length ? form.looking_for.join(', ') : '—'}</p>
              <p>Offering: {form.offering.length ? form.offering.join(', ') : '—'}</p>
              {form.offers.filter(o => o.title?.trim()).length
                ? form.offers.filter(o => o.title?.trim()).map((o, i) => (
                  <p key={i}>• {o.title}{o.discount_value ? ` (${o.discount_value})` : ''} — {o.status}</p>
                ))
                : <p className="text-gray-400">No member offers</p>}
            </ReviewBlock>

            <ReviewBlock title="Location" onEdit={() => setStep(7)}>
              {form.address && <p className="whitespace-pre-wrap">{form.address}</p>}
              <p>{[form.city, form.state, form.country, form.pin_code].filter(Boolean).join(', ') || 'Not set'}</p>
              <p className="text-xs">Exact address public: {form.show_address_publicly ? 'Yes' : 'No'}</p>
            </ReviewBlock>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2 text-xs text-amber-800">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            Submitting publishes your business profile for other FORTI members to discover. You can edit it anytime after submission.
          </div>
        </SectionCard>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 sticky bottom-3 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-3 shadow-lg">
        <button type="button" className="btn-outline" disabled={step === 0 || saving}
          onClick={() => setStep(s => Math.max(0, s - 1))}>
          <ChevronLeft size={16} className="inline" /> Back
        </button>
        <div className="flex items-center gap-2">
          {isPublished && onCancel && (
            <button type="button" className="btn-ghost text-sm" disabled={saving} onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="button" className="btn-ghost text-sm" disabled={saving} onClick={() => saveProgress()}>
            {saving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
            Save Draft
          </button>
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" disabled={saving} onClick={goNext}>
            Continue <ChevronRight size={16} className="inline" />
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={saving} onClick={handleSubmit}>
            {saving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
            {isPublished ? 'Update & Publish' : 'Submit Business Profile'}
          </button>
        )}
      </div>
    </div>
  )
}
