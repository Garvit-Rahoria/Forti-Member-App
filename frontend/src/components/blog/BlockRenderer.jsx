import { Link } from 'react-router-dom'
import { assetUrl } from '../../utils/assetUrl'

const POST_TYPE_LABELS = {
  news: 'News',
  industry_update: 'Industry Update',
  tax_update: 'Tax Update',
  announcement: 'Announcement',
  event: 'Event',
  policy: 'Policy',
  partnership: 'Partnership',
}

export function PostTypeBadge({ type }) {
  const label = POST_TYPE_LABELS[type] || type
  const colors = {
    tax_update: 'bg-amber-100 text-amber-800',
    industry_update: 'bg-blue-100 text-blue-800',
    news: 'bg-primary-100 text-primary-800',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}

export default function BlockRenderer({ blocks = [], relatedPosts = [], menuSlug }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        const d = block.data || {}
        switch (block.block_type) {
          case 'heading':
            return <h2 key={block.id || i} className="text-2xl font-bold text-gray-900">{d.text}</h2>
          case 'paragraph':
            return <p key={block.id || i} className="text-gray-700 leading-relaxed whitespace-pre-wrap">{d.text}</p>
          case 'quote':
            return (
              <blockquote key={block.id || i} className="border-l-4 border-primary-500 pl-4 py-2 italic text-gray-600 bg-primary-50/50 rounded-r-lg">
                {d.text}
                {d.cite && <footer className="text-sm text-gray-500 mt-2 not-italic">— {d.cite}</footer>}
              </blockquote>
            )
          case 'image':
            return d.src ? (
              <figure key={block.id || i} className="rounded-xl overflow-hidden">
                <img src={assetUrl(d.src)} alt={d.alt || ''} className="w-full" />
                {d.caption && <figcaption className="text-center text-sm text-gray-500 py-2">{d.caption}</figcaption>}
              </figure>
            ) : null
          case 'list':
            return (
              <ul key={block.id || i} className="list-disc pl-6 space-y-1 text-gray-700">
                {(d.items || []).map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            )
          case 'embed':
            return d.html ? (
              <div key={block.id || i} className="aspect-video rounded-xl overflow-hidden bg-black" dangerouslySetInnerHTML={{ __html: d.html }} />
            ) : d.url ? (
              <div key={block.id || i} className="aspect-video rounded-xl overflow-hidden">
                <iframe title="embed" src={d.url} className="w-full h-full" allowFullScreen />
              </div>
            ) : null
          case 'divider':
            return <hr key={block.id || i} className="border-gray-200" />
          case 'cta':
            return (
              <div key={block.id || i} className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 text-center">
                {d.title && <h3 className="text-xl font-bold mb-2">{d.title}</h3>}
                {d.text && <p className="text-primary-100 mb-4">{d.text}</p>}
                {d.button_url && (
                  <a href={d.button_url} className="inline-block bg-white text-primary-700 font-semibold px-5 py-2 rounded-lg hover:bg-primary-50">
                    {d.button_label || 'Learn more'}
                  </a>
                )}
              </div>
            )
          case 'gallery':
            return (
              <div key={block.id || i} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(d.images || []).map((src, j) => (
                  <img key={j} src={assetUrl(src)} alt="" className="rounded-lg object-cover w-full h-32" />
                ))}
              </div>
            )
          case 'related_posts':
            return relatedPosts.length > 0 ? (
              <section key={block.id || i}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{d.title || 'Related articles'}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {relatedPosts.slice(0, d.limit || 4).map(p => (
                    <Link key={p.id} to={`/content/${menuSlug}/posts/${p.slug}`}
                      className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-md transition bg-white">
                      {p.featured_image_path && (
                        <img src={assetUrl(p.featured_image_path)} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <PostTypeBadge type={p.post_type} />
                        <p className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{p.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null
          default:
            return d.text ? <p key={block.id || i} className="text-gray-700">{d.text}</p> : null
        }
      })}
    </div>
  )
}

export function PostCard({ post, menuSlug, large }) {
  const path = `/content/${menuSlug}/posts/${post.slug}`
  const catPath = post.category_slug ? `/content/${menuSlug}/${post.category_slug}` : null
  return (
    <article className={`group card-hover overflow-hidden ${large ? 'md:flex' : ''}`}>
      {post.featured_image_path && (
        <Link to={path} className={`relative block overflow-hidden ${large ? 'md:w-2/5 shrink-0' : ''}`}>
          <img src={assetUrl(post.featured_image_path)} alt="" className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${large ? 'h-full min-h-[220px]' : 'h-48'}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-60" />
        </Link>
      )}
      <div className={`p-5 ${large ? 'flex flex-col justify-center md:p-8' : ''}`}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <PostTypeBadge type={post.post_type} />
          {post.category_name && catPath && (
            <Link to={catPath} className="text-xs text-primary-600 hover:underline font-medium">{post.category_name}</Link>
          )}
        </div>
        <Link to={path}>
          <h3 className={`font-display font-bold text-ink group-hover:text-primary-700 transition ${large ? 'text-2xl' : 'text-lg'}`}>{post.title}</h3>
        </Link>
        {post.excerpt && <p className="text-ink-muted text-sm mt-2 line-clamp-3 leading-relaxed">{post.excerpt}</p>}
        {post.published_at && (
          <p className="text-xs text-ink-subtle mt-3">{new Date(post.published_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
        )}
        <Link to={path} className="inline-flex items-center gap-1 text-sm text-primary-600 font-semibold mt-4 hover:gap-2 transition-all">
          Read more →
        </Link>
      </div>
    </article>
  )
}
