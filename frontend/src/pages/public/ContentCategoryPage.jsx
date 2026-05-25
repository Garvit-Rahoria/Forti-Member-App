import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, ChevronRight, Folder } from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import PageHero from '../../components/public/PageHero'
import GlassCard from '../../components/public/GlassCard'
import { PostCard } from '../../components/blog/BlockRenderer'

const http = axios.create({ baseURL: '/api' })

export default function ContentCategoryPage() {
  const { menuSlug, categorySlug } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-category', menuSlug, categorySlug],
    queryFn: () => http.get(`/blog/menus/${menuSlug}/categories/${categorySlug}`).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      </div>
    )
  }

  if (isError || !data?.category) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="text-center py-24 text-ink-muted">Category not found.</div>
      </div>
    )
  }

  const { menu, category, child_categories, posts, breadcrumbs, hub_path } = data

  const crumbEl = (
    <>
      <Link to="/" className="hover:text-white transition">Home</Link>
      <ChevronRight size={14} />
      <Link to={hub_path} className="hover:text-white transition">{menu.label}</Link>
      {breadcrumbs.map((b, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} />
          {b.path ? <Link to={b.path} className="hover:text-white transition">{b.label}</Link> : <span className="text-white/90">{b.label}</span>}
        </span>
      ))}
    </>
  )

  return (
    <div className="page-shell">
      <PublicHeader />

      <PageHero
        title={category.name}
        subtitle={category.description}
        breadcrumbs={crumbEl}
        compact
      />

      <div className="container-page py-12 space-y-12">
        {child_categories.length > 0 && (
          <section>
            <h2 className="heading-display text-lg text-ink mb-4 flex items-center gap-2">
              <Folder size={18} className="text-primary-600" /> Sub-categories
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {child_categories.map(ch => (
                <Link key={ch.id} to={ch.path}>
                  <GlassCard className="p-4 hover:border-primary-200">
                    <p className="font-semibold text-ink">{ch.name}</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="heading-display text-lg text-ink mb-6">Articles</h2>
          {posts.length === 0 ? (
            <p className="text-ink-subtle text-center py-12">No articles in this category yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(p => <PostCard key={p.id} post={p} menuSlug={menuSlug} />)}
            </div>
          )}
        </section>
      </div>

      <PublicFooter />
    </div>
  )
}
