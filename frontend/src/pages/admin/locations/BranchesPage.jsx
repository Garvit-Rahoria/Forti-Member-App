import { useState, useEffect } from 'react'
import api from '../../../api/client'
import toast from 'react-hot-toast'
import { 
  Plus, Edit2, Trash2, X, 
  MapPin, Building2 
} from 'lucide-react'

export default function BranchesPage() {
  const [branches, setBranches] = useState([])
  const [states, setStates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [formData, setFormData] = useState({ name: '', state_id: '', is_active: true })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [branchesRes, statesRes] = await Promise.all([
        api.get('/branches'),
        api.get('/locations/states?country_id=1') // Assuming India for now
      ])
      setBranches(branchesRes.data?.data || [])
      setStates(statesRes.data?.data || [])
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({ 
        name: branch.name, 
        state_id: branch.state_id, 
        is_active: branch.is_active 
      })
    } else {
      setEditingBranch(null)
      setFormData({ name: '', state_id: '', is_active: true })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.state_id) {
      return toast.error('Please fill all required fields')
    }
    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, formData)
        toast.success('Branch updated successfully')
      } else {
        await api.post('/branches', formData)
        toast.success('Branch created successfully')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branch')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return
    try {
      await api.delete(`/branches/${id}`)
      toast.success('Branch deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete branch')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Branch Management
          </h1>
          <p className="text-gray-500 mt-1">Create and manage state branches</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Branch
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : branches.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No branches found.</p>
            <p className="text-sm text-gray-400">Click "Add Branch" to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                  <td className="px-6 py-4 text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {branch.state_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${branch.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openModal(branch)} className="text-indigo-600 hover:text-indigo-900 p-1 bg-indigo-50 rounded-md">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(branch.id)} className="text-red-600 hover:text-red-900 p-1 bg-red-50 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                  placeholder="e.g. Jaipur HQ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  required
                  value={formData.state_id}
                  onChange={e => setFormData({ ...formData, state_id: e.target.value })}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2.5 bg-white"
                >
                  <option value="">Select State</option>
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active Branch</label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
