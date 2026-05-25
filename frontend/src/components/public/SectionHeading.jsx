export default function SectionHeading({ eyebrow, title, subtitle, light = false, center = true, className = '' }) {
  return (
    <div className={`${center ? 'text-center' : ''} mb-12 ${className}`}>
      {eyebrow && (
        <span className={light ? 'eyebrow-light justify-center' : 'eyebrow justify-center'}>
          <span className={`w-8 h-px ${light ? 'bg-primary-300/50' : 'bg-primary-300'}`} />
          {eyebrow}
          <span className={`w-8 h-px ${light ? 'bg-primary-300/50' : 'bg-primary-300'}`} />
        </span>
      )}
      <h2 className={`heading-display text-3xl sm:text-4xl mt-3 ${light ? 'text-white' : 'text-ink'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 max-w-2xl text-base leading-relaxed ${center ? 'mx-auto' : ''} ${light ? 'text-primary-100/90' : 'text-ink-muted'}`}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
