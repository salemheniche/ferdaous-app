import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances, students, groupStudents, teacherGroups } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const groupId = searchParams.get('groupId')

  // If teacher → verify this group is assigned to them
  if (session.role === 'teacher' && session.teacherId && groupId) {
    const allowed = await db.select().from(teacherGroups)
      .where(and(
        eq(teacherGroups.teacherId, session.teacherId),
        eq(teacherGroups.groupId, parseInt(groupId))
      )).limit(1)
    if (allowed.length === 0) {
      return NextResponse.json({ error: 'ليس لديك صلاحية الوصول لهذا الفوج' }, { status: 403 })
    }
  }

  type StudentRow = typeof students.$inferSelect
  let studentsInGroup: StudentRow[] = []
  if (groupId) {
    const gs = await db
      .select({ student: students })
      .from(groupStudents)
      .leftJoin(students, eq(groupStudents.studentId, students.id))
      .where(eq(groupStudents.groupId, parseInt(groupId)))
    studentsInGroup = gs.map(g => g.student).filter((s): s is StudentRow => s !== null)
  }

  const attRecords = await db.select().from(attendances)
    .where(eq(attendances.attendanceDate, date))

  return NextResponse.json({ students: studentsInGroup, attendance: attRecords })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { records, date, groupId } = body

  if (!records || !Array.isArray(records)) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }

  // Teacher permission check
  if (session.role === 'teacher' && session.teacherId && groupId) {
    const allowed = await db.select().from(teacherGroups)
      .where(and(
        eq(teacherGroups.teacherId, session.teacherId),
        eq(teacherGroups.groupId, parseInt(groupId))
      )).limit(1)
    if (allowed.length === 0) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لتسجيل حضور هذا الفوج' }, { status: 403 })
    }
  }

  for (const rec of records) {
    const existing = await db.select().from(attendances)
      .where(and(eq(attendances.studentId, rec.studentId), eq(attendances.attendanceDate, date)))
      .limit(1)

    if (existing.length > 0) {
      await db.update(attendances)
        .set({ status: rec.status, notes: rec.notes ?? null })
        .where(and(eq(attendances.studentId, rec.studentId), eq(attendances.attendanceDate, date)))
    } else {
      await db.insert(attendances).values({
        studentId: rec.studentId,
        attendanceDate: date,
        status: rec.status,
        notes: rec.notes ?? null,
        scheduleId: rec.scheduleId ?? null,
      })
    }

    // Auto update student status if 5+ absences
    const absenceCount = await db.select().from(attendances)
      .where(and(eq(attendances.studentId, rec.studentId), eq(attendances.status, 'absent')))
    if (absenceCount.length >= 5) {
      await db.update(students).set({ status: 'withdrawn' }).where(eq(students.id, rec.studentId))
    }
  }

  const absentCount = records.filter((r: { status: string }) => r.status === 'absent').length
  await logActivity({
    userId: session.id,
    userFullName: session.fullName ?? session.username,
    userRole: session.role,
    action: 'attendance',
    entity: 'attendance',
    description: `تم تسجيل حضور ${records.length} طالب بتاريخ ${date}${absentCount > 0 ? ` (${absentCount} غائب)` : ''}`,
    metadata: { date, total: records.length, absent: absentCount },
  })

  return NextResponse.json({ success: true })
}
