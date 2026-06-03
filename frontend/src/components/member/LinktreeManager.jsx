import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical, Image, Star, Calendar, Lock, BarChart2, Share, Edit2, CheckCircle, Loader2, Youtube, AlignLeft, Link as LinkIcon, Upload, ImageIcon } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'
import { assetUrl } from '../../utils/assetUrl'

export default function LinktreeManager({ links = [], apiClient, refetch }) {
  const qc = useQueryClient()
  const [localLinks, setLocalLinks] = useState(links)

  useEffect(() => {
    setLocalLinks(links)
  }, [links])

  const addLinkMut = useMutation({
    mutationFn: (type = 'custom') => apiClient().post('/member/public-profile/links', {
      link_type: type, title: type === 'text' ? 'About me' : 'New Link', url: '', is_active: true, is_featured: false
    }),
    onSuccess: () => { refetch(); toast.success('Added') },
    onError: e => toast.error(e.response?.data?.message || 'Failed to add')
  })

  const updateLinkMut = useMutation({
    mutationFn: (data) => apiClient().put(`/member/public-profile/links/${data.id}`, data),
    onSuccess: () => { refetch() },
    onError: () => toast.error('Failed to update')
  })

  const delLinkMut = useMutation({
    mutationFn: id => apiClient().delete(`/member/public-profile/links/${id}`),
    onSuccess: () => { refetch(); toast.success('Removed') },
  })

  const reorderMut = useMutation({
    mutationFn: order => apiClient().post('/member/public-profile/links/reorder', { order }),
    onError: () => { toast.error('Failed to save order'); refetch() }
  })

  const handleDragEnd = (result) => {
    if (!result.destination) return
    const items = Array.from(localLinks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setLocalLinks(items)

    const order = items.map(i => i.id)
    reorderMut.mutate(order)
  }

  const updateLink = (id, field, value) => {
    const updated = localLinks.map(l => l.id === id ? { ...l, [field]: value } : l)
    setLocalLinks(updated)
    const link = updated.find(l => l.id === id)
    updateLinkMut.mutate(link)
  }

  const uploadLinkMedia = async (linkId, file) => {
    const fd = new FormData()
    fd.append('media', file)
    try {
      await apiClient().post(`/member/public-profile/links/${linkId}/media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      refetch()
      toast.success('Photo uploaded')
    } catch {
      toast.error('Upload failed')
    }
  }

  const detectYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  const handleUrlBlur = (link) => {
    let updates = { url: link.url };
    const ytId = detectYouTubeId(link.url);
    if (ytId && link.link_type !== 'youtube') {
       updates.link_type = 'youtube';
       toast.success("Detected YouTube Video!");
    }
    const updated = localLinks.map(l => l.id === link.id ? { ...l, ...updates } : l)
    setLocalLinks(updated)
    const dbLink = updated.find(l => l.id === link.id)
    updateLinkMut.mutate(dbLink)
  }

  return (
    <div className="space-y-6">
      
      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          type="button" 
          onClick={() => addLinkMut.mutate('custom')} 
          disabled={addLinkMut.isPending}
          className="py-3 bg-[#8b3dff] hover:bg-[#722ce0] text-white font-semibold rounded-2xl flex justify-center items-center gap-2 transition-colors"
        >
          <LinkIcon size={18} /> Add Link
        </button>
        <button 
          type="button" 
          onClick={() => addLinkMut.mutate('youtube')} 
          disabled={addLinkMut.isPending}
          className="py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl flex justify-center items-center gap-2 transition-colors"
        >
          <Youtube size={18} /> Video
        </button>
        <button 
          type="button" 
          onClick={() => addLinkMut.mutate('text')} 
          disabled={addLinkMut.isPending}
          className="py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-2xl flex justify-center items-center gap-2 transition-colors"
        >
          <AlignLeft size={18} /> Text
        </button>
        <button 
          type="button" 
          onClick={() => addLinkMut.mutate('photo')} 
          disabled={addLinkMut.isPending}
          className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl flex justify-center items-center gap-2 transition-colors col-span-3 sm:col-span-1"
        >
          <ImageIcon size={18} /> Photo
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="links-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {localLinks.map((link, index) => {
                const ytId = link.link_type === 'youtube' ? detectYouTubeId(link.url) : null;
                return (
                  <Draggable key={link.id.toString()} draggableId={link.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white rounded-[24px] overflow-hidden flex shadow-sm border ${link.is_featured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'}`}
                      >
                        {/* Drag Handle */}
                        <div 
                          {...provided.dragHandleProps} 
                          className="w-10 bg-white flex items-center justify-center cursor-grab hover:bg-gray-50 border-r border-gray-50"
                        >
                          <GripVertical size={18} className="text-gray-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1 pr-4">
                              <div className="flex items-center gap-2 group">
                                <input 
                                  value={link.title || ''}
                                  onChange={e => setLocalLinks(localLinks.map(l => l.id === link.id ? { ...l, title: e.target.value } : l))}
                                  onBlur={() => updateLink(link.id, 'title', link.title)}
                                  className="font-semibold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full placeholder-gray-400"
                                  placeholder="Title"
                                />
                                <Edit2 size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>

                              {link.link_type === 'text' ? (
                                <textarea 
                                  value={link.content || ''}
                                  onChange={e => setLocalLinks(localLinks.map(l => l.id === link.id ? { ...l, content: e.target.value } : l))}
                                  onBlur={() => updateLink(link.id, 'content', link.content)}
                                  className="text-sm text-gray-700 bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-[#8b3dff]/20 w-full placeholder-gray-400 resize-none mt-2"
                                  placeholder="Write a paragraph here..."
                                  rows={3}
                                />
                              ) : link.link_type === 'photo' ? (
                                <div className="mt-3 relative rounded-xl overflow-hidden bg-gray-50 border border-gray-200 p-4 flex flex-col items-center justify-center min-h-[120px]">
                                  {link.media_path ? (
                                    <img src={assetUrl(link.media_path)} alt="" className="w-full h-auto rounded-lg object-cover" />
                                  ) : (
                                    <div className="text-gray-400 text-sm mb-2">No photo uploaded</div>
                                  )}
                                  <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                    <Upload size={14} /> {link.media_path ? 'Change Photo' : 'Upload Photo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLinkMedia(link.id, e.target.files[0])} />
                                  </label>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group">
                                  <input 
                                    value={link.url || ''}
                                    onChange={e => setLocalLinks(localLinks.map(l => l.id === link.id ? { ...l, url: e.target.value } : l))}
                                    onBlur={() => handleUrlBlur(link)}
                                    className="text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0 w-full placeholder-gray-400"
                                    placeholder="URL (e.g. https://...)"
                                  />
                                  <Edit2 size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}

                              {/* YouTube Thumbnail Preview */}
                              {ytId && (
                                <div className="mt-3 relative rounded-xl overflow-hidden aspect-video bg-gray-100 border border-gray-200">
                                  <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                      <Youtube size={24} className="ml-1" />
                                    </div>
                                  </div>
                                </div>
                              )}

                            </div>

                            {/* Controls (Toggle) */}
                            <div className="flex items-center gap-4 pl-2 shrink-0">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={link.is_active} 
                                  onChange={e => updateLink(link.id, 'is_active', e.target.checked)} 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                              </label>
                            </div>
                          </div>

                          {/* Bottom Icons Row */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-5 text-gray-400">
                              <button 
                                onClick={() => updateLink(link.id, 'is_featured', !link.is_featured)}
                                className={`transition-colors ${link.is_featured ? 'text-amber-400' : 'hover:text-gray-600'}`}
                                title="Feature this link"
                              >
                                <Star size={18} fill={link.is_featured ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <button 
                              onClick={() => delLinkMut.mutate(link.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}
