import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

export default function BlogNavDropdown({ item }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const path = item.path || `/content/${item.slug}`
  const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`)

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const hasChildren = item.dropdown?.length > 0
  const base = `text-sm font-medium px-3 py-2 rounded-xl flex items-center gap-1 transition-all duration-200 ${
    isActive ? 'text-primary-700 bg-primary-50/80' : 'text-ink-muted hover:text-primary-600 hover:bg-primary-50/50'
  }`

  if (!hasChildren) {
    return <Link to={path} className={base}>{item.label}</Link>
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className={base}>
        {item.label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[240px] glass-card py-2 z-50 animate-fade-in-up shadow-soft-lg border-primary-100/60">
          <Link to={path} className="block px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50/80 border-b border-primary-100/50 mx-2 mb-1 rounded-lg"
            onClick={() => setOpen(false)}>
            All {item.label}
          </Link>
          {item.dropdown.map(cat => (
            <div key={cat.id}>
              <Link to={cat.path} className="block px-4 py-2.5 text-sm text-ink font-medium hover:bg-primary-50/60 transition"
                onClick={() => setOpen(false)}>
                {cat.name}
              </Link>
              {cat.children?.map(ch => (
                <Link key={ch.id} to={ch.path} className="block pl-8 pr-4 py-2 text-xs text-ink-muted hover:bg-primary-50/40 transition"
                  onClick={() => setOpen(false)}>
                  {ch.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
