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
  console.log("pass")
  const applicationStatus = getApplicationStatus(member)
  console.log({applicationStatus})

  return membershipStatus === 'active' || applicationStatus === 'payment_verified'
}

export function getMemberLandingPath(member) {
  console.log("login redreict", member)
  return hasMemberDashboardAccess(member) ? '/member/dashboard' : '/member/status'
}