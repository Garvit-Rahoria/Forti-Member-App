import { useEffect, useState } from 'react'
import api from '../../api/client'
import { assetUrl } from '../../utils/assetUrl'

/**
 * FieldRenderer – renders a single form field based on its type
 */
export default function FieldRenderer({ field, value, onChange, error }) {
  const [options, setOptions] = useState(field.options || [])
  const [loadingOpts, setLoadingOpts] = useState(false)
  const [stateOptions, setStateOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])

  const { field_type, label, placeholder, help_text, is_required, field_key, default_value } = field

  // Load options from external source
  useEffect(() => {
    if (field.options_source === 'manual') {
      setOptions(field.options || [])
      return
    }
    if (field.options_source === 'group' && field.options_group_id) {
      setLoadingOpts(true)
      api.get(`/dropdowns/groups/${field.options_group_id}/items`)
        .then(r => setOptions(r.data.data.map(i => ({ label: i.label, value: i.value }))))
        .finally(() => setLoadingOpts(false))
    }
    if (field.options_source === 'table') {
      setLoadingOpts(true)
      const tableMap = {
        countries: '/locations/countries',
        membership_categories: '/forms', // placeholder
        membership_packages: '/packages',
        payment_methods: '/payments/methods/list',
      }
      if (tableMap[field.options_table]) {
        api.get(tableMap[field.options_table])
          .then(r => {
            const data = r.data.data?.data || r.data.data || []
            setOptions(data.map(item => ({ label: item.name || item.label, value: String(item.id) })))
          })
          .finally(() => setLoadingOpts(false))
      }
    }
  }, [field.options_source, field.options_group_id, field.options_table])

  // Cascading: country → state → city
  useEffect(() => {
    if (field_type === 'state' && value?.country_id) {
      api.get(`/locations/states?country_id=${value.country_id}`)
        .then(r => setStateOptions(r.data.data))
    }
  }, [value?.country_id])

  useEffect(() => {
    if (field_type === 'city' && value?.state_id) {
      api.get(`/locations/cities?state_id=${value.state_id}`)
        .then(r => setCityOptions(r.data.data))
    }
  }, [value?.state_id])

  const commonProps = {
    id: field_key,
    name: field_key,
    placeholder: placeholder || '',
    required: !!is_required,
    className: `input ${error ? 'border-red-400 focus:ring-red-400' : ''}`,
  }

  const renderField = () => {
    switch (field_type) {
      case 'text':
      case 'aadhaar':
      case 'pan':
      case 'gst':
      case 'ifsc':
      case 'transaction_id':
      case 'upi_id':
        return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'number':
        return <input type="number" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'email':
        return <input type="email" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'phone':
        return <input type="tel" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'date':
        return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'datetime':
        return <input type="datetime-local" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'time':
        return <input type="time" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'textarea':
        return <textarea {...commonProps} rows={4} value={value || ''} onChange={e => onChange(e.target.value)} />

      case 'dropdown':
        return (
          <select {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">-- Select {label} --</option>
            {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
          </select>
        )

      case 'radio':
        return (
          <div className="space-y-2 mt-1">
            {options.map((o, i) => (
              <label key={i} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={field_key}
                  value={o.value}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                  className="w-4 h-4 text-primary-500"
                />
                {o.label}
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2 mt-1">
            {options.map((o, i) => {
              const checked = Array.isArray(value) && value.includes(o.value)
              return (
                <label key={i} className="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={o.value}
                    checked={checked}
                    onChange={e => {
                      const arr = Array.isArray(value) ? [...value] : []
                      if (e.target.checked) onChange([...arr, o.value])
                      else onChange(arr.filter(v => v !== o.value))
                    }}
                    className="w-4 h-4 text-primary-500 rounded"
                  />
                  {o.label}
                </label>
              )
            })}
          </div>
        )

      case 'file':
      case 'image':
      case 'qr_upload':
        return (
          <div>
            <input
              type="file"
              id={field_key}
              name={field_key}
              accept={field_type === 'image' || field_type === 'qr_upload' ? 'image/*' : undefined}
              required={!!is_required && !value}
              onChange={e => onChange(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {typeof value === 'string' && (
              <p className="text-xs text-gray-400 mt-1">Current: {value.split('/').pop()}</p>
            )}
          </div>
        )

      case 'country':
        return (
          <CountryField value={value} onChange={onChange} commonProps={commonProps} />
        )

      case 'state':
        return (
          <StateField value={value} onChange={onChange} commonProps={commonProps} />
        )

      case 'city':
        return (
          <CityField value={value} onChange={onChange} commonProps={commonProps} />
        )

      case 'payment_method':
        return (
          <PaymentMethodField value={value} onChange={onChange} commonProps={commonProps} />
        )

      case 'heading':
        return <h3 className="text-lg font-bold text-gray-900 mt-2">{label}</h3>

      case 'paragraph':
        return <p className="text-gray-600 text-sm">{help_text || label}</p>

      case 'divider':
        return <hr className="border-gray-200 my-2" />

      case 'hidden':
        return <input type="hidden" name={field_key} value={default_value || ''} />

      default:
        return <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)} />
    }
  }

  const isLayout = ['heading', 'paragraph', 'divider', 'hidden'].includes(field_type)

  if (isLayout) return <div>{renderField()}</div>

  return (
    <div className="flex flex-col">
      <label htmlFor={field_key} className={`label ${is_required ? "after:content-['*'] after:text-red-500 after:ml-0.5" : ''}`}>
        {label}
      </label>
      {renderField()}
      {help_text && !['heading','paragraph','divider'].includes(field_type) && (
        <p className="text-xs text-gray-400 mt-1">{help_text}</p>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// ─── Sub-renderers ──────────────────────────────────────────────────────────
function CountryField({ value, onChange, commonProps }) {
  const [countries, setCountries] = useState([])
  useEffect(() => {
    api.get('/locations/countries').then(r => setCountries(r.data.data))
  }, [])
  return (
    <select {...commonProps} value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">-- Select Country --</option>
      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
}

function StateField({ value, onChange, commonProps }) {
  const [states, setStates] = useState([])
  useEffect(() => {
    if (value?.country_id) {
      api.get(`/locations/states?country_id=${value.country_id}`).then(r => setStates(r.data.data))
    }
  }, [value?.country_id])
  return (
    <select {...commonProps} value={value?.state_id || ''} onChange={e => onChange({ ...value, state_id: e.target.value })}>
      <option value="">-- Select State --</option>
      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  )
}

function CityField({ value, onChange, commonProps }) {
  const [cities, setCities] = useState([])
  useEffect(() => {
    if (value?.state_id) {
      api.get(`/locations/cities?state_id=${value.state_id}`).then(r => setCities(r.data.data))
    }
  }, [value?.state_id])
  return (
    <select {...commonProps} value={value?.city_id || ''} onChange={e => onChange({ ...value, city_id: e.target.value })}>
      <option value="">-- Select City --</option>
      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  )
}

function PaymentMethodField({ value, onChange, commonProps }) {
  const [methods, setMethods] = useState([])
  
  useEffect(() => {
    api.get('/payments/methods/list')
      .then(r => {
        const data = r.data.data
        setMethods(data)
        // Auto-select the first payment method if none is selected
        if (data.length > 0 && !value) {
          onChange(data[0].id)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-2">
      {methods.map(m => (
        <label key={m.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${String(value) === String(m.id) ? 'border-primary-500 bg-primary-50/30' : 'border-gray-200 hover:border-primary-300'}`}>
          <input type="radio" name={commonProps.name} value={m.id} checked={String(value) === String(m.id)} onChange={() => onChange(m.id)} className="mt-0.5 accent-primary-600" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900">{m.name}</p>
            {m.instructions && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{m.instructions}</p>}
            {m.qr_image && String(value) === String(m.id) && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm inline-block">
                <img src={assetUrl(m.qr_image)} alt="Payment QR Code" className="w-40 h-40 object-contain rounded-lg bg-white border border-gray-100" />
                <p className="mt-2 text-center text-xs font-medium text-gray-500">Scan to pay</p>
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}
