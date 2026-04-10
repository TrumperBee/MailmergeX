import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { campaigns, contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const campaignId = params.id

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    })

    if (!campaign || campaign.userId !== userId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaignContacts = await db.query.contacts.findMany({
      where: eq(contacts.campaignId, campaignId),
    })

    return NextResponse.json({ campaign, contacts: campaignContacts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const campaignId = params.id
    const body = await request.json()

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    })

    if (!campaign || campaign.userId !== userId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const [updated] = await db
      .update(campaigns)
      .set({
        name: body.name ?? campaign.name,
        subject: body.subject ?? campaign.subject,
        template: body.template ?? campaign.template,
        status: body.status ?? campaign.status,
        attachments: body.attachments ?? campaign.attachments,
        totalEmails: body.totalEmails ?? campaign.totalEmails,
        sentEmails: body.sentEmails ?? campaign.sentEmails,
        failedEmails: body.failedEmails ?? campaign.failedEmails,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning()

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const campaignId = params.id

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    })

    if (!campaign || campaign.userId !== userId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    await db.delete(campaigns).where(eq(campaigns.id, campaignId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
