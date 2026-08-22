import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, User, Shield, Phone, Mail, MapPin, Building2,
  Calendar, Award, CreditCard, Activity, Link2, Globe,
  Clock, FileText, CheckCircle, AlertCircle, RefreshCw,
  Download, Edit3, Save, X, Loader2, Copy, ExternalLink,
  Eye, Briefcase, StickyNote, Image as ImageIcon, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import { assetUrl } from '../../../utils/assetUrl'
import { fmtAmount } from '../../../utils/currency'
import CopyMembershipId from '../../../components/admin/CopyMembershipId'
import MemberOrgPanel from '../../../components/admin/MemberOrgPanel'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'

function downloadFile(url, filename) {
  return api.get(url, { responseType: 'blob' })
    .then(resp => {
      const blobUrl = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    })
    .catch(err => {
      toast.error(err.response?.data?.message || 'Download failed')
      throw err
    })
}

function StatusBadge({ status }) {
  const MAP = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  const key = String(status || '').toLowerCase()
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${MAP[key] || MAP.inactive}`}>
      {status ? String(status).replace(/_/g, ' ') : '—'}
    </span>
  )
}

function SectionCard({ title, icon: Icon, children, className = '', action = null }) {
  return (
    <div className={`bg-white border border-primary-100/50 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="border-b border-gray-100 bg-gray-50/70 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
          <Icon size={17} className="text-primary-600 shrink-0" />
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

function InfoItem({ label, value, icon: Icon, mono, full }) {
  return (
    <div className={`flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100/80 ${full ? 'sm:col-span-2' : ''}`}>
      {Icon && <Icon size={15} className="text-primary-500 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <p className={`text-sm font-semibold text-gray-900 mt-0.5 break-words ${mono ? 'font-mono tracking-tight' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <Icon size={28} className="mx-auto mb-2 text-gray-300" />
      <p className="font-medium text-gray-700 text-sm">{title}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function durationLabel(member) {
  const name = `${member.package_name || ''} ${member.package_duration || ''}`.toLowerCase()
  if (name.includes('lifetime')) return 'Lifetime'
  if (name.includes('3 year') || name.includes('3year') || member.plan_type === '3years') return '3 Years'
  if (name.includes('2 year') || name.includes('2year') || member.plan_type === '2years') return '2 Years'
  if (name.includes('year') || member.plan_type === 'yearly' || member.plan_type === '1year') return '1 Year'
  return member.plan_type || member.package_duration || '—'
}

function activityLabel(type) {
  const map = {
    application_submitted: 'Application submitted',
    under_review: 'Marked under review',
    payment_submitted: 'Payment submitted',
    payment_verified: 'Payment verified',
    payment_rejected: 'Payment rejected',
    approved: 'Application approved',
    rejected: 'Application rejected',
    activated: 'Membership activated',
    membership_activated: 'Membership activated',
    renewal: 'Renewal processed',
    note_added: 'Internal note added',
  }
  return map[type] || String(type || 'Event').replace(/_/g, ' ')
}

function MemberEditForm({ member, parsedData, onCancel, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    applicant_name: member.applicant_name || '',
    applicant_email: member.applicant_email || '',
    applicant_phone: member.applicant_phone || '',
    organisation_name: parsedData.organisation_name || parsedData.organization_name || parsedData.company_name || '',
    membership_id: member.membership_id || '',
    wing_id: member.wing_id || '',
    package_id: member.package_id || '',
    membership_type: member.membership_type || '',
    plan_type: member.plan_type || '',
    member_status: member.member_status || 'active',
    expiry_date: member.expiry_date ? String(member.expiry_date).split('T')[0] : '',
  })

  const { data: wings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: () => api.get('/wings').then(r => r.data.data),
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then(r => r.data.data),
  })

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/members/${member.id}`, formData)
      toast.success('Member updated')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Edit Member Information" icon={Edit3} className="border-primary-200 ring-1 ring-primary-100">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input name="applicant_name" value={formData.applicant_name} onChange={handleChange} className="input w-full" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input name="applicant_email" type="email" value={formData.applicant_email} onChange={handleChange} className="input w-full" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
            <input name="applicant_phone" value={formData.applicant_phone} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Organization</label>
            <input name="organisation_name" value={formData.organisation_name} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Membership ID</label>
            <input name="membership_id" value={formData.membership_id} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Wing</label>
            <select name="wing_id" value={formData.wing_id} onChange={handleChange} className="input w-full">
              <option value="">Select Wing</option>
              {wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Package</label>
            <select name="package_id" value={formData.package_id} onChange={handleChange} className="input w-full">
              <option value="">Select Package</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Membership Type</label>
            <select name="membership_type" value={formData.membership_type} onChange={handleChange} className="input w-full">
              <option value="">Select Type</option>
              <option value="corporate">Corporate</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Duration / Plan</label>
            <input name="plan_type" value={formData.plan_type} onChange={handleChange} className="input w-full" placeholder="e.g. lifetime, 3years" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry Date</label>
            <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select name="member_status" value={formData.member_status} onChange={handleChange} className="input w-full">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="btn-outline px-4 py-2 flex items-center justify-center gap-2">
            <X size={16} /> Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

const TABS = [
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'renewals', label: 'Renewals', icon: RefreshCw },
  { id: 'positions', label: 'Positions', icon: Layers },
  { id: 'activity', label: 'Activity', icon: Activity },
]

export default function AdminMemberFullProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [tab, setTab] = useState('payments')
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [proofUrl, setProofUrl] = useState(null)
  const [certBusy, setCertBusy] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'members', 'full', id],
    queryFn: () => api.get(`/members/${id}/full`).then(r => r.data.data),
  })

  const member = data?.member
  const profile = data?.profile
  const links = data?.links || []
  const paymentHistory = data?.paymentHistory || []
  const renewalHistory = data?.renewalHistory || []
  const positionHistory = data?.positionHistory || []
  const activity = data?.activity || []
  const notes = data?.notes || []
  const certificate = data?.certificate || {}

  const parsedData = useMemo(() => {
    try {
      return typeof member?.data === 'string' ? JSON.parse(member.data) : (member?.data || {})
    } catch {
      return {}
    }
  }, [member])

  const primaryAccount = member?.accounts?.find(a => a.is_active) || member?.accounts?.[0] || {}
  const displayName = primaryAccount.full_name || member?.applicant_name || 'Member'
  const displayEmail = primaryAccount.email || member?.applicant_email
  const displayPhone = primaryAccount.phone || member?.applicant_phone
  const displayOrg = parsedData.organisation_name || parsedData.organization_name || parsedData.company_name || '—'
  const photoPath = profile?.profile_photo_path || parsedData.profile_photo || member?.profile_photo_path
  const publicSlug = profile?.public_slug
  const publicUrl = publicSlug ? `${window.location.origin}/m/${publicSlug}` : null
  const publicPath = publicSlug ? `/m/${publicSlug}` : null
  const paymentStatus = paymentHistory[0]?.status || member?.payment_status || null
  const designation = member?.position || parsedData.designation || parsedData.position || null

  async function copyPublicUrl() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success('Public URL copied')
    } catch {
      toast.error('Could not copy URL')
    }
  }

  async function handleDownloadCert() {
    setCertBusy(true)
    try {
      await downloadFile(`/certificates/${member.id}`, `certificate-${member.membership_id || member.id}.pdf`)
      toast.success('Certificate downloaded')
    } finally {
      setCertBusy(false)
    }
  }

  async function handlePreviewCert() {
    setCertBusy(true)
    try {
      const resp = await api.get(`/certificates/${member.id}`, { responseType: 'blob' })
      const blobUrl = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed')
    } finally {
      setCertBusy(false)
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    const note = noteText.trim()
    if (!note) return
    setNoteSaving(true)
    try {
      await api.post(`/members/${id}/notes`, { note })
      setNoteText('')
      toast.success('Note added')
      refetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note')
    } finally {
      setNoteSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-primary-600" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading member profile…</p>
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 border border-red-200">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Unable to load profile</h4>
            <p className="text-sm mt-0.5">Member not found or the server returned an error.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/members')} className="mt-4 text-primary-600 hover:underline flex items-center gap-1 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Members
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="p-2 hover:bg-white rounded-xl text-gray-500 border border-transparent hover:border-gray-200 transition shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Member 360° Profile</h1>
            <p className="text-sm text-gray-500 truncate">
              {displayName}
              {isFetching && <span className="ml-2 text-primary-500">Refreshing…</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!isEditing && (
            <button type="button" onClick={() => setIsEditing(true)} className="btn-outline btn-sm flex items-center gap-1.5">
              <Edit3 size={14} /> Edit Member
            </button>
          )}
          {publicPath ? (
            <a href={publicPath} target="_blank" rel="noreferrer" className="btn-primary btn-sm flex items-center gap-1.5">
              <ExternalLink size={14} /> View Public Profile
            </a>
          ) : (
            <button type="button" disabled className="btn-outline btn-sm opacity-50 cursor-not-allowed flex items-center gap-1.5" title="Public profile not configured">
              <ExternalLink size={14} /> View Public Profile
            </button>
          )}
          <Link to={`/applications/${member.id}`} className="btn-outline btn-sm flex items-center gap-1.5">
            <FileText size={14} /> Application
          </Link>
        </div>
      </div>

      {isEditing ? (
        <MemberEditForm
          member={member}
          parsedData={parsedData}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => { setIsEditing(false); refetch(); qc.invalidateQueries({ queryKey: ['members'] }) }}
        />
      ) : (
        <>
          <div className="bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 rounded-2xl p-5 sm:p-7 text-white shadow-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row gap-5 sm:items-center">
              <div className="shrink-0">
                {photoPath ? (
                  <img src={assetUrl(photoPath)} alt={displayName} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white/20 shadow-xl" />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-3xl font-black shadow-xl">
                    {(displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight truncate">{displayName}</h2>
                    <p className="text-primary-100/90 font-medium mt-0.5 truncate flex items-center gap-1.5">
                      <Building2 size={14} className="shrink-0 opacity-80" /> {displayOrg}
                    </p>
                  </div>
                  <StatusBadge status={member.member_status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                    <span className="text-primary-200 mr-1">ID</span>
                    <CopyMembershipId id={member.membership_id} className="inline font-mono font-bold" />
                  </div>
                  {member.wing_name && (
                    <span className="bg-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                      <span className="text-primary-200">Wing</span> · <strong>{member.wing_name}</strong>
                    </span>
                  )}
                  {member.membership_type && (
                    <span className="bg-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm capitalize">
                      <span className="text-primary-200">Type</span> · <strong>{member.membership_type}</strong>
                    </span>
                  )}
                  {(member.package_name || member.plan_type) && (
                    <span className="bg-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                      <span className="text-primary-200">Package</span> · <strong>{member.package_name || member.plan_type}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <SectionCard title="Personal Details" icon={User}>
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoItem label="Full Name" value={displayName} icon={User} />
                <InfoItem label="Email" value={displayEmail} icon={Mail} />
                <InfoItem label="Phone" value={displayPhone} icon={Phone} />
                <InfoItem label="Gender" value={parsedData.gender} icon={User} />
                <InfoItem label="Date of Birth" value={formatDate(parsedData.dob || parsedData.date_of_birth)} icon={Calendar} />
                <InfoItem label="Organization" value={displayOrg !== '—' ? displayOrg : null} icon={Building2} />
                <InfoItem label="Designation / Position" value={designation} icon={Briefcase} />
                <InfoItem label="Pin / ZIP" value={parsedData.pin_code} icon={MapPin} />
              </div>
            </SectionCard>

            <SectionCard title="Membership Details" icon={Award}>
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoItem label="Wing" value={member.wing_name} icon={Layers} />
                <InfoItem label="Membership Type" value={member.membership_type ? String(member.membership_type).replace(/^\w/, c => c.toUpperCase()) : null} icon={Shield} />
                <InfoItem label="Package" value={member.package_name || member.form_name} icon={Award} full />
                <InfoItem label="Duration" value={durationLabel(member)} icon={Clock} />
                <InfoItem label="Start Date" value={formatDate(member.submitted_at || member.created_at)} icon={Calendar} />
                <InfoItem label="Expiry Date" value={member.expiry_date ? formatDate(member.expiry_date) : (String(member.plan_type || '').includes('lifetime') ? 'Lifetime' : null)} icon={Calendar} />
                <InfoItem label="Payment Status" value={paymentStatus} icon={CreditCard} />
                <InfoItem label="Application Status" value={member.status} icon={FileText} />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Public Profile"
            icon={Globe}
            action={profile ? <StatusBadge status={profile.is_public ? 'active' : 'inactive'} /> : null}
          >
            {profile ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    profile.is_public
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {profile.is_public ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {profile.is_public ? 'Visible to public' : 'Hidden from public'}
                  </span>
                  {profile.headline && <span className="text-gray-600 text-sm">{profile.headline}</span>}
                </div>

                {publicUrl ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-700 truncate">{publicUrl}</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={copyPublicUrl} className="btn-outline btn-sm flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <Copy size={14} /> Copy URL
                      </button>
                      <a href={publicPath} target="_blank" rel="noreferrer" className="btn-primary btn-sm flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <Eye size={14} /> Open Profile
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Public slug is not configured yet.</p>
                )}

                {links.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    {links.slice(0, 4).map(l => (
                      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-primary-200 text-sm">
                        <Link2 size={14} className="text-primary-500 shrink-0" />
                        <span className="truncate font-medium text-gray-800">{l.title || l.url}</span>
                      </a>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setTab('positions')}
                  className="btn-outline btn-sm inline-flex items-center gap-1.5"
                >
                  <Layers size={14} /> Configure Wing / Visibility
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <EmptyState icon={Globe} title="Public profile not configured" hint="Member has not set up a public profile yet. Configure wing and visibility from Positions tab." />
                <button type="button" onClick={() => setTab('positions')} className="btn-outline btn-sm inline-flex items-center gap-1.5">
                  <Layers size={14} /> Open Positions / Config
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Member Records" icon={Activity}>
            <div className="flex gap-1 overflow-x-auto pb-3 -mt-1 mb-4 border-b border-gray-100">
              {TABS.map(({ id: tid, label, icon: Icon }) => (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setTab(tid)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    tab === tid ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {tab === 'payments' && (
              paymentHistory.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments recorded" hint="Payment history will appear here once submitted." />
              ) : (
                <div className="space-y-3">
                  <div className="md:hidden space-y-3">
                    {paymentHistory.map(p => (
                      <div key={p.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">{p.method_name || 'Payment'}</p>
                            <p className="text-xs text-gray-500">{formatDate(p.payment_date)}</p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-sm font-bold text-primary-700">{fmtAmount(p.amount, p.currency)}</p>
                        <p className="text-xs font-mono text-gray-500 truncate">Txn: {p.transaction_id || '—'}</p>
                        {(p.verified_by_name || p.verified_at) && (
                          <p className="text-xs text-gray-500">
                            Verified {p.verified_by_name ? `by ${p.verified_by_name}` : ''}{p.verified_at ? ` · ${formatDateTime(p.verified_at)}` : ''}
                          </p>
                        )}
                        <div className="flex gap-2">
                          {p.screenshot_path && (
                            <button type="button" className="btn-outline btn-sm flex items-center gap-1" onClick={() => setProofUrl(assetUrl(p.screenshot_path))}>
                              <ImageIcon size={13} /> Proof
                            </button>
                          )}
                          <Link to="/payments" className="btn-outline btn-sm flex items-center gap-1"><Eye size={13} /> View Payment</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Date', 'Method', 'Amount', 'Transaction ID', 'Status', 'Verified', 'Actions'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paymentHistory.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50/80">
                            <td className="px-3 py-3 whitespace-nowrap text-gray-600">{formatDate(p.payment_date)}</td>
                            <td className="px-3 py-3">{p.method_name || '—'}</td>
                            <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmtAmount(p.amount, p.currency)}</td>
                            <td className="px-3 py-3 font-mono text-xs text-gray-600">{p.transaction_id || '—'}</td>
                            <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                            <td className="px-3 py-3 text-xs text-gray-500">
                              {p.verified_by_name || p.verified_at
                                ? <>{p.verified_by_name || '—'}{p.verified_at ? <div>{formatDateTime(p.verified_at)}</div> : null}</>
                                : '—'}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                {p.screenshot_path && (
                                  <button type="button" className="btn-outline btn-sm" onClick={() => setProofUrl(assetUrl(p.screenshot_path))}>Proof</button>
                                )}
                                <Link to="/payments" className="btn-outline btn-sm">View</Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {tab === 'renewals' && (
              renewalHistory.length === 0 ? (
                <EmptyState icon={RefreshCw} title="No renewals yet" hint="Renewal history will show here after requests are submitted." />
              ) : (
                <div className="space-y-3">
                  {renewalHistory.map(r => (
                    <div key={r.id} className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{r.package_name || 'Renewal'}</p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-sm text-gray-600">
                          {fmtAmount(r.amount, r.currency)}
                          {r.payment_method_name ? ` · ${r.payment_method_name}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          Requested {formatDate(r.created_at)}
                          {(r.old_expiry_date || r.new_expiry_date) && (
                            <> · {formatDate(r.old_expiry_date)} → {formatDate(r.new_expiry_date)}</>
                          )}
                        </p>
                        {r.transaction_id && <p className="text-xs font-mono text-gray-400">Txn: {r.transaction_id}</p>}
                      </div>
                      <Link to="/renewals" className="btn-outline btn-sm shrink-0 self-start sm:self-center">Open Renewals</Link>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'positions' && (
              <div className="space-y-4">
                {positionHistory.length === 0 ? (
                  <EmptyState icon={Layers} title="No positions assigned" hint="Use Assign below to add an organizational position." />
                ) : (
                  <div className="space-y-2">
                    {positionHistory.map(pos => (
                      <div key={pos.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-primary-600 shrink-0">
                          <Award size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {pos.title || pos.position_title}
                            {pos.wing_name && <span className="text-gray-500 font-normal"> · {pos.wing_name}</span>}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(pos.start_date)} — {pos.end_date ? formatDate(pos.end_date) : 'Present'}
                          </p>
                        </div>
                        {pos.is_current || pos.is_active ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Current</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-600">Previous</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <MemberOrgPanel memberId={member.id} canManage />
              </div>
            )}

            {tab === 'activity' && (
              activity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" hint="Timeline events will appear as the application progresses." />
              ) : (
                <div className="relative space-y-0 pl-1">
                  {activity.map((ev, idx) => (
                    <div key={`${ev.event_type}-${ev.id || idx}`} className="flex gap-3">
                      <div className="flex flex-col items-center w-5 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${idx === activity.length - 1 ? 'bg-primary-600' : 'bg-primary-300'}`} />
                        {idx < activity.length - 1 && <div className="w-0.5 flex-1 bg-primary-100 my-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{activityLabel(ev.event_type)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(ev.created_at)}
                          {ev.acted_by_name ? ` · ${ev.acted_by_name}` : ''}
                        </p>
                        {ev.notes && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-lg px-2.5 py-1.5">{ev.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </SectionCard>

          <SectionCard title="Membership Certificate" icon={FileText}>
            {certificate.available || member.member_status === 'active' ? (
              <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-600 shrink-0">
                    <Award size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">Official Membership Certificate</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-600">
                      <StatusBadge status={certificate.available || member.cert_generated ? 'verified' : 'pending'} />
                      {member.membership_id && (
                        <span className="font-mono bg-white/70 border border-primary-100 px-2 py-0.5 rounded-full">ID: {member.membership_id}</span>
                      )}
                      <span>Issued: {formatDate(certificate.issue_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button type="button" disabled={certBusy} onClick={handlePreviewCert} className="btn-outline btn-sm flex items-center gap-1.5">
                    {certBusy ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Preview
                  </button>
                  <button type="button" disabled={certBusy} onClick={handleDownloadCert} className="btn-primary btn-sm flex items-center gap-1.5">
                    {certBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState icon={FileText} title="Certificate not available yet" hint="Certificate becomes available after membership is activated / generated." />
            )}
          </SectionCard>

          <SectionCard title="Internal Notes" icon={StickyNote}>
            <form onSubmit={handleAddNote} className="space-y-3 mb-4">
              <textarea
                className="input w-full min-h-[88px] resize-y text-sm"
                placeholder="Add an internal admin note (not visible to the member)…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="flex justify-end">
                <button type="submit" disabled={noteSaving || !noteText.trim()} className="btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-50">
                  {noteSaving ? <Loader2 size={14} className="animate-spin" /> : <StickyNote size={14} />}
                  Add Note
                </button>
              </div>
            </form>
            {notes.length === 0 ? (
              <EmptyState icon={StickyNote} title="No internal notes" hint="Notes added here stay within the admin panel." />
            ) : (
              <div className="space-y-2">
                {notes.map(n => (
                  <div key={n.id} className="bg-amber-50/60 border border-amber-100 rounded-xl px-3.5 py-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    <p className="text-[11px] text-gray-500 mt-1.5">{n.author_name || 'Admin'} · {formatDateTime(n.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {proofUrl && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={() => setProofUrl(null)}>
            <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Payment Proof</h4>
                <button type="button" onClick={() => setProofUrl(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
              </div>
              <div className="p-3 bg-gray-50 max-h-[80vh] overflow-auto">
                <img src={proofUrl} alt="Payment proof" className="max-w-full mx-auto rounded-lg" />
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  )
}
