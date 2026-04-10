'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import {
  Plus,
  Mail,
  Users,
  Send,
  AlertCircle,
  Loader2,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react'
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalContacts: 0,
    totalSent: 0,
    totalFailed: 0,
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchCampaigns()
    }
  }, [status, router])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      
      if (res.ok) {
        setCampaigns(data)
        
        const totals = data.reduce(
          (acc: any, campaign: Campaign) => ({
            totalCampaigns: acc.totalCampaigns + 1,
            totalContacts: acc.totalContacts + campaign.totalEmails,
            totalSent: acc.totalSent + campaign.sentEmails,
            totalFailed: acc.totalFailed + campaign.failedEmails,
          }),
          { totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalFailed: 0 }
        )
        setStats(totals)
      }
    } catch (error) {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Campaign deleted')
        fetchCampaigns()
      }
    } catch (error) {
      toast.error('Failed to delete campaign')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 text-gray-400'
      case 'ready':
        return 'bg-blue-500/20 text-blue-400'
      case 'sending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'completed':
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back, {(session?.user as any)?.name || 'User'}
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
                <p className="text-sm text-gray-400">Campaigns</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalContacts}</p>
                <p className="text-sm text-gray-400">Total Contacts</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSent}</p>
                <p className="text-sm text-gray-400">Emails Sent</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalFailed}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Recent Campaigns</h2>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
              <p className="text-gray-400 mb-6">Create your first email campaign</p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="px-6 py-4 hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">{campaign.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {campaign.totalEmails} contacts
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="w-4 h-4" />
                          {campaign.sentEmails} sent
                        </span>
                        {campaign.failedEmails > 0 && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            {campaign.failedEmails} failed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/campaigns/${campaign.id}/edit`}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
