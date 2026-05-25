import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Image, PlayCircle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { GALLERY_ITEMS } from '../../data/siteAssets'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

const CATS = ['All', ...Array.from(new Set(GALLERY_ITEMS.map(g => g.cat)))]

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
    <div className="page-shell">
      <PublicHeader />

      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Gallery</span>
          <h1 className="text-4xl font-black mt-2 mb-3">Events & Moments</h1>
          <p className="text-primary-200">A visual journey through FORTI events, ceremonies, and milestones</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex gap-2 flex-wrap mb-8">
          {CATS.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === c ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id}
              className={`relative rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform shadow-sm hover:shadow-lg
                ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              style={{ height: i === 0 ? '320px' : '160px' }}
              onClick={() => open(item)}>
              <img src={item.src} alt={item.title} className="absolute inset-0 w-full h-full object-cover"/>
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

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.title} className="w-full max-h-[70vh] object-contain rounded-t-2xl bg-black"/>
            <div className="bg-white rounded-b-2xl p-4">
              <span className="text-xs text-primary-600 font-semibold">{lightbox.cat}</span>
              <h3 className="font-bold text-gray-900 mt-0.5">{lightbox.title}</h3>
              <p className="text-sm text-gray-500">{lightbox.subtitle}</p>
            </div>
            <button onClick={close} className="absolute top-3 right-3 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"><X size={18}/></button>
            {filtered.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"><ChevronLeft size={20}/></button>
                <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"><ChevronRight size={20}/></button>
              </>
            )}
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  )
}
