import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { groups, groupStudents, students } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Get group with students
  const groupStudentsList = await db
    .select({ student: students })
    .from(groupStudents)
    .leftJoin(students, eq(groupStudents.studentId, students.id))
    .where(eq(groupStudents.groupId, parseInt(id)))
  return NextResponse.json(groupStudentsList.map(gs => gs.student))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { name, groupType, capacity, status } = body
  const [updated] = await db.update(groups).set({
    name, groupType: groupType || null,
    capacity: capacity ? parseInt(capacity) : null,
    status: status || 'open',
  }).where(eq(groups.id, parseInt(id))).returning()
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.delete(groups).where(eq(groups.id, parseInt(id)))
  return NextResponse.json({ success: true })
}
