'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { MailMergeEngine, isValidEmail } from '@/lib/mail-merge'
import Link from 'next/link'
import { ArrowLeft, Send, AlertCircle, Loader2, Eye, Mail, Paperclip, Image, FileText, File, Settings } from 'lucide-react'
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
  const [showPreview, setShowPreview] = useState(true)
  const [previewContact, setPreviewContact] = useState(0)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

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
      if (smtpRes.ok && smtpData) {
        setSmtpConfig(smtpData)
      } else {
        setShowSettingsModal(true)
      }
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

  const previewEmails = mailMerge && validContacts.length > 0
    ? mailMerge.generateBulkEmails(validContacts.slice(0, 3).map(c => ({
        email: c.email,
        name: c.name || null,
        custom_fields: c.customFields,
      })))
    : []

  const sendEmails = async () => {
    if (!smtpConfig) {
      setShowSettingsModal(true)
      toast.error('Please set up your email account first!')
      return
    }

    if (!campaign || !mailMerge) {
      toast.error('Campaign not loaded properly')
      return
    }

    if (validContacts.length === 0) {
      toast.error('No valid contacts to send')
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

      toast.success(`Sent ${sent} emails${failed > 0 ? `, ${failed} failed` : ''}!`)
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

        {/* SMTP Not Configured Alert */}
        {!smtpConfig && (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                  Email Account Not Set Up
                </h3>
                <p className="text-gray-300 mb-4">
                  You need to connect your email account before you can send emails.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Set Up Email Now
                  </button>
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Go to Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Set Up Your Email Account</h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                <h3 className="text-blue-400 font-medium mb-2">📧 For Gmail:</h3>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Go to <span className="font-mono bg-gray-700 px-1 rounded">myaccount.google.com → Security</span></li>
                  <li>Enable <strong>2-Step Verification</strong></li>
                  <li>Search for <strong>App Passwords</strong></li>
                  <li>Select "Mail" → "Other" → Copy the password</li>
                </ol>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <h3 className="text-white font-medium mb-3">Enter Your Details:</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">SMTP Server</label>
                    <input type="text" value="smtp.gmail.com" readOnly className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Your Gmail *</label>
                    <input type="email" placeholder="yourname@gmail.com" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">App Password *</label>
                    <input type="password" placeholder="16-character password" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Cancel
                </button>
                <Link href="/settings" className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-center rounded-lg">
                  Continue to Settings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Sending Progress */}
        {sending && (
          <div className="bg-primary-900/30 border border-primary-700 rounded-xl p-6 mb-6">
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
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {!sending && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                <Mail className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{validContacts.length}</p>
                <p className="text-sm text-gray-400">Recipients</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                <Paperclip className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{(campaign.attachments || []).length}</p>
                <p className="text-sm text-gray-400">Attachments</p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Email Preview
                </h2>
                <button onClick={() => setShowPreview(!showPreview)} className="text-primary-400 text-sm">
                  {showPreview ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPreview && previewEmails.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setPreviewContact(Math.max(0, previewContact - 1))}
                      className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50" disabled={previewContact === 0}>
                      ← Prev
                    </button>
                    <span className="text-gray-400 text-sm">Contact {previewContact + 1} of {previewEmails.length}</span>
                    <button onClick={() => setPreviewContact(Math.min(previewEmails.length - 1, previewContact + 1))}
                      className="px-3 py-1 bg-gray-700 text-white rounded text-sm disabled:opacity-50" disabled={previewContact === previewEmails.length - 1}>
                      Next →
                    </button>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="mb-2 pb-2 border-b border-gray-600">
                      <p className="text-gray-400 text-sm">Subject:</p>
                      <p className="text-white font-medium">{previewEmails[previewContact]?.subject || '(No subject)'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">To:</p>
                      <p className="text-primary-400">{previewEmails[previewContact]?.contact?.email}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-gray-400 text-sm mb-1">Body:</p>
                      <div className="text-gray-200 whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: previewEmails[previewContact]?.body || '' }} />
                    </div>
                  </div>
                </div>
              )}

              {showPreview && previewEmails.length === 0 && (
                <div className="bg-gray-700/50 rounded-lg p-8 text-center">
                  <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No contacts available for preview</p>
                </div>
              )}
            </div>

            {/* Send Button */}
            <button
              onClick={sendEmails}
              disabled={!smtpConfig || validContacts.length === 0 || sending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {sending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-5 h-5" /> Send {validContacts.length} Emails</>
              )}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
