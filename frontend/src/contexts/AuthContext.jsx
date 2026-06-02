import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

// Decode JWT and check if it is expired without making a network request
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('forti_token')

    // If no token or it is already expired → skip the API call entirely
    if (!stored || isTokenExpired(stored)) {
      sessionStorage.removeItem('forti_token')
      setLoading(false)
      return
    }

    // Token looks valid locally — verify with the server before granting access
    api.get('/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => {
        // Only set token in state AFTER server confirms it's valid
        setToken(stored)
        setUser(r.data.data)
        setLoading(false)
      })
      .catch(() => {
        // Server rejected token — clear everything
        sessionStorage.removeItem('forti_token')
        setToken(null)
        setUser(null)
        setLoading(false)
      })
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token: t, user: u } = res.data.data
    sessionStorage.setItem('forti_token', t)
    // State updates will be batched by React 18 correctly
    setToken(t)
    setUser(u)
    console.log('[Auth] Login success — token set in state:', t ? 'YES' : 'NO')
    return u
  }

  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      console.warn('Logout API failed:', e);
    }
    sessionStorage.removeItem('forti_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
