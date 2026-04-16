import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useMember } from '../../contexts/MemberContext'
import {
  User, Award, CreditCard, FileText, Download, LogOut,
  Clock, CheckCircle, AlertCircle, RefreshCw, Eye,
  Shield, MapPin, Phone, Mail, Calendar, Settings,
  ChevronRight, Loader2, Bell, Home, Activity,
  XCircle, HelpCircle, Wallet, BarChart2,
  Upload, IndianRupee, Building2, Banknote, Info, RotateCcw, Edit2
} from 'lucide-react'
import { getCurrencySymbol, fmtAmount } from '../../utils/currency'

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_MAP = {
  draft:             { label: 'Draft',               color: 'badge-gray',   icon: Clock },
  submitted:         { label: 'Submitted',            color: 'badge-blue',   icon: FileText },
  under_review:      { label: 'Under Review',         color: 'badge-yellow', icon: Eye },
  payment_pending:   { label: 'Payment Pending',      color: 'badge-yellow', icon: Wallet },
  payment_submitted: { label: 'Payment Under Review', color: 'badge-blue',   icon: CreditCard },
  payment_verified:  { label: 'Payment Verified',     color: 'badge-green',  icon: CheckCircle },
  pending:           { label: 'Under Review',         color: 'badge-yellow', icon: Clock },
  approved:          { label: 'Approved (Paid)',       color: 'badge-green',  icon: CheckCircle },
  payment_approved:  { label: 'Payment Approved',     color: 'badge-green',  icon: CheckCircle },
  rejected:          { label: 'Rejected',             color: 'badge-red',    icon: XCircle },
  active:            { label: 'Active Member',        color: 'badge-green',  icon: Shield },
  active_member:     { label: 'Active Member',        color: 'badge-green',  icon: Shield },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: 'badge-gray', icon: HelpCircle }
  const Icon = s.icon
  return (
    <span className={`${s.color} inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold`}>
      <Icon size={11}/>{s.label}
    </span>
  )
}

function MemberStatusBadge({ status }) {
  const map = {
    active:    { label: 'Active',    bg: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    expired:   { label: 'Expired',   bg: 'bg-red-100 text-red-800',     dot: 'bg-red-500' },
    suspended: { label: 'Suspended', bg: 'bg-orange-100 text-orange-800',dot: 'bg-orange-500' },
    inactive:  { label: 'Inactive',  bg: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  }
  const s = map[status] || map.inactive
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
      {s.label}
    </span>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, onTab, member, onLogout }) {
  const nav = [
    { id: 'overview',    label: 'Overview',       icon: Home },
    { id: 'profile',     label: 'My Profile',     icon: User },
    { id: 'documents',   label: 'My Documents',   icon: Award },
    { id: 'payments',    label: 'Payment History', icon: CreditCard },
    { id: 'renewal',     label: 'Renew Membership', icon: RefreshCw },
  ]
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black">F</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">FORTI</p>
            <p className="text-xs text-gray-400">Member Dashboard</p>
          </div>
        </div>
      </div>

      {/* Member info */}
      {member && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
              {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{member.full_name || 'Member'}</p>
              <p className="text-xs text-gray-400 truncate">{member.membership_id}</p>
            </div>
          </div>
          {member.member_status && <div className="mt-2"><MemberStatusBadge status={member.member_status}/></div>}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onTab(id)}
            className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition
              ${activeTab === id
                ? 'bg-primary-50 text-primary-700 border border-primary-100'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Icon size={17}/>{label}
            {activeTab === id && <ChevronRight size={14} className="ml-auto opacity-50"/>}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button onClick={onLogout}
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 text-red-600 hover:bg-red-50 transition">
          <LogOut size={17}/>Logout
        </button>
      </div>
    </div>
  )
}

// ── Status Timeline ────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'submitted',         label: 'Application Submitted'  },
  { key: 'under_review',      label: 'Under Review'           },
  { key: 'payment_pending',   label: 'Payment Pending'        },
  { key: 'payment_submitted', label: 'Payment Submitted'      },
  { key: 'payment_verified',  label: 'Payment Verified'       },
  { key: 'approved',          label: 'Approved'               },
  { key: 'active',            label: 'Membership Active'      },
]

// ── Status messages for the pending popup ─────────────────────────────────
const STATUS_MESSAGES = {
  submitted:         'Your application has been received and is under review by our team.',
  pending:           'Your application is under review by our team.',
  under_review:      'Your application is being actively processed by our team.',
  approved:          'Your membership has been approved. Please await payment instructions.',
  payment_pending:   'Your application is approved. Please submit your payment to activate membership.',
  payment_submitted: 'Your payment has been submitted and is under review by our team.',
  payment_verified:  'Your payment has been verified. Your membership is being activated.',
  rejected:          'Your application was rejected. Please contact support for assistance.',
}

// ── Membership Blocked Screen (full-page, replaces dashboard entirely) ────
function MembershipBlockedScreen({ member, onLogout, refetch }) {
  const appStatus  = member?.status || 'submitted'
  const statusInfo = STATUS_MAP[appStatus] || { label: String(appStatus).replace(/_/g, ' '), color: 'badge-gray', icon: Clock }
  const StatusIcon = statusInfo.icon
  const msg        = STATUS_MESSAGES[appStatus] || 'Status update in progress. Please check back soon.'
  const isRejected = appStatus === 'rejected'

  // Poll backend every 15 seconds; auto-unlocks when member_status becomes 'active'
  useEffect(() => {
    const id = setInterval(() => refetch?.(), 15000)
    return () => clearInterval(id)
  }, [refetch])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-black text-sm">F</div>
          <div>
            <p className="font-bold text-gray-900 text-sm">FORTI</p>
            <p className="text-xs text-gray-400">Member Portal</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition">
          <LogOut size={15}/> Sign Out
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4 overflow-y-auto">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

          {/* Purple header */}
          <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-6 text-white">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={22}/>
              </div>
              <div>
                <h2 className="font-black text-xl leading-tight">Membership Not Active</h2>
                <p className="text-primary-200 text-sm mt-1">
                  Your membership is not active yet. You can track your application status below.
                </p>
              </div>
            </div>
          </div>

          {/* Current status banner */}
          <div className="px-6 pt-5 pb-3">
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              isRejected
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <StatusIcon size={18} className="shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-semibold">Current Status: {statusInfo.label}</p>
                <p className="text-xs mt-0.5">{msg}</p>
              </div>
            </div>
          </div>

          {/* Track Application Status section */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={12}/> Track Application Status
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={10} className="animate-spin"/>
                <span>Auto-updating every 15s</span>
              </div>
            </div>
            <StatusTimeline status={appStatus}/>
          </div>

        </div>

        {/* Member reference info */}
        {member?.email && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Logged in as <span className="font-semibold text-gray-600">{member.full_name || member.email}</span>
            {member.membership_id && (
              <> · Ref: <span className="font-mono text-primary-600">{member.membership_id}</span></>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

const TIMELINE_ORDER = TIMELINE_STEPS.map(s => s.key)

function getTimelineIndex(status) {
  // special: rejected maps to the current index so we can show red there
  if (status === 'rejected') return -1
  return TIMELINE_ORDER.indexOf(status)
}

function StatusTimeline({ status }) {
  const currentIdx = getTimelineIndex(status)
  const isRejected = status === 'rejected'

  return (
    <div className="mt-4">
      <div className="relative flex flex-col gap-0">
        {TIMELINE_STEPS.map((step, idx) => {
          const done    = !isRejected && currentIdx > idx
          const current = !isRejected && currentIdx === idx
          const pending = isRejected ? false : currentIdx < idx

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* connector + dot column */}
              <div className="flex flex-col items-center w-6 shrink-0">
                {/* top line */}
                {idx > 0 && (
                  <div className={`w-0.5 h-4 -mt-0 ${done || current ? 'bg-primary-500' : 'bg-gray-200'}`}/>
                )}
                {/* dot */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all
                  ${done    ? 'bg-primary-600 border-primary-600'
                  : current ? 'bg-white border-primary-600 shadow-[0_0_0_3px_rgba(91,33,182,0.15)]'
                  : 'bg-white border-gray-200'}`}>
                  {done && <CheckCircle size={11} className="text-white" strokeWidth={3}/>}
                  {current && <div className="w-2 h-2 rounded-full bg-primary-600"/>}
                </div>
                {/* bottom line */}
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div className={`w-0.5 h-6 ${done ? 'bg-primary-500' : 'bg-gray-200'}`}/>
                )}
              </div>
              {/* label */}
              <p className={`text-sm py-0.5 ${
                done    ? 'text-primary-700 font-medium'
                : current ? 'text-primary-800 font-bold'
                : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          )
        })}

        {isRejected && (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-6 flex justify-center">
              <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center">
                <XCircle size={11} className="text-white" strokeWidth={3}/>
              </div>
            </div>
            <p className="text-sm font-bold text-red-600">Application Rejected</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ member, onTab }) {
  if (!member) return null
  const daysLeft = member.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-2xl p-6 text-white">
        <p className="text-primary-200 text-sm mb-1">Welcome back,</p>
        <h2 className="text-2xl font-black">{member.full_name || 'Member'}</h2>
        <p className="text-primary-200 text-sm mt-1">Membership ID: <span className="font-mono text-white">{member.membership_id}</span></p>
        <div className="flex flex-wrap gap-4 mt-4">
          <div>
            <p className="text-xs text-primary-300">Status</p>
            <MemberStatusBadge status={member.member_status}/>
          </div>
          {member.expiry_date && (
            <div>
              <p className="text-xs text-primary-300">Expires</p>
              <p className="text-sm font-semibold">{new Date(member.expiry_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
            </div>
          )}
          {(member.package_name || member.plan_type) && (
            <div>
              <p className="text-xs text-primary-300">Package</p>
              <p className="text-sm font-semibold">{member.package_name || (member.plan_type === 'lifetime' ? 'Lifetime' : member.plan_type === '3years' || member.plan_type === '3_years' ? '3 Year Plan' : member.plan_type === 'yearly' || member.plan_type === '1year' ? '1 Year Plan' : member.plan_type)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Expiry warning */}
      {daysLeft !== null && daysLeft <= 30 && member.member_status === 'active' && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${daysLeft <= 7 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <Bell size={18} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-sm">Membership Expiring Soon!</p>
            <p className="text-xs mt-0.5">Your membership expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Renew now to avoid interruption.</p>
            <button onClick={() => onTab('renewal')} className="mt-2 text-xs font-bold underline">Renew Membership →</button>
          </div>
        </div>
      )}

      {/* Application status */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Activity size={17}/>Application Status</h3>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">Current Status</p>
            <StatusBadge status={member.status}/>
          </div>
          <StatusTimeline status={member.status}/>
          {member.applied_at && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">Applied On</p>
              <p className="text-sm font-medium text-gray-900">{new Date(member.applied_at).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</p>
            </div>
          )}
          {member.payment_amount && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-sm font-bold text-primary-700">{Number(member.payment_amount).toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Download Certificate', icon: Award, tab: 'documents', color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' },
          { label: 'Download ID Card',     icon: CreditCard, tab: 'documents', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { label: 'Download Invoice',     icon: FileText, tab: 'documents', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
        ].map(({ label, icon: Icon, tab, color }) => (
          <button key={label} onClick={() => onTab(tab)}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl transition ${color}`}>
            <Icon size={24}/>
            <span className="text-xs font-semibold text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ member, apiClient, refetch }) {
  if (!member) return null
  const data = member.data || {}
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveOk, setSaveOk]   = useState(false)
  const [form, setForm] = useState({
    full_name:         member.full_name || '',
    phone:             member.phone || data.phone || '',
    organisation_name: data.organisation_name || '',
    address:           data.address || '',
  })

  function handleCancel() {
    setForm({
      full_name:         member.full_name || '',
      phone:             member.phone || data.phone || '',
      organisation_name: data.organisation_name || '',
      address:           data.address || '',
    })
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setSaveError('Full name is required.'); return }
    setSaving(true); setSaveError(null)
    try {
      await apiClient().put('/member/profile', form)
      setSaveOk(true)
      setEditing(false)
      await refetch()
      setTimeout(() => setSaveOk(false), 4000)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const displayFields = [
    { label: 'Full Name',       value: member.full_name,        icon: User },
    { label: 'Email',           value: member.email,             icon: Mail },
    { label: 'Phone',           value: member.phone || data.phone, icon: Phone },
    { label: 'Organisation',    value: data.organisation_name,   icon: Building2 },
    { label: 'Address',         value: data.address,             icon: MapPin },
    { label: 'Membership ID',   value: member.membership_id,     icon: Shield },
    { label: 'Gender',          value: data.gender,              icon: User },
    { label: 'Pin/ZIP Code',    value: data.pin_code,            icon: MapPin },
    { label: 'Membership Type', value: data.membership_type
        ? data.membership_type.charAt(0).toUpperCase() + data.membership_type.slice(1)
        : null,                                                   icon: Award },
  ].filter(f => f.value)

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><User size={17}/>Profile Information</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-outline btn-sm flex items-center gap-1.5">
              <Edit2 size={13}/> Edit Profile
            </button>
          )}
        </div>
        <div className="card-body space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {data.profile_photo ? (
              <img src={data.profile_photo} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary-200"/>
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-3xl">
                {(member.full_name || '?').charAt(0)}
              </div>
            )}
            <div>
              <h4 className="text-xl font-bold text-gray-900">{member.full_name}</h4>
              <p className="text-gray-500 text-sm">{member.email}</p>
              <div className="mt-1"><MemberStatusBadge status={member.member_status}/></div>
            </div>
          </div>

          {/* Feedback banners */}
          {saveOk && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <CheckCircle size={15}/> Profile updated successfully.
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertCircle size={15}/> {saveError}
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Your full name"/>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"/>
                </div>
                <div>
                  <label className="label">Organisation</label>
                  <input className="input" value={form.organisation_name}
                    onChange={e => setForm(f => ({ ...f, organisation_name: e.target.value }))}
                    placeholder="Your organisation name"/>
                </div>
                <div>
                  <label className="label">Address</label>
                  <input className="input" value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="City, State"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin"/>Saving…</> : <><CheckCircle size={14}/>Save Changes</>}
                </button>
                <button onClick={handleCancel} disabled={saving} className="btn-outline">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {displayFields.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon size={16} className="text-gray-400 mt-0.5 shrink-0"/>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{String(value)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Social links */}
      {Array.isArray(data.social_links) && data.social_links.filter(l => l.url).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Social Media Links</h3></div>
          <div className="card-body space-y-2">
            {data.social_links.filter(l => l.url).map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-primary-600 hover:underline">
                <span className="font-medium text-gray-500 w-24 shrink-0">{link.platform}</span>
                <span className="truncate">{link.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Documents Tab ──────────────────────────────────────────────────────────
function DocumentsTab({ member, apiClient }) {
  const [downloading, setDownloading] = useState({})

  async function download(type, uuid) {
    setDownloading(d => ({ ...d, [type]: true }))
    try {
      const token = localStorage.getItem('forti_member_token')
      const url = `/api/member/${type}/${uuid}/download`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || 'File not available')
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `FORTI_${type}_${uuid}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      alert(err.message || 'Download failed')
    } finally {
      setDownloading(d => ({ ...d, [type]: false }))
    }
  }

  // Documents unlocked once payment is verified OR membership is active
  const isApproved = member?.member_status === 'active' ||
    member?.payment_status === 'verified' ||
    member?.status === 'active'
  const subUuid = member?.sub_uuid

  const docs = [
    {
      type: 'certificate',
      title: 'Membership Certificate',
      desc: 'Official FORTI membership certificate in PDF format',
      icon: Award,
      color: 'from-yellow-400 to-orange-500',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    {
      type: 'idcard',
      title: 'Digital ID Card',
      desc: 'Your FORTI membership ID card with QR code',
      icon: CreditCard,
      color: 'from-blue-400 to-primary-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      type: 'invoice',
      title: 'Payment Invoice',
      desc: 'Official invoice for your membership payment',
      icon: FileText,
      color: 'from-green-400 to-teal-500',
      bg: 'bg-green-50 border-green-200',
    },
  ]

  return (
    <div className="space-y-6">
      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-sm">Documents Not Yet Available</p>
            <p className="text-xs mt-0.5">Your membership documents will be available for download once your application is approved and payment is verified.</p>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-5">
        {docs.map(({ type, title, desc, icon: Icon, color, bg }) => (
          <div key={type} className={`rounded-2xl border p-5 flex flex-col gap-4 ${bg}`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md`}>
              <Icon size={22}/>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => download(type, subUuid)}
              disabled={!isApproved || !subUuid || downloading[type]}
              className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-40 mt-auto">
              {downloading[type]
                ? <><Loader2 size={13} className="animate-spin"/>Downloading…</>
                : <><Download size={13}/>Download PDF</>
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Payments Tab ───────────────────────────────────────────────────────────
const PAYMENT_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
]

function PaymentsTab({ apiClient }) {
  const [payments, setPayments]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [dlState, setDlState]     = useState({})

  useEffect(() => {
    apiClient().get('/member/payment-history')
      .then(r => setPayments(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function downloadInvoice(submissionUuid, membershipId) {
    setDlState(s => ({ ...s, [submissionUuid]: true }))
    try {
      const token = localStorage.getItem('forti_member_token')
      const res = await fetch(`/api/member/invoice/${submissionUuid}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.message || 'Invoice not available yet')
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `FORTI_Invoice_${membershipId || submissionUuid}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      alert(err.message || 'Invoice download failed')
    } finally {
      setDlState(s => ({ ...s, [submissionUuid]: false }))
    }
  }

  const filtered = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter)

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-primary-500"/></div>

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="card-header flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><BarChart2 size={17}/>Payment History</h3>
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {PAYMENT_FILTERS.map(f => {
              const count = f.key === 'all' ? payments.length : payments.filter(p => p.status === f.key).length
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition
                    ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                  {f.label}
                  {f.key !== 'all' && <span className="ml-1 opacity-60">({count})</span>}
                </button>
              )
            })}
          </div>
        </div>
        {!filtered.length ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {filter === 'all' ? 'No payment records found.' : `No ${filter} payments.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Method', 'Membership ID', 'Transaction ID', 'Amount', 'Status', 'Invoice'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-900">{p.method_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.membership_id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.transaction_id || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmtAmount(p.amount, p.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                    <td className="px-4 py-3">
                      {p.status === 'verified' && p.submission_uuid ? (
                        <button
                          onClick={() => downloadInvoice(p.submission_uuid, p.membership_id)}
                          disabled={dlState[p.submission_uuid]}
                          className="btn-outline btn-sm flex items-center gap-1 whitespace-nowrap disabled:opacity-50">
                          {dlState[p.submission_uuid]
                            ? <Loader2 size={11} className="animate-spin"/>
                            : <Download size={11}/>}
                          Invoice
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Renewal Tab ────────────────────────────────────────────────────────────
function RenewalTab({ member, apiClient }) {
  const [step, setStep]                   = useState(1)   // 1=current-plan, 2=instructions, 3=payment
  const [methods, setMethods]             = useState([])
  const [paySettings, setPaySettings]     = useState({})
  const [renewalHistory, setRenewalHistory] = useState([])
  const [latestRenewal, setLatestRenewal] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [notification, setNotification]  = useState(null)
  const [form, setForm] = useState({
    payment_method_id: '',
    transaction_id: '',
    screenshot: null,
  })
  const fileRef = useRef(null)

  // Derive current plan directly from the member object
  function planDisplayName() {
    if (member?.package_name) return member.package_name
    const pt = (member?.plan_type || member?.pkg_plan_type || '').trim()
    if (!pt) return null
    if (pt === 'lifetime') return 'Lifetime'
    if (pt === '3years' || pt === '3_years') return '3 Year Plan'
    if (pt === 'yearly' || pt === '1year') return '1 Year Plan'
    return pt
  }
  const _planName = planDisplayName()
  const currentPlan = _planName ? {
    id:              member?.package_id   || null,
    name:            _planName,
    price:           member?.package_price,
    currency:        member?.currency    || 'INR',
    duration_months: member?.duration_months,
  } : null

  function notify(type, msg) {
    setNotification({ type, msg })
    setTimeout(() => setNotification(null), 6000)
  }

  useEffect(() => {
    const memberType  = member?.data?.membership_type
    const countryCode = member?.data?.country_code || ''
    const location    = countryCode
      ? ''
      : memberType === 'overseas'
        ? 'overseas'
        : (member?.data?.location || member?.data?.state || '')
    const pmParams = countryCode
      ? `?country_code=${encodeURIComponent(countryCode)}`
      : location ? `?location=${encodeURIComponent(location)}` : ''

    Promise.all([
      apiClient().get(`/member/payment-methods${pmParams}`).catch(() => ({ data: { data: [] } })),
      apiClient().get(`/member/payment-settings`).catch(() => ({ data: { data: {} } })),
      apiClient().get(`/member/renewals`).catch(() => ({ data: { data: [] } })),
    ]).then(([pmRes, psRes, rnRes]) => {
      setMethods(pmRes.data.data || [])
      setPaySettings(psRes.data.data || {})
      const history = rnRes.data.data || []
      setRenewalHistory(history)
      setLatestRenewal(history[0] || null)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit() {
    if (!form.payment_method_id)     return notify('error', 'Please select a payment method.')
    if (!form.transaction_id.trim()) return notify('error', 'Please enter the transaction ID / reference.')
    if (!form.screenshot)            return notify('error', 'Please upload a payment screenshot.')

    const fd = new FormData()
    fd.append('submission_uuid', member.sub_uuid)
    if (currentPlan?.id) fd.append('package_id', currentPlan.id)
    fd.append('payment_method_id', form.payment_method_id)
    fd.append('transaction_id', form.transaction_id.trim())
    fd.append('payment_screenshot', form.screenshot)

    setSubmitting(true)
    try {
      await apiClient().post('/member/renewal/apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      notify('success', 'Payment submitted and under verification.')
      const rnRes = await apiClient().get('/member/renewals').catch(() => ({ data: { data: [] } }))
      const history = rnRes.data.data || []
      setRenewalHistory(history)
      setLatestRenewal(history[0] || null)
      setStep(1)
      setForm({ payment_method_id: '', transaction_id: '', screenshot: null })
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      notify('error', err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResubmit() {
    if (!latestRenewal) return
    if (!form.transaction_id.trim()) return notify('error', 'Please enter the transaction ID.')
    if (!form.screenshot)            return notify('error', 'Please upload a payment screenshot.')

    const fd = new FormData()
    fd.append('renewal_uuid', latestRenewal.uuid)
    fd.append('transaction_id', form.transaction_id.trim())
    if (form.payment_method_id) fd.append('payment_method_id', form.payment_method_id)
    fd.append('payment_screenshot', form.screenshot)

    setSubmitting(true)
    try {
      await apiClient().post('/member/renewal/resubmit', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      notify('success', 'Payment resubmitted and under verification.')
      const rnRes = await apiClient().get('/member/renewals').catch(() => ({ data: { data: [] } }))
      const history = rnRes.data.data || []
      setRenewalHistory(history)
      setLatestRenewal(history[0] || null)
      setForm(f => ({ ...f, transaction_id: '', screenshot: null }))
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      notify('error', err.response?.data?.message || 'Resubmission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const daysLeft = member?.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null
  const canRenewNow = daysLeft !== null && daysLeft <= 30

  const membershipStatus = () => {
    if (member?.member_status === 'active' && daysLeft !== null && daysLeft > 30) return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
    if (member?.member_status === 'active' && daysLeft !== null && daysLeft <= 30 && daysLeft > 0) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
    if (daysLeft !== null && daysLeft <= 0) return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' }
    if (member?.member_status === 'active') return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
    return { label: 'Pending Renewal', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' }
  }
  const msInfo = membershipStatus()

  const renewalStatusConfig = {
    pending:           { label: 'Under Review',  color: 'bg-amber-50 border-amber-200 text-amber-800',  icon: Clock,         dot: 'bg-amber-500' },
    payment_submitted: { label: 'Under Review',  color: 'bg-amber-50 border-amber-200 text-amber-800',  icon: Clock,         dot: 'bg-amber-500' },
    verified:          { label: 'Approved',       color: 'bg-green-50 border-green-200 text-green-800',  icon: CheckCircle,   dot: 'bg-green-500' },
    rejected:          { label: 'Rejected',       color: 'bg-red-50 border-red-200 text-red-800',        icon: XCircle,       dot: 'bg-red-500' },
  }

  const canSubmitNew = !latestRenewal || latestRenewal.status === 'verified' || latestRenewal.status === 'rejected'
  const canResubmit  = latestRenewal?.status === 'rejected'
  const hasPending   = latestRenewal && (latestRenewal.status === 'pending' || latestRenewal.status === 'payment_submitted')

  // Compute projected new expiry date for display
  const projectedExpiry = (() => {
    if (!currentPlan?.duration_months || currentPlan.duration_months >= 999) return null
    const base = member?.expiry_date && new Date(member.expiry_date) > new Date()
      ? new Date(member.expiry_date) : new Date()
    const d = new Date(base)
    d.setMonth(d.getMonth() + currentPlan.duration_months)
    return d
  })()

  const durationLabel = (months) => {
    if (!months || months >= 999) return 'Lifetime'
    if (months >= 36) return '3 Years'
    if (months === 24) return '2 Years'
    if (months === 12) return '1 Year'
    return `${months} months`
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="animate-spin text-primary-500"/>
    </div>
  )

  if (!canRenewNow) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield size={17} className="text-primary-600"/> Membership Information
            </h3>
          </div>
          <div className="card-body">
            <div className="grid sm:grid-cols-2 gap-4">
              <InfoRow icon={Shield} label="Membership ID" value={member?.membership_id || '—'} mono />
              <InfoRow icon={Award} label="Current Plan" value={currentPlan?.name || '—'} />
              <InfoRow icon={Calendar} label="Start Date" value={member?.applied_at ? fmtDate(member.applied_at) : '—'} />
              <InfoRow icon={Calendar} label="Expiry Date" value={member?.expiry_date ? fmtDate(member.expiry_date) : '—'} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-800">
          <Info size={17} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-sm">Renewal Not Available Yet</p>
            <p className="text-xs mt-0.5">
              Your membership expires on <strong>{member?.expiry_date ? fmtDate(member.expiry_date) : '—'}</strong>.
              Renewal will be available during the last <strong>30 days</strong> before expiry.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Notification banner */}
      {notification && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium
          ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800'
          : notification.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {notification.type === 'success' ? <CheckCircle size={17} className="shrink-0 mt-0.5"/> :
           notification.type === 'error'   ? <AlertCircle size={17} className="shrink-0 mt-0.5"/> :
                                             <Info size={17} className="shrink-0 mt-0.5"/>}
          {notification.msg}
        </div>
      )}

      {/* ── SECTION 1: Membership Info card ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield size={17} className="text-primary-600"/> Membership Information
          </h3>
        </div>
        <div className="card-body">
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow icon={Shield}   label="Membership ID" value={member?.membership_id || '—'} mono />
            <InfoRow icon={Award}    label="Current Plan"  value={currentPlan?.name || '—'} />
            <InfoRow icon={Calendar} label="Start Date"    value={member?.applied_at ? fmtDate(member.applied_at) : '—'} />
            <InfoRow icon={Calendar} label="Expiry Date"   value={member?.expiry_date ? fmtDate(member.expiry_date) : daysLeft === null ? 'Lifetime' : '—'} />
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg sm:col-span-2">
              <Shield size={16} className="text-gray-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-xs text-gray-400 font-medium">Status</p>
                <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${msInfo.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${msInfo.dot}`}/>
                  {msInfo.label}
                  {daysLeft !== null && daysLeft > 0 && ` · ${daysLeft}d left`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Current Renewal Status ── */}
      {latestRenewal && (
        <div className={`rounded-xl border p-4 ${renewalStatusConfig[latestRenewal.status]?.color || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
          {(() => {
            const cfg = renewalStatusConfig[latestRenewal.status] || {}
            const Icon = cfg.icon || Clock
            return (
              <div className="flex items-start gap-3">
                <Icon size={18} className="shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Renewal Payment: {cfg.label || latestRenewal.status}</p>
                  <p className="text-xs mt-0.5">
                    Package: <strong>{latestRenewal.package_name || '—'}</strong> ·
                    Amount: <strong>{fmtAmount(latestRenewal.amount, latestRenewal.currency)}</strong> ·
                    Submitted: {fmtDate(latestRenewal.created_at)}
                  </p>
                  {latestRenewal.status === 'verified' && (
                    <p className="text-xs mt-1 font-medium">
                      ✓ Your membership has been extended to {latestRenewal.new_expiry_date ? fmtDate(latestRenewal.new_expiry_date) : 'Lifetime'}.
                    </p>
                  )}
                  {latestRenewal.status === 'rejected' && latestRenewal.notes && (
                    <p className="text-xs mt-1">Reason: {latestRenewal.notes}</p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── SECTION 3: Pending Review Message ── */}
      {hasPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-800">
          <Info size={17} className="shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-sm">Payment Under Verification</p>
            <p className="text-xs mt-0.5">Your payment is being reviewed by our team. We will process it within 2–3 business days.</p>
          </div>
        </div>
      )}

      {/* ── SECTION 4: Renewal Form OR Resubmit ── */}
      {(canSubmitNew || canResubmit) && (
        <>
          {/* Step indicators */}
          <div className="flex items-center gap-0">
            {['Your Current Plan', 'Payment Instructions', 'Submit Payment'].map((label, i) => {
              const n = i + 1
              const active = step === n
              const done = step > n
              return (
                <div key={n} className="flex items-center flex-1">
                  <button
                    onClick={() => { if (done) setStep(n) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition
                      ${active ? 'bg-primary-600 text-white'
                      : done   ? 'bg-primary-100 text-primary-700 cursor-pointer'
                      :          'bg-gray-100 text-gray-400 cursor-default'}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${active ? 'bg-white text-primary-600'
                      : done   ? 'bg-primary-600 text-white'
                      :          'bg-gray-300 text-gray-500'}`}>
                      {done ? <CheckCircle size={12}/> : n}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < 2 && <div className={`h-0.5 flex-1 mx-1 ${step > n ? 'bg-primary-400' : 'bg-gray-200'}`}/>}
                </div>
              )
            })}
          </div>

          {/* ── STEP 1: Your Current Plan ── */}
          {step === 1 && !canResubmit && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><RefreshCw size={17}/>Your Current Plan</h3>
              </div>
              <div className="card-body space-y-4">
                {!currentPlan ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800">
                    <AlertCircle size={17} className="shrink-0"/>
                    <div>
                      <p className="font-semibold text-sm">Membership Plan Pending</p>
                      <p className="text-xs mt-0.5">Your plan details will appear once your membership is activated by the admin. Please check back soon.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Plan card */}
                    <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-gray-900 text-lg leading-tight">{currentPlan.name}</p>
                          <p className="text-sm text-gray-500 mt-1">{durationLabel(currentPlan.duration_months)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-3xl font-black text-primary-700">{fmtAmount(currentPlan.price, currentPlan.currency)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{currentPlan.currency || 'INR'}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-primary-200 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Current Expiry</p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">{member?.expiry_date ? fmtDate(member.expiry_date) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">New Expiry After Renewal</p>
                          <p className="text-sm font-semibold text-primary-700 mt-0.5">
                            {currentPlan.duration_months >= 999 ? 'Lifetime' : projectedExpiry ? fmtDate(projectedExpiry) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-blue-800">
                      <Info size={15} className="shrink-0 mt-0.5"/>
                      <p className="text-xs">Your membership will be extended by <strong>{durationLabel(currentPlan.duration_months)}</strong> from the current expiry date upon payment approval.</p>
                    </div>

                    <button onClick={() => setStep(2)} className="btn-primary w-full text-base py-3">
                      Renew This Plan →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment Instructions ── */}
          {step === 2 && !canResubmit && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><IndianRupee size={17}/>Payment Instructions</h3>
              </div>
              <div className="card-body space-y-5">
                {/* Amount highlight */}
                <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-xl p-5 text-white text-center">
                  <p className="text-primary-200 text-xs mb-1">Amount to Pay</p>
                  <p className="text-4xl font-black">{fmtAmount(currentPlan?.price, currentPlan?.currency)}</p>
                  <p className="text-primary-300 text-xs mt-1">{currentPlan?.name}</p>
                </div>

                {/* UPI */}
                {paySettings.upi_id && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <Wallet size={20} className="text-blue-600 shrink-0 mt-0.5"/>
                    <div>
                      <p className="text-sm font-bold text-blue-800">UPI Payment</p>
                      <p className="text-xs text-blue-600 mt-0.5">UPI ID:</p>
                      <p className="font-mono font-bold text-blue-900 text-sm mt-0.5 select-all">{paySettings.upi_id}</p>
                    </div>
                  </div>
                )}

                {/* Bank transfer */}
                {(paySettings.bank_account_number || paySettings.bank_name) && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                    <Building2 size={20} className="text-green-600 shrink-0 mt-0.5"/>
                    <div className="space-y-1.5 w-full">
                      <p className="text-sm font-bold text-green-800">Bank Transfer / NEFT / RTGS</p>
                      {paySettings.bank_account_name   && <BankRow label="Account Name" value={paySettings.bank_account_name}/>}
                      {paySettings.bank_account_number && <BankRow label="Account No."  value={paySettings.bank_account_number} mono/>}
                      {paySettings.bank_ifsc           && <BankRow label="IFSC Code"    value={paySettings.bank_ifsc} mono/>}
                      {paySettings.bank_name           && <BankRow label="Bank"         value={paySettings.bank_name}/>}
                    </div>
                  </div>
                )}

                {/* Fallback */}
                {!paySettings.upi_id && !paySettings.bank_account_number && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
                    <AlertCircle size={17} className="shrink-0 mt-0.5"/>
                    Payment details are managed by your administrator. Please contact the office for UPI or bank details.
                  </div>
                )}

                {/* Methods */}
                <div>
                  <label className="label">Payment Method *</label>
                  <select className="input" value={form.payment_method_id}
                    onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}>
                    <option value="">— Select payment method —</option>
                    {methods.map(m => <option key={m.id} value={m.id}>{m.name}{m.type ? ` (${m.type.replace('_', ' ')})` : ''}</option>)}
                  </select>
                </div>

                {/* Custom instructions */}
                {paySettings.payment_instructions && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <Info size={16} className="text-gray-500 shrink-0 mt-0.5"/>
                    <p className="text-sm text-gray-700">{paySettings.payment_instructions}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-outline flex-1">← Back</button>
                  <button
                    disabled={!form.payment_method_id}
                    onClick={() => setStep(3)}
                    className="btn-primary flex-1 disabled:opacity-40">
                    Continue to Submit →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 (or Resubmit): Submit Payment ── */}
          {(step === 3 || canResubmit) && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {canResubmit ? <><RotateCcw size={17}/> Resubmit Payment</> : <><Upload size={17}/> Submit Payment Proof</>}
                </h3>
              </div>
              <div className="card-body space-y-5">
                {canResubmit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                    <XCircle size={17} className="shrink-0 mt-0.5"/>
                    <div>
                      <p className="font-semibold text-sm">Previous Payment Rejected</p>
                      {latestRenewal?.notes && <p className="text-xs mt-0.5">Reason: {latestRenewal.notes}</p>}
                      <p className="text-xs mt-1">Please complete payment again and resubmit with a new screenshot.</p>
                    </div>
                  </div>
                )}

                {/* Amount — read only */}
                <div>
                  <label className="label">Amount</label>
                  <div className="input bg-gray-50 text-gray-700 font-semibold cursor-default">
                    {canResubmit
                      ? `${fmtAmount(latestRenewal?.amount, latestRenewal?.currency)} — ${latestRenewal?.package_name || ''}`
                      : `${fmtAmount(currentPlan?.price, currentPlan?.currency)} — ${currentPlan?.name || ''}`
                    }
                  </div>
                </div>

                {/* Payment method for resubmit */}
                {canResubmit && (
                  <div>
                    <label className="label">Payment Method</label>
                    <select className="input" value={form.payment_method_id}
                      onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}>
                      <option value="">— Same as before / Select —</option>
                      {methods.map(m => <option key={m.id} value={m.id}>{m.name}{m.type ? ` (${m.type.replace('_', ' ')})` : ''}</option>)}
                    </select>
                  </div>
                )}

                {/* Transaction ID */}
                <div>
                  <label className="label">Transaction ID / Reference No. *</label>
                  <input className="input" placeholder="UPI reference, NEFT/RTGS UTR, or receipt number"
                    value={form.transaction_id}
                    onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}/>
                  <p className="text-xs text-gray-400 mt-1">Enter the exact transaction reference number from your payment app or bank.</p>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="label">Payment Screenshot *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                      ${form.screenshot ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                      onChange={e => setForm(f => ({ ...f, screenshot: e.target.files?.[0] || null }))}/>
                    {form.screenshot ? (
                      <div className="flex flex-col items-center gap-2">
                        {form.screenshot.type?.startsWith('image/') && (
                          <img src={URL.createObjectURL(form.screenshot)} alt="preview"
                            className="w-32 h-32 object-contain rounded-lg border border-gray-200"/>
                        )}
                        <p className="text-sm font-semibold text-primary-700">{form.screenshot.name}</p>
                        <p className="text-xs text-gray-400">({(form.screenshot.size / 1024).toFixed(0)} KB) · Click to change</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload size={28}/>
                        <p className="text-sm font-medium">Click to upload screenshot</p>
                        <p className="text-xs">JPG, PNG or PDF · Max 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {!canResubmit && (
                    <button onClick={() => setStep(2)} className="btn-outline flex-1">← Back</button>
                  )}
                  <button
                    onClick={canResubmit ? handleResubmit : handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {submitting
                      ? <><Loader2 size={15} className="animate-spin"/>Submitting…</>
                      : canResubmit ? 'Resubmit Payment' : 'Submit Payment'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">Your membership will be extended only after payment verification by our team.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SECTION 5: Renewal Payment History ── */}
      {renewalHistory.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><BarChart2 size={17}/>Renewal Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Package', 'Amount', 'Method', 'Transaction ID', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {renewalHistory.map(r => {
                  const scfg = renewalStatusConfig[r.status] || { label: r.status, dot: 'bg-gray-400' }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3 text-gray-900">{r.package_name || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmtAmount(r.amount, r.currency)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.payment_method_name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.transaction_id || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                          ${r.status === 'verified'  ? 'bg-green-50 border-green-200 text-green-700' :
                            r.status === 'rejected'  ? 'bg-red-50 border-red-200 text-red-700' :
                                                       'bg-amber-50 border-amber-200 text-amber-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`}/>
                          {r.status === 'verified' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Under Review'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper sub-components ──────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0"/>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className={`text-sm font-semibold text-gray-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

function BankRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-green-700 w-28 shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-green-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}


// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function MemberDashboard() {
  const navigate = useNavigate()
  const { member, loading, logout, apiClient, refetch } = useMember()
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const daysLeft = member?.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null
  const canRenewNow = daysLeft !== null && daysLeft <= 30

  useEffect(() => {
    if (!loading && !member) {
      navigate('/member/login', { replace: true })
    }
  }, [member, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 size={24} className="animate-spin text-primary-600"/>
          </div>
          <p className="text-gray-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (!member) return null

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  // ── STRICT BLOCK: member not yet active → show ONLY the blocking screen ──
  // No dashboard data, no sidebar, no interaction possible
  if (member.member_status !== 'active') {
    return <MembershipBlockedScreen member={member} onLogout={handleLogout} refetch={refetch}/>
  }

  // ── ACTIVE MEMBER: full dashboard ─────────────────────────────────────────
  const tabContent = {
    overview:  <OverviewTab member={member} onTab={setActiveTab}/>,
    profile:   <ProfileTab member={member} apiClient={apiClient} refetch={refetch}/>,
    documents: <DocumentsTab member={member} apiClient={apiClient}/>,
    payments:  <PaymentsTab apiClient={apiClient}/>,
    renewal:   <RenewalTab member={member} apiClient={apiClient}/> ,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} onTab={setActiveTab} member={member} onLogout={handleLogout}/>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="bg-black/50 flex-1" onClick={() => setMobileMenuOpen(false)}/>
          <div className="w-64">
            <Sidebar activeTab={activeTab} onTab={t => { setActiveTab(t); setMobileMenuOpen(false) }} member={member} onLogout={handleLogout}/>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-sm">F</div>
            <span className="font-bold text-gray-900">Member Dashboard</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-1 text-gray-600">
            <Activity size={20}/>
          </button>
        </div>

        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {activeTab === 'overview' ? 'Dashboard Overview' :
                 activeTab === 'profile' ? 'My Profile' :
                 activeTab === 'documents' ? 'My Documents' :
                 activeTab === 'payments' ? 'Payment History' : 'Renew Membership'}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {member.membership_id && `ID: ${member.membership_id}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="btn-outline btn-sm flex items-center gap-1.5">
                <Home size={14}/> <span className="hidden sm:inline">Homepage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 max-w-5xl">
          {tabContent[activeTab]}
        </div>
      </div>

    </div>
  )
}
