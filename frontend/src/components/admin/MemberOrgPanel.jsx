import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Award, ExternalLink, Loader2, Plus, RefreshCw } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function MemberOrgPanel({ memberId, canManage = false }) {
  const qc = useQueryClient()
  const [wingId, setWingId] = useState('')
  const [posForm, setPosForm] = useState({ position_id: '', start_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [showPosForm, setShowPosForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['member-org', memberId],
    queryFn: () => api.get(`/members/${memberId}/org`).then(r => r.data.data),
    enabled: !!memberId,
  })

  const { data: wings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: () => api.get('/wings').then(r => r.data.data),
  })

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => api.get('/positions').then(r => r.data.data),
  })

  const wingMut = useMutation({
    mutationFn: () => api.post(`/members/${memberId}/org/wing-transfer`, { wing_id: Number(wingId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-org', memberId] }); toast.success('Wing updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const posMut = useMutation({
    mutationFn: body => api.post(`/members/${memberId}/org/positions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-org', memberId] })
      setShowPosForm(false)
      setPosForm({ position_id: '', start_date: new Date().toISOString().slice(0, 10), notes: '' })
      toast.success('Position assigned')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const profileMut = useMutation({
    mutationFn: body => api.put(`/members/${memberId}/org/public-profile`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['member-org', memberId] }); toast.success('Public profile updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (isLoading) {
    return <div className="card p-6 flex justify-center"><Loader2 className="animate-spin text-primary-500" /></div>
  }

  const profile = data?.profile
  const publicUrl = profile?.public_slug ? `/m/${profile.public_slug}` : null

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Layers size={16} className="text-primary-600" /> Wing</h4>
        <p className="text-sm text-gray-600">Current: <strong>{data?.wing?.name || 'Not assigned'}</strong></p>
        {canManage && (
          <div className="flex flex-wrap gap-2 items-end">
            <select className="input flex-1 min-w-[140px]" value={wingId || data?.wing?.id || ''} onChange={e => setWingId(e.target.value)}>
              <option value="">Select wing…</option>
              {wings.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button type="button" className="btn-primary btn-sm flex items-center gap-1" disabled={!wingId || wingMut.isPending}
              onClick={() => wingMut.mutate()}>
              {wingMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Transfer
            </button>
          </div>
        )}
        {data?.wing_history?.length > 1 && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Wing history</summary>
            <ul className="mt-1 space-y-0.5">
              {data.wing_history.map(h => (
                <li key={h.id}>{h.wing_name} — {h.effective_from}{h.effective_to ? ` → ${h.effective_to}` : ' (current)'}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2"><Award size={16} className="text-primary-600" /> Positions</h4>
          {canManage && (
            <button type="button" className="btn-outline btn-sm text-xs flex items-center gap-1" onClick={() => setShowPosForm(v => !v)}>
              <Plus size={12} /> Assign
            </button>
          )}
        </div>
        {(data?.positions || []).length === 0 ? (
          <p className="text-sm text-gray-400">No current positions</p>
        ) : (
          <ul className="space-y-2">
            {data.positions.map(p => (
              <li key={p.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-medium">{p.title}</span>
                <span className="text-gray-500">{p.wing_name} · from {p.start_date}</span>
              </li>
            ))}
          </ul>
        )}
        {showPosForm && canManage && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
            <select className="input" value={posForm.position_id} onChange={e => setPosForm(f => ({ ...f, position_id: e.target.value }))}>
              <option value="">Position…</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <input type="date" className="input" value={posForm.start_date} onChange={e => setPosForm(f => ({ ...f, start_date: e.target.value }))} />
            <input className="input" placeholder="Notes (optional)" value={posForm.notes} onChange={e => setPosForm(f => ({ ...f, notes: e.target.value }))} />
            <button type="button" className="btn-primary btn-sm w-full" disabled={!posForm.position_id || posMut.isPending}
              onClick={() => posMut.mutate({ position_id: Number(posForm.position_id), start_date: posForm.start_date, notes: posForm.notes || null })}>
              Save position
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">Public profile</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!profile?.is_public}
            disabled={!canManage}
            onChange={e => profileMut.mutate({ is_public: e.target.checked, headline: profile?.headline, about_me: profile?.about_me, my_org: profile?.my_org, org_history: profile?.org_history })} />
          Visible on public directory
        </label>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 flex items-center gap-1 hover:underline">
            <ExternalLink size={14} /> {publicUrl}
          </a>
        )}
      </div>
    </div>
  )
}
