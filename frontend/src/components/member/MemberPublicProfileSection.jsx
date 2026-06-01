import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Loader2, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'
import toast from 'react-hot-toast'
import LinktreeManager from './LinktreeManager'
import MobilePreview from './MobilePreview'

export default function MemberPublicProfileSection({ apiClient }) {
  const qc = useQueryClient()

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
    theme_color: '#6C3EAB',
    text_color: '#000000',
    background_style: 'solid',
    button_style: 'rounded',
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
      theme_color: p.theme_color || '#6C3EAB',
      text_color: p.text_color || '#000000',
      background_style: p.background_style || 'solid',
      button_style: p.button_style || 'rounded',
      public_slug: p.public_slug || '',
    })
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => apiClient().put('/member/public-profile', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-public-profile'] }); toast.success('Profile saved') },
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

  const handleBlurSave = () => {
    saveMut.mutate()
  }

  const handleColorChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    clearTimeout(window.colorSaveTimeout)
    window.colorSaveTimeout = setTimeout(() => {
      saveMut.mutate()
    }, 1000)
  }

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#8b3dff]" /></div>
  }

  const publicUrl = data?.public_url || (form.public_slug ? `/m/${form.public_slug}` : null)
  const photo = data?.profile?.profile_photo_path

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full mx-auto pb-20">
      
      {/* Left Column: Editor */}
      <div className="flex-1 space-y-6 w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Profile</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Public visibility</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={form.is_public} 
                  onChange={e => {
                    setForm(f => ({ ...f, is_public: e.target.checked }))
                    setTimeout(() => saveMut.mutate(), 0)
                  }} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </div>
            </label>
            {publicUrl && form.is_public && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#8b3dff] flex items-center gap-1 hover:underline">
                <ExternalLink size={16} /> View live
              </a>
            )}
          </div>
        </div>

        {/* Profile Details Block */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              {photo ? (
                <img src={assetUrl(photo)} alt="" className="w-24 h-24 rounded-full object-cover border border-gray-100 shadow-sm" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-3xl border border-gray-100 shadow-sm">?</div>
              )}
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#8b3dff] text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-[#722ce0] transition-colors">
                <Upload size={14} />
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && photoMut.mutate(e.target.files[0])} />
              </label>
            </div>
            <div className="flex-1 space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Profile Title</label>
                  <input 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#8b3dff]/20 font-medium" 
                    value={form.headline} 
                    onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} 
                    onBlur={handleBlurSave}
                    placeholder="@username or Title" 
                  />
               </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bio</label>
              <span className={`text-xs font-semibold ${form.about_me.trim().split(/\s+/).filter(Boolean).length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.about_me.trim().split(/\s+/).filter(Boolean).length} / 200 words
              </span>
            </div>
            <textarea 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#8b3dff]/20 text-sm resize-y" 
              rows={8} 
              value={form.about_me} 
              onChange={e => {
                const text = e.target.value;
                const words = text.trim().split(/\s+/).filter(Boolean);
                if (words.length <= 200 || text.length < form.about_me.length) {
                  setForm(f => ({ ...f, about_me: text }))
                }
              }} 
              onBlur={handleBlurSave}
              placeholder="Tell us about yourself..." 
            />
          </div>
        </div>

        {/* Linktree Manager */}
        <div>
           <h3 className="font-semibold text-gray-900 mb-4 px-1">Links</h3>
           <LinktreeManager links={data?.links || []} apiClient={apiClient} refetch={refetch} />
        </div>
        
        {/* Appearance / Advanced Settings */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 space-y-5">
           <h3 className="font-semibold text-gray-900 mb-2">Appearance & URLs</h3>
           <div className="grid sm:grid-cols-2 gap-5">
             <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Custom Slug</label>
               <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#8b3dff]/20">
                 <span className="text-gray-400 text-sm">forti.in/m/</span>
                 <input 
                   className="bg-transparent border-none p-0 focus:ring-0 flex-1 text-sm font-medium" 
                   value={form.public_slug} 
                   onChange={e => setForm(f => ({ ...f, public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} 
                   onBlur={handleBlurSave}
                 />
               </div>
             </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Theme Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-300 shadow-sm shrink-0 cursor-pointer group">
                    <div className="w-full h-full pointer-events-none group-hover:opacity-90 transition-opacity" style={{ backgroundColor: form.theme_color }} />
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0" 
                      value={form.theme_color} 
                      onChange={e => handleColorChange('theme_color', e.target.value)} 
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <input 
                    type="text" 
                    className="w-24 text-sm font-medium text-gray-600 uppercase bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#8b3dff] focus:outline-none focus:ring-0 px-1 py-0.5 transition-colors" 
                    value={form.theme_color}
                    onChange={e => handleColorChange('theme_color', e.target.value)}
                    onBlur={handleBlurSave}
                    maxLength={7}
                  />
                </div>
              </div>
             <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Background Style</label>
               <select 
                 className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#8b3dff]/20 text-sm font-medium text-gray-700 cursor-pointer"
                 value={form.background_style}
                 onChange={e => { setForm(f => ({ ...f, background_style: e.target.value })); setTimeout(handleBlurSave, 0) }}
               >
                 <option value="solid">Solid Color</option>
                 <option value="gradient">Gradient Blend</option>
               </select>
             </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Text Color</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-300 shadow-sm shrink-0 cursor-pointer group">
                    <div className="w-full h-full pointer-events-none group-hover:opacity-90 transition-opacity" style={{ backgroundColor: form.text_color }} />
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0" 
                      value={form.text_color} 
                      onChange={e => handleColorChange('text_color', e.target.value)} 
                      onBlur={handleBlurSave}
                    />
                  </div>
                  <input 
                    type="text" 
                    className="w-24 text-sm font-medium text-gray-600 uppercase bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#8b3dff] focus:outline-none focus:ring-0 px-1 py-0.5 transition-colors" 
                    value={form.text_color}
                    onChange={e => handleColorChange('text_color', e.target.value)}
                    onBlur={handleBlurSave}
                    maxLength={7}
                  />
                </div>
              </div>
             <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Button Style</label>
               <select 
                 className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#8b3dff]/20 text-sm font-medium text-gray-700 cursor-pointer"
                 value={form.button_style}
                 onChange={e => { setForm(f => ({ ...f, button_style: e.target.value })); setTimeout(handleBlurSave, 0) }}
               >
                 <option value="rounded">Rounded Rectangle</option>
                 <option value="pill">Pill Shape</option>
                 <option value="outline">Outline Only</option>
               </select>
             </div>
           </div>
        </div>
        
      </div>

      {/* Right Column: Live Preview */}
      <div className="hidden lg:flex w-[400px] shrink-0 justify-center sticky top-24 pt-4 h-fit">
        <MobilePreview profile={form} links={data?.links || []} photo={photo} />
      </div>

    </div>
  )
}
