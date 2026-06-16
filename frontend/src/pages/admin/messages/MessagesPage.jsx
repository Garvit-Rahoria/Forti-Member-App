import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, MailOpen, Search, Clock, Phone, User,
  CheckCircle, Loader2, AlertCircle, Inbox, Tag, MapPin, Building2
} from 'lucide-react'
import api from '../../../api/client'

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | 'read'

  // Fetch all messages
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: () => api.get('/contact/messages').then(r => r.data.data),
    refetchInterval: 15000, // Refresh every 15 seconds
  })

  // Mark message as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/contact/messages/${id}/read`),
    onSuccess: (_, id) => {
      // Refresh count and messages list
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] })
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] })
      // Update local selection
      setSelectedMessage(prev => prev && prev.id === id ? { ...prev, is_read: true } : prev)
    }
  })

  function handleSelect(msg) {
    setSelectedMessage(msg)
    if (!msg.is_read) {
      markReadMutation.mutate(msg.id)
    }
  }

  // Filter & search logic
  const filtered = messages.filter(msg => {
    const matchesSearch =
      msg.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.email.toLowerCase().includes(search.toLowerCase()) ||
      (msg.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      msg.message.toLowerCase().includes(search.toLowerCase())

    if (filter === 'unread') return matchesSearch && !msg.is_read
    if (filter === 'read') return matchesSearch && msg.is_read
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
        <h3 className="font-bold">Failed to load messages</h3>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contact Messages</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage and respond to feedback and enquiries from visitors.</p>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Left Side: Inbox List */}
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
          {/* Controls */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
              />
            </div>
            {/* Tabs */}
            <div className="flex gap-1.5 p-1 bg-gray-50 rounded-xl">
              {[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'read', label: 'Read' }
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setFilter(t.value)}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                    filter === t.value
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Inbox className="mx-auto mb-2 opacity-30" size={32} />
                <p className="text-sm font-medium">No messages found</p>
              </div>
            ) : (
              filtered.map(msg => {
                const selected = selectedMessage?.id === msg.id
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className={`p-4 cursor-pointer hover:bg-gray-50/80 transition-all flex gap-3 relative ${
                      selected ? 'bg-primary-50/50 border-l-4 border-primary-500 pl-3' : ''
                    } ${!msg.is_read ? 'font-semibold bg-red-50/5' : ''}`}
                  >
                    {!msg.is_read && (
                      <span className="mt-1.5 w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]" title="Unread Message" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-sm text-gray-800 truncate max-w-[180px]">{msg.name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          msg.is_read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {msg.is_read ? 'Read' : 'New'}
                        </span>
                        <p className="text-xs text-primary-600 truncate font-semibold">{msg.subject || 'General'}</p>
                        {msg.state_name ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700 flex items-center gap-0.5 shrink-0">
                            <MapPin size={8}/>{msg.state_name}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Side: Message Preview */}
        <div className="hidden lg:flex flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex-col">
          {selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Preview Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedMessage.subject || 'General Enquiry'}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedMessage.is_read
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedMessage.is_read ? (
                      <><CheckCircle size={12} /> Read</>
                    ) : (
                      <><Mail size={12} /> Unread</>
                    )}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="text-gray-400" size={16} />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From</p>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{selectedMessage.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="text-gray-400" size={16} />
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email</p>
                      <a href={`mailto:${selectedMessage.email}`} className="text-sm font-semibold text-primary-600 hover:underline leading-tight">{selectedMessage.email}</a>
                    </div>
                  </div>
                  {selectedMessage.phone && (
                    <div className="flex items-center gap-2 col-span-2 border-t border-gray-100 pt-3 mt-1">
                      <Phone className="text-gray-400" size={16} />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone</p>
                        <a href={`tel:${selectedMessage.phone}`} className="text-sm font-semibold text-gray-800 hover:underline leading-tight">{selectedMessage.phone}</a>
                      </div>
                    </div>
                  )}
                  {selectedMessage.state_name ? (
                    <div className="flex items-center gap-2 col-span-2 border-t border-gray-100 pt-3 mt-1">
                      <MapPin className="text-orange-400" size={16} />
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">State / Region</p>
                        <p className="text-sm font-semibold text-orange-700 leading-tight">{selectedMessage.state_name}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Preview Message Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Message</p>
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 min-h-[160px] text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <Mail className="opacity-20 mb-3" size={48} />
              <h3 className="font-bold text-gray-700">No Message Selected</h3>
              <p className="text-sm mt-1 max-w-xs">Select a contact message from the inbox list to read its contents and sender details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
