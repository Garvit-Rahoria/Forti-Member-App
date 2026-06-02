import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMember } from '../../contexts/MemberContext'
import { MembershipBlockedScreen } from './MemberDashboard'
import { hasMemberDashboardAccess } from '../../utils/memberAccess'
import { clearMemberApplicantSession } from '../../utils/memberSession'

export default function MemberStatus() {
  const navigate = useNavigate()
  const { token, member, loading, logout, refetch } = useMember()

  useEffect(() => {
    if (!loading && !member) {
      navigate('/member/login', { replace: true })
      return
    }

    if (!loading && member && hasMemberDashboardAccess(member)) {
      navigate('/member/dashboard', { replace: true })
    }
  }, [loading, member, navigate])

  if (loading || !member) return null

  function handleLogout() {
    clearMemberApplicantSession()
    logout()
    navigate('/', { replace: true })
  }

  return <MembershipBlockedScreen member={member} onLogout={handleLogout} refetch={refetch} />
}