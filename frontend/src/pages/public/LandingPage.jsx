import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import OTPModal from '../../components/membership/OTPModal'
import { useMember } from '../../contexts/MemberContext'
import {
  Shield, Globe, Award, Users, ChevronRight, CheckCircle,
  FileText, CreditCard, UserCheck, Download, Star,
  ArrowRight, Menu, X, Phone, Mail, MapPin, Zap,
  Building2, BookOpen, Image, MessageCircle, Search,
  Facebook, Twitter, Linkedin, Instagram, Youtube,
  PlayCircle, ChevronDown, ExternalLink
} from 'lucide-react'

const http = axios.create({ baseURL: '/api' })

// ── Navigation ─────────────────────────────────────────────────────────────
function Navbar({ onApply }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { token: memberToken } = useMember()

  function handleMemberNav() {
    navigate(memberToken ? '/member/dashboard' : '/member/login')
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
    <nav className={`sticky top-0 z-40 transition-all duration-200 ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-md border-b border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-lg shadow-md">F</div>
            <div>
              <span className="font-black text-gray-900 text-lg tracking-tight">FORTI</span>
              <p className="text-xs text-gray-400 leading-none -mt-0.5">Membership Portal</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="text-sm text-gray-600 hover:text-primary-600 transition font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50">{l.label}</Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <button onClick={() => navigate('/admin/login')} className="text-sm text-gray-600 hover:text-primary-600 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition border border-gray-200">Admin Login</button>
            <button onClick={() => navigate('/track')} className="text-sm text-gray-600 hover:text-primary-600 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition border border-gray-200">Track Status</button>
            <button onClick={handleMemberNav} className="btn-outline text-sm">{memberToken ? 'My Dashboard' : 'Member Login'}</button>
            <button onClick={onApply} className="btn-primary text-sm">Apply Now</button>
          </div>

          <button className="lg:hidden p-2 text-gray-600" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-4 space-y-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="block text-sm text-gray-700 hover:text-primary-600 py-2 px-2 font-medium rounded-lg hover:bg-primary-50" onClick={() => setMenuOpen(false)}>{l.label}</Link>
            ))}
            <div className="pt-3 space-y-2 border-t border-gray-100">
              <button onClick={() => { navigate('/admin/login'); setMenuOpen(false) }} className="w-full text-sm text-gray-700 font-medium border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition">Admin Login</button>
              <button onClick={() => { navigate('/track'); setMenuOpen(false) }} className="w-full text-sm text-gray-700 font-medium border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition">Track Status</button>
              <button onClick={() => { handleMemberNav(); setMenuOpen(false) }} className="btn-outline w-full text-sm">{memberToken ? 'My Dashboard' : 'Member Login'}</button>
              <button onClick={onApply} className="btn-primary w-full text-sm">Apply Now</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ onApply }) {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/3 -right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"/>
        <div className="absolute -bottom-1/4 -left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/10 rounded-full blur-3xl"/>
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm">
              <Zap size={14} className="text-yellow-300"/>
              <span>India's Premier Professional Network</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight">
              Join the <span className="text-yellow-300">FORTI</span><br/>Professional Membership
            </h1>
            <p className="text-primary-100 text-lg leading-relaxed">
              Connect with thousands of professionals across India and the globe.
              Build your network, access exclusive resources, and grow your career with FORTI membership.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={onApply} className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-8 py-3.5 rounded-xl flex items-center gap-2 transition shadow-lg hover:shadow-xl">
                Apply for Membership <ArrowRight size={18}/>
              </button>
              <button onClick={() => navigate('/member/login')} className="border border-white/40 text-white hover:bg-white/10 font-semibold px-6 py-3.5 rounded-xl flex items-center gap-2 transition">
                Member Login
              </button>
            </div>
            <div className="flex flex-wrap gap-6 pt-2">
              {[['10,000+', 'Active Members'], ['20+', 'States Covered'], ['50+', 'Countries'], ['15+', 'Years']].map(([num, label]) => (
                <div key={label}>
                  <p className="text-2xl font-black text-yellow-300">{num}</p>
                  <p className="text-xs text-primary-200">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="bg-gradient-to-br from-white/20 to-white/5 border border-white/30 rounded-2xl p-6 w-80 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">F</div>
                    <span className="font-bold text-sm">FORTI</span>
                  </div>
                  <span className="text-xs bg-green-400/30 text-green-200 px-2 py-0.5 rounded-full">Active Member</span>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                  <Users size={28} className="text-white/70"/>
                </div>
                <p className="font-bold text-lg mb-0.5">Member Name</p>
                <p className="text-primary-200 text-sm mb-4">FORTI-2026-XXXXX</p>
                <div className="border-t border-white/20 pt-3 flex justify-between text-xs text-primary-200">
                  <span>Individual Member</span>
                  <span>Valid: Lifetime</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-lg">✓ Verified</div>
              <div className="absolute -bottom-4 -left-4 bg-white text-primary-700 rounded-xl px-3 py-2 text-xs font-bold shadow-lg flex items-center gap-1.5">
                <Award size={14}/> Lifetime Access
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"/>
    </section>
  )
}

// ── Live Stats (from DB) ─────────────────────────────────────────────────────
function Stats() {
  const items = [
    { icon: Users,     num: '10,000+', label: 'Active Members' },
    { icon: Globe,     num: '50+',  label: 'Countries' },
    { icon: MapPin,    num: '20+',  label: 'Indian States' },
    { icon: Building2, num: '500+', label: 'Organisations' },
    { icon: Award,     num: '15+',  label: 'Years Active' },
  ]
  return (
    <section className="py-14 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
          {items.map(({ icon: Icon, num, label }) => (
            <div key={label} className="space-y-1">
              <Icon size={22} className="text-primary-400 mx-auto mb-2"/>
              <p className="text-3xl font-black text-primary-700">{num}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── About Snippet ─────────────────────────────────────────────────────────
function AboutSnippet() {
  const navigate = useNavigate()
  return (
    <section className="py-20 bg-gray-50" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">About FORTI</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Empowering Professionals Since 2010</h2>
            <p className="text-gray-600 leading-relaxed">
              FORTI (Federation of Organised and Recognised Trade Institutions) is India's premier professional membership association, dedicated to connecting, empowering, and recognising professionals across all sectors and regions.
            </p>
            <p className="text-gray-600 leading-relaxed">
              With a presence in 20+ Indian states and 50+ countries, FORTI brings together individuals, corporations, and institutions under one unified platform, fostering growth, collaboration, and professional excellence.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[['National Reach', 'Pan-India network across all states'],['Global Presence','Members in 50+ countries worldwide'],['Professional Recognition','Globally accepted certification'],['Community Support','24/7 member support & resources']].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0"/>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/about')} className="btn-outline flex items-center gap-2 mt-2">
              Learn More About FORTI <ArrowRight size={16}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['','Founded in 2010','With a mission to empower professionals globally'],
              ['','10,000+ Members','Active professionals across all sectors'],
              ['','ISO Accredited','Internationally recognised membership certificates'],
              ['','Global Network','Chapters in 50+ countries worldwide']].map(([emoji, title, desc]) => (
              <div key={title} className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-primary-200 hover:shadow-sm transition">
                <div className="text-3xl mb-3">{emoji}</div>
                <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Benefits ───────────────────────────────────────────────────────────────
function Benefits() {
  const items = [
    { icon: Award, title: 'Digital Membership Certificate', desc: 'Professionally designed membership certificate as a PDF, ready to download and print.', color: 'text-yellow-600 bg-yellow-50' },
    { icon: UserCheck, title: 'Digital ID Card with QR', desc: 'Personal FORTI membership ID card with a QR code for instant verification anywhere.', color: 'text-blue-600 bg-blue-50' },
    { icon: Globe, title: 'Multi-Country Network', desc: 'Connect with FORTI members across 50+ countries. Dedicated overseas membership category.', color: 'text-green-600 bg-green-50' },
    { icon: Shield, title: 'Verified Professional Status', desc: 'Build trust with clients and partners through your FORTI verified member status.', color: 'text-purple-600 bg-purple-50' },
    { icon: FileText, title: 'Access to Resources', desc: 'Exclusive access to industry reports, publications, events, and training materials.', color: 'text-red-600 bg-red-50' },
    { icon: Star, title: 'Priority Event Access', desc: 'Get early bird access and discounts to national and international FORTI events.', color: 'text-orange-600 bg-orange-50' },
  ]
  return (
    <section id="benefits" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Member Benefits</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Why Join FORTI?</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">Everything you need to grow your professional network and career</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}><Icon size={22}/></div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Dynamic Plans Preview ─────────────────────────────────────────────────
function PlansPreview({ onApply }) {
  const navigate = useNavigate()

  const staticPlans = [
    { name: 'Individual Membership', badge: 'Most Popular', badgeColor: 'bg-primary-100 text-primary-700', icon: '👤',
      desc: 'For professionals, consultants, freelancers, students, and independent practitioners.',
      features: ['Personal membership certificate','Digital ID card with QR code','Access to FORTI events','Networking directory listing','Monthly newsletter','Renewal management'],
      cta: 'Apply as Individual' },
    { name: 'Corporate Membership', badge: 'Best Value', badgeColor: 'bg-green-100 text-green-700', icon: '',
      desc: 'For companies, organisations, institutions, and enterprises looking to associate with FORTI.',
      features: ['Multiple member seats','Corporate profile listing','Priority event access','Dedicated account manager','Corporate certificate','Custom payment terms'],
      cta: 'Apply as Corporate' },
  ]

  return (
    <section id="membership" className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Membership Plans</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">Choose Your Membership</h2>
          <p className="text-gray-500 mt-3">All plans include a Digital Certificate, ID Card, and Invoice</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {staticPlans.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{t.icon}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.badgeColor}`}>{t.badge}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">{t.name}</h3>
                <p className="text-gray-500 text-sm">{t.desc}</p>
              </div>
              <div className="p-6 space-y-3">
                {t.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500 shrink-0"/>{f}
                  </div>
                ))}
                <div className="pt-4">
                  <button onClick={onApply} className="btn-primary w-full flex items-center justify-center gap-2">
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
          <p className="text-center text-sm text-gray-400 mt-3">Exact pricing shown during application based on your region and duration.</p>
        </div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────
function HowItWorks({ onApply }) {
  const steps = [
    { step: '01', icon: Shield,    title: 'Verify Identity',  desc: 'Enter your Name, Mobile, and Email. OTP sent to verify — takes 30 seconds.' },
    { step: '02', icon: FileText,  title: 'Fill Application', desc: 'Complete the membership form: Personal Details, Location, Category, Plan, and Payment.' },
    { step: '03', icon: CreditCard,title: 'Submit Payment',   desc: 'Pay via UPI, Bank Transfer, or Cash. Upload payment screenshot and transaction reference.' },
    { step: '04', icon: UserCheck, title: 'Get Approved',     desc: 'Our team reviews your application (2–3 business days). Email updates at every step.' },
    { step: '05', icon: Download,  title: 'Get Documents',    desc: 'Once approved, download your Certificate, ID Card, and Invoice from your dashboard.' },
  ]
  return (
    <section id="how-it-works" className="py-20 bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl sm:text-4xl font-black mt-2">How It Works</h2>
          <p className="text-primary-300 mt-3">From application to active membership in 5 simple steps</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map(({ step, icon: Icon, title, desc }, i) => (
            <div key={step} className="relative text-center lg:text-left">
              {i < steps.length - 1 && <div className="hidden lg:block absolute top-5 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-white/10 z-0"/>}
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto lg:mx-0 mb-3">
                  <Icon size={22} className="text-primary-300"/>
                </div>
                <span className="text-xs font-mono text-primary-400 font-bold">{step}</span>
                <h4 className="font-bold text-white my-1">{title}</h4>
                <p className="text-primary-300 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={onApply} className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-10 py-4 rounded-xl flex items-center gap-2 mx-auto transition shadow-lg">
            Start Application <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── News Preview ───────────────────────────────────────────────────────────
function NewsPreview() {
  const navigate = useNavigate()
  const newsItems = [
    { id: 1, cat: 'Announcement', title: 'FORTI Launches New Online Membership Portal', date: 'March 2026', excerpt: 'FORTI has launched its new digital membership management portal, enabling faster application processing and instant certificate delivery.' },
    { id: 2, cat: 'Event',        title: 'Annual General Meeting 2026 — New Delhi', date: 'February 2026', excerpt: 'FORTI hosted its Annual General Meeting in New Delhi, with over 500 members attending in person and virtually across the globe.' },
    { id: 3, cat: 'Update',       title: 'Expansion to 5 New States Announced', date: 'January 2026', excerpt: 'FORTI announces expansion of its State Chapter network to 5 new states, bringing the total active state chapters to 25.' },
  ]
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Latest Updates</span>
            <h2 className="text-3xl font-black text-gray-900 mt-1">News & Media</h2>
          </div>
          <button onClick={() => navigate('/news')} className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline">View All <ArrowRight size={14}/></button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {newsItems.map(n => (
            <div key={n.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition group cursor-pointer" onClick={() => navigate('/news')}>
              <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <BookOpen size={36} className="text-primary-400"/>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{n.cat}</span>
                  <span className="text-xs text-gray-400">{n.date}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition">{n.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{n.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Gallery Preview ────────────────────────────────────────────────────────
function GalleryPreview() {
  const navigate = useNavigate()
  const colors = ['from-purple-200 to-purple-300','from-blue-200 to-blue-300','from-green-200 to-green-300','from-yellow-200 to-yellow-300','from-pink-200 to-pink-300','from-orange-200 to-orange-300']
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Gallery</span>
            <h2 className="text-3xl font-black text-gray-900 mt-1">Events & Moments</h2>
          </div>
          <button onClick={() => navigate('/gallery')} className="text-primary-600 text-sm font-semibold flex items-center gap-1 hover:underline">View Gallery <ArrowRight size={14}/></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((c, i) => (
            <div key={i} className={`h-40 rounded-2xl bg-gradient-to-br ${c} flex items-center justify-center cursor-pointer hover:opacity-90 transition hover:scale-[1.02] relative overflow-hidden group`}
              onClick={() => navigate('/gallery')}>
              <Image size={28} className="text-white/60"/>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <PlayCircle size={32} className="text-white"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Verify Section ─────────────────────────────────────────────────────────
function VerifySection() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  return (
    <section className="py-20 bg-gradient-to-r from-primary-700 to-primary-900 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <Shield size={40} className="text-primary-300 mx-auto mb-4"/>
        <h2 className="text-3xl font-black mb-3">Verify Membership</h2>
        <p className="text-primary-200 mb-8">Enter a FORTI Membership ID to verify its authenticity and current status.</p>
        <form onSubmit={e => { e.preventDefault(); if (input.trim()) navigate(`/verify?id=${encodeURIComponent(input.trim())}`) }}
          className="flex gap-3 max-w-md mx-auto">
          <input type="text" placeholder="e.g. FORTI-2026-00001" value={input} onChange={e => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"/>
          <button type="submit" className="bg-white text-primary-700 font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-50 transition shrink-0">
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

// ── Contact Preview ────────────────────────────────────────────────────────
function ContactPreview() {
  const navigate = useNavigate()
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Get In Touch</span>
          <h2 className="text-3xl font-black text-gray-900 mt-2 mb-4">Need Help?</h2>
          <p className="text-gray-500">Our membership team is ready to assist you with any questions.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: Mail,  label: 'Email Us',    value: 'membership@forti.org', href: 'mailto:membership@forti.org' },
            { icon: Phone, label: 'Call Us',     value: '+91 98765 43210',      href: 'tel:+919876543210' },
            { icon: MapPin,label: 'Headquarters',value: 'New Delhi, India',     href: '/contact' },
          ].map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href}
              className="flex flex-col items-center p-6 rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-3 group-hover:bg-primary-100 transition">
                <Icon size={22} className="text-primary-600"/>
              </div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
              <p className="font-semibold text-gray-900 mt-1 text-sm text-center">{value}</p>
            </a>
          ))}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/contact')} className="btn-primary inline-flex items-center gap-2">
            Send Us a Message <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  const navigate = useNavigate()
  return (
    <footer className="bg-gray-900 text-gray-400 pt-14 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black">F</div>
              <span className="font-black text-white text-xl">FORTI</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">India's premier professional membership organisation, connecting professionals across the globe since 2010.</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Linkedin, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition">
                  <Icon size={15}/>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-sm">Organisation</p>
            <div className="space-y-2 text-sm">
              {[['About Us', '/about'],['News & Media', '/news'],['Gallery', '/gallery'],['Contact Us', '/contact']].map(([l, to]) => (
                <Link key={to} to={to} className="block hover:text-white transition">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-sm">Membership</p>
            <div className="space-y-2 text-sm">
              {[['Membership Plans', '/plans'],['Apply Now', '/membership'],['Verify Membership', '/verify'],['Renew Membership', '/member/dashboard']].map(([l, to]) => (
                <Link key={to} to={to} className="block hover:text-white transition">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3 text-sm">Member Portal</p>
            <div className="space-y-2 text-sm">
              {[['Member Login', '/member/login'],['Member Dashboard', '/member/dashboard'],['Admin Login', '/login']].map(([l, to]) => (
                <Link key={to} to={to} className="block hover:text-white transition">{l}</Link>
              ))}
            </div>
            <p className="font-semibold text-white mt-5 mb-2 text-sm">Contact</p>
            <p className="text-sm">membership@forti.org</p>
            <p className="text-sm">+91 98765 43210</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>&copy; {new Date().getFullYear()} FORTI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Landing Page (main) ────────────────────────────────────────────────────
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
      <AboutSnippet />
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

