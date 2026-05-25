import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, Tag } from 'lucide-react'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'
import PageHero from '../../components/public/PageHero'
import { PostCard } from '../../components/blog/BlockRenderer'

const http = axios.create({ baseURL: '/api' })

export default function ContentTagPage() {
  const { tagSlug } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['blog-tag', tagSlug],
    queryFn: () => http.get(`/blog/tags/${tagSlug}/posts`).then(r => r.data.data),
  })

  return (
    <div className="page-shell">
      <PublicHeader />
      <PageHero
        eyebrow="Tagged articles"
        title={`#${data?.tag?.name || tagSlug}`}
        compact
      />
      <div className="container-page py-12">
        {isLoading ? (
          <Loader2 className="animate-spin mx-auto text-primary-600" />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data?.posts || []).map(p => (
              <PostCard key={p.id} post={p} menuSlug={p.menu_slug} />
            ))}
          </div>
        )}
        {!isLoading && !data?.posts?.length && (
          <p className="text-center text-ink-muted py-12">No articles with this tag.</p>
        )}
      </div>
      <PublicFooter />
    </div>
  )
}
