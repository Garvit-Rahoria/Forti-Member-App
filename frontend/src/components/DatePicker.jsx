import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_HDRS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function fmt(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function parseYMD(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return { y, m: m - 1, d }
}

export function DatePicker({ value, onChange, min, max, placeholder = 'Pick date', className, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const today    = new Date()
  const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate())
  const parsed   = parseYMD(value)

  const [vy, setVy] = useState(() => parsed ? parsed.y : today.getFullYear())
  const [vm, setVm] = useState(() => parsed ? parsed.m : today.getMonth())
  const [yearInput, setYearInput] = useState(() => String(parsed ? parsed.y : today.getFullYear()))

  // Sync view when value changes externally
  useEffect(() => {
    if (value) { const p = parseYMD(value); if (p) { setVy(p.y); setVm(p.m); setYearInput(String(p.y)) } }
  }, [value])

  // Keep yearInput in sync when vy changes (e.g. via prev/next month at year boundary)
  useEffect(() => { setYearInput(String(vy)) }, [vy])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function calGrid() {
    const firstDay = new Date(vy, vm, 1).getDay()
    const lastDay  = new Date(vy, vm + 1, 0).getDate()
    const cells = Array(firstDay).fill(null)
    for (let i = 1; i <= lastDay; i++) cells.push(i)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const isDis  = d => !d || (min && fmt(vy, vm, d) < min) || (max && fmt(vy, vm, d) > max)
  const isSel  = d => d  && value === fmt(vy, vm, d)
  const isNow  = d => d  && todayStr === fmt(vy, vm, d)

  function prevMonth() { vm === 0  ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1) }
  function nextMonth() { vm === 11 ? (setVm(0),  setVy(y => y + 1)) : setVm(m => m + 1) }

  function pick(d) {
    if (!d || isDis(d)) return
    onChange(fmt(vy, vm, d))
    setOpen(false)
  }

  const display = parsed
    ? `${String(parsed.d).padStart(2, '0')}-${String(parsed.m + 1).padStart(2, '0')}-${parsed.y}`
    : ''

  return (
    <div ref={ref} className={`relative ${className || ''}`} style={style || { width: '176px' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="input w-full flex items-center justify-between pr-2.5 cursor-pointer select-none"
      >
        <span className={`text-sm ${display ? 'text-gray-800' : 'text-gray-400'}`}>
          {display || placeholder}
        </span>
        <CalendarDays size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>

      {/* Floating calendar panel */}
      {open && (
        <div
          className="absolute z-[500] bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5"
          style={{ top: 'calc(100% + 6px)', left: 0, width: '268px' }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Month / Year header */}
          <div className="flex items-center gap-1 mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={vm}
                onChange={e => setVm(Number(e.target.value))}
                className="text-[13px] font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-0.5 outline-none focus:border-primary-400 cursor-pointer"
              >
                {MONTHS_FULL.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
              </select>
              <input
                type="text"
                value={yearInput}
                maxLength={4}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setYearInput(val)
                  if (val.length === 4) {
                    const yr = Number(val)
                    if (yr >= 1900 && yr <= 2100) setVy(yr)
                  }
                }}
                onBlur={() => {
                  const yr = Number(yearInput)
                  if (yearInput.length !== 4 || yr < 1900 || yr > 2100) setYearInput(String(vy))
                }}
                className="text-[13px] font-semibold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-0.5 outline-none focus:border-primary-400 w-14 text-center"
                placeholder="Year"
              />
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HDRS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calGrid().map((day, idx) => {
              const sel = isSel(day)
              const now = isNow(day)
              const dis = isDis(day)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pick(day)}
                  disabled={!day || dis}
                  className={[
                    'h-8 w-full rounded-lg text-xs font-medium transition',
                    !day ? 'cursor-default pointer-events-none' :
                    sel  ? 'bg-primary-600 text-white shadow-sm' :
                    now  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300 font-bold' :
                    dis  ? 'text-gray-300 cursor-not-allowed' :
                           'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {day ?? ''}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100">
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold transition"
              onClick={() => { onChange(todayStr); setOpen(false) }}
            >
              Today
            </button>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
              onClick={() => { onChange(''); setOpen(false) }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
