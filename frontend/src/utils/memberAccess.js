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
  const membershipStatus = getMembershipStatus(member)
  const applicationStatus = getApplicationStatus(member)

  return membershipStatus === 'active' || applicationStatus === 'active'
}

export function getMemberLandingPath(member) {
  return hasMemberDashboardAccess(member) ? '/member/dashboard' : '/member/status'
}