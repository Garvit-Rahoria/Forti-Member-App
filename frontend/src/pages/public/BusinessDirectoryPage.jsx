import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Search, MapPin, Building2, Percent, Loader2, ExternalLink,
  Filter, X, Sparkles, Globe2, Package, ChevronLeft, ChevronRight,
  Linkedin, Instagram, Facebook, Youtube, Link2,
} from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import { assetUrl } from '../../utils/assetUrl'

const http = axios.create({ baseURL: '/api' })
const PER_PAGE = 12

function ensureHttpUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function formatOfferLabel(offer) {
  const raw = String(offer?.discount_value || '').trim()
  if (!raw && !offer?.title) return null
  if (!raw) return offer.title
  if (/%\s*off/i.test(raw) || /forti members/i.test(raw)) return raw
  const type = String(offer?.offer_type || '').toLowerCase()
  if (type.includes('percent') || type === 'percentage' || /^\d+(\.\d+)?%?$/.test(raw)) {
    return `${raw.replace(/%/g, '').trim()}% OFF for FORTI Members`
  }
  return raw
}

function platformMeta(platform, url = '') {
  const p = String(platform || '').toLowerCase()
  const u = String(url || '').toLowerCase()
  if (p.includes('linkedin') || u.includes('linkedin.com')) {
    return { label: 'LinkedIn', Icon: Linkedin, className: 'bg-[#0A66C2] text-white' }
  }
  if (p.includes('instagram') || u.includes('instagram.com')) {
    return { label: 'Instagram', Icon: Instagram, className: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white' }
  }
  if (p.includes('facebook') || u.includes('facebook.com')) {
    return { label: 'Facebook', Icon: Facebook, className: 'bg-[#1877F2] text-white' }
  }
  if (p.includes('youtube') || u.includes('youtube.com')) {
    return { label: 'YouTube', Icon: Youtube, className: 'bg-[#FF0000] text-white' }
  }
  if (p.includes('twitter') || p.includes('x/twitter') || u.includes('twitter.com') || /(^|\.)x\.com/.test(u)) {
    return { label: 'X / Twitter', Icon: Link2, className: 'bg-gray-900 text-white' }
  }
  if (p === 'website' || p === 'web') {
    return { label: 'Website', Icon: Globe2, className: 'bg-primary-600 text-white' }
  }
  return { label: platform || 'Link', Icon: Link2, className: 'bg-primary-50 text-primary-700 border border-primary-100' }
}

function buildPresenceLinks(biz) {
  const items = []
  const seen = new Set()
  const push = (platform, url) => {
    const href = ensureHttpUrl(url)
    if (!href) return
    const key = href.toLowerCase().replace(/\/+$/, '')
    if (seen.has(key)) return
    seen.add(key)
    const meta = platformMeta(platform, href)
    if (meta.label === 'Website' && items.some(i => i.label === 'Website')) return
    items.push({ ...meta, url: href, key })
  }
  if (biz.website) push('Website', biz.website)
  for (const l of biz.social_links || []) {
    if (l?.url?.trim()) push(l.platform || 'Other', l.url)
  }
  return items
}

function SocialPresenceModal({ open, onClose, biz }) {
  const links = useMemo(() => (biz ? buildPresenceLinks(biz) : []), [biz])
  if (!open || !biz) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900">Online Presence</h3>
            <p className="text-xs text-gray-500 truncate">{biz.organisation_name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No website or social links available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {links.map(link => {
              const Icon = link.Icon
              return (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold shadow-sm ${link.className}`}
                >
                  <Icon size={15} /> {link.label} <ExternalLink size={12} className="opacity-80" />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-24 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-14 h-14 -mt-8 rounded-xl bg-gray-200 border-2 border-white" />
          <div className="flex-1 pt-8 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-8 bg-gray-100 rounded w-24 ml-auto" />
      </div>
    </div>
  )
}

function BusinessCard({ biz, onOpenSocial }) {
  const logo = biz.logo_path || biz.organisation_logo
  const location = [biz.city, biz.state].filter(Boolean).join(', ')
  const offer = (biz.offers || [])[0]
  const offerLabel = offer ? formatOfferLabel(offer) : null
  const keywords = (biz.keywords || []).slice(0, 3)
  const products = (biz.products || []).slice(0, 3)
  const tags = [...keywords, ...products.map(p => p.name)].filter(Boolean).slice(0, 4)
  const hasPresence = !!(biz.website || (biz.social_links || []).some(l => l?.url?.trim()))

  return (
    <article className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition flex flex-col">
      <div className="h-24 bg-gradient-to-r from-primary-600 to-purple-600 relative overflow-hidden rounded-t-2xl">
        {biz.cover_image && (
          <img src={assetUrl(biz.cover_image)} alt="" className="w-full h-full object-cover opacity-90" />
        )}
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col relative z-10">
        <div className="flex items-start gap-3 mb-3">
          {logo ? (
            <img src={assetUrl(logo)} alt="" className="-mt-8 w-14 h-14 rounded-xl border-2 border-white object-cover bg-white shadow ring-1 ring-black/5 shrink-0" />
          ) : (
            <div className="-mt-8 w-14 h-14 rounded-xl border-2 border-white bg-primary-100 text-primary-700 flex items-center justify-center font-black text-lg shadow ring-1 ring-black/5 shrink-0">
              {(biz.organisation_name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-8">
            <h3 className="font-bold text-gray-900 truncate leading-snug">{biz.organisation_name || 'Business'}</h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {[biz.primary_category, biz.sub_category].filter(Boolean).join(' · ') || 'Uncategorized'}
            </p>
          </div>
        </div>

        {location && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
            <MapPin size={12} className="text-primary-500 shrink-0" /> {location}
          </p>
        )}

        <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
          {biz.short_description || 'No description yet.'}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(t => (
              <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full max-w-full truncate">
                {t}
              </span>
            ))}
          </div>
        )}

        {offerLabel && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-600 text-white shadow-sm">
              <Percent size={10} /> {offerLabel}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-1.5 text-gray-400">
            {hasPresence && (
              <button
                type="button"
                title="Online presence"
                onClick={() => onOpenSocial(biz)}
                className="p-1.5 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition"
              >
                <Globe2 size={15} />
              </button>
            )}
            {(biz.products || []).length > 0 && <Package size={14} className="opacity-60" title="Products/services" />}
          </div>
          <Link to={`/directory/${biz.id}`} className="btn-primary btn-sm text-xs px-3 py-1.5">
            View Profile
          </Link>
        </div>
      </div>
    </article>
  )
}

function readFiltersFromParams(sp) {
  return {
    q: sp.get('q') || '',
    category_id: sp.get('category_id') || '',
    sub_category_id: sp.get('sub_category_id') || '',
    city: sp.get('city') || '',
    state: sp.get('state') || '',
    country: sp.get('country') || '',
    keyword: sp.get('keyword') || '',
    offering_deals: sp.get('offering_deals') === '1',
    page: Math.max(1, parseInt(sp.get('page') || '1', 10) || 1),
  }
}

function filtersToParams(f) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category_id) p.set('category_id', f.category_id)
  if (f.sub_category_id) p.set('sub_category_id', f.sub_category_id)
  if (f.city) p.set('city', f.city)
  if (f.state) p.set('state', f.state)
  if (f.country) p.set('country', f.country)
  if (f.keyword) p.set('keyword', f.keyword)
  if (f.offering_deals) p.set('offering_deals', '1')
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

export default function BusinessDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const applied = useMemo(() => readFiltersFromParams(searchParams), [searchParams])

  const [q, setQ] = useState(applied.q)
  const [categoryId, setCategoryId] = useState(applied.category_id)
  const [subCategoryId, setSubCategoryId] = useState(applied.sub_category_id)
  const [city, setCity] = useState(applied.city)
  const [state, setState] = useState(applied.state)
  const [country, setCountry] = useState(applied.country)
  const [keyword, setKeyword] = useState(applied.keyword)
  const [offeringDeals, setOfferingDeals] = useState(applied.offering_deals)
  const [socialBiz, setSocialBiz] = useState(null)

  // Keep local form in sync when URL changes (back/forward)
  useEffect(() => {
    setQ(applied.q)
    setCategoryId(applied.category_id)
    setSubCategoryId(applied.sub_category_id)
    setCity(applied.city)
    setState(applied.state)
    setCountry(applied.country)
    setKeyword(applied.keyword)
    setOfferingDeals(applied.offering_deals)
  }, [applied])

  const { data: categories = [] } = useQuery({
    queryKey: ['business-categories'],
    queryFn: () => http.get('/business-profile/categories').then(r => r.data.data || []),
    staleTime: 60_000,
  })

  const { data: facets } = useQuery({
    queryKey: ['business-directory-facets'],
    queryFn: () => http.get('/business-profile/directory/facets').then(r => r.data.data || {}),
    staleTime: 60_000,
  })

  const subCategories = useMemo(() => {
    const parent = categories.find(c => String(c.id) === String(categoryId))
    return parent?.children || []
  }, [categories, categoryId])

  const citiesForState = useMemo(() => {
    const all = facets?.cities || []
    if (!state) return all
    return all.filter(c => !c.state || String(c.state).toLowerCase() === String(state).toLowerCase())
  }, [facets, state])

  const queryString = useMemo(() => {
    const p = filtersToParams(applied)
    p.set('per_page', String(PER_PAGE))
    return p.toString()
  }, [applied])

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['business-directory', queryString],
    queryFn: () => http.get(`/business-profile/directory?${queryString}`).then(r => r.data.data),
    placeholderData: (prev) => prev,
  })

  const businesses = data?.items || (Array.isArray(data) ? data : [])
  const total = data?.total ?? businesses.length
  const page = data?.page || applied.page
  const totalPages = data?.total_pages || 1

  function commitFilters(next, { resetPage = true } = {}) {
    const payload = {
      q: (next.q ?? q).trim(),
      category_id: next.category_id ?? categoryId,
      sub_category_id: next.sub_category_id ?? subCategoryId,
      city: (next.city ?? city).trim(),
      state: (next.state ?? state).trim(),
      country: (next.country ?? country).trim(),
      keyword: (next.keyword ?? keyword).trim(),
      offering_deals: next.offering_deals ?? offeringDeals,
      page: resetPage ? 1 : (next.page ?? page),
    }
    setSearchParams(filtersToParams(payload), { replace: false })
  }

  function applyFilters(e) {
    e?.preventDefault()
    commitFilters({})
  }

  function clearFilters() {
    setQ('')
    setCategoryId('')
    setSubCategoryId('')
    setCity('')
    setState('')
    setCountry('')
    setKeyword('')
    setOfferingDeals(false)
    setSearchParams({}, { replace: false })
  }

  const hasFilters = !!(applied.q || applied.category_id || applied.sub_category_id
    || applied.city || applied.state || applied.country || applied.keyword || applied.offering_deals)

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/40 via-white to-white">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-primary-100/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-purple-700" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16 text-white">
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} /> FORTI Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">Business Directory</h1>
          <p className="text-primary-100 mt-2 max-w-2xl text-sm sm:text-base">
            Search FORTI member businesses by name, member, product, service or keyword — then filter by location and industry.
          </p>

          <form onSubmit={applyFilters} className="mt-6 bg-white/95 backdrop-blur rounded-2xl p-3 sm:p-4 shadow-lg text-gray-900">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9 w-full"
                  placeholder="Search business, member name, product, service or keyword…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary shrink-0 inline-flex items-center justify-center gap-2">
                <Filter size={16} /> Search
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 mt-3">
              <select className="input" value={categoryId}
                onChange={e => { setCategoryId(e.target.value); setSubCategoryId('') }}>
                <option value="">All industries</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input" value={subCategoryId} disabled={!subCategories.length}
                onChange={e => setSubCategoryId(e.target.value)}>
                <option value="">All sub-categories</option>
                {subCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input" value={state}
                onChange={e => { setState(e.target.value); setCity('') }}>
                <option value="">All states</option>
                {(facets?.states || []).map(s => (
                  <option key={s.value} value={s.value}>{s.value} ({s.count})</option>
                ))}
              </select>
              <select className="input" value={city} onChange={e => setCity(e.target.value)}>
                <option value="">All cities</option>
                {citiesForState.map(c => (
                  <option key={`${c.value}-${c.state}`} value={c.value}>
                    {c.value}{c.state ? ` · ${c.state}` : ''} ({c.count})
                  </option>
                ))}
              </select>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">All countries</option>
                {(facets?.countries || []).map(c => (
                  <option key={c.value} value={c.value}>{c.value} ({c.count})</option>
                ))}
              </select>
              <input className="input" placeholder="Keyword / service"
                value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={offeringDeals} onChange={e => setOfferingDeals(e.target.checked)} />
                Only with FORTI Member Offers
              </label>
              <div className="flex items-center gap-3">
                {hasFilters && (
                  <button type="button" onClick={clearFilters}
                    className="text-xs font-semibold text-primary-700 inline-flex items-center gap-1 hover:underline">
                    <X size={12} /> Clear filters
                  </button>
                )}
                <button type="submit" className="btn-outline btn-sm text-xs hidden sm:inline-flex">
                  Apply filters
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <p className="text-sm text-gray-600">
            {isLoading ? 'Loading…' : (
              <>
                <span className="font-semibold text-gray-900">{total}</span>
                {' '}published business{total === 1 ? '' : 'es'}
                {hasFilters ? ' matching your search' : ''}
                {isFetching && !isLoading ? ' · updating…' : ''}
              </>
            )}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
          )}
        </div>

        {isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
            <p className="font-semibold text-red-800">Could not load directory</p>
            <p className="text-sm text-red-600 mt-1">{error?.response?.data?.message || 'Please try again.'}</p>
          </div>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <Building2 className="mx-auto text-gray-300 mb-3" size={36} />
            <p className="font-semibold text-gray-800">No businesses found</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Try a different keyword or clear filters. Only published profiles of active FORTI members appear here.
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn-primary btn-sm mt-4 inline-flex items-center gap-1">
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businesses.map(biz => (
                <BusinessCard key={biz.id} biz={biz} onOpenSocial={setSocialBiz} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  type="button"
                  disabled={page <= 1 || isFetching}
                  className="btn-outline btn-sm inline-flex items-center gap-1 disabled:opacity-40"
                  onClick={() => commitFilters({ page: page - 1 }, { resetPage: false })}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-sm text-gray-600 font-medium">{page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || isFetching}
                  className="btn-outline btn-sm inline-flex items-center gap-1 disabled:opacity-40"
                  onClick={() => commitFilters({ page: page + 1 }, { resetPage: false })}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <SocialPresenceModal open={!!socialBiz} biz={socialBiz} onClose={() => setSocialBiz(null)} />
      <PublicFooter />
    </div>
  )
}
