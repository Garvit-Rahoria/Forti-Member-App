import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, FolderOpen, ArrowRight } from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import PageHero from '../../components/public/PageHero'
import GlassCard from '../../components/public/GlassCard'
import { PostCard } from '../../components/blog/BlockRenderer'

const http = axios.create({ baseURL: '/api' })

export default function ContentHubPage() {
  const { menuSlug } = useParams()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-hub', menuSlug],
    queryFn: () => http.get(`/blog/menus/${menuSlug}`).then(r => r.data.data),
  })

  if (isLoading) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary-600" size={32} /></div>
      </div>
    )
  }

  if (isError || !data?.menu) {
    return (
      <div className="page-shell">
        <PublicHeader />
        <div className="text-center py-24 text-ink-muted">Section not found.</div>
      </div>
    )
  }

  const { menu, root_categories, featured_posts, recent_posts } = data

  return (
    <div className="page-shell">
      <PublicHeader />

      <PageHero
        eyebrow="Chamber insights"
        title={menu.label}
        subtitle={menu.description}
      />

      <div className="container-page py-14 space-y-16">
        <section>
          <h2 className="heading-display text-xl text-ink mb-6 flex items-center gap-2">
            <FolderOpen size={22} className="text-primary-600" /> Browse by topic
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {root_categories.map(cat => (
              <Link key={cat.id} to={cat.path}>
                <GlassCard className="p-6 h-full group">
                  <h3 className="text-lg font-display font-bold text-ink group-hover:text-primary-700 transition">{cat.name}</h3>
                  {cat.description && <p className="text-sm text-ink-muted mt-2 line-clamp-2">{cat.description}</p>}
                  <p className="text-sm text-primary-600 font-semibold mt-4 flex items-center gap-1">
                    {cat.child_count > 0 ? `${cat.child_count} sub-topics · ` : ''}
                    View articles <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>

        {featured_posts?.length > 0 && (
          <section>
            <h2 className="heading-display text-xl text-ink mb-6">Featured</h2>
            <PostCard post={featured_posts[0]} menuSlug={menuSlug} large />
          </section>
        )}

        {recent_posts?.length > 0 && (
          <section>
            <h2 className="heading-display text-xl text-ink mb-6">Latest</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recent_posts.map(p => <PostCard key={p.id} post={p} menuSlug={menuSlug} />)}
            </div>
          </section>
        )}
      </div>

      <PublicFooter />
    </div>
  )
}
