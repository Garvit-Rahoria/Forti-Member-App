export default function PageHero({ eyebrow, title, subtitle, breadcrumbs, children, compact = false }) {
  return (
    <section className={`hero-dark relative ${compact ? 'py-14' : 'py-20 lg:py-24'}`}>
      <div className="mesh-orb-1" />
      <div className="mesh-orb-2" />
      <div className="relative container-page">
        {breadcrumbs && (
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-primary-200/80 mb-6">
            {breadcrumbs}
          </nav>
        )}
        {eyebrow && <span className="eyebrow-light">{eyebrow}</span>}
        <h1 className="heading-display text-4xl sm:text-5xl text-white mt-3 max-w-4xl">{title}</h1>
        {subtitle && <p className="text-primary-100/90 text-lg mt-4 max-w-2xl leading-relaxed">{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}
