import { assetUrl } from '../../utils/assetUrl'
import { Share, Youtube } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MobilePreview({ profile, links, photo }) {
  const themeColor = profile?.theme_color || '#6C3EAB'
  const textColor = profile?.text_color || (profile?.background_style === 'solid' ? '#ffffff' : '#111827')
  const bgStyle = profile?.background_style || 'solid'
  const buttonStyle = profile?.button_style || 'rounded'

  const detectYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    return match ? match[1] : null;
  }

  const handleShare = async () => {
    if (!profile?.public_slug) {
      toast.error("Please set a custom slug first");
      return;
    }
    const url = `${window.location.origin}/m/${profile.public_slug}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `@${profile.public_slug}`,
          url: url,
        });
      } else {
        throw new Error("Share not supported");
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
        } catch (clipErr) {
          toast.error("Failed to copy link");
        }
      }
    }
  }

  const getButtonClass = (isFeatured) => {
    let base = "block w-full font-semibold text-sm text-center py-4 px-6 transition-transform relative "
    
    // Featured Animation
    if (isFeatured) {
      base += "animate-pulse shadow-lg scale-[1.02] "
    } else {
      base += "shadow-sm hover:scale-[1.02] "
    }

    // Button Shape
    if (buttonStyle === 'pill') base += "rounded-full "
    else if (buttonStyle === 'rounded') base += "rounded-2xl "
    else if (buttonStyle === 'outline') base += "rounded-none border-2 "
    
    // Button Color
    if (buttonStyle === 'outline') {
      base += "bg-transparent "
    } else {
      base += "bg-white text-gray-900 border border-gray-100 "
    }

    return base
  }

  return (
    <div className="w-[320px] h-[650px] bg-white rounded-[40px] shadow-2xl border-[8px] border-black overflow-hidden relative font-sans flex flex-col">
      {/* Dynamic Background */}
      {bgStyle === 'solid' ? (
        <div className="absolute inset-0 z-0" style={{ backgroundColor: themeColor }} />
      ) : (
        <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(to bottom, ${themeColor}, #ffffff)` }} />
      )}
      
      <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar flex flex-col items-center px-6 pt-12 pb-10">
        
        {/* Share Button top right */}
        <button 
          onClick={handleShare}
          className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 hover:scale-105 transition z-20"
        >
          <Share size={18} />
        </button>

        {/* Avatar */}
        {photo ? (
          <img src={assetUrl(photo)} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-gray-400 font-bold text-3xl border-4 border-white shadow-sm">?</div>
        )}

        {/* Profile Info */}
        <h1 className="mt-4 text-xl font-bold text-center" style={{ color: textColor }}>
          @{profile.public_slug || 'username'}
        </h1>
        {profile.headline && (
          <p className="mt-2 text-sm font-medium text-center" style={{ color: textColor, opacity: 0.9 }}>
            {profile.headline}
          </p>
        )}
        {profile.about_me && (
          <p className="mt-2 text-sm text-center" style={{ color: textColor, opacity: 0.8 }}>
            {profile.about_me}
          </p>
        )}

        {/* Links */}
        <div className="w-full mt-8 space-y-4">
          {links.filter(l => l.is_active).sort((a,b) => a.sort_order - b.sort_order).map(link => {
            
            if (link.link_type === 'text') {
              return (
                <div key={link.id} className="w-full text-center py-2" style={{ color: textColor }}>
                   {link.title && <h3 className="font-bold text-lg mb-1">{link.title}</h3>}
                   <p className="text-sm whitespace-pre-wrap">{link.content}</p>
                </div>
              )
            }

            if (link.link_type === 'photo') {
              return (
                <div key={link.id} className="w-full mb-2">
                  {link.title && <h3 className="font-bold text-center text-sm mb-2" style={{ color: textColor }}>{link.title}</h3>}
                  {link.media_path && (
                    <img src={assetUrl(link.media_path)} alt={link.title} className="w-full h-auto rounded-[24px] shadow-sm border-[4px] border-white/50" />
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
                className={getButtonClass(link.is_featured)}
                style={{ 
                  color: buttonStyle === 'outline' && bgStyle === 'solid' ? 'white' : (buttonStyle === 'outline' ? themeColor : undefined),
                  borderColor: buttonStyle === 'outline' && bgStyle === 'solid' ? 'white' : (buttonStyle === 'outline' ? themeColor : undefined)
                }}
              >
                {/* YouTube Thumbnail Preview inside button */}
                {ytId && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-3 relative bg-black">
                     <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Youtube size={36} className="text-white drop-shadow-md" />
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
    </div>
  )
}
