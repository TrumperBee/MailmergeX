import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { contacts, campaigns } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, body.campaignId),
    })

    if (!campaign || campaign.userId !== userId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const insertedContacts = await db
      .insert(contacts)
      .values(
        body.contacts.map((c: any) => ({
          campaignId: body.campaignId,
          email: c.email,
          name: c.name || null,
          customFields: c.customFields || {},
        }))
      )
      .returning()

    return NextResponse.json(insertedContacts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
