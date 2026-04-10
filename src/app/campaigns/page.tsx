'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, Mail, Search, Eye, Edit, Trash2, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Campaign {
  id: string
  name: string
  status: string
  totalEmails: number
  sentEmails: number
  failedEmails: number
  createdAt: string
}

export default function CampaignsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchCampaigns()
  }, [status, router])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      if (res.ok) setCampaigns(data)
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Campaign deleted'); fetchCampaigns() }
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/20 text-gray-400',
      ready: 'bg-blue-500/20 text-blue-400',
      sending: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
      failed: 'bg-red-500/20 text-red-400',
    }
    return colors[status] || colors.draft
  }

  const getProgressPercentage = (c: Campaign) => {
    if (c.totalEmails === 0) return 0
    return Math.round(((c.sentEmails + c.failedEmails) / c.totalEmails) * 100)
  }

  if (status === 'loading') {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Campaigns</h1>
            <p className="text-gray-400 mt-1">Manage your email marketing campaigns</p>
          </div>
          <Link href="/campaigns/new" className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg">
            <Plus className="w-5 h-5" /> New Campaign
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="sending">Sending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
            <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No campaigns found</h3>
            <p className="text-gray-400 mb-6">Create your first campaign to start sending emails</p>
            <Link href="/campaigns/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg">
              <Plus className="w-4 h-4" /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{campaign.name}</div>
                      <div className="text-sm text-gray-400">{campaign.totalEmails} contacts</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>{campaign.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${getProgressPercentage(campaign)}%` }} />
                        </div>
                        <span className="text-sm text-gray-400 w-12 text-right">{getProgressPercentage(campaign)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/campaigns/${campaign.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/campaigns/${campaign.id}/edit`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"><Edit className="w-4 h-4" /></Link>
                        {campaign.status === 'ready' && (
                          <Link href={`/campaigns/${campaign.id}/send`} className="p-2 text-primary-400 hover:text-primary-300 hover:bg-gray-700 rounded-lg"><Send className="w-4 h-4" /></Link>
                        )}
                        <button onClick={() => deleteCampaign(campaign.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
