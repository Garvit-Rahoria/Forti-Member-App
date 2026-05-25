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

      {post.featured_image_path ? (
        <div className="relative max-h-[480px] overflow-hidden bg-primary-950">
          <img src={assetUrl(post.featured_image_path)} alt="" className="w-full max-h-[480px] object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 container-page pb-10 pt-24">
            <PostTypeBadge type={post.post_type} />
            <h1 className="heading-display text-3xl sm:text-4xl text-white mt-4 max-w-3xl leading-tight">{post.title}</h1>
          </div>
        </div>
      ) : (
        <section className="hero-dark py-16">
          <div className="mesh-orb-1" />
          <div className="container-page">
            <PostTypeBadge type={post.post_type} />
            <h1 className="heading-display text-3xl sm:text-4xl text-white mt-4 max-w-3xl">{post.title}</h1>
          </div>
        </section>
      )}

      <div className="container-page py-4">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <ChevronRight size={14} />
          <Link to={`/content/${menu.slug}`} className="hover:text-primary-600">{menu.label}</Link>
          {post.category_slug && (
            <>
              <ChevronRight size={14} />
              <Link to={`/content/${menuSlug}/${post.category_slug}`} className="hover:text-primary-600">{post.category_name}</Link>
            </>
          )}
        </nav>
      </div>

      <article className="container-page max-w-3xl pb-16">
        {!post.featured_image_path && null}

        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted mb-8 pb-6 border-b border-primary-100/60">
          {post.published_at && (
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary-500" />
              {new Date(post.published_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </span>
          )}
          {post.author_name && <span>By {post.author_name}</span>}
          {post.view_count > 0 && <span className="flex items-center gap-1"><Eye size={14} /> {post.view_count} views</span>}
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(t => (
              <Link key={t.id} to={`/tags/${t.slug}`} className="badge-purple hover:bg-primary-100 transition">#{t.name}</Link>
            ))}
          </div>
        )}

        {post.excerpt && (
          <p className="text-xl text-ink-muted leading-relaxed border-l-4 border-accent-gold pl-5 mb-10 font-medium">{post.excerpt}</p>
        )}

        <div className="prose prose-lg max-w-none">
          {hasBlocks ? (
            <BlockRenderer blocks={blocks} relatedPosts={related_posts} menuSlug={menuSlug} />
          ) : (
            <div className="text-ink-muted leading-relaxed whitespace-pre-wrap text-base">{post.body}</div>
          )}
        </div>

        {!hasBlocks && related_posts?.length > 0 && (
          <section className="mt-14 pt-10 border-t border-primary-100/60">
            <BlockRenderer blocks={[{ block_type: 'related_posts', data: { title: 'Related articles', limit: 4 } }]} relatedPosts={related_posts} menuSlug={menuSlug} />
          </section>
        )}
      </article>

      <PublicFooter />
    </div>
  )
}
