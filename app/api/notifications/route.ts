import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { notifications, users, groupStudents, teacherGroups, students } from '@/db/schemas/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

// Helper: get guardian user IDs for a teacher's groups
async function getTeacherGroupGuardianUserIds(teacherId: number): Promise<number[]> {
  // 1. Get teacher's group IDs
  const tGroups = await db
    .select({ groupId: teacherGroups.groupId })
    .from(teacherGroups)
    .where(eq(teacherGroups.teacherId, teacherId))
  const groupIds = tGroups.map(g => g.groupId).filter((id): id is number => id !== null)
  if (groupIds.length === 0) return []

  // 2. Get students in those groups
  const gs = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(inArray(groupStudents.groupId, groupIds))
  const studentIds = [...new Set(gs.map(g => g.studentId))]
  if (studentIds.length === 0) return []

  // 3. Get guardianUserId for those students
  const studs = await db
    .select({ guardianUserId: students.guardianUserId, firstName: students.firstName, lastName: students.lastName })
    .from(students)
    .where(inArray(students.id, studentIds))

  return [...new Set(
    studs.map(s => s.guardianUserId).filter((id): id is number => id !== null)
  )]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const forMe = searchParams.get('forMe') === '1'

  let allNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt))

  if (forMe) {
    // Filter notifications targeted to this user
    allNotifs = allNotifs.filter(n => {
      if (n.targetType === 'all') return true
      if (n.targetType === 'teachers' && session.role === 'teacher') return true
      if (n.targetType === 'guardians' && session.role === 'guardian') return true
      if (n.targetType === 'specific') {
        try {
          const ids: number[] = JSON.parse(n.targetIds ?? '[]')
          return ids.includes(session.id)
        } catch { return false }
      }
      return false
    })
  } else if (session.role === 'teacher') {
    // Teacher sees ONLY notifications they sent themselves
    allNotifs = allNotifs.filter(n => n.senderId === session.id)
  }
  // Admin sees all

  const result = allNotifs.map(n => {
    let readBy: number[] = []
    try { readBy = JSON.parse(n.isReadBy ?? '[]') } catch {}
    return { ...n, isRead: readBy.includes(session.id) }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, targetType, targetIds } = await req.json()
  if (!title || !body) return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 })

  let resolvedTargetType = targetType ?? 'all'
  let resolvedTargetIds: number[] | null = targetIds ?? null

  // Teacher restrictions: can only send to their own students' guardians
  if (session.role === 'teacher') {
    if (!session.teacherId) return NextResponse.json({ error: 'حساب المعلم غير مرتبط' }, { status: 403 })

    const allowedGuardianIds = await getTeacherGroupGuardianUserIds(session.teacherId)

    if (targetType === 'myGuardians') {
      // All guardians of teacher's students
      resolvedTargetType = 'specific'
      resolvedTargetIds = allowedGuardianIds
    } else if (targetType === 'specific' && Array.isArray(targetIds)) {
      // Validate: only allow IDs from teacher's own guardians
      const filtered = (targetIds as number[]).filter(id => allowedGuardianIds.includes(id))
      if (filtered.length === 0) return NextResponse.json({ error: 'لا يوجد أولياء أمور صالحون' }, { status: 400 })
      resolvedTargetType = 'specific'
      resolvedTargetIds = filtered
    } else {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    if (!resolvedTargetIds || resolvedTargetIds.length === 0) {
      return NextResponse.json({ error: 'لا يوجد أولياء أمور مرتبطون بطلاب فوجك' }, { status: 400 })
    }
  }

  const [created] = await db.insert(notifications).values({
    title,
    body,
    senderId: session.id,
    targetType: resolvedTargetType,
    targetIds: resolvedTargetIds ? JSON.stringify(resolvedTargetIds) : null,
    isReadBy: '[]',
  }).returning()

  await logActivity({
    userId: session.id,
    userFullName: session.fullName ?? session.username,
    userRole: session.role,
    action: 'notification',
    entity: 'notification',
    entityId: created.id,
    description: `أرسل إشعاراً: "${title}" إلى ${resolvedTargetType === 'all' ? 'الجميع' : resolvedTargetType === 'teachers' ? 'المعلمين' : resolvedTargetType === 'guardians' ? 'أولياء الأمور' : `${resolvedTargetIds?.length ?? 0} مستخدم`}`,
  })

  return NextResponse.json(created, { status: 201 })
}
