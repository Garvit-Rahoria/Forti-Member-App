import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Calendar, Tag, ArrowRight, Search, ExternalLink } from 'lucide-react'

function SiteHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black">F</div>
          <div><span className="font-bold text-gray-900">FORTI</span><p className="text-xs text-gray-400 leading-none">Membership Portal</p></div>
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm">
          {[['Home','/'],['About','/about'],['Plans','/plans'],['Gallery','/gallery'],['Contact','/contact']].map(([l,to])=>(
            <Link key={to} to={to} className="text-gray-600 hover:text-primary-600 transition font-medium">{l}</Link>
          ))}
        </div>
        <Link to="/member/login" className="btn-outline text-sm hidden md:flex">Member Login</Link>
      </div>
    </header>
  )
}

const NEWS_ITEMS = [
  { id: 1, cat: 'Announcement', date: 'March 2026', title: 'FORTI Launches New Online Membership Portal', excerpt: 'FORTI has launched its new fully integrated digital membership management portal, enabling faster application processing, instant certificate delivery, and seamless member dashboard access.', featured: true },
  { id: 2, cat: 'Event',        date: 'February 2026', title: 'Annual General Meeting 2026 — New Delhi', excerpt: 'FORTI hosted its Annual General Meeting in New Delhi with over 500 members attending in person and virtually. Key decisions about membership expansion and new state chapters were made.' },
  { id: 3, cat: 'Update',       date: 'January 2026', title: 'Expansion to 5 New States Announced', excerpt: 'FORTI announces expansion of its State Chapter network to 5 new states — Rajasthan, Assam, Uttarakhand, Jharkhand, and Chhattisgarh — bringing the total active chapters to 25.' },
  { id: 4, cat: 'Partnership',  date: 'December 2025', title: 'International Partnership with FICCI', excerpt: 'FORTI signed a Memorandum of Understanding with FICCI to collaborate on professional development programs and industry initiatives across India.' },
  { id: 5, cat: 'Award',        date: 'November 2025', title: 'FORTI Wins Best Professional Association Award', excerpt: 'At the National Professional Excellence Awards 2025, FORTI was recognised as the Best Professional Membership Association for its outstanding contribution to professional development.' },
  { id: 6, cat: 'Update',       date: 'October 2025', title: 'Overseas Membership Reaches 5,000 Members', excerpt: 'FORTI\'s international membership has crossed the 5,000 member mark with representation from 50+ countries. The overseas chapter continues to grow rapidly.' },
  { id: 7, cat: 'Event',        date: 'September 2025', title: 'National Summit on Professional Excellence 2025', excerpt: 'FORTI\'s flagship annual summit was held in Mumbai, bringing together 2,000+ professionals for two days of keynotes, workshops, and networking.' },
  { id: 8, cat: 'Announcement', date: 'August 2025', title: 'New Institutional Membership Tier Launched', excerpt: 'FORTI introduces a dedicated Institutional membership tier for universities, colleges, and professional training institutions, with special pricing and benefits.' },
  { id: 9, cat: 'Update',       date: 'July 2025', title: 'Digital ID Card QR Verification Live', excerpt: 'All FORTI membership ID cards now feature QR codes that can be instantly verified at forti.org/verify — confirming the member\'s name, status, and validity in real time.' },
]

const CATS = ['All', 'Announcement', 'Event', 'Update', 'Partnership', 'Award']

const CAT_COLORS = {
  Announcement: 'bg-blue-100 text-blue-700',
  Event:        'bg-purple-100 text-purple-700',
  Update:       'bg-green-100 text-green-700',
  Partnership:  'bg-orange-100 text-orange-700',
  Award:        'bg-yellow-100 text-yellow-700',
}

export default function NewsPage() {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = NEWS_ITEMS.filter(n =>
    (filter === 'All' || n.cat === filter) &&
    (n.title.toLowerCase().includes(search.toLowerCase()) || n.excerpt.toLowerCase().includes(search.toLowerCase()))
  )

  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Stay Updated</span>
          <h1 className="text-4xl font-black mt-2 mb-3">News & Media</h1>
          <p className="text-primary-200">Latest announcements, events, and updates from FORTI</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" placeholder="Search news…" value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"/>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATS.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === c ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={36} className="mx-auto mb-3"/>
            <p>No news items found.</p>
          </div>
        ) : (
          <>
            {/* Featured (first item) */}
            {featured && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8 hover:shadow-md transition">
                <div className="md:flex">
                  <div className="md:w-2/5 bg-gradient-to-br from-primary-100 to-primary-200 h-48 md:h-auto flex items-center justify-center">
                    <BookOpen size={48} className="text-primary-400"/>
                  </div>
                  <div className="md:w-3/5 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLORS[featured.cat] || 'bg-gray-100 text-gray-600'}`}>{featured.cat}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11}/>{featured.date}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Featured</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 mb-2">{featured.title}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">{featured.excerpt}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map(n => (
                <div key={n.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition group">
                  <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <BookOpen size={32} className="text-gray-300"/>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLORS[n.cat] || 'bg-gray-100 text-gray-600'}`}>{n.cat}</span>
                      <span className="text-xs text-gray-400">{n.date}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition">{n.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{n.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm space-y-1">
          <p>&copy; {new Date().getFullYear()} FORTI. All rights reserved. · <Link to="/" className="hover:text-white">Home</Link> · <Link to="/contact" className="hover:text-white">Contact</Link></p>
          <p className="text-xs text-gray-600">Developed by <a href="https://kaitensoftware.com/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Kaiten Software</a></p>
        </div>
      </footer>
    </div>
  )
}
