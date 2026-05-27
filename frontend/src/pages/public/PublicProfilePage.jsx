import { useParams, Link } from 'react-router-dom'
import { Loader2, Mail, Phone, MapPin, Award, ExternalLink, Briefcase, Calendar } from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import { usePublicProfile } from '../../hooks/usePublicQueries'
function RichText({ content }) {
  if (!content) return null
  return (
    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
      {content}
    </div>
  )
}

function LinkBlock({ link }) {
  if (link.link_type === 'youtube' && link.youtube_embed) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-lg bg-black aspect-video">
        <iframe
          title={link.title}
          src={link.youtube_embed}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if ((link.link_type === 'photo' || link.media_path) && link.media_path) {
    return (
      <figure className="rounded-2xl overflow-hidden shadow-md">
        <img src={assetUrl(link.media_path)} alt={link.title} className="w-full object-cover max-h-[480px]" />
        {link.title && <figcaption className="text-center text-sm text-gray-500 py-2">{link.title}</figcaption>}
      </figure>
    )
  }
  if (link.url) {
    return (
      <a href={link.url} target="_blank" rel="noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition group">
        <span className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
          {link.title?.charAt(0) || '↗'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 group-hover:text-primary-700">{link.title}</p>
          <p className="text-xs text-gray-400 truncate">{link.url}</p>
        </div>
        <ExternalLink size={16} className="text-gray-400 shrink-0" />
      </a>
    )
  }
  if (link.content) {
    return (
      <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-2">{link.title}</h4>
        <RichText content={link.content} />
      </div>
    )
  }
  return null
}

export default function PublicProfilePage() {
  const { slug } = useParams()

  const { data, isLoading, isError } = usePublicProfile(slug)

  const theme = data?.theme_color || '#6C3EAB'

  if (isLoading) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary-600" size={36} />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="flex flex-col items-center justify-center gap-4 p-8 py-32 text-center">
          <p className="text-gray-600">This profile is not available or is set to private.</p>
          <Link to="/" className="text-primary-600 hover:underline">Back home</Link>
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div className="page-shell bg-gradient-section">
      <PublicHeader />
      <header className="h-48 sm:h-56 relative hero-dark">
        <div className="mesh-orb-1" />
        <div className="mesh-orb-2" />
        {data.cover && (
          <img src={assetUrl(data.cover)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="-mt-16 sm:-mt-20 shrink-0">
            {data.photo ? (
              <img src={assetUrl(data.photo)} alt={data.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-4 border-white shadow-xl ring-2 ring-white/80 bg-white relative z-20" />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white shadow-xl flex items-center justify-center text-5xl font-black text-primary-700 border-4 border-white relative z-20">
                {(data.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-center sm:text-left pb-2 flex-1 sm:pt-4">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 capitalize tracking-tight">{data.name}</h1>
            {data.headline && <p className="text-gray-600 mt-1.5 text-lg font-medium capitalize">{data.headline}</p>}
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
              {data.membership_id && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary-100 text-primary-800 shadow-sm border border-primary-200">{data.membership_id}</span>
              )}
              {data.package_name && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#f5f3ff] text-primary-700 flex items-center gap-1 shadow-sm border border-primary-100">
                  <Award size={12} /> {data.package_name}
                </span>
              )}
              {data.approved_at && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1 shadow-sm border border-gray-200">
                  <Calendar size={12} /> Member since {new Date(data.approved_at).getFullYear()}
                </span>
              )}
              {data.wing?.name && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 flex items-center gap-1 shadow-sm border border-gray-200">
                  <MapPin size={12} /> {data.wing.name} Wing
                </span>
              )}
            </div>
          </div>
        </div>

        {/* EXTRACT BUSINESS DATA */}
        {(() => {
          const appData = typeof data.application_data === 'string' 
            ? JSON.parse(data.application_data || '{}') 
            : (data.application_data || {})
          
          const orgName = appData.organisation_name || appData.organization_name || appData.company_name
          const orgEmail = appData.organisation_email || appData.email_address || appData.email
          const city = appData.city || appData.city_name
          const pinCode = appData.pin_code || appData.pincode || appData.zip_code
          const industry = appData.industry || appData.business_category

          const hasOrgDetails = orgName || city || pinCode

          return (
            <>
              {(data.email || data.phone || orgEmail) && (
                <div className="mt-8 flex flex-wrap gap-3 justify-center sm:justify-start">
                  {data.email && (
                    <a href={`mailto:${data.email}`} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:border-primary-300 hover:text-primary-700 transition">
                      <Mail size={16} className="text-primary-500" /> {data.email}
                    </a>
                  )}
                  {orgEmail && orgEmail !== data.email && (
                    <a href={`mailto:${orgEmail}`} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:border-primary-300 hover:text-primary-700 transition">
                      <Briefcase size={16} className="text-primary-500" /> {orgEmail}
                    </a>
                  )}
                  {data.phone && (
                    <a href={`tel:${data.phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:border-primary-300 hover:text-primary-700 transition">
                      <Phone size={16} className="text-primary-500" /> {data.phone}
                    </a>
                  )}
                </div>
              )}

              {hasOrgDetails && (
                <section className="mt-10 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <Briefcase size={16} /> Business Information
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {orgName && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">Organization Name</p>
                        <p className="font-bold text-gray-900 mt-0.5">{orgName}</p>
                      </div>
                    )}
                    {industry && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">Industry / Sector</p>
                        <p className="font-medium text-gray-900 mt-0.5">{industry}</p>
                      </div>
                    )}
                    {(city || pinCode) && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase">Location</p>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {city}{city && pinCode ? ', ' : ''}{pinCode}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )
        })()}

        {data.positions?.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
              <Award size={16} /> Current roles
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.positions.map(p => (
                <span key={p.id} className="px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow capitalize tracking-wide"
                  style={{ backgroundColor: theme }}>
                  {p.title}{p.wing_name ? ` · ${p.wing_name}` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {data.blocks?.map(block => (
          <section key={block.type} className="mt-8 card p-6 shadow-sm border-0">
            <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ color: theme }}>{block.title}</h2>
            <RichText content={block.content} />
          </section>
        ))}

        {data.links?.length > 0 && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Links & media</h2>
            {data.links.map(link => (
              <LinkBlock key={link.id} link={link} />
            ))}
          </section>
        )}

        {data.past_positions?.length > 0 && (
          <section className="mt-8 text-sm text-gray-500">
            <h3 className="font-semibold text-gray-700 mb-2">Past positions</h3>
            <ul className="space-y-1">
              {data.past_positions.map(p => (
                <li key={p.id} className="capitalize">{p.title} · {p.wing_name || '—'} ({p.start_date}{p.end_date ? ` – ${p.end_date}` : ''})</li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}
