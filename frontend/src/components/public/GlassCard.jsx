export default function GlassCard({ children, className = '', hover = true, dark = false }) {
  const base = dark ? 'glass-card-dark' : 'glass-card'
  return (
    <div className={`${base} ${hover ? 'transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  )
}
