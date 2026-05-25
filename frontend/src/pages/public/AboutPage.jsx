import { Link } from 'react-router-dom'
import {
  ArrowLeft, Shield, Globe, Award, Users, CheckCircle,
  Target, Heart, Lightbulb, TrendingUp, MapPin, Building2,
  User, Star, ArrowRight
} from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

export default function AboutPage() {
  const milestones = [
    { year: '2010', title: 'FORTI Founded', desc: 'Established in New Delhi with a founding membership of 200 professionals.' },
    { year: '2013', title: 'State Chapters Launched', desc: 'Expanded to 5 major Indian states including Maharashtra, Tamil Nadu, and Karnataka.' },
    { year: '2016', title: 'International Membership', desc: 'Launched Overseas membership category, welcoming professionals from 10 countries.' },
    { year: '2019', title: 'Digital Transformation', desc: 'Introduced digital membership certificates and ID cards with QR verification.' },
    { year: '2022', title: '10,000 Members Milestone', desc: 'Achieved the 10,000 active members milestone across 20+ states and 50+ countries.' },
    { year: '2026', title: 'New Online Portal', desc: 'Launched the fully integrated online membership management portal.' },
  ]

  const leadership = [
    { name: 'Dr. Rajesh Sharma', title: 'National President', initials: 'RS' },
    { name: 'Mrs. Priya Menon',  title: 'Secretary General',  initials: 'PM' },
    { name: 'Mr. Arun Kapoor',   title: 'Treasurer',          initials: 'AK' },
    { name: 'Ms. Sunita Verma',  title: 'Director, Membership', initials: 'SV' },
  ]

  const values = [
    { icon: Target,      title: 'Mission',    desc: 'To connect, empower, and recognise professionals across India and globally through a unified membership platform.' },
    { icon: Heart,       title: 'Vision',     desc: 'A world where every professional has access to a trusted network that supports career growth and professional excellence.' },
    { icon: Lightbulb,   title: 'Innovation', desc: 'Continuously evolving our platform and services to meet the changing needs of our members.' },
    { icon: TrendingUp,  title: 'Growth',     desc: 'Committed to the professional growth of every member through resources, events, and networking opportunities.' },
  ]

  return (
    <div className="page-shell">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Our Story</span>
          <h1 className="text-4xl sm:text-5xl font-black mt-3 mb-4">About FORTI</h1>
          <p className="text-primary-100 text-lg max-w-2xl mx-auto leading-relaxed">
            India's premier professional membership association, empowering professionals since 2010 with recognition, networking, and resources.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900">Our Purpose</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-md transition">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-primary-600"/>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Who We Are</span>
              <h2 className="text-3xl font-black text-gray-900 mt-2 mb-4">Empowering Professionals Since 2010</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                FORTI (Federation of Organised and Recognised Trade Institutions) is a nationally recognised professional membership body dedicated to supporting, connecting, and recognising professionals across all sectors.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Whether you are an individual professional, a corporate entity, or an educational institution — FORTI provides a structured platform for professional growth, networking, and recognition.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                With active chapters in 20+ Indian states and a growing international presence in 50+ countries, FORTI is truly a global professional community rooted in Indian values.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[['10,000+','Active Members'],['20+','State Chapters'],['50+','Countries'],['15+','Years of Excellence']].map(([n, l]) => (
                  <div key={l} className="border border-gray-200 rounded-xl p-4">
                    <p className="text-2xl font-black text-primary-600">{n}</p>
                    <p className="text-sm text-gray-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[
                { icon: Shield,    title: 'Nationally Recognised',   desc: 'FORTI is a government-recognised professional membership organisation with presence across India.' },
                { icon: Globe,     title: 'Global Network',          desc: 'International chapters in 50+ countries, with dedicated overseas membership category.' },
                { icon: Award,     title: 'ISO-Accredited Certificates', desc: 'Our membership certificates are digitally issued and internationally recognised.' },
                { icon: Building2, title: 'Corporate & Institutional', desc: 'Special membership tiers for corporates, universities, and professional institutions.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary-200 transition">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-primary-600"/>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Our Journey</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2">Key Milestones</h2>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-primary-200"/>
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-6 relative pl-16">
                  <div className="absolute left-0 w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">
                    {m.year}
                  </div>
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 flex-1 hover:shadow-sm transition">
                    <h3 className="font-bold text-gray-900 mb-1">{m.title}</h3>
                    <p className="text-gray-500 text-sm">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-widest">Leadership</span>
            <h2 className="text-3xl font-black text-gray-900 mt-2">Our Team</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map(({ name, title, initials }) => (
              <div key={name} className="text-center p-6 rounded-2xl border border-gray-200 hover:shadow-md transition">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3 text-primary-700 font-black text-xl">
                  {initials}
                </div>
                <p className="font-bold text-gray-900">{name}</p>
                <p className="text-sm text-primary-600 mt-1">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-3">Ready to Join FORTI?</h2>
          <p className="text-primary-200 mb-8">Become part of India's most trusted professional network.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/membership" className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-8 py-3.5 rounded-xl inline-flex items-center justify-center gap-2 transition">
              Apply Now <ArrowRight size={18}/>
            </Link>
            <Link to="/plans" className="border border-white/40 text-white hover:bg-white/10 font-semibold px-6 py-3.5 rounded-xl inline-flex items-center justify-center gap-2 transition">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
