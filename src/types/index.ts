export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface SMTPConfig {
  id: string
  user_id: string
  host: string
  port: number
  secure: boolean
  username: string
  encrypted_password: string
  from_name: string | null
  from_email: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  subject: string | null
  template: string | null
  status: 'draft' | 'ready' | 'sending' | 'completed' | 'failed'
  total_emails: number
  sent_emails: number
  failed_emails: number
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  campaign_id: string
  email: string
  name: string | null
  custom_fields: Record<string, any>
  created_at: string
}

export interface EmailRecord {
  id: string
  contact_id: string
  campaign_id: string
  recipient_email: string
  subject: string | null
  body: string | null
  status: 'pending' | 'sent' | 'failed' | 'opened'
  sent_at: string | null
  opened_at: string | null
  error_message: string | null
  created_at: string
}

export interface EmailLog {
  id: string
  email_id: string
  action: string
  message: string | null
  created_at: string
}

export interface CSVRow {
  [key: string]: string
}

export interface ParsedContact {
  email: string
  name: string | null
  custom_fields: Record<string, string>
}
