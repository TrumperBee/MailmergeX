import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { campaigns, contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const allCampaigns = await db.query.campaigns.findMany({
      where: eq(campaigns.userId, userId),
      orderBy: [desc(campaigns.createdAt)],
    })

    return NextResponse.json(allCampaigns)
  } catch (error: any) {
    console.error('GET /api/campaigns error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()

    const [campaign] = await db
      .insert(campaigns)
      .values({
        userId,
        name: body.name,
        subject: body.subject || null,
        template: body.template || null,
        status: body.status || 'draft',
        totalEmails: body.totalEmails || 0,
        attachments: [],
      })
      .returning()

    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 500 })
  }
}
