import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useMember } from '../../contexts/MemberContext'
import { getApplicationStatus, getMembershipStatus, getDisplayStatus, hasMemberDashboardAccess } from '../../utils/memberAccess'
import { clearMemberApplicantSession } from '../../utils/memberSession'
import {
  User, Award, CreditCard, FileText, Download, LogOut,
  Clock, CheckCircle, AlertCircle, RefreshCw, Eye,
  Shield, MapPin, Phone, Mail, Calendar, Settings,
  ChevronRight, Loader2, Bell, Home, Activity,
  XCircle, HelpCircle, Wallet, BarChart2,
  Upload, IndianRupee, Building2, Banknote, Info, RotateCcw, Edit2,
  Globe, Link2, ExternalLink
} from 'lucide-react'
import { getCurrencySymbol, fmtAmount } from '../../utils/currency'
import { assetUrl } from '../../utils/assetUrl'
import MemberPublicProfileSection from '../../components/member/MemberPublicProfileSection'

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
    <div className="w-64 bg-gradient-sidebar border-r border-white/10 flex flex-col h-screen sticky top-0 shrink-0 text-white shadow-soft-lg">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-cta flex items-center justify-center text-white font-display font-black shadow-glow">F</div>
          <div>
            <p className="font-display font-bold text-sm">FORTI</p>
            <p className="text-xs text-primary-200/70">Member Dashboard</p>
          </div>
        </div>
      </div>

      {/* Member info */}
      {member && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-gold flex items-center justify-center text-white font-bold text-lg">
              {(member.full_name || member.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">{member.full_name || 'Member'}</p>
              <p className="text-xs text-primary-200/70 truncate">{member.membership_id}</p>
            </div>
          </div>
          {getMembershipStatus(member) && <div className="mt-2"><MemberStatusBadge status={getMembershipStatus(member)}/></div>}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onTab(id)}
            className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition
              ${activeTab === id
                ? 'bg-white/15 text-white border-l-[3px] border-accent-gold pl-[9px]'
                : 'text-primary-100/80 hover:bg-white/10 hover:text-white'}`}>
            <Icon size={17}/>{label}
            {activeTab === id && <ChevronRight size={14} className="ml-auto opacity-50"/>}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 text-red-300 hover:bg-red-500/10 transition mb-2">
          <LogOut size={17}/>Logout
        </button>
        <p className="text-center text-xs text-primary-300/50">
          Developed by{' '}
          <a
            href="https://kaitensoftware.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-blue-600 transition-colors font-medium underline-offset-2 hover:underline"
          >
            Kaiten Software
          </a>
        </p>
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
export function MembershipBlockedScreen({ member, onLogout, refetch }) {
  const appStatus = getApplicationStatus(member)
  const displayStatus = getDisplayStatus(member)
  const statusInfo = STATUS_MAP[displayStatus] || { label: 'Status Pending', color: 'badge-gray', icon: Clock }
  const StatusIcon = statusInfo.icon
  const msg = STATUS_MESSAGES[displayStatus] || 'Status update in progress. Please check back soon.'
  const isRejected = displayStatus === 'rejected'

  // Poll backend every 8 seconds; auto-unlocks when member_status becomes 'active'
  useEffect(() => {
    const id = setInterval(() => refetch?.(), 8000)
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
                <span>Auto-updating every 8s</span>
              </div>
            </div>
            <StatusTimeline status={appStatus} membershipStatus={getMembershipStatus(member)}/>
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

function StatusTimeline({ status, membershipStatus }) {
  if (membershipStatus === 'active') {
    return (
      <div className="mt-4">
        <div className="relative flex flex-col gap-0">
          {TIMELINE_STEPS.map((step, idx) => {
            const done = idx < TIMELINE_STEPS.length - 1
            const current = idx === TIMELINE_STEPS.length - 1

            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center w-6 shrink-0">
                  {idx > 0 && (
                    <div className="w-0.5 h-4 -mt-0 bg-primary-500"/>
                  )}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${done ? 'bg-primary-600 border-primary-600' : 'bg-white border-primary-600 shadow-[0_0_0_3px_rgba(91,33,182,0.15)]'}`}>
                    {done && <CheckCircle size={11} className="text-white" strokeWidth={3}/>}
                    {current && <div className="w-2 h-2 rounded-full bg-primary-600"/>}
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className="w-0.5 h-6 bg-primary-500"/>
                  )}
                </div>
                <p className={`text-sm py-0.5 ${done ? 'text-primary-700 font-medium' : 'text-primary-800 font-bold'}`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

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
function OverviewTab({ member, onTab, apiClient }) {
  if (!member) return null
  const daysLeft = member.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null

  const [profileData, setProfileData] = useState(null)
  const [copyToggled, setCopyToggled] = useState(false)
  const [togglingUrl, setTogglingUrl] = useState(false)

  const photoUrl = member.data?.profile_photo || member.profile_photo_path || profileData?.profile?.profile_photo_path

  useEffect(() => {
    apiClient().get('/member/public-profile')
      .then(res => setProfileData(res.data.data))
      .catch(console.error)
  }, [])

  async function handleToggleVisibility() {
    if (!profileData || togglingUrl) return
    setTogglingUrl(true)
    const newStatus = !(profileData.profile?.is_public)
    try {
      await apiClient().patch('/member/public-profile/visibility', { is_public: newStatus })
      setProfileData(prev => ({
        ...prev,
        profile: { ...prev.profile, is_public: newStatus }
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setTogglingUrl(false)
    }
  }

  function handleCopy() {
    if (!profileData?.public_url) return
    const fullUrl = `${window.location.origin}${profileData.public_url}`
    navigator.clipboard.writeText(fullUrl)
    setCopyToggled(true)
    setTimeout(() => setCopyToggled(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-[24px] p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1">
          <p className="text-primary-200 text-sm mb-1">Welcome back,</p>
          <h2 className="text-3xl font-black">{member.full_name || 'Member'}</h2>
          <p className="text-primary-200 text-sm mt-1">Membership ID: <span className="font-mono text-white">{member.membership_id}</span></p>
          <div className="flex flex-wrap gap-6 mt-6">
            <div>
              <p className="text-xs text-primary-300 mb-1">Status</p>
              <MemberStatusBadge status={getMembershipStatus(member)}/>
            </div>
            {member.expiry_date && (
              <div>
                <p className="text-xs text-primary-300 mb-1">Expires</p>
                <p className="text-sm font-semibold bg-white/10 px-3 py-1 rounded-lg">{new Date(member.expiry_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
              </div>
            )}
            {(member.package_name || member.plan_type) && (
              <div>
                <p className="text-xs text-primary-300 mb-1">Package</p>
                <p className="text-sm font-semibold bg-white/10 px-3 py-1 rounded-lg">{member.package_name || (member.plan_type === 'lifetime' ? 'Lifetime' : member.plan_type === '3years' || member.plan_type === '3_years' ? '3 Year Plan' : member.plan_type === 'yearly' || member.plan_type === '1year' ? '1 Year Plan' : member.plan_type)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Avatar / Photo Slot */}
        <div className="shrink-0 flex items-center justify-center md:justify-end">
          {photoUrl ? (
            <img 
              src={assetUrl(photoUrl)} 
              alt="Profile" 
              className="w-36 h-36 md:w-[185px] md:h-[185px] rounded-2xl object-cover border-4 border-white/20 shadow-xl hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-36 h-36 md:w-[185px] md:h-[185px] rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white font-black text-4xl border-4 border-white/20 shadow-xl">
              {(member.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* Share Profile Banner */}
          {profileData && profileData.public_url && (
            <div className="rounded-[24px] border border-primary-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <Globe size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Share Your Profile</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Share your FORTI public profile with others.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium whitespace-nowrap bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700">Visible to Public</span>
                    <input type="checkbox" className="w-4 h-4 accent-primary-600" 
                      checked={!!profileData.profile?.is_public} 
                      onChange={handleToggleVisibility} 
                      disabled={togglingUrl} />
                  </label>
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row items-center gap-2">
                <div className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate select-all">
                  {window.location.origin}{profileData.public_url}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleCopy} disabled={!profileData.profile?.is_public} className="flex-1 sm:flex-none btn-primary py-3 px-5 flex items-center justify-center gap-2 disabled:opacity-50 rounded-xl">
                    {copyToggled ? <CheckCircle size={16}/> : <Link2 size={16}/>}
                    {copyToggled ? 'Copied!' : 'Copy'}
                  </button>
                  <a href={profileData.public_url} target="_blank" rel="noreferrer" 
                     className={`flex-1 sm:flex-none btn-outline py-3 px-5 flex items-center justify-center gap-2 rounded-xl ${!profileData.profile?.is_public ? 'opacity-50 pointer-events-none' : ''}`}>
                    <ExternalLink size={16}/> Preview
                  </a>
                </div>
              </div>
              {!profileData.profile?.is_public && (
                <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>Turn on <strong>Visible to Public</strong> to activate your link. People won't be able to view your profile until you do.</p>
                </div>
              )}
            </div>
          )}

          {/* Payment & Application Details */}
          {(member.applied_at || member.payment_amount) && (
            <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                {member.applied_at && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">Applied On</p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(member.applied_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {member.payment_amount && (
                  <div className={`flex items-center justify-between ${member.applied_at ? 'pt-4 border-t border-gray-100' : ''}`}>
                    <p className="text-sm text-gray-500 font-medium">Amount Paid</p>
                    <p className="text-sm font-black text-primary-700">
                      ₹{Number(member.payment_amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Download Certificate', icon: Award, tab: 'documents', color: 'text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 hover:border-amber-200' },
              { label: 'Download ID Card',     icon: CreditCard, tab: 'documents', color: 'text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200' },
              { label: 'Download Invoice',     icon: FileText, tab: 'documents', color: 'text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200' },
            ].map(({ label, icon: Icon, tab, color }) => (
              <button key={label} onClick={() => onTab(tab)}
                className={`flex flex-col items-center gap-3 p-6 rounded-[20px] transition shadow-sm ${color}`}>
                <Icon size={28}/>
                <span className="text-sm font-bold text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          {/* Expiry warning */}
          {daysLeft !== null && daysLeft <= 30 && getMembershipStatus(member) === 'active' && (
            <div className={`flex items-start gap-3 p-5 rounded-[20px] border shadow-sm ${daysLeft <= 7 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <Bell size={20} className="shrink-0 mt-0.5"/>
              <div>
                <p className="font-bold text-base">Membership Expiring!</p>
                <p className="text-sm mt-1">Your membership expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.</p>
                <button onClick={() => onTab('renewal')} className="mt-3 text-sm font-bold underline px-3 py-1.5 bg-white rounded-lg shadow-sm w-fit border border-current/20">Renew Now →</button>
              </div>
            </div>
          )}

          {/* Application status */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
              <Activity size={18} className="text-primary-600"/>
              <h3 className="font-bold text-gray-900 text-lg">Application Status</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-1 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Current Phase</p>
                <StatusBadge status={getDisplayStatus(member)}/>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <StatusTimeline status={getApplicationStatus(member)} membershipStatus={getMembershipStatus(member)}/>
              </div>
            </div>
          </div>
        </div>
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
    full_name: member?.full_name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    company_name: data?.organisation_name || data?.organization_name || data?.company_name || '',
    designation: data?.designation || '',
    address: data?.address || '',
    city: data?.city || '',
    state: data?.state || '',
    pin_code: data?.pin_code || '',
  })
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!editing) {
      setForm({
        full_name: member?.full_name || '',
        email: member?.email || '',
        phone: member?.phone || '',
        company_name: data?.organisation_name || data?.organization_name || data?.company_name || '',
        designation: data?.designation || '',
        address: data?.address || '',
        city: data?.city || '',
        state: data?.state || '',
        pin_code: data?.pin_code || '',
      })
    }
  }, [member, data, editing])

  function handleCancel() {
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setSaveError('Full name is required.'); return }
    if (!form.email.trim()) { setSaveError('Email is required.'); return }
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

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    setSaving(true); setSaveError(null);
    try {
      await apiClient().post('/member/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSaveOk(true);
      await refetch();
      setTimeout(() => setSaveOk(false), 4000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const displayFields = [
    { label: 'Full Name',       value: member.full_name,        icon: User },
    { label: 'Email',           value: member.email,             icon: Mail },
    { label: 'Phone',           value: member.phone || data.phone, icon: Phone },
    { label: 'Organisation',    value: data.organisation_name || data.organization_name || data.company_name,   icon: Building2 },
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
            <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
              {data.profile_photo ? (
                <img src={assetUrl(data.profile_photo)} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary-200 group-hover:opacity-75 transition-opacity"/>
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-3xl group-hover:opacity-75 transition-opacity">
                  {(member.full_name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Upload size={20} />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900">{member.full_name}</h4>
              <p className="text-gray-500 text-sm mb-1">{member.email}</p>
              <div className="flex items-center gap-3">
                <MemberStatusBadge status={getMembershipStatus(member)}/>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                  <Upload size={12}/> Change Photo
                </button>
              </div>
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
                  <label className="label">Email *</label>
                  <input className="input" type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Your email address"/>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"/>
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

      <MemberPublicProfileSection apiClient={apiClient} />

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
      const url = `/member/${type}/${uuid}/download`
      const res = await apiClient().get(url, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `FORTI_${type}_${uuid}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      alert(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloading(d => ({ ...d, [type]: false }))
    }
  }

  // Documents unlocked once payment is verified OR membership is active
  const isApproved = getMembershipStatus(member) === 'active' ||
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
      const res = await apiClient().get(`/member/invoice/${submissionUuid}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `FORTI_Invoice_${membershipId || submissionUuid}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      alert(err.response?.data?.message || 'Invoice download failed')
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
            <table className="w-full text-sm min-w-[700px]">
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
  const [methods, setMethods]             = useState([])
  const [paySettings, setPaySettings]     = useState({})
  const [renewalHistory, setRenewalHistory] = useState([])
  const [latestRenewal, setLatestRenewal] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [notification, setNotification]  = useState(null)
  const [dragActive, setDragActive]       = useState(false)
  const [previewUrl, setPreviewUrl]       = useState('')
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

  useEffect(() => {
    if (!form.screenshot) {
      setPreviewUrl('')
      return undefined
    }
    if (!form.screenshot.type?.startsWith('image/')) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(form.screenshot)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [form.screenshot])

  useEffect(() => {
    if (!methods.length) return
    if (form.payment_method_id && methods.some(method => String(method.id) === String(form.payment_method_id))) return
    setForm(current => ({ ...current, payment_method_id: String(methods[0].id) }))
  }, [methods])

  function refreshRenewals() {
    return apiClient().get('/member/renewals').catch(() => ({ data: { data: [] } }))
  }

  function handleFileSelect(file) {
    if (!file) return
    setForm(current => ({ ...current, screenshot: file }))
  }

  function clearFile() {
    setForm(current => ({ ...current, screenshot: null }))
    if (fileRef.current) fileRef.current.value = ''
  }

  function onDrop(event) {
    event.preventDefault()
    setDragActive(false)
    handleFileSelect(event.dataTransfer.files?.[0] || null)
  }

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
      const rnRes = await refreshRenewals()
      const history = rnRes.data.data || []
      setRenewalHistory(history)
      setLatestRenewal(history[0] || null)
      setForm({ payment_method_id: '', transaction_id: '', screenshot: null })
      clearFile()
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
      const rnRes = await refreshRenewals()
      const history = rnRes.data.data || []
      setRenewalHistory(history)
      setLatestRenewal(history[0] || null)
      setForm(f => ({ ...f, transaction_id: '', screenshot: null }))
      clearFile()
    } catch (err) {
      notify('error', err.response?.data?.message || 'Resubmission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const daysLeft = member?.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null
  const isLifetimeMembership = (() => {
    if (currentPlan?.duration_months && Number(currentPlan.duration_months) >= 999) return true
    return /lifetime/i.test(currentPlan?.name || member?.package_name || '')
  })()
  const canRenewNow = !isLifetimeMembership && daysLeft !== null && daysLeft <= 30

  const membershipStatus = () => {
    if (getMembershipStatus(member) === 'active' && daysLeft !== null && daysLeft > 30) return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
    if (getMembershipStatus(member) === 'active' && daysLeft !== null && daysLeft <= 30 && daysLeft > 0) return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' }
    if (daysLeft !== null && daysLeft <= 0) return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' }
    if (getMembershipStatus(member) === 'active') return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' }
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
  const selectedMethod = methods.find(method => String(method.id) === String(form.payment_method_id)) || methods[0] || null
  const selectedInstruction = selectedMethod?.instructions || paySettings.payment_instructions
  const selectedQr = assetUrl(selectedMethod?.qr_image)
  const selectedUpiId = selectedMethod?.upi_id || paySettings.upi_id
  const bankDetails = {
    accountName: selectedMethod?.account_name || paySettings.bank_account_name,
    accountNumber: selectedMethod?.account_number || paySettings.bank_account_number,
    ifscCode: selectedMethod?.ifsc_code || paySettings.bank_ifsc,
    bankName: selectedMethod?.bank_name || paySettings.bank_name,
    swiftCode: selectedMethod?.swift_code,
    iban: selectedMethod?.iban,
    bankAddress: selectedMethod?.bank_address,
  }
  const showIntegratedForm = canRenewNow && !hasPending && (canSubmitNew || canResubmit)

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
            <p className="font-semibold text-sm">{isLifetimeMembership ? 'This Membership Does Not Require Renewal' : 'Renewal Not Available Yet'}</p>
            <p className="text-xs mt-0.5">
              {isLifetimeMembership
                ? 'Your current plan is a lifetime membership, so no renewal request is needed.'
                : <>Your membership expires on <strong>{member?.expiry_date ? fmtDate(member.expiry_date) : '—'}</strong>. Renewal will be available during the last <strong>30 days</strong> before expiry.</>}
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

      {/* ── SECTION 4: Integrated Renewal Request ── */}
      {showIntegratedForm && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {canResubmit ? <><RotateCcw size={17}/> Renew Membership</> : <><RefreshCw size={17}/> Renew Membership</>}
            </h3>
          </div>
          <div className="card-body space-y-5">
            {canResubmit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                <XCircle size={17} className="shrink-0 mt-0.5"/>
                <div>
                  <p className="font-semibold text-sm">Previous Renewal Request Was Rejected</p>
                  {latestRenewal?.notes && <p className="text-xs mt-0.5">Reason: {latestRenewal.notes}</p>}
                  <p className="text-xs mt-1">Please make payment again, upload a fresh receipt, and resubmit your renewal request.</p>
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Selected Renewal Plan</p>
                      <p className="mt-2 text-xl font-bold text-gray-900 leading-tight">{canResubmit ? (latestRenewal?.package_name || currentPlan?.name || '—') : (currentPlan?.name || '—')}</p>
                      <p className="mt-1 text-sm text-primary-800/80">{durationLabel(canResubmit ? currentPlan?.duration_months : currentPlan?.duration_months)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-primary-700">{canResubmit ? fmtAmount(latestRenewal?.amount, latestRenewal?.currency) : fmtAmount(currentPlan?.price, currentPlan?.currency)}</p>
                      <p className="text-xs text-primary-700/70 mt-1">Renewal fee</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary-200 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-primary-700/70">Current Expiry</p>
                      <p className="mt-1 font-semibold text-gray-900">{member?.expiry_date ? fmtDate(member.expiry_date) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-primary-700/70">Projected Renewal End</p>
                      <p className="mt-1 font-semibold text-primary-700">{currentPlan?.duration_months >= 999 ? 'Lifetime' : projectedExpiry ? fmtDate(projectedExpiry) : '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
                  <div>
                    <label className="label">Payment Method *</label>
                    <select className="input" value={form.payment_method_id}
                      onChange={e => setForm(f => ({ ...f, payment_method_id: e.target.value }))}>
                      <option value="">— Select payment method —</option>
                      {methods.map(m => <option key={m.id} value={m.id}>{m.name}{m.type ? ` (${m.type.replace('_', ' ')})` : ''}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label">Transaction ID / Reference No. *</label>
                    <input className="input" placeholder="UPI reference, NEFT/RTGS UTR, or receipt number"
                      value={form.transaction_id}
                      onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}/>
                    <p className="text-xs text-gray-400 mt-1">Enter the exact payment reference shown in your banking or payment app.</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-blue-800">
                    <Info size={15} className="shrink-0 mt-0.5"/>
                    <p className="text-xs">Your renewal request will be sent to the admin review queue immediately after you upload payment proof and submit.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Payment Instructions</p>
                      <p className="text-xs text-gray-500 mt-0.5">Complete the payment using the selected method, then upload the receipt below.</p>
                    </div>
                    {selectedMethod?.type && (
                      <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-600">
                        {selectedMethod.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {selectedMethod ? (
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                      <div className="space-y-3">
                        {selectedUpiId && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                            <Wallet size={18} className="text-blue-600 shrink-0 mt-0.5"/>
                            <div>
                              <p className="text-sm font-semibold text-blue-900">UPI ID</p>
                              <p className="text-sm font-mono font-semibold text-blue-800 mt-1 select-all">{selectedUpiId}</p>
                            </div>
                          </div>
                        )}

                        {(bankDetails.accountNumber || bankDetails.bankName || bankDetails.accountName) && (
                          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                            <Banknote size={18} className="text-green-600 shrink-0 mt-0.5"/>
                            <div className="space-y-1.5 w-full">
                              <p className="text-sm font-semibold text-green-900">Bank Transfer Details</p>
                              {bankDetails.accountName && <BankRow label="Account Name" value={bankDetails.accountName}/>} 
                              {bankDetails.accountNumber && <BankRow label="Account No." value={bankDetails.accountNumber} mono/>}
                              {bankDetails.ifscCode && <BankRow label="IFSC Code" value={bankDetails.ifscCode} mono/>}
                              {bankDetails.bankName && <BankRow label="Bank" value={bankDetails.bankName}/>} 
                              {bankDetails.swiftCode && <BankRow label="SWIFT" value={bankDetails.swiftCode} mono/>}
                              {bankDetails.iban && <BankRow label="IBAN" value={bankDetails.iban} mono/>}
                              {bankDetails.bankAddress && <BankRow label="Address" value={bankDetails.bankAddress}/>} 
                            </div>
                          </div>
                        )}

                        {selectedInstruction && (
                          <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3">
                            <Info size={16} className="text-gray-500 shrink-0 mt-0.5"/>
                            <p className="text-sm text-gray-700">{selectedInstruction}</p>
                          </div>
                        )}
                      </div>

                      {selectedQr && (
                        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm md:w-[170px]">
                          <img src={selectedQr} alt="Payment QR" className="w-full aspect-square object-contain rounded-lg bg-white border border-gray-200"/>
                          <p className="mt-2 text-center text-xs text-gray-500">Scan to pay</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-800 text-sm">
                      <AlertCircle size={17} className="shrink-0 mt-0.5"/>
                      Select a payment method to view UPI, QR, or bank transfer instructions.
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Upload Payment Proof</p>
                      <p className="text-xs text-gray-500 mt-0.5">Upload a payment screenshot or PDF receipt. You can replace the file before submitting.</p>
                    </div>
                    {form.screenshot && (
                      <button type="button" onClick={clearFile} className="text-xs font-semibold text-red-600 hover:text-red-700 transition">
                        Remove
                      </button>
                    )}
                  </div>

                  <div
                    onDragOver={event => { event.preventDefault(); setDragActive(true) }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${dragActive ? 'border-primary-400 bg-primary-50' : form.screenshot ? 'border-primary-300 bg-primary-50/60' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => handleFileSelect(e.target.files?.[0] || null)}
                    />
                    {form.screenshot ? (
                      <div className="flex flex-col items-center gap-3">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Receipt preview" className="w-28 h-28 object-cover rounded-lg border border-gray-200 bg-white"/>
                        ) : (
                          <div className="w-28 h-28 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400">
                            <FileText size={28}/>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-primary-700 break-all">{form.screenshot.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(form.screenshot.size / 1024 / 1024).toFixed(2)} MB · Click or drop to replace</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload size={28}/>
                        <p className="text-sm font-medium text-gray-600">Drag & drop receipt here, or click to upload</p>
                        <p className="text-xs">Supports JPG, PNG, WEBP and PDF</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={canResubmit ? handleResubmit : handleSubmit}
                    disabled={submitting || !form.payment_method_id}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting
                      ? <><Loader2 size={15} className="animate-spin"/>Submitting…</>
                      : canResubmit ? 'Resubmit Renewal Request' : 'Submit Renewal Request'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">Your renewal becomes active only after the admin verifies your payment proof.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Renewal Payment History ── */}
      {renewalHistory.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><BarChart2 size={17}/>Renewal Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
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
  const { token, member, loading, logout, apiClient, refetch } = useMember()
  const [activeTab, setActiveTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showExpiryPopup, setShowExpiryPopup] = useState(true)
  const daysLeft = member?.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null
  const canRenewNow = daysLeft !== null && daysLeft <= 30



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
  
  function handleLogout() {
    clearMemberApplicantSession()
    logout()
    navigate('/', { replace: true })
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col space-y-4 bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Unable to load dashboard</h2>
        <p className="text-gray-500 max-w-md">We couldn't retrieve your member profile. The server might be experiencing issues, or your session may be invalid.</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
          <button onClick={handleLogout} className="btn-secondary">Log Out</button>
        </div>
      </div>
    )
  }

  // ── STRICT BLOCK: role = applicant OR member not yet active → show ONLY the blocking screen ──
  // No dashboard data, no sidebar, no interaction possible
  if (!hasMemberDashboardAccess(member)) {
    return <MembershipBlockedScreen member={member} onLogout={handleLogout} refetch={refetch}/>
  }

  // ── ACTIVE MEMBER: full dashboard ─────────────────────────────────────────
  // Use member identity as key to force re-mount all tabs on user change
  const sessionKey = member.submission_id || member.email || member.id
  const tabContent = {
    overview:  <OverviewTab key={`o-${sessionKey}`} member={member} onTab={setActiveTab} apiClient={apiClient}/>,
    profile:   <ProfileTab key={`p-${sessionKey}`} member={member} apiClient={apiClient} refetch={refetch}/>,
    documents: <DocumentsTab key={`d-${sessionKey}`} member={member} apiClient={apiClient}/>,
    payments:  <PaymentsTab key={`pay-${sessionKey}`} apiClient={apiClient}/>,
    renewal:   <RenewalTab key={`r-${sessionKey}`} member={member} apiClient={apiClient}/> ,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">

      {/* Desktop Sidebar — only visible on lg+ */}
      <div className="hidden lg:block shrink-0">
        <Sidebar activeTab={activeTab} onTab={setActiveTab} member={member} onLogout={handleLogout}/>
      </div>

      {/* Mobile Sidebar — slides in from left on small screens */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="bg-black/50 backdrop-blur-sm absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            <Sidebar
              activeTab={activeTab}
              onTab={t => { setActiveTab(t); setMobileMenuOpen(false) }}
              member={member}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black text-sm">F</div>
            <span className="font-bold text-gray-900 text-sm">FORTI Member</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-2 text-gray-500 hover:text-primary-600 transition" aria-label="Homepage">
              <Home size={18}/>
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-600 hover:text-primary-600 transition"
              aria-label="Open sidebar menu"
            >
              <Activity size={20}/>
            </button>
          </div>
        </div>

        {/* Desktop Page header */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
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
                <Home size={14}/> Homepage
              </button>
            </div>
          </div>
        </div>

        {/* Tab content — extra bottom padding on mobile for the bottom nav */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 w-full max-w-[1400px] mx-auto pb-24 lg:pb-6">
            {tabContent[activeTab]}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="Member navigation">
        {[
          { id: 'overview',  label: 'Overview',  icon: Home },
          { id: 'profile',   label: 'Profile',   icon: User },
          { id: 'documents', label: 'Documents', icon: Award },
          { id: 'payments',  label: 'Payments',  icon: CreditCard },
          { id: 'renewal',   label: 'Renew',     icon: RefreshCw },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={activeTab === id ? 22 : 20} strokeWidth={activeTab === id ? 2.5 : 1.5} />
            <span>{label}</span>
            {activeTab === id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Expiry Warning Popup */}
      {daysLeft !== null && daysLeft <= 90 && getMembershipStatus(member) === 'active' && showExpiryPopup && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 shadow-2xl max-w-[calc(100vw-2rem)]">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 p-4 max-w-sm flex items-start gap-3 w-80">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-gray-900">Plan Expiring</h3>
                <button onClick={() => setShowExpiryPopup(false)} className="text-gray-400 hover:text-gray-600 transition">
                  <XCircle size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Your membership expires in <strong className="text-amber-700">{daysLeft} days</strong>.
              </p>
              <button 
                onClick={() => { setActiveTab('renewal'); setShowExpiryPopup(false) }} 
                className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition shadow-sm"
              >
                Renew Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
