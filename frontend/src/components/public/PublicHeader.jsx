import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
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
      className={`whitespace-nowrap text-sm font-medium px-3 py-2 rounded-xl transition-all duration-200 relative group ${active ? 'text-primary-700 bg-primary-50/80' : 'text-ink-muted hover:text-primary-600 hover:bg-primary-50/50'
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const { data: blogNav = [] } = useQuery({
    queryKey: ['blog-nav'],
    queryFn: () => http.get('/blog/nav').then(r => r.data.data),
    staleTime: 60_000,
  })

  function handleMemberNav() {
    navigate(memberToken ? getMemberLandingPath(member) : '/member/login')
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
      ? 'bg-white/85 backdrop-blur-xl shadow-glass border-b border-primary-100/40'
      : 'bg-white/70 backdrop-blur-lg border-b border-white/50'
      }`}>
      {/* Top info bar — desktop only */}
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

      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-2 sm:gap-6">
        <Link to="/" className="flex items-center min-w-0 shrink group">
          <img src={SITE_LOGO} alt="FORTI" className="h-8 sm:h-10 w-auto max-w-full object-contain transition group-hover:opacity-90" onError={e => { e.target.style.display = 'none' }} />
        </Link>

        <nav className="hidden xl:flex items-center gap-1.5">
          {STATIC_BEFORE.map(l => <NavLink key={l.to} to={l.to} pathname={location.pathname}>{l.label}</NavLink>)}
          {blogNav.map(item => <BlogNavDropdown key={item.id} item={item} />)}
          {STATIC_AFTER.map(l => <NavLink key={l.to} to={l.to} pathname={location.pathname}>{l.label}</NavLink>)}
        </nav>

        <div className="hidden xl:flex items-center gap-2 ml-auto shrink-0">
          {isLanding ? (
            <>
              <button type="button" onClick={() => navigate('/admin/login')} className="btn-outline btn-sm whitespace-nowrap">Admin</button>
              <button type="button" onClick={() => navigate('/track')} className="btn-outline btn-sm whitespace-nowrap">Track</button>
              <button type="button" onClick={handleMemberNav} className="btn-outline btn-sm text-primary-700 border-primary-200 whitespace-nowrap">
                {memberToken ? 'Dashboard' : 'Member Login'}
              </button>
              {onApply && (
                <button type="button" onClick={onApply} className="btn-gold btn-sm whitespace-nowrap shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95">Apply Now</button>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={handleMemberNav} className="btn-outline btn-sm whitespace-nowrap">
                {memberToken ? 'Dashboard' : 'Member Login'}
              </button>
              {onApply && <button type="button" onClick={onApply} className="btn-primary btn-sm whitespace-nowrap shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95">Apply Now</button>}
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          type="button"
          className="xl:hidden ml-auto p-2.5 rounded-xl text-ink-muted hover:bg-primary-50 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Backdrop and Drawer (Rendered via Portal to avoid backdrop-filter issues) */}
      {createPortal(
        <div className="xl:hidden">
          {/* Mobile Backdrop */}
          {menuOpen && (
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998]"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Slide-in Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white z-[9999] shadow-2xl flex flex-col
              transform transition-transform duration-300 ease-in-out overflow-y-auto
              ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-700 to-primary-900 shrink-0">
              <img src={SITE_LOGO} alt="FORTI" className="h-8 w-auto object-contain brightness-0 invert" onError={e => { e.target.style.display = 'none' }} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 py-4 space-y-0.5" aria-label="Mobile navigation">
              {[...STATIC_BEFORE].map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center py-3 px-3 text-sm font-medium rounded-xl transition-colors
                    ${location.pathname === l.to ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}

              {blogNav.map(item => (
                <div key={item.id}>
                  <Link
                    to={item.path}
                    className="flex items-center py-3 px-3 font-semibold text-sm text-primary-700 rounded-xl hover:bg-primary-50 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.dropdown?.map(cat => (
                    <Link
                      key={cat.id}
                      to={cat.path}
                      className="flex items-center py-2 pl-7 pr-3 text-sm text-gray-500 hover:text-primary-600 transition-colors rounded-lg"
                      onClick={() => setMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              ))}

              {[...STATIC_AFTER].map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center py-3 px-3 text-sm font-medium rounded-xl transition-colors
                    ${location.pathname === l.to ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="px-4 py-4 space-y-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
              {isLanding && (
                <>
                  <button type="button" onClick={() => { navigate('/track'); setMenuOpen(false) }} className="w-full btn-outline btn-sm">
                    Track Application
                  </button>
                  <button type="button" onClick={() => { navigate('/admin/login'); setMenuOpen(false) }} className="w-full btn-outline btn-sm">
                    Admin Login
                  </button>
                </>
              )}
              <button type="button" onClick={() => { handleMemberNav(); setMenuOpen(false) }} className="w-full btn-outline btn-sm">
                {memberToken ? 'My Dashboard' : 'Member Login'}
              </button>
              {onApply && (
                <button type="button" onClick={() => { onApply(); setMenuOpen(false) }} className="w-full btn-gold btn-sm">
                  Apply for Membership
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
