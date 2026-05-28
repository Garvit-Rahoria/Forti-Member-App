import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, ChevronRight, Calendar, Eye } from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import BlockRenderer, { PostTypeBadge } from '../../components/blog/BlockRenderer'
import { assetUrl } from '../../utils/assetUrl'

const http = axios.create({ baseURL: '/api' })

export default function BlogPostPage() {
  const { menuSlug, postSlug } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post', menuSlug, postSlug],
    queryFn: () => http.get(`/blog/menus/${menuSlug}/posts/${postSlug}`).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      </div>
    )
  }

  if (isError || !data?.post) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="text-center py-24 text-ink-muted">Article not found.</div>
      </div>
    )
  }

  const { menu, post, blocks, related_posts } = data
  const hasBlocks = blocks?.length > 0

  return (
    <div className="page-shell">
      <PublicHeader />

      <div className="container-page pt-8 pb-4">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-8 font-medium">
          <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <Link to={`/content/${menu.slug}`} className="hover:text-primary-600 transition-colors">{menu.label}</Link>
          {post.category_slug && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <Link to={`/content/${menuSlug}/${post.category_slug}`} className="hover:text-primary-600 transition-colors">{post.category_name}</Link>
            </>
          )}
        </nav>

        <div className="max-w-4xl mx-auto">
          <div className="mb-5">
            <PostTypeBadge type={post.post_type} />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.15] tracking-tight mb-6">{post.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 py-6 border-y border-gray-100">
            {post.published_at && (
              <span className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" />
                {new Date(post.published_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </span>
            )}
            {post.author_name && <span>By <span className="font-semibold text-gray-900">{post.author_name}</span></span>}
            {post.view_count > 0 && <span className="flex items-center gap-2"><Eye size={16} className="text-gray-400" /> {post.view_count} views</span>}
          </div>
        </div>
      </div>

      <article className="container-page max-w-4xl pb-24">
        {post.featured_image_path && (
          <div className="mb-14 mt-4">
            <img 
              src={assetUrl(post.featured_image_path)} 
              alt={post.title} 
              className="w-full max-h-[700px] object-contain rounded-2xl bg-gray-50 border border-gray-100 shadow-sm"
            />
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {post.tags.map(t => (
              <Link key={t.id} to={`/tags/${t.slug}`} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors">#{t.name}</Link>
            ))}
          </div>
        )}

        {post.excerpt && (
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed border-l-4 border-primary-500 pl-6 mb-12 font-serif italic">{post.excerpt}</p>
        )}

        <div className="prose prose-lg md:prose-xl text-gray-800 prose-headings:text-gray-900 prose-headings:font-bold prose-a:text-primary-600 max-w-none">
          {hasBlocks ? (
            <BlockRenderer blocks={blocks} relatedPosts={related_posts} menuSlug={menuSlug} />
          ) : (
            <div className="leading-relaxed whitespace-pre-wrap">{post.body}</div>
          )}
        </div>

        {!hasBlocks && related_posts?.length > 0 && (
          <section className="mt-20 pt-12 border-t border-gray-200">
            <BlockRenderer blocks={[{ block_type: 'related_posts', data: { title: 'Related articles', limit: 4 } }]} relatedPosts={related_posts} menuSlug={menuSlug} />
          </section>
        )}
      </article>

      <PublicFooter />
    </div>
  )
}
