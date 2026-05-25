import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Globe, Link2, Plus, Trash2, Loader2, CheckCircle, Image, Youtube,
  GripVertical, ExternalLink, Upload,
} from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'
import toast from 'react-hot-toast'

const LINK_TYPES = [
  { value: 'custom', label: 'Custom link' },
  { value: 'youtube', label: 'YouTube video' },
  { value: 'photo', label: 'Photo' },
  { value: 'about_me', label: 'About (inline)' },
  { value: 'my_org', label: 'My organisation' },
  { value: 'org_history', label: 'History' },
]

export default function MemberPublicProfileSection({ apiClient }) {
  const qc = useQueryClient()
  const [linkDraft, setLinkDraft] = useState({ link_type: 'custom', title: '', url: '', content: '' })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['member-public-profile'],
    queryFn: () => apiClient().get('/member/public-profile').then(r => r.data.data),
  })

  const [form, setForm] = useState({
    is_public: false,
    headline: '',
    about_me: '',
    my_org: '',
    org_history: '',
    show_email: false,
    show_phone: false,
    theme_color: '#6C3EAB',
    public_slug: '',
  })

  useEffect(() => {
    if (!data?.profile) return
    const p = data.profile
    setForm({
      is_public: !!p.is_public,
      headline: p.headline || '',
      about_me: p.about_me || '',
      my_org: p.my_org || '',
      org_history: p.org_history || '',
      show_email: !!p.show_email,
      show_phone: !!p.show_phone,
      theme_color: p.theme_color || '#6C3EAB',
      public_slug: p.public_slug || '',
    })
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => apiClient().put('/member/public-profile', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-public-profile'] }); toast.success('Public profile saved') },
    onError: e => toast.error(e.response?.data?.message || 'Save failed'),
  })

  const photoMut = useMutation({
    mutationFn: file => {
      const fd = new FormData()
      fd.append('photo', file)
      return apiClient().post('/member/public-profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => { refetch(); toast.success('Photo updated') },
    onError: () => toast.error('Upload failed'),
  })

  const addLinkMut = useMutation({
    mutationFn: () => apiClient().post('/member/public-profile/links', linkDraft),
    onSuccess: () => {
      refetch()
      setLinkDraft({ link_type: 'custom', title: '', url: '', content: '' })
      toast.success('Link added')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const delLinkMut = useMutation({
    mutationFn: id => apiClient().delete(`/member/public-profile/links/${id}`),
    onSuccess: () => { refetch(); toast.success('Removed') },
  })

  async function uploadLinkMedia(linkId, file) {
    const fd = new FormData()
    fd.append('media', file)
    try {
      await apiClient().post(`/member/public-profile/links/${linkId}/media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      refetch()
      toast.success('Media uploaded')
    } catch {
      toast.error('Upload failed')
    }
  }

  if (isLoading) {
    return <div className="card p-8 flex justify-center"><Loader2 className="animate-spin text-primary-500" /></div>
  }

  const publicUrl = data?.public_url || (form.public_slug ? `/m/${form.public_slug}` : null)
  const photo = data?.profile?.profile_photo_path

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="h-2" style={{ background: form.theme_color }} />
        <div className="card-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Globe size={17} /> Public profile page</h3>
          {publicUrl && form.is_public && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 flex items-center gap-1 hover:underline">
              <ExternalLink size={14} /> Preview
            </a>
          )}
        </div>
        <div className="card-body space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              {photo ? (
                <img src={assetUrl(photo)} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">?</div>
              )}
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary-700">
                <Upload size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && photoMut.mutate(e.target.files[0])} />
              </label>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm font-medium">Make my profile public</span>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Headline</label>
              <input className="input" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. President, Rajasthan Chapter" />
            </div>
            <div>
              <label className="label">Profile URL slug</label>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>/m/</span>
                <input className="input flex-1" value={form.public_slug} onChange={e => setForm(f => ({ ...f, public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} />
              </div>
            </div>
            <div>
              <label className="label">Accent colour</label>
              <input type="color" className="h-10 w-full rounded cursor-pointer" value={form.theme_color} onChange={e => setForm(f => ({ ...f, theme_color: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">About me</label>
              <textarea className="input" rows={4} value={form.about_me} onChange={e => setForm(f => ({ ...f, about_me: e.target.value }))} />
            </div>
            <div>
              <label className="label">My organisation</label>
              <textarea className="input" rows={3} value={form.my_org} onChange={e => setForm(f => ({ ...f, my_org: e.target.value }))} />
            </div>
            <div>
              <label className="label">History</label>
              <textarea className="input" rows={3} value={form.org_history} onChange={e => setForm(f => ({ ...f, org_history: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_email} onChange={e => setForm(f => ({ ...f, show_email: e.target.checked }))} /> Show email</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_phone} onChange={e => setForm(f => ({ ...f, show_phone: e.target.checked }))} /> Show phone</label>
          </div>

          <button type="button" className="btn-primary flex items-center gap-2" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save public profile
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="font-semibold flex items-center gap-2"><Link2 size={16} /> Links & media</h3></div>
        <div className="card-body space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
            <select className="input" value={linkDraft.link_type} onChange={e => setLinkDraft(d => ({ ...d, link_type: e.target.value }))}>
              {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="input" placeholder="Title" value={linkDraft.title} onChange={e => setLinkDraft(d => ({ ...d, title: e.target.value }))} />
            {(linkDraft.link_type === 'custom' || linkDraft.link_type === 'youtube') && (
              <input className="input sm:col-span-2" placeholder={linkDraft.link_type === 'youtube' ? 'YouTube URL' : 'https://…'} value={linkDraft.url} onChange={e => setLinkDraft(d => ({ ...d, url: e.target.value }))} />
            )}
            {['about_me', 'my_org', 'org_history', 'custom'].includes(linkDraft.link_type) && linkDraft.link_type !== 'youtube' && (
              <textarea className="input sm:col-span-2" rows={2} placeholder="Content (optional)" value={linkDraft.content} onChange={e => setLinkDraft(d => ({ ...d, content: e.target.value }))} />
            )}
            <button type="button" className="btn-outline sm:col-span-2 flex items-center justify-center gap-2" disabled={!linkDraft.title || addLinkMut.isPending}
              onClick={() => addLinkMut.mutate()}>
              <Plus size={14} /> Add item
            </button>
          </div>

          <ul className="space-y-3">
            {(data?.links || []).map(link => (
              <li key={link.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-white">
                <GripVertical size={16} className="text-gray-300 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm flex items-center gap-2">
                    {link.link_type === 'youtube' && <Youtube size={14} className="text-red-600" />}
                    {link.link_type === 'photo' && <Image size={14} className="text-emerald-600" />}
                    {link.title}
                    <span className="text-xs text-gray-400 font-normal">({link.link_type})</span>
                  </p>
                  {link.url && <p className="text-xs text-gray-500 truncate">{link.url}</p>}
                  {link.media_path && <img src={assetUrl(link.media_path)} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
                  {link.link_type === 'photo' && !link.media_path && (
                    <label className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 cursor-pointer">
                      <Upload size={12} /> Upload photo
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLinkMedia(link.id, e.target.files[0])} />
                    </label>
                  )}
                </div>
                <button type="button" className="text-red-400 hover:text-red-600 p-1" onClick={() => delLinkMut.mutate(link.id)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {data?.positions?.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Your current positions are shown automatically on your public page when enabled.
        </p>
      )}
    </div>
  )
}
