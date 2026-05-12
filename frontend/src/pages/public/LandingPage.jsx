import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import OTPModal from '../../components/membership/OTPModal'
import { useMember } from '../../contexts/MemberContext'
import { getMemberLandingPath } from '../../utils/memberAccess'
import {
  Shield, Globe, Award, Users, ChevronRight, CheckCircle,
  FileText, CreditCard, UserCheck, Download, Star,
  ArrowRight, Menu, X, Phone, Mail, MapPin, Zap,
  Building2, BookOpen, Image, MessageCircle, Search,
  Facebook, Twitter, Linkedin, Instagram, Youtube,
  PlayCircle, ChevronDown, ExternalLink, Eye, Target,
  TrendingUp, Briefcase, Landmark, Network
} from 'lucide-react'

const http = axios.create({ baseURL: '/api' })

// ── Navigation ──────────────────────────────────────────────────────────────
function Navbar({ onApply }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { token: memberToken, member } = useMember()

  function handleMemberNav() {
    navigate(memberToken ? getMemberLandingPath(member) : '/member/login')
  }

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { label: 'Home',        to: '/' },
    { label: 'About Us',    to: '/about' },
    { label: 'Plans',       to: '/plans' },
    { label: 'News',        to: '/news' },
    { label: 'Gallery',     to: '/gallery' },
    { label: 'Contact',     to: '/contact' },
    { label: 'Verify',      to: '/verify' },
  ]

  return (
    <nav className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg shadow-gray-200/60' : 'bg-white/98 backdrop-blur-md border-b border-gray-100'}`}>
      {/* Top info bar */}
      <div className="hidden lg:block bg-gradient-to-r from-primary-700 to-primary-900 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Mail size={11}/> info@forti.in</span>
            <span className="flex items-center gap-1.5"><Phone size={11}/> Mon – Sat: 10:00 AM – 6:00 PM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary-300">Follow us:</span>
            {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="hover:text-yellow-300 transition"><Icon size={12}/></a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary-200">F</div>
            <div>
              <span className="font-black text-gray-900 text-base tracking-tight leading-none">FORTI</span>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5 font-medium tracking-wide">Membership Portal</p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className="text-sm text-gray-600 hover:text-primary-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-primary-50 relative group">
                {l.label}
                <span className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-primary-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left"/>
              </Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button onClick={() => navigate('/admin/login')}
              className="text-xs text-gray-600 hover:text-primary-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition border border-gray-200">
              Admin Login
            </button>
            <button onClick={() => navigate('/track')}
              className="text-xs text-gray-600 hover:text-gray-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition border border-gray-200">
              Track Status
            </button>
            <button onClick={handleMemberNav}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-300 text-primary-700 hover:bg-primary-50 transition">
              {memberToken ? 'My Dashboard' : 'Member Login'}
            </button>
            <button onClick={onApply}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 transition shadow-md shadow-primary-200">
              Apply Now
            </button>
          </div>

          <button className="lg:hidden p-2 text-gray-600 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-4 space-y-1">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className="block text-sm text-gray-700 hover:text-primary-600 py-2.5 px-3 font-medium rounded-xl hover:bg-primary-50 transition"
                onClick={() => setMenuOpen(false)}>{l.label}</Link>
            ))}
            <div className="pt-3 space-y-2 border-t border-gray-100">
              <button onClick={() => { navigate('/admin/login'); setMenuOpen(false) }}
                className="w-full text-sm text-gray-700 font-medium border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition">Admin Login</button>
              <button onClick={() => { navigate('/track'); setMenuOpen(false) }}
                className="w-full text-sm text-gray-700 font-medium border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition">Track Status</button>
              <button onClick={() => { handleMemberNav(); setMenuOpen(false) }}
                className="w-full text-sm text-primary-700 font-semibold border border-primary-200 rounded-xl py-2.5 hover:bg-primary-50 transition">
                {memberToken ? 'My Dashboard' : 'Member Login'}
              </button>
              <button onClick={onApply}
                className="w-full text-sm font-bold py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white">
                Apply Now
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ── Hero — President Message ────────────────────────────────────────────────
function Hero({ onApply }) {
  const navigate = useNavigate()
  return (
    <section className="relative bg-white overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-50/60 to-transparent"/>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl"/>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-50/60 rounded-full blur-3xl"/>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: President Image */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              {/* Decorative ring */}
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary-200 via-amber-100 to-primary-100 opacity-60"/>
              <div className="relative w-72 h-80 sm:w-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50">
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users size={64} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-sm font-medium opacity-50">President Photo</p>
                  </div>
                </div>
              </div>
              {/* Verified badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-400 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
                ✓ Verified
              </div>
            </div>
          </div>

          {/* Right: Message */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500"/>
              <span className="text-primary-700 text-sm font-semibold">Message From the President</span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
                Mr. Suresh Agarwal
              </h1>
              <p className="text-primary-600 font-semibold mt-1">President, FORTI</p>
            </div>

            {/* Quote card */}
            <div className="relative bg-gradient-to-br from-primary-800 to-primary-900 rounded-2xl p-6 text-white shadow-xl">
              <div className="absolute top-4 left-5 text-6xl text-white/10 font-serif leading-none select-none">"</div>
              <p className="relative text-sm sm:text-base leading-relaxed text-primary-100 italic">
                FORTI is one big happy family that stays united and weathers every storm it faces.
                It is an ever-increasing family with branches in every single district in Rajasthan
                that cares about the smooth functioning of businesses and trade. Together, we address
                issues that businessmen and traders face and bring about a positive change that
                ensures a market that brims with opportunities for generations to come.
              </p>
              <div className="absolute bottom-4 right-5 text-6xl text-white/10 font-serif leading-none select-none rotate-180">"</div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={onApply}
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md shadow-primary-200 transition">
                Apply for Membership <ArrowRight size={16}/>
              </button>
              <button onClick={() => navigate('/member/login')}
                className="border border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition hover:bg-primary-50">
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
      {/* Golden gradient bg matching forti.in */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400"/>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aDJ2NGg0djJoLTR2NGgtMnYtNGgtNHYtMmg0em0wLTMwVjBoMnY0aDR2MmgtNHY0aC0yVjZoLTRWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"/>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {items.map(({ icon: Icon, num, label, color }) => (
            <div key={label}
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 text-center hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border border-white/60">
              <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={20}/>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-gray-900">{num}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium leading-tight">{label}</p>
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
      href: '/about',
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
      href: '/about',
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
      href: '/about',
    },
  ]

  return (
    <section className="py-20 bg-gray-50" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm uppercase tracking-widest">
            <span className="w-6 h-px bg-primary-400"/>
            Organisation Overview
            <span className="w-6 h-px bg-primary-400"/>
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Who We Are &amp; What We Stand For</h2>
        </div>

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
                <button onClick={() => navigate(href)}
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
      desc: 'For professionals, consultants, freelancers, students, and independent practitioners.',
      features: ['Personal membership certificate','Digital ID card with QR code','Access to FORTI events','Networking directory listing','Monthly newsletter','Renewal management'],
      cta: 'Apply as Individual', gradient: 'from-primary-600 to-primary-800' },
    { name: 'Corporate Membership', badge: 'Best Value', badgeColor: 'bg-amber-100 text-amber-700', icon: '🏢',
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
                  <button onClick={onApply}
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
function NewsPreview() {
  const navigate = useNavigate()
  const newsItems = [
    {
      id: 1, cat: 'BLOGS',
      title: 'The Importance of Small and Medium Enterprises in the Indian Economy',
      date: 'March 2026',
      excerpt: 'Small businesses have been the backbone of the Indian economy for centuries, providing employment to millions of people. Learn how FORTI supports SME growth across Rajasthan.',
    },
    {
      id: 2, cat: 'NEWS',
      title: 'FORTI News',
      date: 'April 2026',
      excerpt: 'Stay informed about the latest developments, happenings, and news updates from FORTI — India\'s apex chamber of Trade and Industry in Rajasthan.',
    },
    {
      id: 3, cat: 'ANNOUNCEMENT',
      title: 'FORTI Launches New Online Membership Portal',
      date: 'March 2026',
      excerpt: 'FORTI has launched its new digital membership management portal, enabling faster application processing and instant certificate delivery.',
    },
  ]

  const catColors = {
    BLOGS: 'bg-primary-100 text-primary-700',
    NEWS: 'bg-emerald-100 text-emerald-700',
    ANNOUNCEMENT: 'bg-amber-100 text-amber-700',
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm uppercase tracking-widest">
            <span className="w-6 h-px bg-primary-400"/>
            Stay Informed With Us
            <span className="w-6 h-px bg-primary-400"/>
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">All Our Latest News &amp; Updates</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">Stay informed and be the first to know about the latest developments, happenings, and news updates from our organisation.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {newsItems.map(n => (
            <div key={n.id}
              className="bg-white rounded-2xl border border-gray-200 hover:border-primary-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => navigate('/news')}>
              {/* Image placeholder */}
              <div className="h-44 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen size={40} className="text-primary-300 group-hover:scale-110 transition-transform duration-500"/>
                </div>
                <div className="absolute top-4 left-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${catColors[n.cat] || 'bg-gray-100 text-gray-600'}`}>
                    {n.cat}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-gray-400 font-medium">{n.date}</p>
                <h3 className="font-black text-gray-900 text-sm leading-snug group-hover:text-primary-600 transition-colors">{n.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{n.excerpt}</p>
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition"
                  onClick={e => { e.stopPropagation(); navigate('/news') }}>
                  Read More <ArrowRight size={12}/>
                </button>
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
  const colors = [
    'from-purple-200 to-purple-300','from-blue-200 to-blue-300',
    'from-emerald-200 to-emerald-300','from-amber-200 to-amber-300',
    'from-rose-200 to-rose-300','from-indigo-200 to-indigo-300',
  ]
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
          {colors.map((c, i) => (
            <div key={i}
              className={`h-40 rounded-2xl bg-gradient-to-br ${c} flex items-center justify-center cursor-pointer hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group`}
              onClick={() => navigate('/gallery')}>
              <Image size={28} className="text-white/60 group-hover:scale-110 transition-transform"/>
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <PlayCircle size={32} className="text-white drop-shadow"/>
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
          <input type="text" placeholder="e.g. FORTI-2026-00001" value={input} onChange={e => setInput(e.target.value)}
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

  const galleryColors = [
    'from-purple-400 to-purple-600','from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600','from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600','from-indigo-400 to-indigo-600',
    'from-teal-400 to-teal-600','from-orange-400 to-orange-600',
    'from-cyan-400 to-cyan-600',
  ]

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
                {galleryColors.map((c, i) => (
                  <div key={i}
                    className={`h-14 rounded-lg bg-gradient-to-br ${c} cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-300 flex items-center justify-center`}
                    onClick={() => navigate('/gallery')}>
                    <Image size={14} className="text-white/60"/>
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
  const navigate = useNavigate()

  function handleApply() { setShowOTPModal(true) }

  function handleOTPVerified(data) {
    setShowOTPModal(false)
    navigate('/membership', { state: { otpData: data } })
  }

  return (
    <div className="min-h-screen">
      <Navbar onApply={handleApply} />
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
      <Footer />
      {showOTPModal && (
        <OTPModal onVerified={handleOTPVerified} onClose={() => setShowOTPModal(false)} />
      )}
    </div>
  )
}
