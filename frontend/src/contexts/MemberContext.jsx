import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { clearMemberApplicantSession } from '../utils/memberSession'

const MemberContext = createContext(null)

const http = axios.create({ baseURL: '/api', timeout: 15_000 })
const STORAGE_KEY = 'forti_member_token'

export function MemberProvider({ children }) {
  // Read token from localStorage on first render — this is the KEY fix for persistence
  const [token, setToken]     = useState(() => localStorage.getItem(STORAGE_KEY))
  const [member, setMember]   = useState(null)
  // Start in loading=true only if there IS a saved token (we need to validate it)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(STORAGE_KEY))

  const tokenRef = useRef(token)

  // Keep ref in sync with state (for use inside callbacks without stale closures)
  const syncToken = (t) => {
    if (t === null) {
      console.trace('[MemberContext] setToken(null) called!')
    }
    tokenRef.current = t
    setToken(t)
  }

  // Fetch member profile from backend using a given token
  const fetchMe = useCallback(async (tok) => {
    if (!tok) {
      setLoading(false)
      return null
    }
    try {
      const res = await http.get('/member/me', {
        headers: { Authorization: `Bearer ${tok}` }
      })
      const data = res.data.data
      setMember(data)
      return data
    } catch (err) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        console.warn('[MemberContext] Token invalid/expired — clearing session')
        localStorage.removeItem(STORAGE_KEY)
        clearMemberApplicantSession()
        syncToken(null)
        setMember(null)
      } else {
        console.warn('[MemberContext] /me fetch failed (non-auth):', err?.message)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount: if we already have a token in localStorage, validate it immediately
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      tokenRef.current = saved
      fetchMe(saved)
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab sync: if another tab logs out or in, mirror that here
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return
      if (!e.newValue) {
        console.warn('[MemberContext] Logged out in another tab - clearing session')
        syncToken(null)
        setMember(null)
      } else if (e.newValue !== tokenRef.current) {
        // New session in another tab
        tokenRef.current = e.newValue
        setToken(e.newValue)
        setLoading(true)
        fetchMe(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fetchMe])

  /**
   * login(tok) — called from MemberLogin after successful OTP verification.
   * Order is critical:
   *   1. Write token to localStorage immediately (so any re-render reads it)
   *   2. Update tokenRef (so fetchMe uses the right token)
   *   3. Set token state (triggers re-renders with the correct token)
   *   4. Fetch member profile
   *   5. Return memberData so caller can compute the redirect path
   */
  const login = useCallback(async (tok) => {
    // Step 1 & 2: persist and sync ref BEFORE any state update
    localStorage.setItem(STORAGE_KEY, tok)
    tokenRef.current = tok

    // Step 3: update state — MemberRoute will now see token = tok
    syncToken(tok)
    setLoading(true)
    setMember(null)

    // Step 4: fetch member profile (setLoading(false) happens inside fetchMe's finally)
    const memberData = await fetchMe(tok)

    return memberData
  }, [fetchMe])

  const logout = useCallback(async () => {
    try {
      const t = tokenRef.current
      if (t) await http.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${t}` } })
    } catch (e) {
      console.warn('Logout failed:', e)
    }
    console.warn('[MemberContext] logout() called - clearing session')
    clearMemberApplicantSession()
    syncToken(null)
    setMember(null)
    setLoading(false)
  }, [])

  const apiClient = useCallback(() => {
    const t = tokenRef.current
    return axios.create({
      baseURL: '/api',
      headers: t ? { Authorization: `Bearer ${t}` } : {}
    })
  }, [])

  return (
    <MemberContext.Provider value={{ token, member, loading, login, logout, apiClient, refetch: () => fetchMe(tokenRef.current) }}>
      {children}
    </MemberContext.Provider>
  )
}

export function useMember() {
  const ctx = useContext(MemberContext)
  if (!ctx) throw new Error('useMember must be used within MemberProvider')
  return ctx
}
