import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, MapPin, Globe2, Mail, Phone, Loader2, ExternalLink,
  Package, Trophy, Handshake, Percent, Image as ImageIcon, Tags,
  Send, X, AlertCircle, Building2, Linkedin, Instagram, Facebook,
  Youtube, Link2, BadgeCheck,
} from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import { assetUrl } from '../../utils/assetUrl'
import { useMember } from '../../contexts/MemberContext'
import { hasMemberDashboardAccess } from '../../utils/memberAccess'

const http = axios.create({ baseURL: '/api' })

function ensureHttpUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function normalizePresenceUrl(url) {
  try {
    const u = new URL(ensureHttpUrl(url))
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    const path = u.pathname.replace(/\/+$/, '') || ''
    return `${host}${path}${u.search}`.toLowerCase()
  } catch {
    return String(url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '')
  }
}

function isWebsitePlatform(platform) {
  const p = String(platform || '').toLowerCase().trim()
  return p === 'website' || p === 'web' || p === 'site'
}

function platformMeta(platform, url = '') {
  const p = String(platform || '').toLowerCase().trim()
  const u = String(url || '').toLowerCase()

  if (p.includes('linkedin') || u.includes('linkedin.com')) {
    return { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, className: 'bg-[#0A66C2] text-white hover:brightness-110' }
  }
  if (p.includes('instagram') || u.includes('instagram.com')) {
    return { key: 'instagram', label: 'Instagram', Icon: Instagram, className: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:brightness-110' }
  }
  if (p.includes('facebook') || u.includes('facebook.com') || u.includes('fb.com')) {
    return { key: 'facebook', label: 'Facebook', Icon: Facebook, className: 'bg-[#1877F2] text-white hover:brightness-110' }
  }
  if (p.includes('youtube') || u.includes('youtube.com') || u.includes('youtu.be')) {
    return { key: 'youtube', label: 'YouTube', Icon: Youtube, className: 'bg-[#FF0000] text-white hover:brightness-110' }
  }
  if (
    p.includes('twitter') || p === 'x' || p.includes('x/twitter')
    || u.includes('twitter.com') || /(^|\.)x\.com(\/|$)/i.test(u)
  ) {
    return { key: 'twitter', label: 'X / Twitter', Icon: Link2, className: 'bg-gray-900 text-white hover:bg-gray-800' }
  }
  if (isWebsitePlatform(platform)) {
    return { key: 'website', label: 'Website', Icon: Globe2, className: 'bg-primary-600 text-white hover:bg-primary-700' }
  }
  if (p === 'other') {
    return { key: 'other', label: 'Other', Icon: Link2, className: 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200' }
  }
  const label = String(platform || '').trim() || 'Link'
  return {
    key: `custom-${label.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    Icon: Link2,
    className: 'bg-primary-50 text-primary-700 border border-primary-100 hover:bg-primary-100',
  }
}

/** Merge overview website + onboarding social_links into unique clickable presence buttons. */
function buildPresenceLinks(website, socialLinks = []) {
  const items = []
  const seenUrls = new Set()
  const seenKeys = new Set()

  const push = (platform, url) => {
    const href = ensureHttpUrl(url)
    if (!href) return
    const norm = normalizePresenceUrl(href)
    if (!norm || seenUrls.has(norm)) return

    const meta = platformMeta(platform, href)
    // Only one Website button; skip extra website-like entries
    if (meta.key === 'website' && seenKeys.has('website')) return
    // One button per known platform key (LinkedIn, Instagram, …)
    if (meta.key !== 'other' && meta.key !== 'custom' && !meta.key.startsWith('custom-') && seenKeys.has(meta.key)) {
      return
    }

    seenUrls.add(norm)
    seenKeys.add(meta.key)
    items.push({
      platform: meta.label,
      url: href,
      label: meta.label,
      Icon: meta.Icon,
      className: meta.className,
      key: `${meta.key}-${norm}`,
    })
  }

  // Overview website field first (canonical Website)
  if (String(website || '').trim()) {
    push('Website', website)
  }

  for (const link of socialLinks || []) {
    const url = link?.url
    if (!String(url || '').trim()) continue
    const platform = String(link?.platform || '').trim() || 'Other'
    // If this social row is another Website and we already have one, skip
    push(platform, url)
  }

  return items
}

function formatOfferDiscount(offer) {
  const raw = String(offer?.discount_value || '').trim()
  if (!raw) return null
  const type = String(offer?.offer_type || '').toLowerCase()
  if (/%\s*off/i.test(raw) || /forti members/i.test(raw)) return raw
  if (type.includes('percent') || type === 'percentage' || /^\d+(\.\d+)?%?$/.test(raw)) {
    const num = raw.replace(/%/g, '').trim()
    return `${num}% OFF for FORTI Members`
  }
  return raw
}

function isOfferActive(offer) {
  if (String(offer?.status || '').toLowerCase() === 'inactive') return false
  if (String(offer?.status || 'active').toLowerCase() !== 'active') return false
  if (!offer?.valid_until) return true
  const until = new Date(offer.valid_until)
  if (Number.isNaN(until.getTime())) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  until.setHours(0, 0, 0, 0)
  return until >= today
}

function SafeImage({ src, alt = '', className = '', fallback }) {
  const [failed, setFailed] = useState(false)
  const url = src ? assetUrl(src) : ''
  if (!url || failed) {
    return fallback || (
      <div className={`bg-gray-100 text-gray-400 flex items-center justify-center ${className}`}>
        <ImageIcon size={20} />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  )
}

function Section({ icon: Icon, title, children, empty, accent }) {
  if (empty) return null
  return (
    <section className={`bg-white rounded-2xl border p-5 sm:p-6 space-y-4 shadow-sm ${
      accent ? 'border-primary-200 ring-1 ring-primary-100' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          accent ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'
        }`}>
          <Icon size={16} />
        </div>
        <h2 className="font-bold text-gray-900 text-base sm:text-lg">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!src) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-gray-800 hover:bg-white shadow"
        aria-label="Close preview"
      >
        <X size={18} />
      </button>
      <img
        src={assetUrl(src)}
        alt={alt || 'Preview'}
        className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl bg-white"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

function QuoteModal({ open, onClose, profile, canRequest, onLogin, member }) {
  const { token, apiClient } = useMember()
  const products = profile?.products || []

  const defaults = useMemo(() => {
    const data = member?.data && typeof member.data === 'object' ? member.data : {}
    return {
      requester_name: member?.full_name || member?.applicant_name || member?.name || '',
      requester_company: data.organisation_name || data.organization_name || data.company_name || '',
      requester_email: member?.email || member?.applicant_email || '',
      requester_phone: member?.phone || member?.applicant_phone || '',
      product_service_id: '',
      requirement: '',
      budget: '',
      quantity: '',
      timeline: '',
      message: '',
    }
  }, [member])

  const [form, setForm] = useState(defaults)

  useEffect(() => {
    if (open) setForm(defaults)
  }, [open, defaults])

  const mutation = useMutation({
    mutationFn: async () => {
      const client = apiClient
        ? apiClient()
        : axios.create({
          baseURL: '/api',
          headers: { Authorization: `Bearer ${token}` },
        })
      const selected = products.find(p => String(p.id) === String(form.product_service_id))
      const contactLines = [
        form.requester_name && `Name: ${form.requester_name.trim()}`,
        form.requester_company && `Company: ${form.requester_company.trim()}`,
        form.requester_email && `Email: ${form.requester_email.trim()}`,
        form.requester_phone && `Phone: ${form.requester_phone.trim()}`,
      ].filter(Boolean).join('\n')
      const combinedMessage = [contactLines, form.message?.trim()].filter(Boolean).join('\n\n')

      return client.post('/member/business-profile/quotes', {
        business_profile_id: profile.id,
        product_service_id: form.product_service_id || null,
        product_service_name: selected?.name || null,
        requirement: form.requirement,
        budget: form.budget || null,
        quantity: form.quantity || null,
        timeline: form.timeline || null,
        message: combinedMessage || null,
      })
    },
    onSuccess: () => {
      toast.success('Quote request sent to the business')
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send quote request')
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !mutation.isPending && onClose()} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="font-bold text-gray-900">Request a Quote</h3>
            <p className="text-xs text-gray-500 truncate">{profile?.organisation_name}</p>
          </div>
          <button type="button" disabled={mutation.isPending} onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {!canRequest ? (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              Quote requests are available to authenticated active FORTI members.
            </div>
            <button type="button" className="btn-primary w-full" onClick={onLogin}>
              Member Login to Continue
            </button>
          </div>
        ) : (
          <form
            className="p-5 space-y-3"
            onSubmit={e => {
              e.preventDefault()
              if (!form.requester_name.trim()) {
                toast.error('Please enter your name')
                return
              }
              if (!form.requester_email.trim()) {
                toast.error('Please enter your email')
                return
              }
              if (!form.requirement.trim()) {
                toast.error('Please enter your requirement')
                return
              }
              if (mutation.isPending) return
              mutation.mutate()
            }}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Your Name *</label>
                <input className="input" required value={form.requester_name}
                  onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Business / Company</label>
                <input className="input" placeholder="Optional"
                  value={form.requester_company}
                  onChange={e => setForm(f => ({ ...f, requester_company: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" required value={form.requester_email}
                  onChange={e => setForm(f => ({ ...f, requester_email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.requester_phone}
                  onChange={e => setForm(f => ({ ...f, requester_phone: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Required Service / Product</label>
              <select className="input" value={form.product_service_id}
                onChange={e => setForm(f => ({ ...f, product_service_id: e.target.value }))}>
                <option value="">General enquiry</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.item_type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Requirement / Message *</label>
              <textarea className="input" rows={3} required
                placeholder="Describe what you need…"
                value={form.requirement}
                onChange={e => setForm(f => ({ ...f, requirement: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Budget (optional)</label>
                <input className="input" placeholder="e.g. ₹50,000"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>
              <div>
                <label className="label">Quantity (optional)</label>
                <input className="input" placeholder="e.g. 10 units"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">Expected Timeline</label>
              <input className="input" placeholder="e.g. Within 2 weeks"
                value={form.timeline}
                onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))} />
            </div>

            <div>
              <label className="label">Additional Note</label>
              <textarea className="input" rows={2} placeholder="Anything else we should know?"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>

            <button type="submit" className="btn-primary w-full inline-flex items-center justify-center gap-2"
              disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {mutation.isPending ? 'Sending…' : 'Send Quote Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function BusinessDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, member } = useMember()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const canRequest = !!(token && member && hasMemberDashboardAccess(member))

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['business-public', id],
    queryFn: () => http.get(`/business-profile/public/${id}`).then(r => r.data.data),
    enabled: !!id,
  })

  const keywords = useMemo(
    () => (profile?.keywords || []).map(k => k.keyword || k).filter(Boolean),
    [profile]
  )

  const offers = useMemo(
    () => (profile?.offers || []).filter(isOfferActive),
    [profile]
  )

  const publicLocation = useMemo(() => {
    if (!profile) return ''
    return [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
  }, [profile])

  const showExactAddress = !!(profile?.show_address_publicly && (profile.address || profile.pin_code))
  const logo = profile?.logo_path || profile?.organisation_logo
  const categoryLine = [profile?.primary_category?.name, profile?.sub_category?.name].filter(Boolean).join(' · ')
  const presenceLinks = useMemo(
    () => buildPresenceLinks(profile?.website, profile?.social_links || []),
    [profile?.website, profile?.social_links]
  )
  const products = profile?.products || []
  const gallery = profile?.gallery || []
  const achievements = profile?.achievements || []
  const lookingFor = profile?.looking_for || []
  const offering = profile?.offering || []

  // Email/phone: show when present on published business profile (business contact fields).
  // Exact street address / PIN follow show_address_publicly from onboarding privacy.
  const showEmail = !!profile?.business_email
  const showPhone = !!profile?.business_phone

  const openQuote = () => setQuoteOpen(true)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/directory" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline mb-4">
          <ArrowLeft size={14} /> Back to Directory
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-24 text-gray-500 gap-2">
            <Loader2 className="animate-spin text-primary-600" /> Loading business profile…
          </div>
        ) : error || !profile ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Building2 className="mx-auto text-gray-300 mb-3" size={36} />
            <p className="font-semibold text-gray-800">Business not found</p>
            <p className="text-sm text-gray-500 mt-1">This profile may be unpublished or unavailable.</p>
            <Link to="/directory" className="btn-outline btn-sm mt-4 inline-flex">Back to Directory</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero — overflow only on cover, not the card, so logo overlap is visible */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="relative h-40 sm:h-52 md:h-60 bg-gradient-to-r from-primary-700 via-primary-600 to-purple-600 overflow-hidden rounded-t-2xl">
                {profile.cover_image ? (
                  <SafeImage
                    src={profile.cover_image}
                    alt=""
                    className="w-full h-full object-cover"
                    fallback={<div className="w-full h-full bg-gradient-to-r from-primary-700 via-primary-600 to-purple-600" />}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="px-4 sm:px-6 pb-5 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                  {/* Logo overlaps cover; title block padded so it stays on white */}
                  <div className="-mt-10 sm:-mt-12 shrink-0 self-start relative z-20">
                    {logo ? (
                      <SafeImage
                        src={logo}
                        alt={profile.organisation_name || 'Logo'}
                        className="w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 rounded-2xl border-4 border-white object-cover bg-white shadow-md ring-1 ring-black/5"
                        fallback={
                          <div className="w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 rounded-2xl border-4 border-white bg-primary-100 text-primary-700 flex items-center justify-center font-black text-2xl shadow-md ring-1 ring-black/5">
                            {(profile.organisation_name || 'B').charAt(0).toUpperCase()}
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 rounded-2xl border-4 border-white bg-primary-100 text-primary-700 flex items-center justify-center font-black text-2xl shadow-md ring-1 ring-black/5">
                        {(profile.organisation_name || 'B').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-1 sm:pt-10 md:pt-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 break-words leading-tight">
                        {profile.organisation_name || 'Business'}
                      </h1>
                      {(categoryLine || publicLocation) && (
                        <p className="text-sm text-gray-500 mt-1 break-words">
                          {[categoryLine, publicLocation].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {profile.membership_id && (
                        <p className="inline-flex items-center gap-1 text-xs text-primary-700 font-semibold mt-2 bg-primary-50 border border-primary-100 px-2.5 py-1 rounded-full">
                          <BadgeCheck size={12} /> FORTI Member · {profile.membership_id}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-primary inline-flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
                      onClick={openQuote}
                    >
                      <Send size={16} /> Request a Quote
                    </button>
                  </div>
                </div>

                {profile.description && (
                  <p className="text-sm text-gray-700 mt-5 whitespace-pre-wrap leading-relaxed break-words">
                    {profile.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4 text-xs">
                  {profile.established_year && (
                    <span className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full text-gray-700">
                      Est. {profile.established_year}
                    </span>
                  )}
                  {profile.employee_count && (
                    <span className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full text-gray-700">
                      {profile.employee_count} employees
                    </span>
                  )}
                  {showEmail && (
                    <a href={`mailto:${profile.business_email}`}
                      className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-gray-700 hover:border-gray-300 transition max-w-full">
                      <Mail size={12} className="shrink-0" />
                      <span className="truncate">{profile.business_email}</span>
                    </a>
                  )}
                  {showPhone && (
                    <a href={`tel:${profile.business_phone}`}
                      className="bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-gray-700 hover:border-gray-300 transition">
                      <Phone size={12} /> {profile.business_phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <Section
                icon={Tags}
                title="Category & Keywords"
                empty={!profile.primary_category && !profile.sub_category && !keywords.length}
              >
                {(profile.primary_category || profile.sub_category) && (
                  <p className="text-sm text-gray-700 font-medium break-words">
                    {[profile.primary_category?.name, profile.sub_category?.name].filter(Boolean).join(' → ')}
                  </p>
                )}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map(k => (
                      <span key={k} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium break-all">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section icon={Package} title="Products & Services" empty={!products.length}>
                <div className="grid sm:grid-cols-2 gap-3">
                  {products.map(p => (
                    <div key={p.id || p.name} className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50/60 hover:border-primary-100 transition">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm break-words">{p.name}</p>
                        <span className="text-[10px] tracking-wide font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full shrink-0 capitalize">
                          {p.item_type || 'service'}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed break-words">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={Globe2} title="Online Presence" empty={!presenceLinks.length}>
                <div className="flex flex-wrap gap-2">
                  {presenceLinks.map((link) => {
                    const Icon = link.Icon
                    return (
                      <a
                        key={link.key}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${link.className}`}
                        aria-label={`Open ${link.label}`}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span>{link.label}</span>
                        <ExternalLink size={12} className="opacity-80 shrink-0" />
                      </a>
                    )
                  })}
                </div>
              </Section>

              <Section icon={ImageIcon} title="Photos & Gallery" empty={!gallery.length}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {gallery.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setLightbox({ src: g.image_path, alt: g.caption || 'Gallery photo' })}
                      className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:ring-2 hover:ring-primary-300 transition focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <SafeImage src={g.image_path} alt={g.caption || ''} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </Section>

              <Section icon={Trophy} title="Achievements & Awards" empty={!achievements.length}>
                <ul className="space-y-3">
                  {achievements.map(a => (
                    <li key={a.id || a.title} className="flex gap-3 text-sm">
                      {a.image_path ? (
                        <button
                          type="button"
                          onClick={() => setLightbox({ src: a.image_path, alt: a.title })}
                          className="shrink-0 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-amber-300 transition"
                        >
                          <SafeImage src={a.image_path} alt={a.title || ''} className="w-14 h-14 object-cover" />
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                          <Trophy size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 break-words">
                          {a.title}{a.year ? ` (${a.year})` : ''}
                        </p>
                        {a.issued_by && <p className="text-xs text-gray-500 mt-0.5">Issued by {a.issued_by}</p>}
                        {a.description && <p className="text-gray-600 mt-1 break-words">{a.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={Handshake} title="Networking" empty={!lookingFor.length && !offering.length}>
                {lookingFor.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Looking for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lookingFor.map(v => (
                        <span key={v} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full break-all">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
                {offering.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Offering to members</p>
                    <div className="flex flex-wrap gap-1.5">
                      {offering.map(v => (
                        <span key={v} className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full break-all">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              <Section icon={Percent} title="FORTI Member Offers" empty={!offers.length} accent>
                <div className="space-y-3">
                  {offers.map(o => {
                    const discountLabel = formatOfferDiscount(o)
                    return (
                      <div
                        key={o.id || o.title}
                        className="relative overflow-hidden border border-primary-200 bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-bold text-gray-900 text-base break-words">{o.title}</p>
                          {discountLabel && (
                            <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-black tracking-wide text-white bg-primary-600 px-3 py-1 rounded-full shadow-sm shrink-0">
                              <Percent size={12} /> {discountLabel}
                            </span>
                          )}
                        </div>
                        {o.description && (
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed break-words">{o.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          {o.valid_until && (
                            <span>Valid until {String(o.valid_until).slice(0, 10)}</span>
                          )}
                          {o.terms && (
                            <span className="break-words"><span className="font-semibold text-gray-600">Terms:</span> {o.terms}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>

              <Section
                icon={MapPin}
                title="Business Location"
                empty={!publicLocation && !showExactAddress}
              >
                {showExactAddress && profile.address && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{profile.address}</p>
                )}
                <p className="text-sm text-gray-600 flex items-start gap-1.5">
                  <MapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
                  <span className="break-words">
                    {[
                      publicLocation,
                      showExactAddress && profile.pin_code ? `PIN ${profile.pin_code}` : null,
                    ].filter(Boolean).join(' · ') || 'Location not shared'}
                  </span>
                </p>
                {!showExactAddress && (
                  <p className="text-xs text-gray-400">Exact street address is private for this business.</p>
                )}
              </Section>
            </div>

            <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur border border-primary-100 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-gray-600 text-center sm:text-left break-words">
                Interested in working with{' '}
                <span className="font-semibold text-gray-900">{profile.organisation_name}</span>?
              </p>
              <button
                type="button"
                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 shrink-0"
                onClick={openQuote}
              >
                <Send size={16} /> Contact Business / Request Quote
              </button>
            </div>
          </div>
        )}
      </div>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        profile={profile}
        canRequest={canRequest}
        member={member}
        onLogin={() => navigate('/member/login', { state: { from: `/directory/${id}` } })}
      />

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}

      <PublicFooter />
    </div>
  )
}
