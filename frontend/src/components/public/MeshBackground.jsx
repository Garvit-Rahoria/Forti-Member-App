export default function MeshBackground({ variant = 'light', className = '' }) {
  if (variant === 'dark') {
    return (
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
        <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full bg-primary-400/25 blur-3xl animate-mesh-drift" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-accent-gold/20 blur-3xl animate-mesh-drift" style={{ animationDelay: '-10s' }} />
        <div className="absolute top-1/2 left-0 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl animate-mesh-drift" style={{ animationDelay: '-5s' }} />
      </div>
    )
  }
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary-200/40 blur-3xl animate-mesh-drift" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent-gold/20 blur-3xl animate-mesh-drift" style={{ animationDelay: '-8s' }} />
    </div>
  )
}
