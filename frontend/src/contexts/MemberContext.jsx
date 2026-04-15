import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const MemberContext = createContext(null)

const http = axios.create({ baseURL: '/api' })
const STORAGE_KEY = 'forti_member_token'

export function MemberProvider({ children }) {
  const [token, setToken]     = useState(() => localStorage.getItem(STORAGE_KEY))
  const [member, setMember]   = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY))

  const fetchMe = useCallback(async (t) => {
    const tok = t || token
    if (!tok) { setLoading(false); return }
    try {
      const res = await http.get('/member/me', {
        headers: { Authorization: `Bearer ${tok}` }
      })
      setMember(res.data.data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchMe(token)
    else setLoading(false)
  }, [])

  function login(tok, memberData) {
    localStorage.setItem(STORAGE_KEY, tok)
    setToken(tok)
    setMember(memberData)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setMember(null)
  }

  function apiClient() {
    return axios.create({
      baseURL: '/api',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
  }

  return (
    <MemberContext.Provider value={{ token, member, loading, login, logout, apiClient, refetch: () => fetchMe(token) }}>
      {children}
    </MemberContext.Provider>
  )
}

export function useMember() {
  const ctx = useContext(MemberContext)
  if (!ctx) throw new Error('useMember must be used within MemberProvider')
  return ctx
}
