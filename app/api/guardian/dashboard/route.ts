import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students, attendances, groupStudents, groups, teacherGroups, teachers } from '@/db/schemas/schema'
import { eq, and, gte, lte, count } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'guardian') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get students linked to this guardian
  const myStudents = await db.select().from(students).where(eq(students.guardianUserId, session.id))

  const result = await Promise.all(myStudents.map(async (student) => {
    // Get student's groups with teacher info
    const studentGroups = await db.select({
      groupId: groups.id,
      groupName: groups.name,
      groupNumber: groups.groupNumber,
      teacherId: teachers.id,
      teacherName: teachers.fullName,
      teacherPhone: teachers.phone,
    })
      .from(groupStudents)
      .leftJoin(groups, eq(groupStudents.groupId, groups.id))
      .leftJoin(teacherGroups, eq(teacherGroups.groupId, groups.id))
      .leftJoin(teachers, eq(teacherGroups.teacherId, teachers.id))
      .where(eq(groupStudents.studentId, student.id))

    // Get this week's attendance
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const weekStart = startOfWeek.toISOString().split('T')[0]
    const weekEnd = endOfWeek.toISOString().split('T')[0]

    const weekAttendance = await db.select().from(attendances)
      .where(and(
        eq(attendances.studentId, student.id),
        gte(attendances.attendanceDate, weekStart),
        lte(attendances.attendanceDate, weekEnd),
      ))

    const weekPresent = weekAttendance.filter(a => a.status === 'present').length
    const weekAbsent = weekAttendance.filter(a => a.status === 'absent').length
    const weekLate = weekAttendance.filter(a => a.status === 'late').length

    // Get total attendance
    const totalAttendance = await db.select().from(attendances).where(eq(attendances.studentId, student.id))
    const totalPresent = totalAttendance.filter(a => a.status === 'present').length
    const totalAbsent = totalAttendance.filter(a => a.status === 'absent').length

    // Get teacher notes (attendance notes for absences/late)
    const teacherNotes = totalAttendance
      .filter(a => a.notes)
      .slice(-5)
      .map(a => ({ date: a.attendanceDate, status: a.status, note: a.notes }))

    return {
      student,
      groups: studentGroups,
      weekStats: { present: weekPresent, absent: weekAbsent, late: weekLate, total: weekAttendance.length },
      totalStats: { present: totalPresent, absent: totalAbsent, total: totalAttendance.length },
      teacherNotes,
    }
  }))

  return NextResponse.json(result)
}
