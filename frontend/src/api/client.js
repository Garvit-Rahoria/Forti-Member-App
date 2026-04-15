import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  // Never attach a token to the login request itself
  if (config.url?.includes('/auth/login')) return config
  const token = localStorage.getItem('forti_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      // Don't redirect on the login or me endpoints – let the caller handle it
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/me')
      if (!isAuthEndpoint) {
        localStorage.removeItem('forti_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
