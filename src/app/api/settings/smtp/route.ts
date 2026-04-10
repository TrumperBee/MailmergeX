import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { smtpSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { encrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const settings = await db.query.smtpSettings.findFirst({
      where: eq(smtpSettings.userId, userId),
    })

    return NextResponse.json(settings || null)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

    const existing = await db.query.smtpSettings.findFirst({
      where: eq(smtpSettings.userId, userId),
    })

    let result
    if (existing) {
      const updateData: any = {
        host: body.host,
        port: body.port,
        secure: body.secure,
        username: body.username,
        fromName: body.fromName || null,
        fromEmail: body.fromEmail,
        updatedAt: new Date(),
      }

      if (body.password) {
        updateData.encryptedPassword = encrypt(body.password)
      }

      [result] = await db
        .update(smtpSettings)
        .set(updateData)
        .where(eq(smtpSettings.userId, userId))
        .returning()
    } else {
      [result] = await db
        .insert(smtpSettings)
        .values({
          userId,
          host: body.host,
          port: body.port || 587,
          secure: body.secure || false,
          username: body.username,
          encryptedPassword: encrypt(body.password),
          fromName: body.fromName || null,
          fromEmail: body.fromEmail,
        })
        .returning()
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
