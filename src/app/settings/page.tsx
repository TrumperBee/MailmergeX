'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Mail, Lock, Server, Send, Loader2, HelpCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: '',
    fromEmail: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchSMTPConfig()
  }, [status, router])

  const fetchSMTPConfig = async () => {
    try {
      const res = await fetch('/api/settings/smtp')
      const data = await res.json()
      if (res.ok && data) {
        setSmtpConfig({
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          secure: data.secure || false,
          username: data.username || '',
          password: '',
          fromName: data.fromName || '',
          fromEmail: data.fromEmail || '',
        })
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    if (!smtpConfig.username || !smtpConfig.fromEmail) {
      toast.error('Please enter your email address')
      return
    }
    if (!smtpConfig.password && !loading) {
      const existing = await fetch('/api/settings/smtp')
      const data = await existing.json()
      if (!data) {
        toast.error('Please enter your App Password')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig),
      })

      if (res.ok) {
        toast.success('Settings saved successfully! ✓')
        setSmtpConfig(prev => ({ ...prev, password: '' }))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!smtpConfig.username || !smtpConfig.password) {
      toast.error('Enter your email AND App Password first')
      return
    }

    setTesting(true)
    toast.loading('Testing connection...', { id: 'test' })
    
    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          username: smtpConfig.username,
          password: smtpConfig.password,
        }),
      })

      const data = await res.json()
      
      if (data.success) {
        toast.success('✓ Connection successful!', { id: 'test' })
      } else {
        let msg = data.error || 'Connection failed'
        if (msg.includes('ECONNREFUSED')) msg = 'Cannot connect to server. Check your host/port.'
        if (msg.includes('EAUTH')) msg = 'Wrong email or password. Make sure to use an App Password.'
        toast.error(msg, { id: 'test' })
      }
    } catch {
      toast.error('Connection test failed', { id: 'test' })
    } finally {
      setTesting(false)
    }
  }

  if (status === 'loading' || loading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Email Settings</h1>
          <p className="text-gray-400 mt-1">Connect your email account to send bulk emails</p>
        </div>

        {/* Help Box */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-5 mb-6">
          <button onClick={() => setShowHelp(!showHelp)} className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2 text-blue-400">
              <HelpCircle className="w-5 h-5" />
              <span className="font-medium">How to set up Gmail (click to {showHelp ? 'hide' : 'show'})</span>
            </div>
          </button>
          
          {showHelp && (
            <div className="mt-4 text-gray-300 text-sm space-y-2">
              <p><strong className="text-yellow-400">Step 1:</strong> Go to <span className="font-mono bg-gray-700 px-1 rounded">myaccount.google.com → Security</span></p>
              <p><strong className="text-yellow-400">Step 2:</strong> Enable <span className="text-white">2-Step Verification</span></p>
              <p><strong className="text-yellow-400">Step 3:</strong> Search for <span className="text-white">App Passwords</span></p>
              <p><strong className="text-yellow-400">Step 4:</strong> Select app <span className="text-white">"Mail"</span>, device <span className="text-white">"Other"</span></p>
              <p><strong className="text-yellow-400">Step 5:</strong> Copy the <span className="text-yellow-400">16-character password</span> (spaces don't matter)</p>
              <p><strong className="text-yellow-400">Step 6:</strong> Paste it in the App Password field below</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="space-y-6">
            {/* SMTP Server */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                SMTP Server (already filled for Gmail)
              </label>
              <input type="text" value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              <p className="text-xs text-gray-500 mt-1">Gmail: smtp.gmail.com | Outlook: smtp-mail.outlook.com</p>
            </div>

            {/* Port */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                <input type="number" value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) || 587 })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Security</label>
                <select value={smtpConfig.secure ? 'true' : 'false'} onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.value === 'true' })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="false">STARTTLS (Recommended)</option>
                  <option value="true">SSL/TLS</option>
                </select>
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Gmail Address *
                </label>
                <input type="email" value={smtpConfig.username} onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  placeholder="yourname@gmail.com"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  App Password * 
                  <button type="button" onClick={() => setShowHelp(true)} className="ml-1 text-blue-400 text-xs underline">(need help?)</button>
                </label>
                <input type="password" value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                  placeholder="16-character password"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
            </div>

            {/* From Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sender Name</label>
                <input type="text" value={smtpConfig.fromName} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  placeholder="My Company"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sender Email *</label>
                <input type="email" value={smtpConfig.fromEmail} onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                  placeholder="yourname@gmail.com"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <button onClick={testConnection} disabled={testing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</> : <><CheckCircle className="w-4 h-4" /> Test Connection</>}
              </button>
              <button onClick={saveConfig} disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
