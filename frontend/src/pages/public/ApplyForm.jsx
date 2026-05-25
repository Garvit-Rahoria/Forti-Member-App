import { useParams, useSearchParams } from 'react-router-dom'
import DynamicFormRenderer from '../../components/dynamic-form/DynamicFormRenderer'
import PublicHeader from '../../components/public/PublicHeader'
import PublicFooter from '../../components/public/PublicFooter'

export default function ApplyForm() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const resumeUuid = searchParams.get('resume')

  return (
    <div className="page-shell">
      <PublicHeader />

      <main className="container-page max-w-4xl py-8">
        <DynamicFormRenderer
          formSlug={slug}
          submissionUuid={resumeUuid}
        />
      </main>

      <PublicFooter />
    </div>
  )
}
