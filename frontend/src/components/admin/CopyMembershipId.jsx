import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * CopyMembershipId
 * Renders the membership ID text with a compact inline copy button.
 * Usage:
 *   <CopyMembershipId id={member.membership_id} />
 *   <CopyMembershipId id={member.membership_id} className="text-sm font-mono" />
 */
export default function CopyMembershipId({ id, className = '' }) {
  const [copied, setCopied] = useState(false)

  if (!id) return <span className="text-gray-400">—</span>

  function handleCopy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{id}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy Membership ID'}
        aria-label="Copy Membership ID"
        className={`p-0.5 rounded transition-colors shrink-0 ${
          copied
            ? 'text-emerald-500 bg-emerald-50'
            : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
        }`}
      >
        {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
      </button>
      {copied && (
        <span className="text-[10px] text-emerald-600 font-medium leading-none">Copied</span>
      )}
    </span>
  )
}
