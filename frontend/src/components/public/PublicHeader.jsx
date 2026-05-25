import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Menu, X, Mail, Phone, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import { SITE_LOGO } from '../../data/siteAssets'
import BlogNavDropdown from './BlogNavDropdown'
import { useMember } from '../../contexts/MemberContext'
import { getMemberLandingPath } from '../../utils/memberAccess'

const http = axios.create({ baseURL: '/api' })

const STATIC_BEFORE = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'Plans', to: '/plans' },
]
const STATIC_AFTER = [
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
  { label: 'Verify', to: '/verify' },
]

function NavLink({ to, children, pathname }) {
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link to={to}
      className={`text-sm font-medium px-3 py-2 rounded-xl transition-all duration-200 relative group ${
        active ? 'text-primary-700 bg-primary-50/80' : 'text-ink-muted hover:text-primary-600 hover:bg-primary-50/50'
      }`}>
      {children}
      {!active && (
        <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-gradient-to-r from-primary-500 to-accent-gold rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
      )}
    </Link>
  )
}

export default function PublicHeader({ variant = 'default', onApply }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { token: memberToken, member } = useMember()
  const isLanding = variant === 'landing'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const { data: blogNav = [] } = useQuery({
    queryKey: ['blog-nav'],
    queryFn: () => http.get('/blog/nav').then(r => r.data.data),
    staleTime: 60_000,
  })

  function handleMemberNav() {
    navigate(memberToken ? getMemberLandingPath(member) : '/member/login')
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/85 backdrop-blur-xl shadow-glass border-b border-primary-100/40'
        : 'bg-white/70 backdrop-blur-lg border-b border-white/50'
    }`}>
      {/* Top info bar — landing & default */}
      <div className="hidden lg:block bg-gradient-to-r from-primary-950 via-primary-800 to-primary-700 text-white text-xs py-2">
        <div className="container-page flex items-center justify-between">
          <div className="flex items-center gap-6 text-primary-100/90">
            <span className="flex items-center gap-1.5"><Mail size={11} className="text-accent-gold" /> info@forti.in</span>
            <span className="flex items-center gap-1.5"><Phone size={11} className="text-accent-gold" /> Mon – Sat: 10:00 AM – 6:00 PM</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-primary-300/80">Follow us</span>
            {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="hover:text-accent-gold transition"><Icon size={12} /></a>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <img src={SITE_LOGO} alt="FORTI" className="h-10 w-auto object-contain transition group-hover:opacity-90" onError={e => { e.target.style.display = 'none' }} />
          <div className="hidden sm:block">
            <span className="font-display font-bold text-ink tracking-tight">FORTI</span>
            <p className="text-[11px] text-ink-subtle leading-none mt-0.5">Federation of Trade & Industry</p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {STATIC_BEFORE.map(l => <NavLink key={l.to} to={l.to} pathname={location.pathname}>{l.label}</NavLink>)}
          {blogNav.map(item => <BlogNavDropdown key={item.id} item={item} />)}
          {STATIC_AFTER.map(l => <NavLink key={l.to} to={l.to} pathname={location.pathname}>{l.label}</NavLink>)}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {isLanding ? (
            <>
              <button type="button" onClick={() => navigate('/admin/login')} className="btn-outline btn-sm">Admin</button>
              <button type="button" onClick={() => navigate('/track')} className="btn-outline btn-sm">Track</button>
              <button type="button" onClick={handleMemberNav} className="btn-outline btn-sm text-primary-700 border-primary-200">
                {memberToken ? 'Dashboard' : 'Member Login'}
              </button>
              {onApply && (
                <button type="button" onClick={onApply} className="btn-gold btn-sm">Apply Now</button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={handleMemberNav} className="btn-outline btn-sm">
                {memberToken ? 'Dashboard' : 'Member Login'}
              </button>
              {onApply && <button type="button" onClick={onApply} className="btn-primary btn-sm">Apply Now</button>}
            </>
          )}
        </div>

        <button type="button" className="lg:hidden p-2.5 rounded-xl text-ink-muted hover:bg-primary-50 transition" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-primary-100/50 px-4 py-4 space-y-1 bg-white/95 backdrop-blur-xl">
          {[...STATIC_BEFORE, ...STATIC_AFTER].map(l => (
            <Link key={l.to} to={l.to} className="block py-2.5 px-3 text-ink-muted font-medium rounded-xl hover:bg-primary-50" onClick={() => setMenuOpen(false)}>{l.label}</Link>
          ))}
          {blogNav.map(item => (
            <div key={item.id} className="pt-2 border-t border-primary-100/50">
              <Link to={item.path} className="block py-2 px-3 font-semibold text-primary-700" onClick={() => setMenuOpen(false)}>{item.label}</Link>
              {item.dropdown?.map(cat => (
                <Link key={cat.id} to={cat.path} className="block py-1.5 pl-6 text-sm text-ink-muted" onClick={() => setMenuOpen(false)}>{cat.name}</Link>
              ))}
            </div>
          ))}
          <div className="pt-3 space-y-2 border-t border-primary-100/50">
            <button type="button" onClick={() => { handleMemberNav(); setMenuOpen(false) }} className="w-full btn-outline btn-sm">{memberToken ? 'Dashboard' : 'Member Login'}</button>
            {onApply && <button type="button" onClick={() => { onApply(); setMenuOpen(false) }} className="w-full btn-primary btn-sm">Apply Now</button>}
          </div>
        </div>
      )}
    </header>
  )
}
