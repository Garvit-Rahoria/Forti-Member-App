// FieldTypePanel.jsx  – Slide-in panel showing all available field types
const FIELD_TYPES = [
  { group: 'Basic Input', items: [
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'textarea', label: 'Text Area', icon: '📄' },
    { type: 'number', label: 'Number', icon: '🔢' },
    { type: 'email', label: 'Email', icon: '📧' },
    { type: 'phone', label: 'Phone', icon: '📞' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'datetime', label: 'Date & Time', icon: '🕐' },
    { type: 'time', label: 'Time', icon: '⏰' },
  ]},
  { group: 'Selection', items: [
    { type: 'dropdown', label: 'Dropdown', icon: '▼' },
    { type: 'radio', label: 'Radio Buttons', icon: '⚪' },
    { type: 'checkbox', label: 'Checkboxes', icon: '☑️' },
  ]},
  { group: 'Upload', items: [
    { type: 'file', label: 'File Upload', icon: '📎' },
    { type: 'image', label: 'Image Upload', icon: '🖼️' },
  ]},
  { group: 'Location', items: [
    { type: 'country', label: 'Country', icon: '🌍' },
    { type: 'state', label: 'State / Province', icon: '🗺️' },
    { type: 'city', label: 'City', icon: '🏙️' },
  ]},
  { group: 'India Specific', items: [
    { type: 'aadhaar', label: 'Aadhaar', icon: '🪪' },
    { type: 'pan', label: 'PAN Card', icon: '📋' },
    { type: 'gst', label: 'GST Number', icon: '🏛️' },
    { type: 'ifsc', label: 'IFSC Code', icon: '🏦' },
  ]},
  { group: 'Payment', items: [
    { type: 'payment_method', label: 'Payment Method', icon: '💳' },
    { type: 'transaction_id', label: 'Transaction ID', icon: '🔖' },
    { type: 'upi_id', label: 'UPI ID', icon: '📱' },
    { type: 'qr_upload', label: 'QR Upload', icon: '📸' },
  ]},
  { group: 'Layout', items: [
    { type: 'heading', label: 'Heading', icon: 'H' },
    { type: 'paragraph', label: 'Paragraph', icon: '¶' },
    { type: 'divider', label: 'Divider', icon: '─' },
    { type: 'hidden', label: 'Hidden Field', icon: '👁️' },
  ]},
]

export default function FieldTypePanel({ onPicked, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="card-header sticky top-0 bg-white z-10">
          <h3 className="font-semibold">Choose Field Type</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {FIELD_TYPES.map(group => (
            <div key={group.group}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.group}</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {group.items.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => onPicked(ft.type)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left text-sm text-gray-700 font-medium"
                  >
                    <span className="text-lg leading-none">{ft.icon}</span>
                    <span className="text-xs">{ft.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
