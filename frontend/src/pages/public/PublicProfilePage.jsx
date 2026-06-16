import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, Share, Youtube } from 'lucide-react'
import { assetUrl } from '../../utils/assetUrl'
import { usePublicProfile } from '../../hooks/usePublicQueries'
import { SITE_LOGO } from '../../data/siteAssets'

export default function PublicProfilePage() {
  const { slug } = useParams()
  const { data, isLoading, isError } = usePublicProfile(slug)

  const themeColor = data?.theme_color || '#6C3EAB'
  const textColor = data?.text_color || (data?.background_style === 'solid' ? '#ffffff' : '#111827')
  const bgStyle = data?.background_style || 'solid'
  const buttonStyle = data?.button_style || 'rounded'

  useEffect(() => {
    if (data) {
      document.title = `${data.name} | FORTI`
      
      const setMeta = (name, content) => {
        let el = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };
      
      setMeta('og:title', data.name);
      if (data.headline) setMeta('og:description', data.headline);
      if (data.photo) setMeta('og:image', assetUrl(data.photo));
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: themeColor }} size={36} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 text-center p-8 bg-gray-50">
        <p className="text-gray-600">This profile is not available or is set to private.</p>
        <Link to="/" className="text-[#8b3dff] hover:underline font-medium">Return to Home</Link>
      </div>
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data.name,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const detectYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    return match ? match[1] : null;
  }

  const getButtonClass = (isFeatured) => {
    let base = "block w-full font-semibold text-[15px] text-center py-4 px-6 transition-transform relative "
    
    if (isFeatured) {
      base += "animate-pulse shadow-xl scale-[1.03] "
    } else {
      base += "shadow-sm hover:scale-[1.02] "
    }

    if (buttonStyle === 'pill') base += "rounded-full "
    else if (buttonStyle === 'rounded') base += "rounded-[24px] "
    else if (buttonStyle === 'outline') base += "rounded-none border-2 "
    else base += "rounded-[24px] " 
    
    if (buttonStyle === 'outline') {
      base += "bg-transparent "
    } else {
      base += "bg-white text-gray-900 border border-gray-100 "
    }

    return base
  }

  const isDarkBg = textColor === '#ffffff'
  const cardBgClass = isDarkBg 
    ? "bg-white/10 border-white/10 backdrop-blur-md shadow-sm" 
    : "bg-white/80 border-gray-200/80 backdrop-blur-md shadow-sm"

  return (
    <div className="min-h-screen w-full relative font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-white" />
      {bgStyle === 'solid' ? (
        <div className="fixed inset-0 z-0 opacity-100" style={{ backgroundColor: themeColor }} />
      ) : (
        <div className="fixed inset-0 z-0 opacity-20" style={{ background: `linear-gradient(to bottom, ${themeColor}, #ffffff)` }} />
      )}
      
      {/* Responsive layout container */}
      <main className="relative z-10 w-full max-w-[480px] md:max-w-5xl lg:max-w-6xl mx-auto min-h-screen px-4 pt-16 md:pt-24 pb-20 flex flex-col">
        
        {/* Share Button top right */}
        <button 
          onClick={handleShare}
          className={`absolute top-6 right-6 w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition z-20 ${bgStyle === 'solid' ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white/60 text-gray-900 hover:bg-white'}`}
        >
          <Share size={18} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start w-full">
          
          {/* LEFT SIDEBAR: PROFILE INFO */}
          <div className="md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left md:sticky md:top-24">
            {/* Avatar */}
            <div className="mb-6">
              {data.photo ? (
                <img src={assetUrl(data.photo)} alt={data.name} className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover shadow-xl border-4 border-white/90" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white shadow-xl border-4 border-white/90 flex items-center justify-center text-gray-400 font-bold text-4xl">
                  {(data.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <h1 className="text-2xl md:text-3xl font-black mb-2 select-all leading-tight" style={{ color: textColor }}>
              {data.name}
            </h1>
            {data.headline && (
              <p className="text-[15px] md:text-[17px] font-bold mb-4 opacity-90 select-all" style={{ color: textColor }}>
                {data.headline}
              </p>
            )}
            {data.about_me && (
              <div className={`text-sm leading-relaxed mb-6 p-5 rounded-2xl border ${cardBgClass} select-all`} style={{ color: textColor }}>
                {data.about_me}
              </div>
            )}

            {/* FORTI Branding - Desktop only */}
            <div className="hidden md:flex flex-col items-start mt-8 opacity-60 hover:opacity-100 transition-opacity">
               <Link to="/" className="flex flex-col items-start gap-1">
                 <img src={SITE_LOGO} alt="FORTI" className="h-8 object-contain" onError={e => { e.target.style.display = 'none' }} />
                 <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: bgStyle === 'solid' ? 'rgba(255,255,255,0.7)' : themeColor }}>
                   Member Network
                 </span>
               </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: LINKS & CARDS */}
          <div className="md:col-span-2 w-full space-y-5">
            {(data.links || [])
              .sort((a,b) => a.sort_order - b.sort_order)
              .map(link => {
                
                if (link.link_type === 'text') {
                  return (
                    <div key={link.id} className={`w-full p-6 rounded-[24px] border ${cardBgClass} text-left select-all`} style={{ color: textColor }}>
                       {link.title && <h3 className="font-bold text-lg md:text-xl mb-2">{link.title}</h3>}
                       <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap opacity-95">{link.content}</p>
                    </div>
                  )
                }

                if (link.link_type === 'photo') {
                  return (
                    <div key={link.id} className={`w-full p-5 rounded-[24px] border ${cardBgClass}`}>
                      {link.title && <h3 className="font-bold text-sm md:text-base mb-3 text-center md:text-left select-all" style={{ color: textColor }}>{link.title}</h3>}
                      {link.media_path && (
                        <img src={assetUrl(link.media_path)} alt={link.title} className="w-full h-auto rounded-[18px] shadow-lg border-2 border-white/20 object-cover" />
                      )}
                    </div>
                  )
                }

                const ytId = link.link_type === 'youtube' ? detectYouTubeId(link.url) : null;

                return (
                  <a 
                    key={link.id} 
                    href={link.url || '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`${getButtonClass(link.is_featured)} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                    style={{ 
                      color: buttonStyle === 'outline' && bgStyle === 'solid' ? 'white' : (buttonStyle === 'outline' ? themeColor : undefined),
                      borderColor: buttonStyle === 'outline' && bgStyle === 'solid' ? 'white' : (buttonStyle === 'outline' ? themeColor : undefined)
                    }}
                  >
                    {/* YouTube Thumbnail Preview */}
                    {ytId && (
                      <div className="w-full aspect-video rounded-[16px] overflow-hidden mb-3 relative bg-black group-hover:opacity-90 transition-opacity">
                         <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover opacity-80" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <Youtube size={48} className="text-white drop-shadow-lg" />
                         </div>
                      </div>
                    )}
                    <span className={link.is_featured ? 'font-bold' : ''} style={{ color: buttonStyle !== 'outline' ? themeColor : undefined }}>
                      {link.title}
                    </span>
                  </a>
                )
            })}
          </div>

        </div>

        {/* FORTI Branding Bottom - Mobile only */}
        <div className="md:hidden mt-auto pt-16 flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
           <Link to="/" className="flex flex-col items-center gap-1">
             <img src={SITE_LOGO} alt="FORTI" className="h-8 object-contain" onError={e => { e.target.style.display = 'none' }} />
             <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: bgStyle === 'solid' ? 'rgba(255,255,255,0.7)' : themeColor }}>
               Member Network
             </span>
           </Link>
        </div>
      </main>
    </div>
  )
}
