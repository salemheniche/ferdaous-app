import { NextResponse } from 'next/server'
import { db } from '@/db'
import { students, teachers, groups } from '@/db/schemas/schema'
import { eq, count } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [ts] = await db.select({ count: count() }).from(students)
  const [ta] = await db.select({ count: count() }).from(students).where(eq(students.status, 'active'))
  const [tw] = await db.select({ count: count() }).from(students).where(eq(students.status, 'withdrawn'))
  const [twa] = await db.select({ count: count() }).from(students).where(eq(students.status, 'waiting'))
  const [tt] = await db.select({ count: count() }).from(teachers)
  const [tg] = await db.select({ count: count() }).from(groups)

  return NextResponse.json({
    students: { total: ts.count, active: ta.count, withdrawn: tw.count, waiting: twa.count },
    teachers: { total: tt.count },
    groups: { total: tg.count },
  })
}
