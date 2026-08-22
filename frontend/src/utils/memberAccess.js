export function getApplicationStatus(member) {
  return member?.applicationStatus ?? member?.status ?? null
}

export function getMembershipStatus(member) {
  return member?.membershipStatus ?? member?.member_status ?? 'inactive'
}

export function getDisplayStatus(member) {
  return hasMemberDashboardAccess(member) ? 'active' : getApplicationStatus(member)
}

export function hasMemberDashboardAccess(member) {
  if (!member) return false

  // Check every possible field name the backend might return
  const memberStatus   = member.membershipStatus ?? member.member_status ?? null
  const appStatus      = member.applicationStatus ?? member.status ?? null
  const role           = member.role ?? null

  // Active via member_status
  if (memberStatus === 'active') return true

  // Active via application status
  if (appStatus === 'active') return true

  // Active via role field
  if (role === 'member') return true

  return false
}

export function getMemberLandingPath(member) {
  if (!member) return '/member/status'
  return hasMemberDashboardAccess(member) ? '/member/dashboard' : '/member/status'
}