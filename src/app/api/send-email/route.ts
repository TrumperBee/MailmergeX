import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { decrypt } from '@/lib/encryption'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, smtpConfig, attachments } = await request.json()

    if (!to || !smtpConfig) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: decrypt(smtpConfig.encryptedPassword),
      },
    })

    const mailOptions: any = {
      from: `"${smtpConfig.fromName || 'MailMergeX'}" <${smtpConfig.fromEmail}>`,
      to,
      subject: subject || '(No subject)',
      html: body || '',
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att: { name: string; path: string }) => ({
        filename: att.name,
        path: join(process.cwd(), 'public', att.path),
      }))
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to send email' }, { status: 500 })
  }
}
