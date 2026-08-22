import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import AdminModalPortal from '../../../components/admin/AdminModalPortal'
import {
  Plus, Edit2, Trash2, X, Search, RotateCcw,
  Building2, Loader2, Ban, AlertTriangle
} from 'lucide-react'

const PAGE_SIZE = 20

const EMPTY_FORM = {
  name: '',
  country_id: '',
  state_id: '',
  city_id: '',
  is_active: true,
}

const EMPTY_FILTERS = {
  q: '',
  state_id: '',
  country_id: '',
  city_id: '',
  status: 'all',
}

function isIndiaCountry(country) {
  if (!country) return false
  const iso = String(country.iso2 || country.iso_code || '').toUpperCase()
  const name = String(country.name || '').toLowerCase()
  return iso === 'IN' || name === 'india'
}

function selectClass(extra = '') {
  return `w-full border border-gray-300 rounded-lg text-sm py-2 px-3 bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-500 ${extra}`
}

export default function BranchesPage() {
  const [tab, setTab] = useState('indian') // indian | overseas
  const [branches, setBranches] = useState([])
  const [pagination, setPagination] = useState({ page: 1, perPage: PAGE_SIZE, total: 0, lastPage: 1 })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [debouncedQ, setDebouncedQ] = useState('')

  const [countries, setCountries] = useState([])
  const [indiaStates, setIndiaStates] = useState([])
  const [filterCities, setFilterCities] = useState([])
  const [formCities, setFormCities] = useState([])
  const [formStates, setFormStates] = useState([])

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const indiaCountry = useMemo(
    () => countries.find(c => isIndiaCountry(c)) || null,
    [countries]
  )
  const overseasCountries = useMemo(
    () => countries.filter(c => !isIndiaCountry(c)),
    [countries]
  )

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 350)
    return () => clearTimeout(t)
  }, [filters.q])

  // Reset page when tab/filters change
  useEffect(() => {
    setPage(1)
  }, [tab, debouncedQ, filters.state_id, filters.country_id, filters.city_id, filters.status])

  // Load countries + India states once
  useEffect(() => {
    ;(async () => {
      try {
        const countriesRes = await api.get('/locations/countries')
        const list = countriesRes.data?.data || []
        setCountries(list)
        const india = list.find(c => isIndiaCountry(c))
        if (india) {
          const statesRes = await api.get(`/locations/states?country_id=${india.id}`)
          setIndiaStates(statesRes.data?.data || [])
        }
      } catch {
        toast.error('Failed to load locations')
      }
    })()
  }, [])

  // Filter cities dependent on state (indian) or country (overseas)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (tab === 'indian' && filters.state_id) {
          const r = await api.get(`/locations/cities?state_id=${filters.state_id}`)
          if (!cancelled) setFilterCities(r.data?.data || [])
          return
        }
        if (tab === 'overseas' && filters.country_id) {
          const r = await api.get(`/locations/cities?country_id=${filters.country_id}`)
          if (!cancelled) setFilterCities(r.data?.data || [])
          return
        }
        if (!cancelled) setFilterCities([])
      } catch {
        if (!cancelled) setFilterCities([])
      }
    })()
    return () => { cancelled = true }
  }, [tab, filters.state_id, filters.country_id])

  // Form geo dropdowns
  useEffect(() => {
    if (!showModal) return
    if (tab === 'indian' && indiaCountry) {
      setFormStates(indiaStates)
      if (formData.state_id) {
        api.get(`/locations/cities?state_id=${formData.state_id}`)
          .then(r => setFormCities(r.data?.data || []))
          .catch(() => setFormCities([]))
      } else {
        setFormCities([])
      }
      return
    }
    if (tab === 'overseas' && formData.country_id) {
      api.get(`/locations/cities?country_id=${formData.country_id}`)
        .then(r => setFormCities(r.data?.data || []))
        .catch(() => setFormCities([]))
    } else {
      setFormCities([])
    }
  }, [showModal, tab, formData.state_id, formData.country_id, indiaCountry, indiaStates])

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        scope: tab,
        page,
        per_page: PAGE_SIZE,
        include_inactive: 1,
        status: filters.status || 'all',
      }
      if (debouncedQ) params.q = debouncedQ
      if (tab === 'indian') {
        if (filters.state_id) params.state_id = filters.state_id
        if (filters.city_id) params.city_id = filters.city_id
      } else {
        if (filters.country_id) params.country_id = filters.country_id
        if (filters.city_id) params.city_id = filters.city_id
      }

      const res = await api.get('/branches', { params })
      const payload = res.data?.data
      // Paginated: { data, total, page, perPage, lastPage }
      if (payload && Array.isArray(payload.data)) {
        setBranches(payload.data)
        setPagination({
          page: payload.page || page,
          perPage: payload.perPage || PAGE_SIZE,
          total: payload.total || 0,
          lastPage: payload.lastPage || 1,
        })
      } else if (Array.isArray(payload)) {
        setBranches(payload)
        setPagination({ page: 1, perPage: PAGE_SIZE, total: payload.length, lastPage: 1 })
      } else {
        setBranches([])
        setPagination({ page: 1, perPage: PAGE_SIZE, total: 0, lastPage: 1 })
      }
    } catch {
      toast.error('Failed to load branches')
      setBranches([])
    } finally {
      setLoading(false)
    }
  }, [tab, page, debouncedQ, filters.state_id, filters.country_id, filters.city_id, filters.status])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setDebouncedQ('')
    setPage(1)
  }

  const openModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name || '',
        country_id: branch.country_id ? String(branch.country_id) : (tab === 'indian' && indiaCountry ? String(indiaCountry.id) : ''),
        state_id: branch.state_id ? String(branch.state_id) : '',
        city_id: branch.city_id ? String(branch.city_id) : '',
        is_active: branch.is_active !== false,
      })
    } else {
      setEditingBranch(null)
      setFormData({
        ...EMPTY_FORM,
        country_id: tab === 'indian' && indiaCountry ? String(indiaCountry.id) : '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      return toast.error(tab === 'overseas' ? 'Association name is required' : 'Branch name is required')
    }
    if (tab === 'indian' && !formData.state_id) return toast.error('State is required')
    if (tab === 'overseas' && !formData.country_id) return toast.error('Country is required')

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        scope: tab,
        country_id: tab === 'indian'
          ? (indiaCountry?.id || formData.country_id || null)
          : (formData.country_id || null),
        state_id: tab === 'indian' ? (formData.state_id || null) : null,
        city_id: formData.city_id || null,
        is_active: formData.is_active,
      }

      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, payload)
        toast.success(tab === 'overseas' ? 'Association updated' : 'Branch updated')
      } else {
        await api.post('/branches', payload)
        toast.success(tab === 'overseas' ? 'Association created' : 'Branch created')
      }
      setShowModal(false)
      fetchBranches()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/branches/${deleteTarget.id}`)
      toast.success('Marked as inactive')
      setDeleteTarget(null)
      fetchBranches()
    } catch {
      toast.error('Failed to deactivate')
    } finally {
      setDeleting(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return
    if (!window.confirm('Permanently delete this record? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/branches/${deleteTarget.id}?permanent=1`)
      toast.success('Permanently deleted')
      setDeleteTarget(null)
      fetchBranches()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const switchTab = (next) => {
    if (next === tab) return
    setTab(next)
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const nameLabel = tab === 'overseas' ? 'Association / Branch Name' : 'Branch Name'
  const addLabel = tab === 'overseas' ? 'Add Association' : 'Add Branch'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            Branch Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage Indian branches and overseas associations
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {[
          { key: 'indian', label: 'Indian Branches' },
          { key: 'overseas', label: 'Overseas Associations' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${tab === t.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${tab === 'indian' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 items-end`}>
          <div className={tab === 'indian' ? 'lg:col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                placeholder={tab === 'overseas' ? 'Search association, country, city…' : 'Search branch, state, city…'}
                className="w-full border border-gray-300 rounded-lg text-sm py-2 pl-9 pr-3 focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              />
            </div>
          </div>

          {tab === 'indian' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
              <select
                value={filters.state_id}
                onChange={e => setFilters(f => ({ ...f, state_id: e.target.value, city_id: '' }))}
                className={selectClass()}
              >
                <option value="">All</option>
                {indiaStates.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <select
                value={filters.country_id}
                onChange={e => setFilters(f => ({ ...f, country_id: e.target.value, city_id: '' }))}
                className={selectClass()}
              >
                <option value="">All</option>
                {overseasCountries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
            <select
              value={filters.city_id}
              onChange={e => setFilters(f => ({ ...f, city_id: e.target.value }))}
              className={selectClass()}
              disabled={tab === 'indian' ? !filters.state_id : !filters.country_id}
            >
              <option value="">All</option>
              {filterCities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className={selectClass()}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{nameLabel}</th>
                {tab === 'indian' ? (
                  <>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">State</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">City</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Country</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">City</th>
                  </>
                )}
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No {tab === 'overseas' ? 'associations' : 'branches'} found
                  </td>
                </tr>
              ) : branches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{branch.name}</td>
                  {tab === 'indian' ? (
                    <>
                      <td className="px-4 py-3 text-gray-600">{branch.state_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{branch.city_name || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-gray-600">{branch.country_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{branch.city_name || '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      branch.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(branch)}
                        className="p-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(branch)}
                        className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                        title="Deactivate / Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm">
            <span className="text-gray-500">
              Page {pagination.page} of {pagination.lastPage} — {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-outline btn-sm"
                disabled={page >= pagination.lastPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {pagination.lastPage <= 1 && pagination.total > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Showing {pagination.total} {tab === 'overseas' ? 'association(s)' : 'branch(es)'}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingBranch
                    ? (tab === 'overseas' ? 'Edit Association' : 'Edit Branch')
                    : (tab === 'overseas' ? 'Add Association' : 'Add Branch')}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {tab === 'indian' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                      <select
                        required
                        value={formData.state_id}
                        onChange={e => setFormData(f => ({ ...f, state_id: e.target.value, city_id: '' }))}
                        className={selectClass('py-2.5')}
                      >
                        <option value="">Select State</option>
                        {formStates.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <select
                        value={formData.city_id}
                        onChange={e => setFormData(f => ({ ...f, city_id: e.target.value }))}
                        className={selectClass('py-2.5')}
                        disabled={!formData.state_id}
                      >
                        <option value="">Select City</option>
                        {formCities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                        placeholder="e.g. Jaipur HQ"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                      <select
                        required
                        value={formData.country_id}
                        onChange={e => setFormData(f => ({ ...f, country_id: e.target.value, city_id: '' }))}
                        className={selectClass('py-2.5')}
                      >
                        <option value="">Select Country</option>
                        {overseasCountries.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <select
                        value={formData.city_id}
                        onChange={e => setFormData(f => ({ ...f, city_id: e.target.value }))}
                        className={selectClass('py-2.5')}
                        disabled={!formData.country_id}
                      >
                        <option value="">
                          {formCities.length ? 'Select City' : 'No cities listed (optional)'}
                        </option>
                        {formCities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Association Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                        placeholder="e.g. Dubai Association"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={e => setFormData(f => ({ ...f, is_active: e.target.value === 'active' }))}
                    className={selectClass('py-2.5')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Only active records appear on the membership application form.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                    {saving ? 'Saving…' : (editingBranch ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </AdminModalPortal>
      )}

      {/* Delete / deactivate confirm */}
      {deleteTarget && (
        <AdminModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-50 text-amber-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Remove branch?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium text-gray-800">{deleteTarget.name}</span>
                    {' '}— prefer deactivating so existing applications stay intact.
                  </p>
                </div>
                <button type="button" onClick={() => setDeleteTarget(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeactivate}
                  className="w-full btn-primary justify-center disabled:opacity-60"
                >
                  <Ban className="w-4 h-4" />
                  {deleting ? 'Working…' : 'Mark as Inactive'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handlePermanentDelete}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-medium disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full btn-outline justify-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </AdminModalPortal>
      )}
    </div>
  )
}
