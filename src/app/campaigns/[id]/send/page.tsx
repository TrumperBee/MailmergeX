'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { MailMergeEngine, isValidEmail } from '@/lib/mail-merge'
import Link from 'next/link'
import { ArrowLeft, Send, AlertCircle, Loader2, Eye, Mail, Paperclip, Image, FileText, File } from 'lucide-react'
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
}

interface Contact {
  id: string
  email: string
  name: string
  customFields: Record<string, string>
}

interface SMTPConfig {
  id: string
  host: string
  port: number
  secure: boolean
  username: string
  encryptedPassword: string
  fromName: string
  fromEmail: string
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

export default function SendCampaignPage() {
  const params = useParams()
  const id = params.id as string
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [previewContact, setPreviewContact] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated' && id) fetchData()
  }, [status, id, router])

  const fetchData = async () => {
    try {
      const [campaignRes, smtpRes] = await Promise.all([
        fetch(`/api/campaigns/${id}`),
        fetch('/api/settings/smtp'),
      ])
      const campaignData = await campaignRes.json()
      const smtpData = await smtpRes.json()
      
      if (campaignRes.ok) {
        setCampaign(campaignData.campaign)
        setContacts(campaignData.contacts || [])
      }
      if (smtpRes.ok) setSmtpConfig(smtpData)
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  const validContacts = contacts.filter(c => isValidEmail(c.email))

  const mailMerge = campaign?.template
    ? new MailMergeEngine(campaign.template, campaign.subject || '')
    : null

  const previewEmails = mailMerge
    ? mailMerge.generateBulkEmails(validContacts.slice(0, 3).map(c => ({
        email: c.email,
        name: c.name || null,
        custom_fields: c.customFields,
      })))
    : []

  const sendEmails = async () => {
    if (!campaign || !smtpConfig || !mailMerge) {
      toast.error('Missing configuration')
      return
    }

    if (validContacts.length === 0) {
      toast.error('No valid contacts')
      return
    }

    setSending(true)
    setProgress({ current: 0, total: validContacts.length })

    try {
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sending' }),
      })

      let sent = 0
      let failed = 0

      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i]
        const emailData = mailMerge.generateEmail({
          email: contact.email,
          name: contact.name || null,
          custom_fields: contact.customFields,
        })

        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: contact.email,
              subject: emailData.subject,
              body: emailData.body,
              smtpConfig,
              attachments: campaign.attachments || [],
            }),
          })

          const result = await response.json()

          if (result.success) {
            sent++
            await fetch('/api/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId: contact.id,
                campaignId: campaign.id,
                recipientEmail: contact.email,
                subject: emailData.subject,
                body: emailData.body,
                status: 'sent',
                sentAt: new Date().toISOString(),
              }),
            })
          } else {
            failed++
            await fetch('/api/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId: contact.id,
                campaignId: campaign.id,
                recipientEmail: contact.email,
                subject: emailData.subject,
                body: emailData.body,
                status: 'failed',
                errorMessage: result.error,
              }),
            })
          }
        } catch (error: any) {
          failed++
          await fetch('/api/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: contact.id,
              campaignId: campaign.id,
              recipientEmail: contact.email,
              subject: emailData.subject,
              body: emailData.body,
              status: 'failed',
              errorMessage: error.message,
            }),
          })
        }

        setProgress({ current: i + 1, total: validContacts.length })
        if (i < validContacts.length - 1) await new Promise(r => setTimeout(r, 100))
      }

      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: failed === validContacts.length ? 'failed' : 'completed',
          sentEmails: sent,
          failedEmails: failed,
        }),
      })

      toast.success(`Sent ${sent} emails${failed > 0 ? `, ${failed} failed` : ''}`)
      router.push(`/campaigns/${campaign.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading' || loading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></AppLayout>
  }

  if (!campaign) {
    return <AppLayout><div className="text-center py-12"><h2 className="text-xl font-semibold text-white">Campaign not found</h2></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={`/campaigns/${campaign.id}`} className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaign
          </Link>
          <h1 className="text-3xl font-bold text-white">Send Campaign</h1>
          <p className="text-gray-400 mt-1">{campaign.name}</p>
        </div>

        {!smtpConfig && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">SMTP Not Configured</h3>
                <p className="text-gray-300 mb-4">Configure SMTP settings before sending emails.</p>
                <Link href="/settings" className="inline-block px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg">Configure SMTP</Link>
              </div>
            </div>
          </div>
        )}

        {sending && (
          <div className="bg-primary-900/30 border border-primary-700 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              <h3 className="text-lg font-semibold text-primary-400">Sending Emails...</h3>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{progress.current} / {progress.total}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {!sending && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Ready to Send</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <Mail className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{validContacts.length}</p>
                <p className="text-sm text-gray-400">Valid Contacts</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{contacts.length - validContacts.length}</p>
                <p className="text-sm text-gray-400">Invalid Emails</p>
              </div>
            </div>

            {smtpConfig && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Sending From</h3>
                <p className="text-white">{smtpConfig.fromName || 'No name'} &lt;{smtpConfig.fromEmail}&gt;</p>
                <p className="text-sm text-gray-400 mt-1">via {smtpConfig.host}:{smtpConfig.port}</p>
              </div>
            )}

            {/* Attachments Info */}
            {(campaign.attachments || []).length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments ({campaign.attachments?.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(campaign.attachments || []).map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-600/50 rounded p-2">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{file.name}</p>
                        <p className="text-gray-500 text-xs">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-2">These files will be attached to all outgoing emails.</p>
              </div>
            )}

            <div className="border-t border-gray-700 pt-6">
              <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-primary-500 hover:text-primary-400 mb-4">
                <Eye className="w-4 h-4" /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>

              {showPreview && previewEmails.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setPreviewContact(Math.max(0, previewContact - 1))}
                      className="px-3 py-1 bg-gray-700 text-white rounded text-sm" disabled={previewContact === 0}>Prev</button>
                    <span className="text-gray-400 text-sm">Contact {previewContact + 1} of {previewEmails.length}</span>
                    <button onClick={() => setPreviewContact(Math.min(previewEmails.length - 1, previewContact + 1))}
                      className="px-3 py-1 bg-gray-700 text-white rounded text-sm" disabled={previewContact === previewEmails.length - 1}>Next</button>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="mb-3"><span className="text-sm font-medium text-gray-400">Subject:</span> <span className="text-white">{previewEmails[previewContact].subject}</span></div>
                    <div className="border-t border-gray-600 pt-3"><div className="text-white whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: previewEmails[previewContact].body || '(No content)' }} /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-700">
              <Link href={`/campaigns/${campaign.id}`} className="px-6 py-2 text-gray-400 hover:text-white">Cancel</Link>
              <button onClick={sendEmails} disabled={!smtpConfig || validContacts.length === 0 || sending}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50">
                <Send className="w-4 h-4" /> Send {validContacts.length} Emails
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
