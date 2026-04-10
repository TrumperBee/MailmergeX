'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { isValidEmail, detectEmailColumn, detectNameColumn } from '@/lib/mail-merge'
import Papa from 'papaparse'
import {
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  Mail,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type Step = 'upload' | 'preview' | 'template' | 'review'

interface CSVRow {
  [key: string]: string
}

interface Contact {
  email: string
  name: string | null
  customFields: Record<string, string>
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [campaignName, setCampaignName] = useState('')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [emailColumn, setEmailColumn] = useState<string>('')
  const [nameColumn, setNameColumn] = useState<string>('')
  const [template, setTemplate] = useState('')
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFileUpload = useCallback((file: File) => {
    setLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[]
        const cols = results.meta.fields || []
        
        setCsvData(data)
        setHeaders(cols)
        
        const detectedEmail = detectEmailColumn(cols)
        const detectedName = detectNameColumn(cols)
        
        if (detectedEmail) setEmailColumn(detectedEmail)
        if (detectedName) setNameColumn(detectedName)
        
        setLoading(false)
      },
      error: () => {
        toast.error('Failed to parse CSV file')
        setLoading(false)
      },
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type === 'text/csv') {
        handleFileUpload(file)
      } else {
        toast.error('Please upload a CSV file')
      }
    },
    [handleFileUpload]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const validateContacts = () => {
    const validContacts: CSVRow[] = []
    const invalidEmails: number[] = []

    csvData.forEach((row, index) => {
      const email = row[emailColumn]?.trim()
      if (email && isValidEmail(email)) {
        validContacts.push(row)
      } else {
        invalidEmails.push(index + 1)
      }
    })

    return { validContacts, invalidEmails }
  }

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    if (!subject.trim()) {
      toast.error('Please enter an email subject')
      return
    }

    if (!template.trim()) {
      toast.error('Please enter an email template')
      return
    }

    if (!emailColumn) {
      toast.error('Please select an email column')
      return
    }

    setLoading(true)

    try {
      const { validContacts, invalidEmails } = validateContacts()

      if (validContacts.length === 0) {
        toast.error('No valid contacts found')
        setLoading(false)
        return
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject,
          template,
          status: 'draft',
          totalEmails: validContacts.length,
        }),
      })

      if (!res.ok) throw new Error('Failed to create campaign')

      const campaign = await res.json()
      setCampaignId(campaign.id)

      const contacts: Contact[] = validContacts.map((row) => {
        const customFields: Record<string, string> = {}
        headers.forEach((header) => {
          if (header !== emailColumn && header !== nameColumn) {
            customFields[header.toLowerCase().replace(/[^a-z0-9]/gi, '_')] = row[header] || ''
          }
        })

        return {
          email: row[emailColumn].trim(),
          name: nameColumn ? row[nameColumn]?.trim() || null : null,
          customFields,
        }
      })

      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          contacts,
        }),
      })

      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      })

      toast.success(`Campaign created with ${validContacts.length} contacts!`)
      
      if (invalidEmails.length > 0) {
        toast.error(`${invalidEmails.length} contacts skipped due to invalid emails`)
      }

      router.push(`/campaigns/${campaign.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const getPreviewContacts = (): Contact[] => {
    return csvData.slice(0, 3).map((row) => {
      const customFields: Record<string, string> = {}
      headers.forEach((header) => {
        if (header !== emailColumn && header !== nameColumn) {
          customFields[header.toLowerCase().replace(/[^a-z0-9]/gi, '_')] = row[header] || ''
        }
      })

      return {
        email: row[emailColumn]?.trim() || '',
        name: nameColumn ? row[nameColumn]?.trim() || null : null,
        customFields,
      }
    })
  }

  const replacePlaceholders = (text: string, contact: Contact) => {
    let result = text
    result = result.replace(/\{\{name\}\}/gi, contact.name || '')
    result = result.replace(/\{\{email\}\}/gi, contact.email || '')
    Object.entries(contact.customFields).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
      result = result.replace(regex, value || '')
    })
    return result
  }

  const availablePlaceholders = [
    'name',
    'email',
    ...headers
      .filter((h) => h !== emailColumn && h !== nameColumn)
      .map((h) => h.toLowerCase().replace(/[^a-z0-9]/gi, '_')),
  ]

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/campaigns" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-white">Create New Campaign</h1>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {(['upload', 'preview', 'template', 'review'] as Step[]).map((s, index) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step === s
                    ? 'bg-primary-600 text-white'
                    : index < ['upload', 'preview', 'template', 'review'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {index < ['upload', 'preview', 'template', 'review'].indexOf(step) ? (
                    <Check className="w-4 h-4" />
                  ) : index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${step === s ? 'text-white' : 'text-gray-400'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
                {index < 3 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    index < ['upload', 'preview', 'template', 'review'].indexOf(step)
                      ? 'bg-green-500'
                      : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          {step === 'upload' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Campaign Details</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Summer Sale Newsletter"
                />
              </div>

              <h2 className="text-xl font-semibold text-white mb-4">Upload Contacts (CSV)</h2>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center"
              >
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-300 mb-2">Drag and drop your CSV file here</p>
                <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="inline-block px-4 py-2 bg-gray-700 text-white rounded-lg cursor-pointer">
                  Choose File
                </label>
              </div>

              {csvData.length > 0 && (
                <div className="flex items-center gap-2 text-green-400 mt-4">
                  <Check className="w-5 h-5" />
                  <span>{csvData.length} contacts loaded from {headers.length} columns</span>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Map CSV Columns</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Column *</label>
                  <select value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="">Select column</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name Column</label>
                  <select value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="">None</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {availablePlaceholders.map((placeholder) => (
                  <span key={placeholder} className="px-2 py-1 bg-gray-700 text-primary-400 text-sm rounded font-mono">
                    {'{{'}{placeholder}{'}}'}
                  </span>
                ))}
              </div>

              <h3 className="text-lg font-medium text-white mb-4">Contact Preview (first 5)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-gray-300">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {csvData.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {headers.map((header) => (
                          <td key={header} className={`px-4 py-2 ${header === emailColumn ? 'text-primary-400' : 'text-gray-300'}`}>
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'template' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Create Email Template</h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Subject *</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., {{name}}, Check out our latest offers!" />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Body *</label>
                <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={12}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
                  placeholder={`Dear {{name}},

We're excited to share our latest products with you!

Best regards,
The Team`} />
              </div>
            </div>
          )}

          {step === 'review' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Review & Create Campaign</h2>
              <div className="space-y-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Campaign Name</h3>
                  <p className="text-white">{campaignName || '(Not set)'}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <Users className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{validateContacts().validContacts.length}</p>
                    <p className="text-sm text-gray-400">Contacts</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{validateContacts().validContacts.length}</p>
                    <p className="text-sm text-gray-400">Valid Emails</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <Mail className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{validateContacts().invalidEmails.length}</p>
                    <p className="text-sm text-gray-400">Invalid Emails</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
            <button onClick={() => {
              const steps: Step[] = ['upload', 'preview', 'template', 'review']
              const currentIndex = steps.indexOf(step)
              if (currentIndex > 0) setStep(steps[currentIndex - 1])
            }} disabled={step === 'upload'}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50">
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>

            {step === 'review' ? (
              <button onClick={createCampaign} disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Campaign'}
              </button>
            ) : (
              <button onClick={() => {
                if (!campaignName.trim() && step === 'upload') { toast.error('Please enter a campaign name'); return }
                if (!emailColumn && step === 'preview') { toast.error('Please select an email column'); return }
                const steps: Step[] = ['upload', 'preview', 'template', 'review']
                const currentIndex = steps.indexOf(step)
                if (currentIndex < 3) setStep(steps[currentIndex + 1])
              }} disabled={loading || (step === 'upload' && csvData.length === 0)}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
