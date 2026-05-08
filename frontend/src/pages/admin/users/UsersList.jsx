import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Key, Shield, X, Loader2, Search } from 'lucide-react'
import api from '../../../api/client'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import toast from 'react-hot-toast'

// ── Role configuration ────────────────────────────────────────────────────────
const ROLES = [
  { value: 'super_admin',    label: 'Super Administrator',   badge: 'bg-purple-100 text-purple-700' },
  { value: 'branch_manager', label: 'State/Branch Manager',  badge: 'bg-green-100 text-green-700' },
  { value: 'office_staff',   label: 'Office Staff',          badge: 'bg-gray-100 text-gray-700' },
]
const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.value, r]))
// Normalize legacy role values that may exist in older records
const ROLE_ALIAS = {
  admin:         'super_admin',
  state_manager: 'branch_manager',
  staff:         'office_staff',
}
function resolveRole(raw) {
  const key = ROLE_ALIAS[raw] || raw
  return ROLE_MAP[key] || { value: raw, label: raw, badge: 'bg-red-100 text-red-600' }
}

function normalizeStateSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function rankStateMatch(label, query) {
  const normalizedLabel = normalizeStateSearch(label)
  if (!normalizedLabel || !query) return null

  if (normalizedLabel === query) return { score: 0, index: 0 }

  if (normalizedLabel.startsWith(query)) {
    return { score: 1, index: 0 }
  }

  const words = normalizedLabel.split(/\s+/)
  const wordIndex = words.findIndex(word => word.startsWith(query))
  if (wordIndex !== -1) {
    return { score: 2, index: normalizedLabel.indexOf(query) }
  }

  const substringIndex = normalizedLabel.indexOf(query)
  if (substringIndex !== -1) {
    return { score: 3, index: substringIndex }
  }

  return null
}

// ── User create / edit modal ──────────────────────────────────────────────────
function UserModal({ user, onClose, onSave, saving }) {
  const empty = { full_name: '', email: '', password: '', role: 'office_staff', is_active: 1, assigned_state_id: '' }
  const [d, setD] = useState(user ? { ...user, password: '' } : empty)
  const [stateQuery, setStateQuery] = useState('')
  const [stateOpen, setStateOpen] = useState(false)
  const [stateTouched, setStateTouched] = useState(false)
  const stateBoxRef = useRef(null)
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))

  const { data: statesData } = useQuery({
    queryKey: ['states-list'],
    queryFn: () => api.get('/locations/states').then(r => r.data.data || []),
    staleTime: 60_000,
  })
  const states = useMemo(
    () => (statesData || []).map(s => ({ id: s.id, value: s.id, label: s.label || s.name, code: s.code || '' })),
    [statesData],
  )
  const selectedState = states.find(s => String(s.id) === String(d.assigned_state_id)) || null

  useEffect(() => {
    if (selectedState) {
      setStateQuery(selectedState.label)
      return
    }
    if (!d.assigned_state_id) setStateQuery('')
  }, [selectedState, d.assigned_state_id])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!stateBoxRef.current?.contains(event.target)) {
        setStateOpen(false)
        setStateTouched(true)
        setStateQuery(selectedState?.label || '')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [selectedState])

  const filteredStates = useMemo(() => {
    const query = normalizeStateSearch(stateQuery)
    if (!query) return []

    return states
      .map((option) => {
        const match = rankStateMatch(option.label, query)
        if (!match) return null

        return {
          ...option,
          _matchScore: match.score,
          _matchIndex: match.index,
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left._matchScore !== right._matchScore) return left._matchScore - right._matchScore
        if (left._matchIndex !== right._matchIndex) return left._matchIndex - right._matchIndex
        return left.label.localeCompare(right.label)
      })
  }, [stateQuery, states])

  const showStateError =
    (d.role === 'branch_manager' || d.role === 'office_staff') &&
    stateTouched &&
    !selectedState

  function handleStateSelect(state) {
    set('assigned_state_id', Number(state.id))
    setStateQuery(state.label)
    setStateTouched(false)
    setStateOpen(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if ((d.role === 'branch_manager' || d.role === 'office_staff') && !selectedState) {
      setStateTouched(true)
      setStateOpen(false)
      return
    }
    onSave(d)
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">{user ? 'Edit User' : 'New Admin User'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form className="card-body space-y-4" onSubmit={handleSubmit}>
          {/* Full name */}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={d.full_name} required
              onChange={e => set('full_name', e.target.value)} />
          </div>

          {/* Email */}
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={d.email} required
              onChange={e => set('email', e.target.value)} />
          </div>

          {/* Password (required on create, hidden on edit) */}
          {!user && (
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" value={d.password || ''} required minLength={8}
                placeholder="Minimum 8 characters"
                onChange={e => set('password', e.target.value)} />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="label">Role *</label>
            <select className="input" value={d.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Assigned state — required for branch_manager and office_staff scoped access */}
          {(d.role === 'branch_manager' || d.role === 'office_staff') && (
            <div>
              <label className="label">Assigned State</label>
              <div ref={stateBoxRef} className="relative">
                <input
                  className="input"
                  value={stateQuery}
                  placeholder="— Select State —"
                  autoComplete="off"
                  onChange={e => {
                    setStateQuery(e.target.value)
                    set('assigned_state_id', null)
                    setStateTouched(true)
                    setStateOpen(!!e.target.value.trim())
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setStateOpen(false)
                      setStateTouched(true)
                      setStateQuery(selectedState?.label || '')
                    }, 120)
                  }}
                />
                {stateOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="max-h-44 overflow-y-auto">
                      {filteredStates.length ? filteredStates.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleStateSelect(s)}>
                          {s.label}
                        </button>
                      )) : (
                        <div className="px-3 py-2 text-sm text-gray-400">No states found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {showStateError && <p className="text-xs text-red-500 mt-1">Please select a valid state</p>}
              <p className="text-xs text-gray-400 mt-1">
                This {d.role === 'branch_manager' ? 'manager' : 'staff user'} will only see records from this state.
              </p>
            </div>
          )}

          {/* Active toggle (edit only) */}
          {user && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!d.is_active}
                onChange={e => set('is_active', e.target.checked ? 1 : 0)} />
              <span>Account Active</span>
            </label>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {user ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
          </form>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Password reset modal ──────────────────────────────────────────────────────
function ResetPwModal({ user, onClose, onSend, sending }) {
  const [sent, setSent] = useState(false)

  async function handleSend() {
    await onSend()
    setSent(true)
  }

  return (
    <AdminModalPortal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
        <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3 className="font-semibold">Reset Password</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="card-body space-y-4">
          {sent ? (
            <>
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✉️</span>
                </div>
                <p className="text-sm text-gray-700 font-medium">Reset email sent!</p>
                <p className="text-xs text-gray-400 mt-1">
                  A reset link has been sent to <strong>{user.email}</strong>.<br />
                  It expires in 1 hour.
                </p>
              </div>
              <button className="btn-primary w-full" onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Send a password reset link to <strong>{user.full_name}</strong>'s email address:
              </p>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{user.email}</p>
              <p className="text-xs text-gray-400">The user will receive an email with a secure link to set a new password. The link expires in 1 hour.</p>
              <div className="flex gap-3 pt-1 border-t border-gray-100">
                <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  Send Reset Link
                </button>
                <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </AdminModalPortal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UsersList() {
  const qc = useQueryClient()
  const [modal, setModal]       = useState(null) // null | 'new' | user-object
  const [pwModal, setPwModal]   = useState(null) // null | user-object
  const [q, setQ]               = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then(r => {
      const d = r.data.data
      return Array.isArray(d) ? d : (d?.data || [])
    }),
  })

  const saveMut = useMutation({
    mutationFn: d => d.id ? api.put(`/users/${d.id}`, d) : api.post('/users', d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(vars.id ? 'User updated' : 'User created')
      setModal(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'Error saving user'),
  })

  const pwMut = useMutation({
    mutationFn: ({ id }) => api.post(`/users/${id}/send-reset`),
    onSuccess: (res) => {
      const email = res.data?.data?.email || ''
      toast.success(res.data?.message || `Reset link sent to ${email}`)
    },
    onError: err => toast.error(err.response?.data?.message || err.message || 'Failed to send reset link'),
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/users/${id}`, { is_active }),
    onSuccess: (_, { is_active }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(is_active ? 'User activated' : 'User deactivated')
    },
    onError: err => toast.error(err.response?.data?.message || 'Error'),
  })

  // Dedup by email — keep first occurrence (highest id from backend query)
  const allUsers = useMemo(() => {
    const raw = Array.isArray(data) ? data : []
    const seen = new Set()
    return raw.filter(u => {
      if (!u.email || seen.has(u.email.toLowerCase())) return false
      seen.add(u.email.toLowerCase())
      return true
    })
  }, [data])

  const users = useMemo(() => {
    return allUsers.filter(u => {
      const matchQ = !q || u.full_name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())
      const matchRole = !roleFilter || u.role === roleFilter
      return matchQ && matchRole
    })
  }, [allUsers, q, roleFilter])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Users</h2>
          <p className="text-gray-500 text-sm">Manage portal admin accounts and their roles</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('new')}>
          <Plus size={16} /> New User
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="Search by name or email…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Last Login</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Loader2 size={20} className="animate-spin mx-auto mb-2" />Loading...
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found</td></tr>
              ) : users.map(u => {
                const roleInfo = resolveRole(u.role)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      {u.assigned_state_id && (
                        <p className="text-xs text-gray-400">State ID: {u.assigned_state_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleInfo?.badge || 'bg-gray-100 text-gray-600'}`}>
                        {roleInfo?.label || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {u.last_login ? new Date(u.last_login).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button className="btn-outline btn-sm flex items-center gap-1" onClick={() => setModal(u)}>
                          <Edit size={11} /> Edit
                        </button>
                                        <button className="btn-outline btn-sm flex items-center gap-1" onClick={() => setPwModal(u)}>
                          <Key size={11} /> Reset PW
                        </button>
                        <button
                          className={`btn-sm flex items-center gap-1 rounded-lg px-2 text-xs font-medium ${
                            u.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                          onClick={() => toggleActiveMut.mutate({ id: u.id, is_active: u.is_active ? 0 : 1 })}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={saveMut.mutate}
          saving={saveMut.isPending}
        />
      )}

      {/* Password reset modal */}
      {pwModal && (
        <ResetPwModal
          user={pwModal}
          onClose={() => setPwModal(null)}
          onSend={() => pwMut.mutateAsync({ id: pwModal.id })}
          sending={pwMut.isPending}
        />
      )}
    </div>
  )
}
