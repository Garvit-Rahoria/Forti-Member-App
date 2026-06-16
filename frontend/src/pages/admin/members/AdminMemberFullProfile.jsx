import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, User, Shield, Phone, Mail, MapPin, Building2,
  Calendar, Award, CreditCard, Activity, Link2, Globe, Image,
  Clock, FileText, CheckCircle, XCircle, AlertCircle, RefreshCw,
  Download, Edit3, Save, X, Loader2
} from 'lucide-react'
import api from '../../../api/client'
import { assetUrl } from '../../../utils/assetUrl'
import { getCurrencySymbol, fmtAmount } from '../../../utils/currency'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7000'

function downloadFile(url, filename) {
  api.get(url, { responseType: 'blob' })
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
      console.error(err)
      alert(err.response?.data?.message || 'Download failed')
    })
}

function StatusBadge({ status }) {
  const MAP = {
    active:    'bg-emerald-100 text-emerald-800 border-emerald-200',
    approved:  'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending:   'bg-amber-100 text-amber-800 border-amber-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    expired:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    inactive:  'bg-gray-100 text-gray-800 border-gray-200',
    rejected:  'bg-red-100 text-red-800 border-red-200',
    verified:  'bg-emerald-100 text-emerald-800 border-emerald-200',
    under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${MAP[status] || MAP.inactive}`}>
      {status ? status.replace('_', ' ').toUpperCase() : '—'}
    </span>
  )
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3.5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Icon size={18} className="text-primary-600" />
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoItem({ label, value, icon: Icon, mono }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-sm font-semibold text-gray-900 mt-0.5 truncate ${mono ? 'font-mono tracking-tight' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MemberEditForm({ member, parsedData, onCancel, onSuccess }) {
  const [loading, setLoading] = useState(false);
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
    expiry_date: member.expiry_date ? member.expiry_date.split('T')[0] : '',
  });

  const { data: wings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: () => api.get('/wings').then(r => r.data.data),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then(r => r.data.data),
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/members/${member.id}`, formData);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Edit Member Information" icon={Edit3} className="shadow-md border-primary-200 ring-1 ring-primary-100">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name</label>
            <input name="organisation_name" value={formData.organisation_name} onChange={handleChange} className="input w-full" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 grid md:grid-cols-2 gap-4">
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
        </div>

        <div className="border-t border-gray-100 pt-4 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Type / Duration</label>
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
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-outline px-4 py-2 flex items-center gap-2">
            <X size={16} /> Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

export default function AdminMemberFullProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'members', 'full', id],
    queryFn: () => api.get(`/members/${id}/full`).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-primary-600" />
        </div>
        <p className="text-gray-500 font-medium">Loading comprehensive profile...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-3 border border-red-200">
          <AlertCircle size={20} />
          <div>
            <h4 className="font-bold">Error loading profile</h4>
            <p className="text-sm">The member could not be found or an error occurred.</p>
          </div>
        </div>
        <button onClick={() => navigate('/members')} className="mt-4 text-primary-600 hover:underline flex items-center gap-1 text-sm font-medium">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    )
  }

  const { member, profile, links, paymentHistory, renewalHistory, positionHistory } = data

  const primaryAccount = member.accounts?.find(a => a.is_active) || member.accounts?.[0] || {}

  let parsedData = {}
  try { parsedData = typeof member.data === 'string' ? JSON.parse(member.data) : member.data || {} } catch {}

  const displayName = primaryAccount.full_name || member.applicant_name
  const displayEmail = primaryAccount.email || member.applicant_email
  const displayPhone = primaryAccount.phone || member.applicant_phone
  const displayOrg = parsedData.organisation_name || parsedData.organization_name || parsedData.company_name || '—'
  
  const handleDownloadCert = () => {
    downloadFile(`/certificates/${member.id}`, `certificate-${member.membership_id || member.id}.pdf`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/members')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Full 360° Profile View</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive data for {displayName}</p>
          </div>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-outline flex items-center gap-2 px-4 py-2">
            <Edit3 size={16} /> Edit Member
          </button>
        )}
      </div>

      <div className="space-y-8">
        
        {isEditing ? (
          <MemberEditForm 
            member={member} 
            parsedData={parsedData} 
            onCancel={() => setIsEditing(false)} 
            onSuccess={() => { setIsEditing(false); refetch(); }} 
          />
        ) : (
          <SectionCard title="Member Identity" icon={User} className="shadow-md">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {profile?.profile_photo_path ? (
              <img src={assetUrl(profile.profile_photo_path)} className="w-32 h-32 rounded-2xl object-cover border-4 border-gray-50 shadow-sm shrink-0" alt="Profile" />
            ) : (
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-500 shrink-0 border-4 border-gray-50 shadow-sm">
                <User size={48} />
              </div>
            )}
            
            <div className="flex-1 w-full space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                  <p className="text-primary-700 font-medium">{displayOrg}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={member.member_status} />
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider">
                    {member.membership_id || 'NO ID'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <InfoItem label="Position" value={member.position} icon={Shield} />
                <InfoItem label="Wing" value={member.wing_name} icon={Building2} />
                <InfoItem label="Email ID" value={displayEmail} icon={Mail} />
                <InfoItem label="Phone" value={displayPhone} icon={Phone} />
                <InfoItem label="Gender" value={parsedData.gender} icon={User} />
                <InfoItem label="Pin Code" value={parsedData.pin_code} icon={MapPin} />
                <InfoItem label="Membership Type" value={member.membership_type} icon={Award} />
                <InfoItem label="Package" value={member.plan_type} icon={Award} />
              </div>
            </div>
          </div>
        </SectionCard>
        )}

        {/* SECTION 2: Public Profile Information */}
        <SectionCard title="Public Profile Summary" icon={Globe}>
          {profile ? (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Headline</h4>
                    <p className="font-medium text-gray-900">{profile.headline || '—'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">About Me</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.about_me || '—'}</p>
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-4 shrink-0">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Theme Color</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md shadow-sm border border-gray-200" style={{ backgroundColor: profile.theme_color || '#ccc' }}></div>
                      <span className="font-mono text-sm">{profile.theme_color || '#cccccc'}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Public Link</h4>
                    {profile.public_slug ? (
                      <a href={`/m/${profile.public_slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors">
                        <Link2 size={14} /> /m/{profile.public_slug}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">Not configured</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Globe size={32} className="mx-auto mb-3 text-gray-300" />
              <p>This member has not configured their public profile yet.</p>
            </div>
          )}
        </SectionCard>

        {/* SECTION 3: Links and Media */}
        <SectionCard title="Links and Media" icon={Link2}>
          {links && links.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {links.map(l => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${l.link_type === 'youtube' ? 'bg-red-50 text-red-500' : 'bg-primary-50 text-primary-500'}`}>
                    <Link2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">{l.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{l.url}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p>No links or media added to the public profile.</p>
            </div>
          )}
        </SectionCard>

        {/* SECTION 4: Membership Certificate */}
        <SectionCard title="Membership Certificate" icon={FileText}>
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary-600 shadow-sm shrink-0">
                <Award size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Official Membership Certificate</h4>
                <p className="text-primary-700 text-sm mt-0.5">Verified digital document for {displayName}</p>
              </div>
            </div>
            
            <button 
              onClick={handleDownloadCert}
              className="w-full md:w-auto inline-flex justify-center items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>
        </SectionCard>

        {/* SECTION 5: All Member Logs */}
        <SectionCard title="Member Logs (Payments, Renewals, Positions)" icon={Activity}>
          <div className="space-y-6">
            {/* We combine them visually in segments */}
            
            {/* Payments */}
            {paymentHistory && paymentHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard size={16} className="text-gray-400" /> Initial Payments</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Method</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paymentHistory.map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                          <td className="px-4 py-2.5">{p.method_name || '—'}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{fmtAmount(p.amount, p.currency)}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Renewals */}
            {renewalHistory && renewalHistory.length > 0 && (
              <div className={paymentHistory?.length ? 'pt-4 border-t border-gray-100' : ''}>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><RefreshCw size={16} className="text-gray-400" /> Renewal Requests</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Txn ID</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Amount</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {renewalHistory.map(r => (
                        <tr key={r.id}>
                          <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.created_at)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{r.transaction_id || '—'}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900">{fmtAmount(r.amount, r.currency)}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Positions */}
            {positionHistory && positionHistory.length > 0 && (
              <div className={paymentHistory?.length || renewalHistory?.length ? 'pt-4 border-t border-gray-100' : ''}>
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Award size={16} className="text-gray-400" /> Position Log</h4>
                <div className="space-y-3">
                  {positionHistory.map(pos => (
                    <div key={pos.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
                        <Award size={16} className="text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{pos.position_title} <span className="text-gray-500 font-normal">({pos.wing_name} Wing)</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(pos.start_date)} — {pos.end_date ? formatDate(pos.end_date) : 'Present'}</p>
                      </div>
                      <div>
                        {pos.is_active ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Current</span>
                        ) : (
                          <span className="bg-gray-200 text-gray-600 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Past</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!paymentHistory?.length && !renewalHistory?.length && !positionHistory?.length && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Clock size={32} className="mx-auto mb-3 text-gray-300" />
                <p>No activity logs recorded for this member yet.</p>
              </div>
            )}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
