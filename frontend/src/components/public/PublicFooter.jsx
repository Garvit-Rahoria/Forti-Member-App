import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import { SITE_LOGO } from '../../data/siteAssets'

export default function PublicFooter() {
  return (
    <footer className="relative bg-gradient-to-b from-primary-950 via-primary-900 to-ink text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-gold/10 rounded-full blur-3xl" />
      </div>
      <div className="relative container-page py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src={SITE_LOGO} alt="FORTI" className="h-10 brightness-0 invert opacity-90" onError={e => { e.target.style.display = 'none' }} />
            </Link>
            <p className="text-primary-200/80 text-sm leading-relaxed max-w-md">
              Federation of Rajasthan Trade & Industry — the apex chamber connecting businesses, policy, and opportunity across Rajasthan and beyond.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-accent-gold mb-4">Quick links</h4>
            <ul className="space-y-2 text-sm text-primary-100/80">
              {[['About', '/about'], ['Plans', '/plans'], ['News', '/content/insights'], ['Contact', '/contact']].map(([l, to]) => (
                <li key={to}><Link to={to} className="hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-accent-gold mb-4">Contact</h4>
            <ul className="space-y-2.5 text-sm text-primary-100/80">
              <li className="flex items-center gap-2"><Mail size={14} className="text-accent-gold shrink-0" /> info@forti.in</li>
              <li className="flex items-center gap-2"><Phone size={14} className="text-accent-gold shrink-0" /> Mon – Sat: 10 AM – 6 PM</li>
              <li className="flex items-center gap-2"><MapPin size={14} className="text-accent-gold shrink-0" /> Jaipur, Rajasthan</li>
            </ul>
            <div className="flex gap-3 mt-4">
              {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-12 pt-8 text-center text-xs text-primary-300/60">
          © {new Date().getFullYear()} FORTI. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
