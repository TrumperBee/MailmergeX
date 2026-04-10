'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Edit, Send, Users, CheckCircle, XCircle, Clock, Loader2, Paperclip, Image, FileText, File } from 'lucide-react'
import toast from 'react-hot-toast'

interface Attachment {
  name: string
  size: number
  path: string
  type: string
}

interface Campaign {
  id: string
  name: string
  subject: string
  template: string
  status: string
  attachments: Attachment[]
  totalEmails: number
  sentEmails: number
  failedEmails: number
  createdAt: string
}

interface Contact {
  id: string
  email: string
  name: string
  customFields: Record<string, string>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />
  return <File className="w-4 h-4 text-gray-400" />
}

export default function CampaignDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'contacts' | 'logs'>('contacts')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated' && id) fetchData()
  }, [status, id, router])

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = await res.json()
      if (res.ok) {
        setCampaign(data.campaign)
        setContacts(data.contacts || [])
      } else {
        toast.error(data.error || 'Failed to load campaign')
      }
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

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

  const getProgressPercentage = () => {
    if (!campaign || campaign.totalEmails === 0) return 0
    return Math.round(((campaign.sentEmails + campaign.failedEmails) / campaign.totalEmails) * 100)
  }

  if (status === 'loading' || loading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></AppLayout>
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-white mb-2">Campaign not found</h2>
          <Link href="/campaigns" className="text-primary-500 hover:text-primary-400">Back to campaigns</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/campaigns" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaigns
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>{campaign.status}</span>
              </div>
              <p className="text-gray-400">Created on {new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/campaigns/${campaign.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-medium rounded-lg">
                <Edit className="w-4 h-4" /> Edit
              </Link>
              {campaign.status === 'ready' && (
                <Link href={`/campaigns/${campaign.id}/send`} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg">
                  <Send className="w-4 h-4" /> Send Emails
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.totalEmails}</p>
                <p className="text-sm text-gray-400">Total Contacts</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.sentEmails}</p>
                <p className="text-sm text-gray-400">Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaign.failedEmails}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{getProgressPercentage()}%</p>
                <p className="text-sm text-gray-400">Progress</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Campaign Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">Subject</label>
              <p className="text-white">{campaign.subject || '(No subject)'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-400 mb-1 block">Status</label>
              <p className="text-white capitalize">{campaign.status}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-400 mb-1 block">Template</label>
              <div className="bg-gray-700/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{campaign.template || '(No template)'}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {(campaign.attachments || []).length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Attachments ({campaign.attachments?.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(campaign.attachments || []).map((file, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.name}</p>
                    <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex border-b border-gray-700">
            <button onClick={() => setActiveTab('contacts')} className={`px-6 py-4 font-medium ${activeTab === 'contacts' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-400'}`}>
              Contacts ({contacts.length})
            </button>
          </div>
          <div className="p-6">
            {contacts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No contacts yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">Custom Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-primary-400">{contact.email}</td>
                        <td className="px-4 py-3 text-gray-300">{contact.name || '-'}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {Object.keys(contact.customFields || {}).length > 0
                            ? Object.entries(contact.customFields).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
