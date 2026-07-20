import { db } from '@/db'
import { students, teachers, groups, groupStudents, attendances, notifications } from '@/db/schemas/schema'
import { eq, count, sql, desc, or } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

async function getDashboardData(sessionId?: number, sessionRole?: string) {
  const [totalStudents] = await db.select({ count: count() }).from(students)
  const [activeStudents] = await db.select({ count: count() }).from(students).where(eq(students.status, 'active'))
  const [withdrawnStudents] = await db.select({ count: count() }).from(students).where(eq(students.status, 'withdrawn'))
  const [waitingStudents] = await db.select({ count: count() }).from(students).where(eq(students.status, 'waiting'))
  const [totalTeachers] = await db.select({ count: count() }).from(teachers)
  const [totalGroups] = await db.select({ count: count() }).from(groups)
  const [openGroups] = await db.select({ count: count() }).from(groups).where(eq(groups.status, 'open'))
  const groupsWithStudents = await db.selectDistinct({ groupId: groupStudents.groupId }).from(groupStudents)

  // Today attendance
  const today = new Date().toISOString().split('T')[0]
  const [todayPresent] = await db.select({ count: count() }).from(attendances)
    .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'present'`)
  const [todayAbsent] = await db.select({ count: count() }).from(attendances)
    .where(sql`${attendances.attendanceDate} = ${today} AND ${attendances.status} = 'absent'`)

  // Recent notifications — for teacher: only sent by them or targeted to them
  let recentNotifs
  if (sessionRole === 'teacher' && sessionId) {
    const all = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(20)
    recentNotifs = all.filter(n => {
      if (n.senderId === sessionId) return true
      if (n.targetType === 'all') return true
      if (n.targetType === 'teachers') return true
      if (n.targetType === 'specific') {
        try { return (JSON.parse(n.targetIds ?? '[]') as number[]).includes(sessionId) } catch { return false }
      }
      return false
    }).slice(0, 3)
  } else {
    recentNotifs = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(3)
  }

  return {
    students: {
      total: Number(totalStudents.count),
      active: Number(activeStudents.count),
      withdrawn: Number(withdrawnStudents.count),
      waiting: Number(waitingStudents.count),
    },
    teachers: { total: Number(totalTeachers.count) },
    groups: {
      total: Number(totalGroups.count),
      open: Number(openGroups.count),
      withStudents: groupsWithStudents.length,
      empty: Number(totalGroups.count) - groupsWithStudents.length,
    },
    today: {
      present: Number(todayPresent.count),
      absent: Number(todayAbsent.count),
      date: today,
    },
    recentNotifs,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData(session?.id, session?.role)
  const todayLabel = new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const isAdmin = session?.role === 'admin'

  const statCards = [
    {
      title: 'الطلاب النشطون',
      value: data.students.active,
      total: `من أصل ${data.students.total}`,
      icon: '👨‍🎓',
      color: '#1a5c35',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      href: '/students',
    },
    {
      title: 'حضور اليوم',
      value: data.today.present,
      total: data.today.absent > 0 ? `${data.today.absent} غائب` : 'لا غياب ✅',
      icon: '📋',
      color: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
      href: '/attendance',
    },
    {
      title: 'الأفواج المفتوحة',
      value: data.groups.open,
      total: `من أصل ${data.groups.total} فوج`,
      icon: '📚',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      href: '/groups',
    },
    {
      title: 'المعلمون',
      value: data.teachers.total,
      total: 'معلم نشط',
      icon: '👨‍🏫',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
      href: isAdmin ? '/teachers' : '/schedules',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 hidden sm:block">{todayLabel}</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            أهلاً، {session?.fullName?.split(' ')[0] ?? 'مستخدم'} 👋
          </h1>
          <p className="text-base text-gray-500">
            {session?.role === 'admin' ? 'مدير النظام' : 'معلم'}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map(card => (
          <Link key={card.href} href={card.href}
            className="rounded-2xl border p-4 flex flex-col gap-2 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            style={{ background: card.bg, borderColor: card.border }}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ background: card.color }}>
                {card.title}
              </span>
            </div>
            <div>
              <p className="text-4xl font-bold" style={{ color: card.color }}>{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.total}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Today attendance quick view */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <Link href="/attendance" className="text-xs text-green-700 font-medium hover:underline">تسجيل الحضور ←</Link>
          <h2 className="font-bold text-gray-700 flex items-center gap-2 text-base">
            <span>📅</span> حضور اليوم
          </h2>
        </div>
        {data.today.present === 0 && data.today.absent === 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-yellow-800">لم يُسجَّل حضور اليوم بعد</p>
              <p className="text-xs text-yellow-600">اضغط على "تسجيل الحضور" للبدء</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <span className="text-3xl font-bold text-green-700">{data.today.present}</span>
              <div>
                <p className="text-base font-semibold text-green-700">✅ حاضر</p>
                <p className="text-sm text-green-600">طالب حضر اليوم</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
              <span className="text-3xl font-bold text-red-600">{data.today.absent}</span>
              <div>
                <p className="text-base font-semibold text-red-600">❌ غائب</p>
                <p className="text-sm text-red-500">
                  {data.today.absent > 0 ? 'تم إرسال إشعارات الأولياء' : 'لا غياب اليوم'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Students status breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2"><span>📊</span> توزيع حالات الطلاب</h2>
          <div className="space-y-3">
            {[
              { label: 'نشط',         value: data.students.active,    color: '#16a34a', bg: '#dcfce7', pct: data.students.total ? Math.round(data.students.active / data.students.total * 100) : 0 },
              { label: 'في الانتظار', value: data.students.waiting,   color: '#d97706', bg: '#fef9c3', pct: data.students.total ? Math.round(data.students.waiting / data.students.total * 100) : 0 },
              { label: 'منسحب',       value: data.students.withdrawn, color: '#dc2626', bg: '#fee2e2', pct: data.students.total ? Math.round(data.students.withdrawn / data.students.total * 100) : 0 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.value} ({item.pct}٪)</span>
                </div>
                <div className="w-full rounded-full h-2.5" style={{ background: item.bg }}>
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2"><span>⚡</span> إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/attendance',      icon: '📋', label: 'تسجيل الحضور',    color: '#1a5c35' },
              { href: '/auto-attendance', icon: '📷', label: 'تحضير QR',         color: '#1d4ed8' },
              { href: '/groups',          icon: '📚', label: 'الأفواج',           color: '#7c3aed' },
              { href: '/notifications',   icon: '🔔', label: 'الإشعارات',         color: '#b45309' },
              ...(isAdmin ? [
                { href: '/students',      icon: '👨‍🎓', label: 'إضافة طالب',     color: '#0891b2' },
                { href: '/reports',       icon: '📊', label: 'التقارير',          color: '#6b7280' },
              ] : []),
            ].map(action => (
              <Link key={action.href} href={action.href}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all active:scale-95"
                style={{ background: '#fafafa' }}>
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      {data.recentNotifs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <Link href="/notifications" className="text-sm text-green-700 font-medium hover:underline">عرض الكل ←</Link>
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2"><span>🔔</span> آخر الإشعارات</h2>
          </div>
          <div className="space-y-2">
            {data.recentNotifs.map(n => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-lg flex-shrink-0">🔔</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                  <p className="text-sm text-gray-500 truncate">{n.body}</p>
                </div>
                <p className="text-sm text-gray-400 flex-shrink-0">
                  {new Date(n.createdAt!).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
