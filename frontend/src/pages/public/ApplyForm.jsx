import { useParams, useSearchParams } from 'react-router-dom'
import DynamicFormRenderer from '../../components/dynamic-form/DynamicFormRenderer'

export default function ApplyForm() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const resumeUuid = searchParams.get('resume')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <span className="font-bold text-gray-900 text-lg">FORTI Membership Portal</span>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <DynamicFormRenderer
          formSlug={slug}
          submissionUuid={resumeUuid}
        />
      </main>

      <footer className="text-center text-xs text-gray-400 py-6">
        &copy; {new Date().getFullYear()} FORTI. All rights reserved.
      </footer>
    </div>
  )
}
