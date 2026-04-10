'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Save, Users, Loader2, Upload, X, FileText, Image, File } from 'lucide-react'
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
  attachments: Attachment[]
}

interface Contact {
  customFields: Record<string, string>
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />
  if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />
  return <File className="w-5 h-5 text-gray-400" />
}

export default function EditCampaignPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Partial<Campaign>>({ attachments: [] })
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated' && id) fetchCampaign()
  }, [status, id, router])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = await res.json()
      if (res.ok) {
        setCampaign(data.campaign || {})
        setContacts(data.contacts || [])
      }
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const validFiles = Array.from(files).filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: File type not allowed`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('campaignId', id)
      validFiles.forEach(file => formData.append('files', file))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.files) {
        const newAttachments = [...(campaign.attachments || []), ...data.files]
        setCampaign({ ...campaign, attachments: newAttachments })
        toast.success(`${data.files.length} file(s) uploaded`)
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [id, campaign.attachments])

  const removeAttachment = async (path: string) => {
    try {
      await fetch(`/api/upload?filepath=${encodeURIComponent(path)}`, { method: 'DELETE' })
      const newAttachments = (campaign.attachments || []).filter(a => a.path !== path)
      setCampaign({ ...campaign, attachments: newAttachments })
      toast.success('File removed')
    } catch {
      toast.error('Failed to remove file')
    }
  }

  const saveCampaign = async () => {
    if (!campaign.name?.trim() || !campaign.subject?.trim() || !campaign.template?.trim()) {
      toast.error('All fields are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaign.name,
          subject: campaign.subject,
          template: campaign.template,
          attachments: campaign.attachments || [],
        }),
      })

      if (res.ok) {
        toast.success('Campaign updated!')
        router.push(`/campaigns/${id}`)
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Failed to save campaign')
    } finally {
      setSaving(false)
    }
  }

  const availablePlaceholders = ['name', 'email', ...Array.from(new Set(contacts.flatMap(c => Object.keys(c.customFields || {})).filter(k => k !== 'name' && k !== 'email')))]

  if (status === 'loading' || loading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={`/campaigns/${id}`} className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaign
          </Link>
          <h1 className="text-3xl font-bold text-white">Edit Campaign</h1>
          <p className="text-gray-400 mt-1">{campaign.name}</p>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Campaign Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name *</label>
                <input type="text" value={campaign.name || ''} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Subject *</label>
                <input type="text" value={campaign.subject || ''} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
            </div>
          </div>

          {/* Template */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Email Template</h2>
            <textarea value={campaign.template || ''} onChange={(e) => setCampaign({ ...campaign, template: e.target.value })} rows={10}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm" />
            
            <div className="mt-4 bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Click to add placeholders</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availablePlaceholders.map((placeholder) => (
                  <button key={placeholder} onClick={() => setCampaign({ ...campaign, template: (campaign.template || '') + `{{${placeholder}}}` })}
                    className="px-2 py-1 bg-gray-600 text-primary-400 text-sm rounded font-mono hover:bg-gray-500">
                    {'{{'}{placeholder}{'}}'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Attachments</h2>
            
            {/* Upload Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => document.getElementById('file-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx,.txt" onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-gray-500'}`} />
              <p className="text-gray-300 mb-1">
                {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                PDF, Images (JPG, PNG), DOCX, TXT • Max 5MB per file • 25MB total
              </p>
            </div>

            {/* File List */}
            {(campaign.attachments || []).length > 0 && (
              <div className="mt-4 space-y-2">
                {(campaign.attachments || []).map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="text-white text-sm">{file.name}</p>
                        <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeAttachment(file.path)} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <p className="text-sm text-gray-400 mt-2">
                  Total: {formatFileSize((campaign.attachments || []).reduce((acc, f) => acc + f.size, 0))}
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            <Link href={`/campaigns/${id}`} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
              Cancel
            </Link>
            <button onClick={saveCampaign} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
