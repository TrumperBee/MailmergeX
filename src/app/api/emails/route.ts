import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { emails } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const [email] = await db
      .insert(emails)
      .values({
        contactId: body.contactId,
        campaignId: body.campaignId,
        recipientEmail: body.recipientEmail,
        subject: body.subject || null,
        body: body.body || null,
        status: body.status || 'pending',
        sentAt: body.sentAt ? new Date(body.sentAt) : null,
        errorMessage: body.errorMessage || null,
      })
      .returning()

    return NextResponse.json(email)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    const campaignEmails = await db.query.emails.findMany({
      where: eq(emails.campaignId, campaignId),
    })

    return NextResponse.json(campaignEmails)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
