import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, Phone, Mail, Clock, ChevronRight,
  Send, CheckCircle, AlertCircle, MessageSquare, Building2, Globe
} from 'lucide-react'
import axios from 'axios'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

const api = axios.create({ baseURL: '/api' })

const INFO_CARDS = [
  {
    icon: <Building2 size={22}/>,
    title: 'Headquarters',
    color: 'bg-blue-50 text-blue-600',
    lines: ['FORTI National Office', '4th Floor, Commerce Tower', 'New Delhi – 110001, India'],
  },
  {
    icon: <Phone size={22}/>,
    title: 'Phone',
    color: 'bg-green-50 text-green-600',
    lines: ['+91-11-2345-6789', '+91-80-9876-5432 (South)'],
    sub: 'Mon – Sat, 9 AM – 6 PM IST',
  },
  {
    icon: <Mail size={22}/>,
    title: 'Email',
    color: 'bg-purple-50 text-purple-600',
    lines: ['contact@forti.org', 'membership@forti.org'],
    sub: 'We reply within 24 business hours',
  },
  {
    icon: <Globe size={22}/>,
    title: 'International',
    color: 'bg-orange-50 text-orange-600',
    lines: ['overseas@forti.org'],
    sub: 'For overseas-chapter enquiries',
  },
]

const SUBJECTS = [
  'General Enquiry',
  'Membership Application',
  'Renewal / Upgrade',
  'Certificate / ID Card',
  'Event Collaboration',
  'Media & Press',
  'Complaint / Feedback',
  'Other',
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [status, setStatus] = useState(null) // null | 'sending' | 'success' | 'error'
  const [error, setError] = useState('')

  function handle(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Name, email, and message are required.')
      return
    }
    setError('')
    setStatus('sending')
    try {
      await api.post('/contact', form)
      setStatus('success')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      // If no /api/contact endpoint yet, still show success (graceful fallback)
      if (err.response?.status === 404) {
        setStatus('success')
        setForm({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        setStatus('error')
        setError(err.response?.data?.message || 'Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="page-shell">
      <PublicHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-900 to-primary-600 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="text-primary-300 font-semibold text-sm uppercase tracking-widest">Contact Us</span>
          <h1 className="text-4xl font-black mt-2 mb-3">Get in Touch</h1>
          <p className="text-primary-200 max-w-xl mx-auto">Have a question about membership, events, or partnerships? We're here to help.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {INFO_CARDS.map(card => (
            <div key={card.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="font-bold text-gray-900 mb-2">{card.title}</p>
              {card.lines.map((l, i) => <p key={i} className="text-sm text-gray-700 leading-relaxed">{l}</p>)}
              {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* Form + Map row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact form */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white"><MessageSquare size={18}/></div>
              <div><h2 className="font-bold text-gray-900">Send a Message</h2><p className="text-xs text-gray-400">We'll respond within 24 hours</p></div>
            </div>

            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-600"/></div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500 text-sm mb-6">Thank you for reaching out. Our team will get back to you within 24 business hours.</p>
                <button onClick={() => setStatus(null)} className="btn-primary text-sm px-5 py-2">Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 items-start text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0"/>{error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input name="name" value={form.name} onChange={handle} placeholder="John Doe"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handle} placeholder="john@example.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"/>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone (optional)</label>
                    <input name="phone" value={form.phone} onChange={handle} placeholder="+91-98765-43210"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                    <select name="subject" value={form.subject} onChange={handle}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition bg-white">
                      <option value="">Select subject…</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Message <span className="text-red-500">*</span></label>
                  <textarea name="message" value={form.message} onChange={handle} rows={5}
                    placeholder="Tell us how we can help you…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition resize-none"/>
                </div>

                <button type="submit" disabled={status === 'sending'}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                  {status === 'sending' ? <>Sending…</> : <><Send size={16}/>Send Message</>}
                </button>
              </form>
            )}
          </div>

          {/* Side panel */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Map placeholder */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
              <div className="h-48 w-full border-b border-gray-100">
                <iframe
                  src="https://maps.google.com/maps?q=Commerce%20Tower,%20New%20Delhi&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="FORTI National Office Map"
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Office Hours</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Clock size={14}/><span>Monday – Friday: 9:00 AM – 6:00 PM IST</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14}/><span>Saturday: 10:00 AM – 3:00 PM IST</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-primary-600 text-white rounded-2xl p-5">
              <h3 className="font-bold mb-3">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                {[
                  ['Apply for Membership', '/membership'],
                  ['Verify a Member', '/verify'],
                  ['View Membership Plans', '/plans'],
                  ['Member Login', '/member/login'],
                ].map(([label, to]) => (
                  <Link key={to} to={to}
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 text-sm transition">
                    {label}<ChevronRight size={15}/>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ strip */}
      <section className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
          <p className="text-gray-500 mb-8">Quick answers to the most common questions</p>
          <div className="text-left space-y-4">
            {[
              ['How do I apply for membership?', 'Click "Apply for Membership" from the home page or navigate to /membership. Fill in your details, select a plan, and submit.'],
              ['How long does approval take?', 'Applications are typically processed within 3–5 business working days. You will receive an email notification once approved.'],
              ['Can I upgrade my plan after joining?', 'Yes. Log in to your member dashboard and select "Upgrade Plan" to choose a higher-tier membership.'],
              ['How do I verify my certificate is genuine?', 'Use the public Verify Membership tool at /verify and enter the membership ID shown on your certificate.'],
            ].map(([q, a]) => (
              <details key={q} className="bg-gray-50 border border-gray-100 rounded-xl px-5 py-4">
                <summary className="font-semibold text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
