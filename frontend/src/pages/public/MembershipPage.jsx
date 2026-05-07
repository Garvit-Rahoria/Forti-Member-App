import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MembershipApplicationForm from '../../components/membership/MembershipApplicationForm'
import OTPModal from '../../components/membership/OTPModal'
import { clearMemberApplicantSession } from '../../utils/memberSession'
import { useMember } from '../../contexts/MemberContext'

export default function MembershipPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useMember()
  // Accept pre-verified OTP data from LandingPage via navigate state
  const [otpVerified, setOtpVerified] = useState(location.state?.otpData || null)
  const [showOTPModal, setShowOTPModal] = useState(!location.state?.otpData)

  useEffect(() => {
    clearMemberApplicantSession()
    logout()
    window.history.replaceState(null, '', window.location.pathname)
  }, [logout])

  function handleOTPVerified(data) {
    setOtpVerified(data)
    setShowOTPModal(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-extrabold text-base shadow">
            F
          </div>
          <div>
            <span className="font-bold text-gray-900 text-base">FORTI Membership Portal</span>
            <p className="text-xs text-gray-400 leading-none">Membership Application</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!otpVerified ? (
          /* Waiting for OTP verification – show a placeholder / locked state */
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">🔒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Identity Verification Required</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              To begin your membership application, please complete a quick verification.
              An OTP will be sent to your email.
            </p>
            <button
              onClick={() => setShowOTPModal(true)}
              className="btn-primary btn-lg mx-auto">
              Verify My Identity
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-full mb-4">
                <span>✅</span>
                <span>Identity verified for <strong>{otpVerified.applicant?.email}</strong></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Apply for Membership</h1>
              <p className="text-gray-500 mt-2 text-sm">Complete all 5 steps to submit your membership application</p>
            </div>
            <MembershipApplicationForm key={otpVerified.applicant?.email || otpVerified.applicant?.phone_full || 'membership-application'} prefill={otpVerified.applicant} />
          </>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-8">
        &copy; {new Date().getFullYear()} FORTI. All rights reserved.
        <span className="mx-2">·</span>
        Developed by{' '}
        <a
          href="https://kaitensoftware.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-primary-600 transition-colors font-medium"
        >
          Kaiten Software
        </a>
      </footer>

      {/* OTP Modal */}
      {showOTPModal && (
        <OTPModal
          onVerified={handleOTPVerified}
          onClose={() => {
            setShowOTPModal(false)
            if (!otpVerified) navigate('/')
          }}
        />
      )}
    </div>
  )
}

