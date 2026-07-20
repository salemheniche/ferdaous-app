import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, teachers, groups, groupStudents,
  rooms, subjects, schedules, attendances,
  feePayments, expenses, donations, salaryPayments,
  settings as settingsTable, users, guardians,
  pushSubscriptions, notifications,
  teacherGroups,
} from '@/db/schemas/schema'
import { getSession, hashPassword } from '@/lib/auth'
import { eq, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'json'

  const [
    allStudents, allTeachers, allGroups, allGroupStudents,
    allRooms, allSubjects, allSchedules, allAttendances,
    allFees, allExpenses, allDonations, allSalaries, allSettings, allUsers,
    allTeacherGroups,
  ] = await Promise.all([
    db.select().from(students),
    db.select().from(teachers),
    db.select().from(groups),
    db.select().from(groupStudents),
    db.select().from(rooms),
    db.select().from(subjects),
    db.select().from(schedules),
    db.select().from(attendances),
    db.select().from(feePayments),
    db.select().from(expenses),
    db.select().from(donations),
    db.select().from(salaryPayments),
    db.select().from(settingsTable),
    db.select({ id: users.id, username: users.username, role: users.role, fullName: users.fullName, phone: users.phone, status: users.status, teacherId: users.teacherId }).from(users),
    db.select().from(teacherGroups),
  ])

  const backup = {
    meta: {
      version: '2.0',
      created_at: new Date().toISOString(),
      system: 'منصة الفردوس',
    },
    tables: {
      students: allStudents,
      teachers: allTeachers,
      groups: allGroups,
      group_students: allGroupStudents,
      teacher_groups: allTeacherGroups,
      rooms: allRooms,
      subjects: allSubjects,
      schedules: allSchedules,
      attendances: allAttendances,
      fee_payments: allFees,
      expenses: allExpenses,
      donations: allDonations,
      salary_payments: allSalaries,
      settings: allSettings,
      users: allUsers,
    },
    stats: {
      students: allStudents.length,
      teachers: allTeachers.length,
      groups: allGroups.length,
      attendances: allAttendances.length,
    },
  }

  const filename = `ferdous_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

// ── POST: Restore from backup JSON ───────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tables?: Record<string, unknown[]>; meta?: { version?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'ملف JSON غير صالح' }, { status: 400 })
  }

  const { tables } = body
  if (!tables || typeof tables !== 'object') {
    return NextResponse.json({ error: 'ملف النسخة الاحتياطية غير صالح — حقل tables مفقود' }, { status: 400 })
  }

  try {
    // ── 1. Clear existing data (preserve admin accounts) ─────
    await db.delete(salaryPayments)
    await db.delete(feePayments)
    await db.delete(expenses)
    await db.delete(donations)
    await db.delete(attendances)
    await db.delete(schedules)
    await db.delete(teacherGroups)
    await db.delete(groupStudents)
    await db.delete(groups)
    await db.delete(subjects)
    await db.delete(rooms)
    await db.delete(students)
    await db.delete(teachers)
    await db.delete(notifications)
    await db.delete(pushSubscriptions)
    await db.execute(sql`DELETE FROM users WHERE role IN ('guardian','teacher')`)
    await db.delete(guardians)

    const counts: Record<string, number> = {}

    // ── 2. Restore users (non-admin) ─────────────────────────
    if (Array.isArray(tables.users)) {
      const nonAdminUsers = (tables.users as Record<string, unknown>[]).filter(u => u.role !== 'admin')
      for (const u of nonAdminUsers) {
        try {
          await db.execute(sql`
            INSERT INTO users (id, username, password, role, full_name, phone, status, teacher_id, email, created_at)
            VALUES (
              ${u.id as number},
              ${u.username as string},
              ${(u.password as string) ?? await hashPassword(u.phone as string ?? 'password123')},
              ${u.role as string},
              ${(u.fullName as string) ?? null},
              ${(u.phone as string) ?? null},
              ${(u.status as string) ?? 'active'},
              ${(u.teacherId as number) ?? null},
              ${(u.email as string) ?? null},
              ${(u.createdAt as string) ?? new Date().toISOString()}
            )
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              role = EXCLUDED.role,
              full_name = EXCLUDED.full_name,
              phone = EXCLUDED.phone,
              status = EXCLUDED.status
          `)
        } catch { /* skip duplicates */ }
      }
      // Sync sequence
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1))`)
      counts.users = nonAdminUsers.length
    }

    // ── 3. Rooms ──────────────────────────────────────────────
    if (Array.isArray(tables.rooms) && tables.rooms.length > 0) {
      for (const r of tables.rooms as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO rooms (id, name, room_number, floor, capacity, status, equipment, created_at)
          VALUES (${r.id as number}, ${r.name as string}, ${(r.roomNumber as string) ?? null}, ${(r.floor as string) ?? null},
            ${(r.capacity as number) ?? null}, ${(r.status as string) ?? 'available'}, ${(r.equipment as string) ?? null},
            ${(r.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('rooms','id'), COALESCE((SELECT MAX(id) FROM rooms), 1))`)
      counts.rooms = tables.rooms.length
    }

    // ── 4. Subjects ───────────────────────────────────────────
    if (Array.isArray(tables.subjects) && tables.subjects.length > 0) {
      for (const s of tables.subjects as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO subjects (id, subject_code, name, description, weekly_sessions, created_at)
          VALUES (${s.id as number}, ${(s.subjectCode as string) ?? null}, ${s.name as string},
            ${(s.description as string) ?? null}, ${(s.weeklySessions as number) ?? 1},
            ${(s.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('subjects','id'), COALESCE((SELECT MAX(id) FROM subjects), 1))`)
      counts.subjects = tables.subjects.length
    }

    // ── 5. Groups ─────────────────────────────────────────────
    if (Array.isArray(tables.groups) && tables.groups.length > 0) {
      for (const g of tables.groups as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO groups (id, group_number, name, group_type, room_id, capacity, status, created_at)
          VALUES (${g.id as number}, ${(g.groupNumber as string) ?? null}, ${g.name as string},
            ${(g.groupType as string) ?? null}, ${(g.roomId as number) ?? null},
            ${(g.capacity as number) ?? null}, ${(g.status as string) ?? 'open'},
            ${(g.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('groups','id'), COALESCE((SELECT MAX(id) FROM groups), 1))`)
      counts.groups = tables.groups.length
    }

    // ── 6. Teachers ───────────────────────────────────────────
    if (Array.isArray(tables.teachers) && tables.teachers.length > 0) {
      for (const t of tables.teachers as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO teachers (id, teacher_number, full_name, qualification, phone, email, hire_date, base_salary, avatar, status, user_id, created_at)
          VALUES (${t.id as number}, ${(t.teacherNumber as string) ?? null}, ${t.fullName as string},
            ${(t.qualification as string) ?? null}, ${(t.phone as string) ?? null}, ${(t.email as string) ?? null},
            ${(t.hireDate as string) ?? null}, ${(t.baseSalary as string) ?? null},
            ${(t.avatar as string) ?? null}, ${(t.status as string) ?? 'active'},
            ${(t.userId as number) ?? null}, ${(t.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('teachers','id'), COALESCE((SELECT MAX(id) FROM teachers), 1))`)
      counts.teachers = tables.teachers.length
    }

    // ── 7. Students ───────────────────────────────────────────
    if (Array.isArray(tables.students) && tables.students.length > 0) {
      for (const s of tables.students as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO students (id, student_number, first_name, last_name, gender, birth_date, birth_place, address, phone,
            guardian_name, guardian_phone, guardian_user_id, guardian_id, avatar, educational_level, social_status,
            enrollment_date, withdrawal_date, status, notes, created_at)
          VALUES (
            ${s.id as number}, ${(s.studentNumber as string) ?? null}, ${s.firstName as string}, ${s.lastName as string},
            ${(s.gender as string) ?? null}, ${(s.birthDate as string) ?? null}, ${(s.birthPlace as string) ?? null},
            ${(s.address as string) ?? null}, ${(s.phone as string) ?? null}, ${(s.guardianName as string) ?? null},
            ${(s.guardianPhone as string) ?? null}, ${(s.guardianUserId as number) ?? null}, ${(s.guardianId as number) ?? null},
            ${(s.avatar as string) ?? null}, ${(s.educationalLevel as string) ?? null}, ${(s.socialStatus as string) ?? null},
            ${(s.enrollmentDate as string) ?? null}, ${(s.withdrawalDate as string) ?? null},
            ${(s.status as string) ?? 'waiting'}, ${(s.notes as string) ?? null},
            ${(s.createdAt as string) ?? new Date().toISOString()}
          )
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('students','id'), COALESCE((SELECT MAX(id) FROM students), 1))`)
      counts.students = tables.students.length
    }

    // ── 8. Group Students ─────────────────────────────────────
    if (Array.isArray(tables.group_students) && tables.group_students.length > 0) {
      for (const gs of tables.group_students as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO group_students (id, group_id, student_id, joined_date)
          VALUES (${gs.id as number}, ${gs.groupId as number}, ${gs.studentId as number}, ${(gs.joinedDate as string) ?? null})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('group_students','id'), COALESCE((SELECT MAX(id) FROM group_students), 1))`)
      counts.group_students = tables.group_students.length
    }

    // ── 9. Teacher Groups ─────────────────────────────────────
    if (Array.isArray(tables.teacher_groups) && tables.teacher_groups.length > 0) {
      for (const tg of tables.teacher_groups as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO teacher_groups (id, teacher_id, group_id, subject_id)
          VALUES (${tg.id as number}, ${tg.teacherId as number}, ${tg.groupId as number}, ${(tg.subjectId as number) ?? null})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('teacher_groups','id'), COALESCE((SELECT MAX(id) FROM teacher_groups), 1))`)
    }

    // ── 10. Schedules ─────────────────────────────────────────
    if (Array.isArray(tables.schedules) && tables.schedules.length > 0) {
      for (const s of tables.schedules as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO schedules (id, day_of_week, start_time, end_time, group_id, subject_id, teacher_id, room_id, created_at)
          VALUES (${s.id as number}, ${(s.dayOfWeek as string) ?? null}, ${(s.startTime as string) ?? null},
            ${(s.endTime as string) ?? null}, ${(s.groupId as number) ?? null}, ${(s.subjectId as number) ?? null},
            ${(s.teacherId as number) ?? null}, ${(s.roomId as number) ?? null},
            ${(s.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('schedules','id'), COALESCE((SELECT MAX(id) FROM schedules), 1))`)
      counts.schedules = tables.schedules.length
    }

    // ── 11. Attendances ───────────────────────────────────────
    if (Array.isArray(tables.attendances) && tables.attendances.length > 0) {
      for (const a of tables.attendances as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO attendances (id, schedule_id, student_id, attendance_date, status, notes, created_at)
          VALUES (${a.id as number}, ${(a.scheduleId as number) ?? null}, ${a.studentId as number},
            ${a.attendanceDate as string}, ${(a.status as string) ?? 'present'}, ${(a.notes as string) ?? null},
            ${(a.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('attendances','id'), COALESCE((SELECT MAX(id) FROM attendances), 1))`)
      counts.attendances = tables.attendances.length
    }

    // ── 12. Financial tables ──────────────────────────────────
    if (Array.isArray(tables.fee_payments) && tables.fee_payments.length > 0) {
      for (const f of tables.fee_payments as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO fee_payments (id, student_id, amount, payment_date, for_month, notes, created_at)
          VALUES (${f.id as number}, ${(f.studentId as number) ?? null}, ${(f.amount as string) ?? null},
            ${(f.paymentDate as string) ?? null}, ${(f.forMonth as string) ?? null}, ${(f.notes as string) ?? null},
            ${(f.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('fee_payments','id'), COALESCE((SELECT MAX(id) FROM fee_payments), 1))`)
      counts.fee_payments = tables.fee_payments.length
    }

    if (Array.isArray(tables.expenses) && tables.expenses.length > 0) {
      for (const e of tables.expenses as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO expenses (id, category, amount, expense_date, notes, created_at)
          VALUES (${e.id as number}, ${(e.category as string) ?? null}, ${(e.amount as string) ?? null},
            ${(e.expenseDate as string) ?? null}, ${(e.notes as string) ?? null},
            ${(e.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('expenses','id'), COALESCE((SELECT MAX(id) FROM expenses), 1))`)
      counts.expenses = tables.expenses.length
    }

    if (Array.isArray(tables.donations) && tables.donations.length > 0) {
      for (const d of tables.donations as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO donations (id, donor_name, amount, donation_date, notes, created_at)
          VALUES (${d.id as number}, ${(d.donorName as string) ?? null}, ${(d.amount as string) ?? null},
            ${(d.donationDate as string) ?? null}, ${(d.notes as string) ?? null},
            ${(d.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('donations','id'), COALESCE((SELECT MAX(id) FROM donations), 1))`)
      counts.donations = tables.donations.length
    }

    if (Array.isArray(tables.salary_payments) && tables.salary_payments.length > 0) {
      for (const s of tables.salary_payments as Record<string, unknown>[]) {
        await db.execute(sql`
          INSERT INTO salary_payments (id, teacher_id, for_month, base_salary, bonus, deduction, net_salary, payment_date, created_at)
          VALUES (${s.id as number}, ${(s.teacherId as number) ?? null}, ${(s.forMonth as string) ?? null},
            ${(s.baseSalary as string) ?? null}, ${(s.bonus as string) ?? '0'}, ${(s.deduction as string) ?? '0'},
            ${(s.netSalary as string) ?? null}, ${(s.paymentDate as string) ?? null},
            ${(s.createdAt as string) ?? new Date().toISOString()})
          ON CONFLICT (id) DO NOTHING
        `)
      }
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('salary_payments','id'), COALESCE((SELECT MAX(id) FROM salary_payments), 1))`)
      counts.salary_payments = tables.salary_payments.length
    }

    // ── 13. Settings (merge, don't overwrite system keys) ─────
    if (Array.isArray(tables.settings) && tables.settings.length > 0) {
      for (const s of tables.settings as Record<string, unknown>[]) {
        if (!s.key) continue
        await db.insert(settingsTable).values({ key: s.key as string, value: s.value as string ?? null })
          .onConflictDoUpdate({ target: settingsTable.key, set: { value: s.value as string ?? null } })
      }
      counts.settings = tables.settings.length
    }

    return NextResponse.json({
      success: true,
      message: 'تمت استعادة النسخة الاحتياطية بنجاح',
      counts,
    })
  } catch (err: unknown) {
    console.error('[Backup/Restore]', err)
    const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
    return NextResponse.json({ error: `فشلت الاستعادة: ${msg}` }, { status: 500 })
  }
}
