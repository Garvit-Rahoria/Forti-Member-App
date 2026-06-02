const LOCAL_STORAGE_PREFIXES = ['forti_member', 'forti_application', 'membership_application', 'applicant']
const SESSION_STORAGE_PREFIXES = ['forti_member', 'forti_application', 'membership_application', 'applicant']

function removePrefixedKeys(storage, prefixes) {
  if (!storage) return
  const keysToRemove = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && prefixes.some(prefix => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(key => storage.removeItem(key))
}

export function clearMemberApplicantSession() {
  console.trace('[memberSession] clearMemberApplicantSession called!')
  removePrefixedKeys(window.localStorage, LOCAL_STORAGE_PREFIXES)
  removePrefixedKeys(window.sessionStorage, SESSION_STORAGE_PREFIXES)
  window.localStorage.removeItem('forti_member_token')
  document.cookie.split(';').forEach(cookie => {
    const eqIndex = cookie.indexOf('=')
    const rawName = eqIndex >= 0 ? cookie.slice(0, eqIndex) : cookie
    const name = rawName.trim()
    if (!name) return
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  })
}
