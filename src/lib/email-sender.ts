import nodemailer from 'nodemailer'
import { SMTPConfig } from '@/types'
import { decrypt } from './encryption'
import { EmailLog } from '@/types'

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  smtpConfig: SMTPConfig
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Create a Nodemailer transporter from SMTP config
 */
export function createTransporter(smtpConfig: SMTPConfig) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.username,
      pass: decrypt(smtpConfig.encrypted_password),
    },
  })
}

/**
 * Send a single email
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const transporter = createTransporter(options.smtpConfig)

    const mailOptions = {
      from: `"${options.smtpConfig.from_name || 'MailMergeX'}" <${options.smtpConfig.from_email}>`,
      to: options.to,
      subject: options.subject,
      html: options.body,
    }

    const info = await transporter.sendMail(mailOptions)
    
    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email',
    }
  }
}

/**
 * Send bulk emails with rate limiting
 * Gmail and most SMTP providers have rate limits:
 * - Gmail: 500 emails/day (regular) or 2000/day (Google Workspace)
 * - Default SMTP: typically 100-500 emails/hour
 */
export async function sendBulkEmails(
  emails: Array<{ to: string; subject: string; body: string }>,
  smtpConfig: SMTPConfig,
  options: {
    rateLimit?: number // emails per minute (default: 10)
    onProgress?: (sent: number, total: number) => void
    onEmailResult?: (index: number, result: SendEmailResult) => void
  } = {}
): Promise<{ sent: number; failed: number; results: SendEmailResult[] }> {
  const rateLimit = options.rateLimit || 10 // 10 emails per minute default
  const delayBetweenEmails = Math.ceil(60000 / rateLimit) // milliseconds

  let sent = 0
  let failed = 0
  const results: SendEmailResult[] = []

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]
    const result = await sendEmail({
      to: email.to,
      subject: email.subject,
      body: email.body,
      smtpConfig,
    })

    results.push(result)

    if (result.success) {
      sent++
    } else {
      failed++
    }

    options.onProgress?.(i + 1, emails.length)
    options.onEmailResult?.(i, result)

    // Rate limiting delay (except for last email)
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenEmails))
    }
  }

  return { sent, failed, results }
}

/**
 * Test SMTP connection
 */
export async function testSMTPConnection(smtpConfig: SMTPConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(smtpConfig)
    await transporter.verify()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' }
  }
}
