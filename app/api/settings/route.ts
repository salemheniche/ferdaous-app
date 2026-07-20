import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { settings } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
    return NextResponse.json(setting ?? { key, value: null })
  }
  const all = await db.select().from(settings)
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 })
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  return NextResponse.json({ success: true })
}
