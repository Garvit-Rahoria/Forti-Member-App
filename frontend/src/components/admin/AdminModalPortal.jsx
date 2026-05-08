import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function AdminModalPortal({ children, lockScroll = true }) {
  useEffect(() => {
    if (!lockScroll) return undefined

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [lockScroll])

  return createPortal(children, document.body)
}