/** Resolve upload/storage paths — uses Vite proxy in dev when VITE_API_URL is unset. */
export function assetUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  let base = import.meta.env.VITE_API_URL || ''
  base = base.replace(/\/api\/?$/, '').replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}
