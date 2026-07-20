import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [notif] = await db.select().from(notifications).where(eq(notifications.id, parseInt(id))).limit(1)
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let readBy: number[] = []
  try { readBy = JSON.parse(notif.isReadBy ?? '[]') } catch {}

  if (!readBy.includes(session.id)) {
    readBy.push(session.id)
    await db.update(notifications).set({ isReadBy: JSON.stringify(readBy) }).where(eq(notifications.id, parseInt(id)))
  }

  return NextResponse.json({ success: true })
}
