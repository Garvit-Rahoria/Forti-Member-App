import {
  MapPin, Globe2, Package, Trophy, Handshake, Tags,
  Pencil, Image as ImageIcon, ExternalLink, Percent, CheckCircle,
} from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'

function Section({ icon: Icon, title, children, empty }) {
  if (empty) return null
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  )
}

export default function BusinessProfileView({ profile, onEdit }) {
  if (!profile) return null

  const logo = profile.logo_path || profile.organisation_logo
  const name = profile.organisation_name || 'Business Profile'
  const cat = profile.primary_category?.name
  const sub = profile.sub_category?.name
  const keywords = (profile.keywords || []).map(k => k.keyword || k).filter(Boolean)
  const products = profile.products || []
  const links = (profile.social_links || []).filter(l => l.url)
  const gallery = profile.gallery || []
  const achievements = profile.achievements || []
  const offers = (profile.offers || []).filter(o => o.status !== 'inactive')
  const lookingFor = profile.looking_for || []
  const offering = profile.offering || []
  const locationBits = [profile.city, profile.state, profile.country].filter(Boolean)
  const showAddress = profile.show_address_publicly && profile.address

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="h-36 sm:h-44 bg-gradient-to-r from-primary-600 to-purple-600 relative">
          {profile.cover_image && (
            <img src={assetUrl(profile.cover_image)} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="text-xs font-semibold bg-green-500 text-white px-2.5 py-1 rounded-full shadow">
              Published
            </span>
            <button type="button" onClick={onEdit}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-gray-800 px-3 py-1.5 rounded-full shadow hover:bg-gray-50">
              <Pencil size={12} /> Edit Business Profile
            </button>
          </div>
        </div>
        <div className="px-5 pb-5 -mt-10 relative">
          <div className="flex items-end gap-4">
            {logo ? (
              <img src={assetUrl(logo)} alt=""
                className="w-20 h-20 rounded-2xl border-4 border-white object-cover bg-white shadow" />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-white bg-primary-100 flex items-center justify-center font-black text-primary-700 text-xl shadow">
                {(name || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="pb-1 min-w-0 flex-1">
              <h1 className="text-2xl font-black text-gray-900 truncate">{name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[cat, sub, ...locationBits].filter(Boolean).join(' · ')}
              </p>
              {profile.membership_id && (
                <p className="text-xs text-primary-600 font-semibold mt-1">Member ID: {profile.membership_id}</p>
              )}
            </div>
          </div>
          {profile.description && (
            <p className="text-sm text-gray-700 mt-4 whitespace-pre-wrap leading-relaxed">{profile.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-600">
            {profile.established_year && <span className="bg-gray-50 border px-2.5 py-1 rounded-full">Est. {profile.established_year}</span>}
            {profile.employee_count && <span className="bg-gray-50 border px-2.5 py-1 rounded-full">{profile.employee_count} employees</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer"
                className="bg-primary-50 border border-primary-100 text-primary-700 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <Globe2 size={12} /> Website <ExternalLink size={10} />
              </a>
            )}
            {profile.business_email && <span className="bg-gray-50 border px-2.5 py-1 rounded-full">{profile.business_email}</span>}
            {profile.business_phone && <span className="bg-gray-50 border px-2.5 py-1 rounded-full">{profile.business_phone}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <Section icon={Tags} title="Category & Keywords" empty={!cat && !keywords.length}>
          {(cat || sub) && (
            <p className="text-sm text-gray-700">{[cat, sub].filter(Boolean).join(' → ')}</p>
          )}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map(k => (
                <span key={k} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">{k}</span>
              ))}
            </div>
          )}
        </Section>

        <Section icon={Package} title="Products & Services" empty={!products.length}>
          <ul className="space-y-2">
            {products.map(p => (
              <li key={p.id || p.name} className="text-sm border border-gray-100 rounded-xl px-3 py-2">
                <span className="font-semibold text-gray-900">{p.name}</span>
                <span className="text-xs text-gray-400 ml-2 capitalize">({p.item_type})</span>
                {p.description && <p className="text-gray-600 mt-1">{p.description}</p>}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Globe2} title="Online Presence" empty={!links.length && !profile.website}>
          <ul className="space-y-1.5">
            {links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noreferrer"
                  className="text-sm text-primary-700 hover:underline inline-flex items-center gap-1">
                  <span className="font-semibold text-gray-800">{l.platform}:</span> {l.url}
                  <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={ImageIcon} title="Gallery" empty={!gallery.length}>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {gallery.map(g => (
              <div key={g.id} className="aspect-square rounded-lg overflow-hidden border">
                <img src={assetUrl(g.image_path)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </Section>

        <Section icon={Trophy} title="Achievements" empty={!achievements.length}>
          <ul className="space-y-3">
            {achievements.map(a => (
              <li key={a.id || a.title} className="flex gap-3 text-sm">
                {a.image_path ? (
                  <img src={assetUrl(a.image_path)} alt="" className="w-14 h-14 rounded-lg object-cover border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Trophy size={18} />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{a.title}{a.year ? ` (${a.year})` : ''}</p>
                  {a.issued_by && <p className="text-xs text-gray-500">Issued by {a.issued_by}</p>}
                  {a.description && <p className="text-gray-600 mt-1">{a.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Handshake} title="Networking" empty={!lookingFor.length && !offering.length && !offers.length}>
          {lookingFor.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {lookingFor.map(v => <span key={v} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{v}</span>)}
              </div>
            </div>
          )}
          {offering.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Offering to members</p>
              <div className="flex flex-wrap gap-1.5">
                {offering.map(v => <span key={v} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{v}</span>)}
              </div>
            </div>
          )}
          {offers.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-gray-500 inline-flex items-center gap-1">
                <Percent size={12} /> FORTI Member Offers
              </p>
              {offers.map(o => (
                <div key={o.id || o.title} className="border border-primary-100 bg-primary-50/50 rounded-xl px-3 py-2 text-sm">
                  <p className="font-semibold text-gray-900">{o.title}</p>
                  {o.discount_value && <p className="text-primary-700 text-xs font-medium mt-0.5">{o.discount_value}</p>}
                  {o.description && <p className="text-gray-600 mt-1">{o.description}</p>}
                  {o.valid_until && (
                    <p className="text-xs text-gray-400 mt-1">Valid until {String(o.valid_until).slice(0, 10)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon={MapPin} title="Location" empty={!locationBits.length && !showAddress}>
          {showAddress && <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.address}</p>}
          <p className="text-sm text-gray-600">
            {[profile.city, profile.state, profile.country, profile.pin_code].filter(Boolean).join(', ')}
          </p>
        </Section>

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-green-800">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Your business profile is live</p>
            <p className="text-xs mt-0.5 text-green-700">
              Other FORTI members can discover your business. Use Edit Business Profile anytime to update details.
            </p>
          </div>
        </div>

        <button type="button" onClick={onEdit} className="btn-primary w-full sm:w-auto self-start inline-flex items-center justify-center gap-2">
          <Pencil size={16} /> Edit Business Profile
        </button>
      </div>
    </div>
  )
}
