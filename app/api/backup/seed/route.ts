import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  students, teachers, groups, groupStudents,
  rooms, subjects, schedules, attendances,
  feePayments, expenses, donations, salaryPayments,
  teacherGroups, users, guardians,
} from '@/db/schemas/schema'
import { getSession, hashPassword } from '@/lib/auth'
import { sql } from 'drizzle-orm'

// ── Arabic first/last names for demo
const firstNamesMale   = ['أحمد','محمد','يوسف','عمر','إبراهيم','عبدالرحمن','خالد','علي','سامي','بلال','أنس','زياد','هشام','ياسين','عمار','رياض','نور الدين','عبد الله','إدريس','حمزة']
const firstNamesFemale = ['فاطمة','مريم','خديجة','عائشة','زينب','نور','سارة','هاجر','رقية','أسماء','سلمى','أميرة','ريم','لمياء','نادية','إيمان','حفصة','منال','وفاء','شيماء']
const lastNames        = ['بن علي','العمري','الزهراني','بوعزيزي','بلقاسم','حداد','صالح','بن يوسف','الأمين','برهان','بن موسى','عثمان','كريم','بلال','الشريف','منصور','قاسم','حسن','بن عمر','لعموري']
const cities           = ['الجزائر','وهران','قسنطينة','عنابة','باتنة','سطيف','تلمسان','بجاية','تيزي وزو','بسكرة']
const levels           = ['المستوى الأول','المستوى الثاني','المستوى الثالث','حفظ القرآن الكريم','التجويد']
const dayOfWeeks       = ['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء']
const subjectNames     = ['تحفيظ القرآن الكريم','التجويد والترتيل','الفقه الإسلامي','السيرة النبوية','العقيدة الإسلامية']
const roomNames        = ['القاعة الكبرى','القاعة الخضراء','قاعة التحفيظ','قاعة النور','قاعة الرحمة']

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randDate(from: Date, to: Date): string {
  const t = from.getTime() + Math.random() * (to.getTime() - from.getTime())
  return new Date(t).toISOString().split('T')[0]
}
function phone(): string { return `05${randInt(10,99)}${randInt(100000,999999)}` }

// DELETE all data except admin users and settings
async function clearAll() {
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
  // Remove guardian users (keep admin users)
  await db.execute(sql`DELETE FROM users WHERE role = 'guardian'`)
  await db.execute(sql`DELETE FROM users WHERE role = 'teacher'`)
  await db.delete(guardians)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  // ── CLEAR ALL ──
  if (action === 'clear') {
    await clearAll()
    return NextResponse.json({ success: true, message: 'تم مسح جميع البيانات بنجاح' })
  }

  // ── SEED DEMO ──
  if (action === 'seed') {
    await clearAll()

    // 1. Rooms (5)
    const roomRows = await Promise.all(roomNames.map((name, i) =>
      db.insert(rooms).values({
        name,
        roomNumber: `R${String(i + 1).padStart(2, '0')}`,
        floor: i < 3 ? 'الطابق الأرضي' : 'الطابق الأول',
        capacity: [30, 25, 20, 35, 28][i],
        status: 'available',
      }).returning().then(r => r[0])
    ))

    // 2. Subjects (5)
    const subjectRows = await Promise.all(subjectNames.map((name, i) =>
      db.insert(subjects).values({
        subjectCode: `SBJ${String(i + 1).padStart(2, '0')}`,
        name,
        weeklySessions: randInt(2, 4),
      }).returning().then(r => r[0])
    ))

    // 3. Groups (6)
    const groupDefs = [
      { name: 'فوج الفردوس الأول',  type: 'تحفيظ' },
      { name: 'فوج الفردوس الثاني', type: 'تحفيظ' },
      { name: 'فوج النور',          type: 'تجويد' },
      { name: 'فوج الرحمة',        type: 'تجويد' },
      { name: 'فوج الإتقان',       type: 'تحفيظ' },
      { name: 'فوج البيان',        type: 'مختلط' },
    ]
    const groupRows = await Promise.all(groupDefs.map((g, i) =>
      db.insert(groups).values({
        groupNumber: `GRP${String(i + 1).padStart(2, '0')}`,
        name: g.name,
        groupType: g.type,
        roomId: roomRows[i % roomRows.length]?.id ?? null,
        capacity: randInt(20, 35),
        status: 'open',
      }).returning().then(r => r[0])
    ))

    // 4. Teachers (6) + their user accounts
    const teacherDefs = [
      { first: 'عبد الله', last: 'بوزيدي' },
      { first: 'محمد الأمين', last: 'حداد' },
      { first: 'يحيى', last: 'صالح' },
      { first: 'كريم', last: 'بن علي' },
      { first: 'رشيد', last: 'العمري' },
      { first: 'نور الدين', last: 'منصور' },
    ]
    const teacherRows: typeof teachers.$inferSelect[] = []
    for (let i = 0; i < teacherDefs.length; i++) {
      const t = teacherDefs[i]
      const teacherPhone = phone()
      const username = `teacher${String(i + 1).padStart(2, '0')}`
      const hashed = await hashPassword('teacher123')
      const [userRow] = await db.insert(users).values({
        username,
        password: hashed,
        fullName: `${t.first} ${t.last}`,
        role: 'teacher',
        phone: teacherPhone,
        status: 'active',
      }).returning()

      const [teacherRow] = await db.insert(teachers).values({
        teacherNumber: `TCH${String(i + 1).padStart(2, '0')}`,
        fullName: `${t.first} ${t.last}`,
        qualification: 'حافظ للقرآن الكريم',
        phone: teacherPhone,
        hireDate: randDate(new Date('2020-01-01'), new Date('2023-06-01')),
        baseSalary: String(randInt(25000, 45000)),
        status: 'active',
        userId: userRow.id,
      }).returning()

      // Update teacher userId link
      await db.execute(sql`UPDATE teachers SET user_id = ${userRow.id} WHERE id = ${teacherRow.id}`)
      // Update user teacherId link
      await db.execute(sql`UPDATE users SET teacher_id = ${teacherRow.id} WHERE id = ${userRow.id}`)

      teacherRows.push(teacherRow)
    }

    // 5. Teacher-Group assignments
    for (let i = 0; i < groupRows.length; i++) {
      const grp = groupRows[i]
      const tchr = teacherRows[i % teacherRows.length]
      const subj = subjectRows[i % subjectRows.length]
      if (!grp || !tchr || !subj) continue
      await db.insert(teacherGroups).values({
        teacherId: tchr.id,
        groupId: grp.id,
        subjectId: subj.id,
      })
    }

    // 6. Schedules (2–3 per group)
    const timeSlots = [
      { start: '08:00', end: '09:30' },
      { start: '10:00', end: '11:30' },
      { start: '14:00', end: '15:30' },
    ]
    const scheduleRows: typeof schedules.$inferSelect[] = []
    for (const grp of groupRows) {
      if (!grp) continue
      const teacher = teacherRows[groupRows.indexOf(grp) % teacherRows.length]
      const subject = subjectRows[groupRows.indexOf(grp) % subjectRows.length]
      if (!teacher || !subject) continue
      for (let d = 0; d < 2; d++) {
        const ts = timeSlots[d % timeSlots.length]
        const [sched] = await db.insert(schedules).values({
          dayOfWeek: dayOfWeeks[d],
          startTime: ts.start,
          endTime: ts.end,
          groupId: grp.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          roomId: grp.roomId ?? null,
        }).returning()
        scheduleRows.push(sched)
      }
    }

    // 7. Students (40) with guardian accounts
    const studentRows: typeof students.$inferSelect[] = []
    for (let i = 0; i < 40; i++) {
      const isMale = Math.random() > 0.4
      const firstName = isMale ? rand(firstNamesMale) : rand(firstNamesFemale)
      const lastName = rand(lastNames)
      const guardianPhone = phone()
      const guardianName = `ولي أمر ${firstName} ${lastName}`

      // Create guardian user
      const guardianUsername = guardianPhone
      const hashedPwd = await hashPassword(guardianPhone)
      const [guardianUser] = await db.insert(users).values({
        username: guardianUsername,
        password: hashedPwd,
        fullName: guardianName,
        role: 'guardian',
        phone: guardianPhone,
        status: 'active',
      }).returning()

      const [student] = await db.insert(students).values({
        studentNumber: `FD${String(i + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        gender: isMale ? 'male' : 'female',
        birthDate: randDate(new Date('2005-01-01'), new Date('2015-12-31')),
        birthPlace: rand(cities),
        address: `حي ${rand(['النصر','الوفاء','السلام','الأمل','الفردوس'])} - ${rand(cities)}`,
        phone: phone(),
        guardianName,
        guardianPhone,
        guardianUserId: guardianUser.id,
        educationalLevel: rand(levels),
        enrollmentDate: randDate(new Date('2022-09-01'), new Date('2024-03-01')),
        status: i < 35 ? 'active' : (i < 38 ? 'waiting' : 'withdrawn'),
        notes: i % 5 === 0 ? 'طالب متميز في الحفظ' : null,
      }).returning()

      studentRows.push(student)
    }

    // 8. Assign students to groups (6–8 per group)
    for (let i = 0; i < studentRows.length; i++) {
      const student = studentRows[i]
      const group = groupRows[i % groupRows.length]
      if (!student || !group) continue
      await db.insert(groupStudents).values({
        studentId: student.id,
        groupId: group.id,
        joinedDate: randDate(new Date('2022-09-01'), new Date('2023-09-01')),
      })
    }

    // 9. Attendance records (last 30 days for all active students)
    const today = new Date()
    for (let day = 29; day >= 0; day--) {
      const d = new Date(today)
      d.setDate(today.getDate() - day)
      const dateStr = d.toISOString().split('T')[0]
      const dow = d.getDay()
      if (dow === 5 || dow === 6) continue // skip Friday & Saturday

      for (const student of studentRows.slice(0, 35)) { // active students only
        const rand100 = Math.random() * 100
        const status = rand100 < 80 ? 'present' : rand100 < 90 ? 'absent' : rand100 < 95 ? 'late' : 'excused'
        const sched = scheduleRows.find(s => s.groupId === groupRows[studentRows.indexOf(student) % groupRows.length]?.id)
        await db.insert(attendances).values({
          studentId: student.id,
          attendanceDate: dateStr,
          status: status as 'present' | 'absent' | 'late' | 'excused',
          scheduleId: sched?.id ?? null,
          notes: status === 'absent' ? rand(['مرض','ظروف عائلية','غياب غير مبرر', null, null]) : null,
        }).catch(() => {}) // ignore duplicates
      }
    }

    // 10. Fee payments
    const months = ['2024-09','2024-10','2024-11','2024-12','2025-01','2025-02']
    for (const student of studentRows.slice(0, 35)) {
      for (const month of months) {
        if (Math.random() > 0.25) {
          await db.insert(feePayments).values({
            studentId: student.id,
            amount: String(randInt(500, 2000)),
            paymentDate: `${month}-${String(randInt(1, 28)).padStart(2, '0')}`,
            forMonth: month,
            notes: null,
          }).catch(() => {})
        }
      }
    }

    // 11. Salary payments
    for (const teacher of teacherRows) {
      for (const month of months) {
        await db.insert(salaryPayments).values({
          teacherId: teacher.id,
          forMonth: month,
          baseSalary: teacher.baseSalary ?? '30000',
          bonus: String(randInt(0, 5000)),
          deduction: String(randInt(0, 2000)),
          netSalary: String(randInt(28000, 50000)),
          paymentDate: `${month}-25`,
        }).catch(() => {})
      }
    }

    // 12. Expenses & Donations
    const expenseCategories = ['صيانة','أدوات تعليمية','كهرباء وماء','تنظيف','متفرقات']
    for (let i = 0; i < 15; i++) {
      await db.insert(expenses).values({
        category: rand(expenseCategories),
        amount: String(randInt(500, 8000)),
        expenseDate: randDate(new Date('2024-09-01'), today),
        notes: null,
      })
    }
    const donorNames = ['الحاج بوعلام','عائلة بن يوسف','مؤسسة النور','أنصار القرآن','متبرع مجهول']
    for (let i = 0; i < 8; i++) {
      await db.insert(donations).values({
        donorName: rand(donorNames),
        amount: String(randInt(5000, 50000)),
        donationDate: randDate(new Date('2024-01-01'), today),
        notes: null,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'تم استيراد البيانات التجريبية بنجاح',
      counts: {
        students: studentRows.length,
        teachers: teacherRows.length,
        groups: groupRows.length,
        rooms: roomRows.length,
        subjects: subjectRows.length,
        schedules: scheduleRows.length,
      },
    })
  }

  return NextResponse.json({ error: 'action غير معروف' }, { status: 400 })
}
