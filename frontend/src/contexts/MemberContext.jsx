import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { clearMemberApplicantSession } from '../utils/memberSession'

const MemberContext = createContext(null)

// 15 s timeout — prevents infinite spinner if backend is slow/unreachable
const http = axios.create({ baseURL: '/api', timeout: 15_000 })
const STORAGE_KEY = 'forti_member_token'

export function MemberProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem(STORAGE_KEY))
  const [member, setMember]   = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY))

  // Store token in a ref so fetchMe can read latest value without being a dep
  const tokenRef = useRef(token)
  useEffect(() => { tokenRef.current = token }, [token])

  // fetchMe has NO deps — always call with explicit tok argument
  const fetchMe = useCallback(async (t) => {
    const tok = t ?? tokenRef.current
    if (!tok) { setLoading(false); return null }
    try {
      const headers = { Authorization: `Bearer ${tok}` }
      const res = await http.get('/member/me', { headers })
      const data = res.data.data
      setMember(data)
      return data
    } catch (err) {
      // Clear session on any auth failure (401 = expired, 403 = wrong role/token)
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        console.warn('[MemberContext] Token invalid/expired — clearing session')
        clearMemberApplicantSession()
        setToken(null)
        setMember(null)
      } else {
        console.warn('[MemberContext] /me fetch failed (non-auth):', err?.message)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, []) // no deps — uses tokenRef + explicit arg

  // Run once on mount: restore session from localStorage token
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) fetchMe(saved)
    else setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab session sync: if another tab changes/removes the token,
  // clear or reload the session so a new login doesn't show stale data.
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return
      if (!e.newValue) {
        // Token was removed in another tab (logout) — clear this tab too
        setToken(null)
        setMember(null)
      } else if (e.newValue !== tokenRef.current) {
        // Token changed (new user logged in another tab) — fetch fresh data
        tokenRef.current = e.newValue
        setToken(e.newValue)
        setLoading(true)
        fetchMe(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fetchMe])

  // login: called by MemberLogin after OTP — always fetches fresh profile
  async function login(tok) {
    // Fully clear previous session before loading new one
    setMember(null)
    setToken(null)
    clearMemberApplicantSession()
    localStorage.setItem(STORAGE_KEY, tok)
    tokenRef.current = tok
    setToken(tok)
    setLoading(true)
    return await fetchMe(tok)
  }

  async function logout() {
    try {
      const t = tokenRef.current;
      if (t) await http.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${t}` } });
    } catch (e) {
      console.warn('Logout API failed:', e);
    }
    clearMemberApplicantSession()
    setToken(null)
    setMember(null)
  }

  function apiClient() {
    const t = tokenRef.current
    return axios.create({
      baseURL: '/api',
      headers: t ? { Authorization: `Bearer ${t}` } : {}
    })
  }

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
