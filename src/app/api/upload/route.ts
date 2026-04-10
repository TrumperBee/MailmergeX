import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/jpg': '.jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25MB total

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const formData = await request.formData()
    const campaignId = formData.get('campaignId') as string
    const files = formData.getAll('files') as File[]

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Calculate total size
    let totalSize = 0
    for (const file of files) {
      totalSize += file.size
    }
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit` }, { status: 400 })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', userId, campaignId)
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const uploadedFiles: { name: string; size: number; path: string; type: string }[] = []

    for (const file of files) {
      // Validate file type
      const ext = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
      if (!ext) {
        continue // Skip invalid types
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        continue // Skip files too large
      }

      // Generate unique filename
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}-${safeName}`
      const filepath = join(uploadsDir, filename)

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filepath, buffer)

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        path: `/uploads/${userId}/${campaignId}/${filename}`,
        type: file.type,
      })
    }

    return NextResponse.json({ files: uploadedFiles })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filepath = searchParams.get('filepath')

    if (!filepath) {
      return NextResponse.json({ error: 'Filepath required' }, { status: 400 })
    }

    // Validate filepath to prevent directory traversal
    const fullPath = join(process.cwd(), 'public', filepath)
    if (!fullPath.startsWith(join(process.cwd(), 'public', 'uploads'))) {
      return NextResponse.json({ error: 'Invalid filepath' }, { status: 400 })
    }

    // Delete file
    const { unlink } = await import('fs/promises')
    try {
      await unlink(fullPath)
    } catch {
      // File might not exist
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 })
  }
}
