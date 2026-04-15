import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Image, PlayCircle, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

function SiteHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black">F</div>
          <div><span className="font-bold text-gray-900">FORTI</span><p className="text-xs text-gray-400 leading-none">Membership Portal</p></div>
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm">
          {[['Home','/'],['About','/about'],['Plans','/plans'],['News','/news'],['Contact','/contact']].map(([l,to])=>(
            <Link key={to} to={to} className="text-gray-600 hover:text-primary-600 transition font-medium">{l}</Link>
          ))}
        </div>
        <Link to="/member/login" className="btn-outline text-sm hidden md:flex">Member Login</Link>
      </div>
    </header>
  )
}

// Gallery data — gradient placeholders until real photos are uploaded
const GALLERY_ITEMS = [
  { id: 1, cat: 'AGM 2026',       title: 'Annual General Meeting 2026', subtitle: 'New Delhi', gradient: 'from-purple-200 to-purple-400', span: 'col-span-2 row-span-2' },
  { id: 2, cat: 'Awards',         title: 'National Excellence Awards', subtitle: 'Mumbai 2025', gradient: 'from-yellow-200 to-orange-300', span: '' },
  { id: 3, cat: 'Events',         title: 'National Summit 2025', subtitle: 'Mumbai', gradient: 'from-blue-200 to-blue-400', span: '' },
  { id: 4, cat: 'Certification',  title: 'Certificate Distribution', subtitle: 'Chennai Chapter', gradient: 'from-green-200 to-green-400', span: '' },
  { id: 5, cat: 'Events',         title: 'State Chapter Launch', subtitle: 'Jaipur 2025', gradient: 'from-pink-200 to-pink-400', span: '' },
  { id: 6, cat: 'Networking',     title: 'Member Networking Night', subtitle: 'Bangalore', gradient: 'from-indigo-200 to-indigo-400', span: '' },
  { id: 7, cat: 'Events',         title: 'International Members Meet', subtitle: 'Dubai 2025', gradient: 'from-cyan-200 to-cyan-400', span: '' },
  { id: 8, cat: 'AGM 2026',       title: 'AGM Panel Discussion', subtitle: 'New Delhi', gradient: 'from-rose-200 to-rose-400', span: '' },
  { id: 9, cat: 'Awards',         title: 'Best New Member Awards', subtitle: 'Mumbai 2025', gradient: 'from-amber-200 to-amber-400', span: '' },
  { id: 10, cat: 'Certification', title: 'Batch Certification 2025', subtitle: 'Hyderabad', gradient: 'from-teal-200 to-teal-400', span: '' },
  { id: 11, cat: 'Networking',    title: 'Women in Business Summit', subtitle: 'Delhi 2025', gradient: 'from-fuchsia-200 to-fuchsia-400', span: '' },
  { id: 12, cat: 'Events',        title: 'FORTI Leadership Forum', subtitle: 'Pune 2025', gradient: 'from-lime-200 to-lime-400', span: '' },
]

const CATS = ['All', 'AGM 2026', 'Events', 'Awards', 'Certification', 'Networking']

export default function GalleryPage() {
  const [filter, setFilter] = useState('All')
  const [lightbox, setLightbox] = useState(null)

  const filtered = GALLERY_ITEMS.filter(g => filter === 'All' || g.cat === filter)

  function open(item) { setLightbox(item) }
  function close() { setLightbox(null) }
  function prev() {
    const idx = filtered.findIndex(g => g.id === lightbox.id)
    setLightbox(filtered[(idx - 1 + filtered.length) % filtered.length])
  }
  function next() {
    const idx = filtered.findIndex(g => g.id === lightbox.id)
    setLightbox(filtered[(idx + 1) % filtered.length])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Gallery</span>
          <h1 className="text-4xl font-black mt-2 mb-3">Events & Moments</h1>
          <p className="text-primary-200">A visual journey through FORTI events, ceremonies, and milestones</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATS.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === c ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Masonry-like grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id}
              className={`relative rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform shadow-sm hover:shadow-lg
                ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              style={{ height: i === 0 ? '320px' : '160px' }}
              onClick={() => open(item)}>
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`}/>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <PlayCircle size={36} className="text-white drop-shadow-lg"/>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-white font-bold text-sm leading-tight">{item.title}</p>
                <p className="text-white/70 text-xs">{item.subtitle}</p>
              </div>
              <div className="absolute top-3 left-3">
                <span className="bg-black/30 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">{item.cat}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">Gallery images will be updated regularly as events take place. <Link to="/contact" className="text-primary-600 hover:underline">Submit your event photos</Link>.</p>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className={`w-full rounded-2xl bg-gradient-to-br ${lightbox.gradient} flex items-center justify-center`} style={{ height: '400px' }}>
              <Image size={64} className="text-white/30"/>
            </div>
            <div className="bg-white rounded-b-2xl p-4">
              <span className="text-xs text-primary-600 font-semibold">{lightbox.cat}</span>
              <h3 className="font-bold text-gray-900 mt-0.5">{lightbox.title}</h3>
              <p className="text-sm text-gray-500">{lightbox.subtitle}</p>
            </div>
            {/* Navigation */}
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition">
              <ChevronLeft size={20}/>
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition">
              <ChevronRight size={20}/>
            </button>
            <button onClick={close} className="absolute -top-3 -right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-primary-600 transition">
              <X size={18}/>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} FORTI. All rights reserved. · <Link to="/" className="hover:text-white">Home</Link> · <Link to="/contact" className="hover:text-white">Contact</Link></p>
        </div>
      </footer>
    </div>
  )
}
