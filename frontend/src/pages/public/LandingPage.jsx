import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import OTPModal from '../../components/membership/OTPModal'
import { SITE_LOGO, PRESIDENT_PHOTO, GALLERY_PREVIEW } from '../../data/siteAssets'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import MeshBackground from '../../components/public/MeshBackground'
import SectionHeading from '../../components/public/SectionHeading'
import { useBlogHub } from '../../hooks/usePublicQueries'
import {
  Shield, Globe, Award, Users, ChevronRight, CheckCircle,
  FileText, CreditCard, UserCheck, Download, Star,
  ArrowRight, Menu, X, Phone, Mail, MapPin, Zap,
  Building2, BookOpen, Image, MessageCircle, Search,
  Facebook, Twitter, Linkedin, Instagram, Youtube,
  PlayCircle, ChevronDown, ExternalLink, Eye, Target,
  TrendingUp, Briefcase, Landmark, Network
} from 'lucide-react'


// ── Hero — President Message ────────────────────────────────────────────────
function Hero({ onApply }) {
  const navigate = useNavigate()
  return (
    <section className="relative mesh-bg bg-surface-base overflow-hidden">
      <MeshBackground variant="light" />

      <div className="relative container-page section-padding !pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary-300/40 via-accent-gold/30 to-primary-200/50 blur-sm animate-shimmer" />
              <div className="relative w-72 h-80 sm:w-80 sm:h-96 rounded-2xl overflow-hidden shadow-soft-lg ring-1 ring-white/80">
                <img src={PRESIDENT_PHOTO} alt="Mr. Suresh Agarwal, President of FORTI" className="w-full h-full object-cover object-top" />
              </div>
            </div>
          </div>

          <div className="space-y-6 order-1 lg:order-2 animate-fade-in-up">
            <span className="badge-gold">Message From the President</span>
            <div>
              <h1 className="heading-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.1]">
                Mr. Suresh Agarwal
              </h1>
              <p className="text-primary-600 font-semibold mt-2 text-lg">President, FORTI</p>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-soft-lg">
              <div className="absolute inset-0 bg-gradient-chamber" />
              <div className="relative p-6 sm:p-7 text-white">
                <div className="absolute top-3 left-4 text-7xl text-white/10 font-serif leading-none select-none">"</div>
                <p className="relative text-sm sm:text-base leading-relaxed text-primary-50/95 italic pt-4">
                  FORTI is one big happy family that stays united and weathers every storm it faces.
                  It is an ever-increasing family with branches in every single district in Rajasthan
                  that cares about the smooth functioning of businesses and trade.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={onApply} className="btn-gold btn-lg">
                Apply for Membership <ArrowRight size={18} />
              </button>
              <button type="button" onClick={() => navigate('/member/login')} className="btn-outline btn-lg">
                Member Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Stats Section (golden) ──────────────────────────────────────────────────
function Stats() {
  const items = [
    { icon: Users,     num: '15K',  label: 'Direct Members',         color: 'text-amber-600 bg-amber-50' },
    { icon: Network,   num: '2L',   label: 'Indirect Members',       color: 'text-primary-600 bg-primary-50' },
    { icon: Building2, num: '500',  label: 'Associations',           color: 'text-emerald-600 bg-emerald-50' },
    { icon: Globe,     num: '8',    label: 'International Branches', color: 'text-blue-600 bg-blue-50' },
    { icon: TrendingUp,num: '17',   label: 'National Branches',      color: 'text-violet-600 bg-violet-50' },
    { icon: MapPin,    num: '29',   label: 'Rajasthan State Branches',color: 'text-rose-600 bg-rose-50' },
  ]
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-gold via-amber-400 to-accent-gold-dark" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
      <div className="relative container-page">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {items.map(({ icon: Icon, num, label, color }) => (
            <div key={label} className="glass-card p-4 text-center hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center ${color} group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon size={20}/>
              </div>
              <p className="text-2xl sm:text-3xl font-display font-black text-ink">{num}</p>
              <p className="text-xs text-ink-muted mt-1 font-medium leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── About + Vision + Mission ────────────────────────────────────────────────
function AboutVisionMission() {
  const navigate = useNavigate()
  const cards = [
    {
      icon: Building2,
      tag: 'Who We Are',
      title: 'About FORTI',
      color: 'from-primary-600 to-primary-800',
      iconBg: 'bg-primary-50 text-primary-600',
      borderHover: 'hover:border-primary-200',
      content: 'Federation of Rajasthan Trade and Industry, abbreviated as FORTI, is a registered body with the Registrar of Non-Trading Companies and is the apex chamber of Trade and Industry in Rajasthan. FORTI acts as a bridge between the Government of India at the National Level and the Government of Rajasthan at the state level for its members.',
      cta: 'Know More',
      href: '/about#who-we-are',
    },
    {
      icon: Eye,
      tag: 'Our Vision',
      title: 'Our Vision',
      color: 'from-emerald-500 to-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderHover: 'hover:border-emerald-200',
      content: 'To enhance the efficiency and global competitiveness of the Indian industry and expand business opportunities in domestic and foreign markets through a range of specialised services and international linkages while also ensuring the businesses have the right to business ethics.',
      cta: 'Know More',
      href: '/about#vision',
    },
    {
      icon: Target,
      tag: 'Our Purpose',
      title: 'Our Mission',
      color: 'from-indigo-500 to-indigo-700',
      iconBg: 'bg-indigo-50 text-indigo-600',
      borderHover: 'hover:border-indigo-200',
      content: "FORTI's mission is to promote the culture and business of Rajasthan globally by collaborating with partners, hosting exhibitions, providing employment opportunities to women, creating favorable policies, establishing Jaipur Night Bazaars, organizing award shows, and providing a platform for start-ups.",
      cta: 'Know More',
      href: '/about#purpose',
    },
  ]

  return (
    <section className="section-padding bg-gradient-section" id="about">
      <div className="container-page">
        <SectionHeading eyebrow="Organisation Overview" title="Who We Are & What We Stand For" />

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, tag, title, color, iconBg, borderHover, content, cta, href }) => (
            <div key={title}
              className={`bg-white rounded-2xl border border-gray-200 ${borderHover} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group`}>
              {/* Card header gradient bar */}
              <div className={`h-1.5 bg-gradient-to-r ${color}`}/>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon size={22}/>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{tag}</p>
                    <h3 className="font-black text-gray-900 text-lg leading-tight">{title}</h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{content}</p>
                <button onClick={() => {
                  const [path, hash] = href.split('#')
                  navigate({ pathname: path, hash: hash ? '#' + hash : '' })
                }}
                  className={`inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg bg-gradient-to-r ${color} text-white hover:opacity-90 transition shadow-sm`}>
                  {cta} <ArrowRight size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Benefits ────────────────────────────────────────────────────────────────
function Benefits() {
  const items = [
    { icon: Award,    title: 'Digital Membership Certificate', desc: 'Professionally designed membership certificate as a PDF, ready to download and print.', color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { icon: UserCheck,title: 'Digital ID Card with QR',        desc: 'Personal FORTI membership ID card with a QR code for instant verification anywhere.',      color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { icon: Globe,    title: 'Multi-Country Network',          desc: 'Connect with FORTI members across 50+ countries. Dedicated overseas membership category.',  color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { icon: Shield,   title: 'Verified Professional Status',   desc: 'Build trust with clients and partners through your FORTI verified member status.',         color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { icon: FileText, title: 'Access to Resources',            desc: 'Exclusive access to industry reports, publications, events, and training materials.',       color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { icon: Star,     title: 'Priority Event Access',          desc: 'Get early bird access and discounts to national and international FORTI events.',           color: 'text-orange-600 bg-orange-50 border-orange-100' },
  ]
  return (
    <section id="benefits" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Member Benefits</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Why Join FORTI?</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">Everything you need to grow your professional network and career</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ icon: Icon, title, desc, color }) => (
            <div key={title}
              className={`p-5 rounded-2xl border ${color} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={20}/>
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Plans Preview ───────────────────────────────────────────────────────────
function PlansPreview({ onApply }) {
  const navigate = useNavigate()
  const staticPlans = [
    { name: 'Individual Membership', badge: 'Most Popular', badgeColor: 'bg-primary-100 text-primary-700', icon: '👤',
      type: 'individual',
      desc: 'For professionals, consultants, freelancers, students, and independent practitioners.',
      features: ['Personal membership certificate','Digital ID card with QR code','Access to FORTI events','Networking directory listing','Monthly newsletter','Renewal management'],
      cta: 'Apply as Individual', gradient: 'from-primary-600 to-primary-800' },
    { name: 'Corporate Membership', badge: 'Best Value', badgeColor: 'bg-amber-100 text-amber-700', icon: '🏢',
      type: 'corporate',
      desc: 'For companies, organisations, institutions, and enterprises looking to associate with FORTI.',
      features: ['Multiple member seats','Corporate profile listing','Priority event access','Dedicated account manager','Corporate certificate','Custom payment terms'],
      cta: 'Apply as Corporate', gradient: 'from-amber-500 to-amber-700' },
  ]
  return (
    <section id="membership" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Membership Plans</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Choose Your Membership</h2>
          <p className="text-gray-500 mt-3">All plans include a Digital Certificate, ID Card, and Invoice</p>
        </div>
        <div className="grid md:grid-cols-2 gap-7 max-w-4xl mx-auto">
          {staticPlans.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className={`h-1.5 bg-gradient-to-r ${t.gradient}`}/>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{t.icon}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${t.badgeColor}`}>{t.badge}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{t.name}</h3>
                <p className="text-gray-500 text-sm">{t.desc}</p>
              </div>
              <div className="p-6 space-y-2.5">
                {t.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0"/>{f}
                  </div>
                ))}
                <div className="pt-4">
                  <button onClick={() => onApply(t.type)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${t.gradient} hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md`}>
                    {t.cta} <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/plans')} className="btn-outline inline-flex items-center gap-2">
            View All Plans with Pricing <ArrowRight size={16}/>
          </button>
          <p className="text-sm text-gray-400 mt-3">Exact pricing shown during application based on your region and duration.</p>
        </div>
      </div>
    </section>
  )
}

// ── How It Works ────────────────────────────────────────────────────────────
function HowItWorks({ onApply }) {
  const steps = [
    { step: '01', icon: Shield,     title: 'Verify Identity',  desc: 'Enter your Name, Mobile, and Email. OTP sent to verify — takes 30 seconds.' },
    { step: '02', icon: FileText,   title: 'Fill Application', desc: 'Complete the membership form: Personal Details, Location, Category, Plan, and Payment.' },
    { step: '03', icon: CreditCard, title: 'Submit Payment',   desc: 'Pay via UPI, Bank Transfer, or Cash. Upload payment screenshot and transaction reference.' },
    { step: '04', icon: UserCheck,  title: 'Get Approved',     desc: 'Our team reviews your application (2–3 business days). Email updates at every step.' },
    { step: '05', icon: Download,   title: 'Get Documents',    desc: 'Once approved, download your Certificate, ID Card, and Invoice from your dashboard.' },
  ]
  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}/>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl sm:text-4xl font-black mt-2">How It Works</h2>
          <p className="text-primary-300 mt-3">From application to active membership in 5 simple steps</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {steps.map(({ step, icon: Icon, title, desc }, i) => (
            <div key={step} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+30px)] w-[calc(100%-60px)] h-px bg-white/15"/>
              )}
              <div className="relative z-10 group">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-white/20 transition">
                  <Icon size={22} className="text-amber-300"/>
                </div>
                <span className="text-xs font-mono text-primary-400 font-bold tracking-widest">{step}</span>
                <h4 className="font-bold text-white my-1 text-sm">{title}</h4>
                <p className="text-primary-300 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <button onClick={onApply}
            className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-10 py-4 rounded-xl inline-flex items-center gap-2 transition shadow-xl shadow-black/20">
            Start Application <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── News / Blog Section ─────────────────────────────────────────────────────
const POST_TYPE_LABELS = {
  news: 'News',
  industry_update: 'Industry',
  tax_update: 'Tax Update',
  announcement: 'Announcement',
  event: 'Event',
}

function NewsPreview() {
  const navigate = useNavigate()
  const { data: hub } = useBlogHub('insights')

  const newsItems = (hub?.recent_posts?.length ? hub.recent_posts : hub?.featured_posts || []).slice(0, 3).map(p => ({
    id: p.id,
    cat: POST_TYPE_LABELS[p.post_type] || p.category_name || 'News',
    title: p.title,
    date: p.published_at ? new Date(p.published_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '',
    excerpt: p.excerpt,
    image: p.featured_image_path || '/images/news/01.jpg',
    path: `/content/insights/posts/${p.slug}`,
  }))

  const fallbackItems = [
    { id: 'f1', cat: 'News', title: 'News & Insights', date: '', excerpt: 'Browse chamber news, industry updates, and tax briefings.', image: '/images/news/01.jpg', path: '/content/insights' },
  ]
  const displayItems = newsItems.length ? newsItems : fallbackItems

  const catColors = {
    News: 'bg-primary-100 text-primary-700',
    Industry: 'bg-blue-100 text-blue-700',
    'Tax Update': 'bg-amber-100 text-amber-800',
    Announcement: 'bg-emerald-100 text-emerald-700',
    Event: 'bg-purple-100 text-purple-700',
  }

  return (
    <section className="section-padding bg-surface-base">
      <div className="container-page">
        <SectionHeading
          eyebrow="Stay Informed With Us"
          title="Latest News & Updates"
          subtitle="Chamber announcements, industry intelligence, and regulatory briefings for members and partners."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {displayItems.map(n => (
            <div key={n.id}
              className="card-hover overflow-hidden group cursor-pointer"
              onClick={() => navigate(n.path || '/content/insights')}>
              <div className="h-44 relative overflow-hidden bg-surface-muted">
                <img src={n.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${catColors[n.cat] || 'bg-white/90 text-ink'}`}>
                    {n.cat}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-ink-subtle font-medium">{n.date}</p>
                <h3 className="font-display font-bold text-ink text-sm leading-snug group-hover:text-primary-600 transition-colors">{n.title}</h3>
                <p className="text-ink-muted text-xs leading-relaxed line-clamp-3">{n.excerpt}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 group-hover:gap-2.5 transition-all">
                  Read More <ArrowRight size={12}/>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Gallery Preview ─────────────────────────────────────────────────────────
function GalleryPreview() {
  const navigate = useNavigate()
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Gallery</span>
            <h2 className="text-3xl font-black text-gray-900 mt-1">Events &amp; Moments</h2>
          </div>
          <button onClick={() => navigate('/gallery')}
            className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline">
            View Gallery <ArrowRight size={14}/>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GALLERY_PREVIEW.map((item, i) => (
            <div key={item.id}
              className={`h-40 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group ${i === 0 ? 'md:col-span-2 md:row-span-2 md:h-full min-h-[168px]' : ''}`}
              onClick={() => navigate('/gallery')}>
              <img src={item.src} alt={item.title} className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Eye size={32} className="text-white drop-shadow"/>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <button onClick={() => navigate('/gallery')}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 border border-primary-200 px-5 py-2.5 rounded-xl hover:bg-primary-50 transition">
            View More <ArrowRight size={14}/>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Verify Section ──────────────────────────────────────────────────────────
function VerifySection() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  return (
    <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-900 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-primary-200"/>
        </div>
        <h2 className="text-3xl font-black mb-3">Verify Membership</h2>
        <p className="text-primary-200 mb-8">Enter a FORTI Membership ID to verify its authenticity and current status.</p>
        <form onSubmit={e => { e.preventDefault(); if (input.trim()) navigate(`/verify?id=${encodeURIComponent(input.trim())}`) }}
          className="flex gap-3 max-w-md mx-auto">
          <input type="text" placeholder="e.g. FR-123456" value={input} onChange={e => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"/>
          <button type="submit"
            className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-50 transition shrink-0 shadow-lg">
            <Search size={16}/> Verify
          </button>
        </form>
        <p className="text-primary-300 text-xs mt-4">
          <Link to="/verify" className="underline hover:text-white transition">Go to full verification page</Link>
        </p>
      </div>
    </section>
  )
}

// ── Contact Preview ─────────────────────────────────────────────────────────
function ContactPreview() {
  const navigate = useNavigate()
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Get In Touch</span>
          <h2 className="text-3xl font-black text-gray-900 mt-2 mb-3">Need Help?</h2>
          <p className="text-gray-500">Our membership team is ready to assist you with any questions.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {[
            { icon: Mail,   label: 'Email Us',     value: 'info@forti.in',                href: 'mailto:info@forti.in' },
            { icon: Phone,  label: 'Call Us',      value: '+91 9214007205',               href: 'tel:+919214007205' },
            { icon: MapPin, label: 'Headquarters', value: 'A-7 Second Floor, Ganpati Enclave, Civil Lines, Jaipur – 302006', href: '/contact' },
          ].map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href}
              className="flex flex-col items-center p-6 rounded-2xl bg-white border border-gray-200 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group text-center">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition group-hover:scale-110">
                <Icon size={20} className="text-primary-600"/>
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
              <p className="font-semibold text-gray-900 text-sm">{value}</p>
            </a>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/contact')}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold px-7 py-3 rounded-xl inline-flex items-center gap-2 shadow-md hover:opacity-90 transition">
            Send Us a Message <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  return (
    <footer className="relative overflow-hidden">
      {/* Dark bg with subtle industrial overlay pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"/>
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}/>

      <div className="relative pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

            {/* About */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-base shadow-md">F</div>
                <span className="font-black text-white text-lg">FORTI</span>
              </div>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">ABOUT US</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                FORTI is an apex chamber of trade and industry that acts as a bridge between the Government of India at National Level and Government of Rajasthan at State level for policy advocacy with the governments and dissemination of information amongst its members.
              </p>
              <div className="flex gap-2">
                {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <a key={i} href="#"
                    className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:bg-primary-600 hover:text-white transition-all duration-300">
                    <Icon size={15}/>
                  </a>
                ))}
              </div>
            </div>

            {/* All Contacts */}
            <div>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">ALL CONTACTS</p>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-primary-400 mt-0.5 shrink-0"/>
                  <span>A-7 Second Floor, Ganpati Enclave, Civil Lines, Jaipur – 302006</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-primary-400 shrink-0"/>
                  <a href="tel:+919214007205" className="hover:text-white transition">+91 9214007205</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={14} className="text-primary-400 shrink-0"/>
                  <a href="mailto:info@forti.in" className="hover:text-white transition">info@forti.in</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <MessageCircle size={14} className="text-primary-400 shrink-0"/>
                  <span>Mon – Sat: 10:00 A.M – 6:00 P.M</span>
                </div>
              </div>
            </div>

            {/* Subscribe */}
            <div>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">SUBSCRIBE</p>
              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Subscribe to receive our monthly newsletter to stay updated on our announcements, events, projects, and more.
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Insert Your Email"
                  className="w-full bg-white border-0 text-gray-900 text-sm px-4 py-2.5 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => { if (email.trim()) { setEmail(''); } }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 transition shadow-md">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Gallery */}
            <div>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4">GALLERY</p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {GALLERY_PREVIEW.slice(0, 9).map(item => (
                  <div key={item.id}
                    className="h-14 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-300"
                    onClick={() => navigate('/gallery')}>
                    <img src={item.src} alt="" className="w-full h-full object-cover"/>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/gallery')}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-xs hover:opacity-90 transition">
                View More
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} All rights reserved by FORTI &nbsp;|&nbsp; Developed by{' '}
              <a href="https://kaitensoftware.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors font-medium">
                Kaiten Software
              </a>
            </p>
            <div className="flex gap-4 text-xs text-gray-500">
              <a href="#" className="hover:text-gray-300 transition">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Landing Page (main) ─────────────────────────────────────────────────────
export default function LandingPage() {
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [pendingPlanType, setPendingPlanType] = useState(null)
  const navigate = useNavigate()

  function handleApply(type = null) {
    if (typeof type === 'string') {
      setPendingPlanType(type)
    } else {
      setPendingPlanType(null)
    }
    setShowOTPModal(true)
  }

  function handleOTPVerified(data) {
    setShowOTPModal(false)
    navigate('/membership', { state: { otpData: data, prefill: { membership_type: pendingPlanType } } })
  }

  return (
    <div className="page-shell">
      <PublicHeader variant="landing" onApply={handleApply} />
      <Hero onApply={handleApply} />
      <Stats />
      <AboutVisionMission />
      <Benefits />
      <PlansPreview onApply={handleApply} />
      <HowItWorks onApply={handleApply} />
      <NewsPreview />
      <GalleryPreview />
      <VerifySection />
      <ContactPreview />
      <PublicFooter />
      {showOTPModal && (
        <OTPModal onVerified={handleOTPVerified} onClose={() => setShowOTPModal(false)} />
      )}
    </div>
  )
}
