import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FolderTree, Tag, FileText, Plus, Loader2, Pencil, Trash2, Save, X, Eye, ArrowUp, ArrowDown } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

const NAV_VISIBILITY = [
  { value: 'main_dropdown', label: 'Show in main menu dropdown' },
  { value: 'hub_only', label: 'Hub page only (not in dropdown)' },
  { value: 'hidden', label: 'Hidden from navigation' },
]

const POST_TYPES = [
  { value: 'news', label: 'News' },
  { value: 'industry_update', label: 'Industry Update' },
  { value: 'tax_update', label: 'Tax Update' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'event', label: 'Event' },
  { value: 'policy', label: 'Policy' },
  { value: 'partnership', label: 'Partnership' },
]

const BLOCK_TYPES = ['paragraph', 'heading', 'quote', 'image', 'list', 'embed', 'divider', 'cta', 'gallery', 'related_posts']

function emptyBlock(type = 'paragraph') {
  return { block_type: type, sort_order: 0, data: { text: '' } }
}

export default function BlogManagerPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('posts')
  const [postEditor, setPostEditor] = useState(null)

  const tabs = [
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'menus', label: 'Menus', icon: BookOpen },
    { id: 'tags', label: 'Tags', icon: Tag },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Blog & Content</h2>
        <p className="text-gray-500 text-sm mt-1">Chamber news, industry updates, tax briefings — nested categories and menu placement.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === t.id ? 'bg-primary-100 text-primary-800' : 'text-gray-600 hover:bg-gray-100'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'menus' && <MenusTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'tags' && <TagsTab />}
      {tab === 'posts' && (
        <PostsTab onEdit={setPostEditor} />
      )}

      {postEditor !== null && (
        <PostEditorModal
          postId={postEditor}
          onClose={() => setPostEditor(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['blog-posts'] }); setPostEditor(null) }}
        />
      )}
    </div>
  )
}

function MenusTab() {
  const qc = useQueryClient()
  const { data: menus = [] } = useQuery({
    queryKey: ['blog-menus-admin'],
    queryFn: () => api.get('/blog/admin/menus').then(r => r.data.data),
  })
  const [form, setForm] = useState({ slug: '', label: '', description: '', nav_path: '', sort_order: 0, show_in_header: true })

  const createMut = useMutation({
    mutationFn: body => api.post('/blog/admin/menus', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-menus-admin', 'blog-nav'] }); toast.success('Menu created'); setForm({ slug: '', label: '', description: '', nav_path: '', sort_order: 0, show_in_header: true }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-4">
      <div className="card p-4 grid sm:grid-cols-3 gap-3">
        <input className="input" placeholder="Slug (insights)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        <input className="input" placeholder="Label" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
        <input className="input" placeholder="Nav path (/content/insights)" value={form.nav_path} onChange={e => setForm(f => ({ ...f, nav_path: e.target.value }))} />
        <button type="button" className="btn-primary sm:col-span-3" disabled={!form.slug || !form.label || createMut.isPending}
          onClick={() => createMut.mutate({ ...form, nav_path: form.nav_path || `/content/${form.slug}` })}>
          <Plus size={14} className="inline mr-1" /> Add menu hub
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Label</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Path</th><th className="px-3 py-2">Header</th></tr></thead>
          <tbody className="divide-y">
            {menus.map(m => (
              <tr key={m.id}><td className="px-3 py-2 font-medium">{m.label}</td><td className="px-3 py-2 text-gray-500">{m.slug}</td><td className="px-3 py-2">{m.nav_path}</td><td className="px-3 py-2">{m.show_in_header ? 'Yes' : 'No'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CategoriesTab() {
  const qc = useQueryClient()
  const { data: menus = [] } = useQuery({ queryKey: ['blog-menus-admin'], queryFn: () => api.get('/blog/admin/menus').then(r => r.data.data) })
  const { data: trees = [] } = useQuery({ queryKey: ['blog-categories-admin'], queryFn: () => api.get('/blog/admin/categories').then(r => r.data.data) })
  const [form, setForm] = useState({ menu_id: '', parent_id: '', name: '', slug: '', nav_visibility: 'hub_only', sort_order: 0 })

  const createMut = useMutation({
    mutationFn: body => api.post('/blog/admin/categories', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-categories-admin', 'blog-nav'] }); toast.success('Category created') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const flatCats = trees.flatMap(t => t.flat || [])

  return (
    <div className="space-y-4">
      <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select className="input" value={form.menu_id} onChange={e => setForm(f => ({ ...f, menu_id: e.target.value }))}>
          <option value="">Menu…</option>
          {menus.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select className="input" value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}>
          <option value="">No parent (root)</option>
          {flatCats.filter(c => String(c.menu_id) === String(form.menu_id)).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input className="input" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <select className="input" value={form.nav_visibility} onChange={e => setForm(f => ({ ...f, nav_visibility: e.target.value }))}>
          {NAV_VISIBILITY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" className="btn-primary lg:col-span-4" disabled={!form.menu_id || !form.name || createMut.isPending}
          onClick={() => createMut.mutate({ ...form, menu_id: Number(form.menu_id), parent_id: form.parent_id ? Number(form.parent_id) : null })}>
          Add category
        </button>
      </div>
      {trees.map(tree => (
        <div key={tree.menu_id} className="card p-4">
          <h3 className="font-bold text-gray-900 mb-3">{tree.menu_label}</h3>
          <CategoryTree nodes={tree.tree} depth={0} menuSlug={tree.menu_slug} />
        </div>
      ))}
    </div>
  )
}

function CategoryTree({ nodes, depth, menuSlug }) {
  if (!nodes?.length) return <p className="text-sm text-gray-400">No categories</p>
  return (
    <ul className={depth ? 'pl-4 border-l border-gray-200 ml-2' : ''}>
      {nodes.map(n => (
        <li key={n.id} className="py-1.5">
          <span className="font-medium">{n.name}</span>
          <span className="text-xs text-gray-400 ml-2">/{menuSlug}/{n.slug}</span>
          <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-gray-100">{n.nav_visibility}</span>
          {n.children?.length > 0 && <CategoryTree nodes={n.children} depth={depth + 1} menuSlug={menuSlug} />}
        </li>
      ))}
    </ul>
  )
}

function TagsTab() {
  const qc = useQueryClient()
  const { data: tags = [] } = useQuery({ queryKey: ['blog-tags'], queryFn: () => api.get('/blog/admin/tags').then(r => r.data.data) })
  const [name, setName] = useState('')
  const createMut = useMutation({
    mutationFn: body => api.post('/blog/admin/tags', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-tags'] }); setName(''); toast.success('Tag created') },
  })
  return (
    <div className="card p-4 space-y-4">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Tag name" value={name} onChange={e => setName(e.target.value)} />
        <button type="button" className="btn-primary" disabled={!name.trim()} onClick={() => createMut.mutate({ name })}>Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(t => <span key={t.id} className="px-3 py-1 rounded-full bg-gray-100 text-sm">{t.name}</span>)}
      </div>
    </div>
  )
}

function PostsTab({ onEdit }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => api.get('/blog/admin/posts', { params: { per_page: 50 } }).then(r => r.data.data),
  })
  const posts = data?.data || []

  const delMut = useMutation({
    mutationFn: id => api.delete(`/blog/admin/posts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-posts'] }); toast.success('Deleted') },
  })

  return (
    <div className="space-y-4">
      <button type="button" className="btn-primary flex items-center gap-2" onClick={() => onEdit('new')}>
        <Plus size={16} /> New article
      </button>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Title</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Category</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>
            ) : posts.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-left font-medium">{p.title}</td>
                <td className="px-3 py-2 text-left text-gray-500">{p.post_type}</td>
                <td className="px-3 py-2 text-left">{p.category_name || '—'}</td>
                <td className="px-3 py-2 text-left"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{p.status}</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <a
                    href={p.status === 'published' ? `/content/${p.menu_slug}/posts/${p.slug}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-block mr-3 ${p.status === 'published' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-300 pointer-events-none cursor-not-allowed'}`}
                    title={p.status === 'published' ? 'View public post' : 'Must be published to view'}
                  >
                    <Eye size={16} />
                  </a>
                  <button type="button" className="text-primary-600 hover:text-primary-800 mr-3" onClick={() => onEdit(p.id)} title="Edit"><Pencil size={16} /></button>
                  <button type="button" className="text-red-500 hover:text-red-700" onClick={() => delMut.mutate(p.id)} title="Delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PostEditorModal({ postId, onClose, onSaved }) {
  const isNew = postId === 'new'
  const { data: loaded, isLoading } = useQuery({
    queryKey: ['blog-post', postId],
    queryFn: () => api.get(`/blog/admin/posts/${postId}`).then(r => r.data.data),
    enabled: !isNew,
  })
  const { data: menus = [] } = useQuery({ queryKey: ['blog-menus-admin'], queryFn: () => api.get('/blog/admin/menus').then(r => r.data.data) })
  const { data: catTrees = [] } = useQuery({ queryKey: ['blog-categories-admin'], queryFn: () => api.get('/blog/admin/categories').then(r => r.data.data) })
  const { data: tags = [] } = useQuery({ queryKey: ['blog-tags'], queryFn: () => api.get('/blog/admin/tags').then(r => r.data.data) })

  const [form, setForm] = useState({
    menu_id: '', category_id: '', title: '', slug: '', excerpt: '', body: '', post_type: 'news',
    status: 'draft', is_featured: false, featured_image_path: '', tag_ids: [], blocks: [emptyBlock()],
    related_post_ids: [],
  })

  useEffect(() => {
    if (isNew && menus.length && !form.menu_id) {
      setForm(f => ({ ...f, menu_id: String(menus[0].id) }))
    }
  }, [menus, isNew])

  useEffect(() => {
    if (isNew || !loaded?.post) return
    const p = loaded.post
    setForm({
      menu_id: String(p.menu_id),
      category_id: p.category_id ? String(p.category_id) : '',
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      body: p.body || '',
      post_type: p.post_type,
      status: p.status,
      is_featured: !!p.is_featured,
      featured_image_path: p.featured_image_path || '',
      tag_ids: (loaded.tags || []).map(t => t.id),
      blocks: loaded.blocks?.length ? loaded.blocks.map((b, i) => ({ block_type: b.block_type, sort_order: i, data: b.data || {} })) : [emptyBlock()],
      related_post_ids: loaded.related_post_ids || [],
    })
  }, [loaded, isNew])

  const flatCats = catTrees.flatMap(t => (t.flat || []).map(c => ({ ...c, menu_label: t.menu_label })))

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        menu_id: Number(form.menu_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        blocks: form.blocks.map((b, i) => ({ ...b, sort_order: i })),
      }
      if (isNew) return api.post('/blog/admin/posts', payload)
      return api.put(`/blog/admin/posts/${postId}`, payload)
    },
    onSuccess: () => { toast.success('Saved'); onSaved() },
    onError: e => toast.error(e.response?.data?.message || 'Save failed'),
  })

  if (!isNew && isLoading) {
    return (
      <AdminModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
      </AdminModalPortal>
    )
  }

  async function uploadImage(file, field) {
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/blog/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setForm(f => ({ ...f, [field]: res.data.data.path }))
  }

  function updateBlock(i, patch) {
    setForm(f => {
      const blocks = [...f.blocks]
      blocks[i] = { ...blocks[i], ...patch }
      return { ...f, blocks }
    })
  }

  function moveBlock(i, dir) {
    setForm(f => {
      const blocks = [...f.blocks]
      if (i + dir < 0 || i + dir >= blocks.length) return f
      const temp = blocks[i]
      blocks[i] = blocks[i + dir]
      blocks[i + dir] = temp
      return { ...f, blocks }
    })
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-slate-950/60 p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
            <h3 className="font-bold text-lg">{isNew ? 'New article' : 'Edit article'}</h3>
            <button type="button" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="input" value={form.menu_id} onChange={e => setForm(f => ({ ...f, menu_id: e.target.value }))}>
                <option value="">Menu…</option>
                {menus.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Category…</option>
                {flatCats.filter(c => String(c.menu_id) === String(form.menu_id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="input" value={form.post_type} onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}>
                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <input className="input" placeholder="Slug (optional)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            <textarea className="input" rows={2} placeholder="Excerpt" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} />
            <textarea className="input" rows={4} placeholder="Body (fallback if no blocks)" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} /> Featured
            </label>
            <div>
              <label className="label">Featured image</label>
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'featured_image_path')} />
              {form.featured_image_path && <p className="text-xs text-gray-500 mt-1">{form.featured_image_path}</p>}
            </div>
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <label key={t.id} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={form.tag_ids.includes(t.id)}
                      onChange={e => setForm(f => ({
                        ...f,
                        tag_ids: e.target.checked ? [...f.tag_ids, t.id] : f.tag_ids.filter(id => id !== t.id),
                      }))} />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Content blocks</label>
                <button type="button" className="btn-outline btn-sm" onClick={() => setForm(f => ({ ...f, blocks: [...f.blocks, emptyBlock()] }))}>+ Block</button>
              </div>
              {form.blocks.map((b, i) => (
                <div key={i} className="border rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex gap-2">
                    <select className="input flex-1" value={b.block_type} onChange={e => updateBlock(i, { block_type: e.target.value, data: {} })}>
                      {BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="flex gap-1 items-center bg-gray-50 rounded-lg border px-1">
                      <button type="button" disabled={i === 0} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30" onClick={() => moveBlock(i, -1)}><ArrowUp size={16}/></button>
                      <button type="button" disabled={i === form.blocks.length - 1} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30" onClick={() => moveBlock(i, 1)}><ArrowDown size={16}/></button>
                    </div>
                    <button type="button" className="text-red-500 ml-1 p-2 hover:bg-red-50 rounded-lg" onClick={() => setForm(f => ({ ...f, blocks: f.blocks.filter((_, j) => j !== i) }))}><Trash2 size={16} /></button>
                  </div>
                  {['paragraph', 'heading', 'quote'].includes(b.block_type) && (
                    <textarea className="input text-sm" rows={3} placeholder="Text"
                      value={b.data?.text || ''} onChange={e => updateBlock(i, { data: { ...b.data, text: e.target.value } })} />
                  )}
                  {b.block_type === 'image' && (
                    <>
                      <input className="input text-sm" placeholder="Image path or upload"
                        value={b.data?.src || ''} onChange={e => updateBlock(i, { data: { ...b.data, src: e.target.value } })} />
                      <input type="file" accept="image/*" onChange={async e => {
                        if (!e.target.files?.[0]) return
                        const fd = new FormData()
                        fd.append('image', e.target.files[0])
                        const res = await api.post('/blog/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                        updateBlock(i, { data: { ...b.data, src: res.data.data.path } })
                      }} />
                    </>
                  )}
                  {b.block_type === 'embed' && (
                    <input className="input text-sm" placeholder="Embed URL" value={b.data?.url || ''}
                      onChange={e => updateBlock(i, { data: { url: e.target.value } })} />
                  )}
                  {b.block_type === 'list' && (
                    <textarea className="input text-sm" rows={2} placeholder="One item per line"
                      value={(b.data?.items || []).join('\n')}
                      onChange={e => updateBlock(i, { data: { items: e.target.value.split('\n').filter(Boolean) } })} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white rounded-b-xl">
            <button type="button" className="btn-primary flex items-center gap-2" disabled={!form.menu_id || !form.title || saveMut.isPending}
              onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}
