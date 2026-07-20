'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), { ssr: false })

type StudentData = {
  student: {
    id: number
    studentNumber: string
    firstName: string
    lastName: string
    status: string
    educationalLevel: string | null
    enrollmentDate: string | null
  }
  groups: {
    groupId: number | null
    groupName: string | null
    groupNumber: string | null
    teacherId: number | null
    teacherName: string | null
    teacherPhone: string | null
  }[]
  weekStats: { present: number; absent: number; late: number; total: number }
  totalStats: { present: number; absent: number; total: number }
  teacherNotes: { date: string | null; status: string; note: string | null }[]
}

type Notification = {
  id: number
  title: string
  body: string
  createdAt: string
  isRead: boolean
}

const statusLabel: Record<string, string> = {
  active: 'نشط', waiting: 'في الانتظار', withdrawn: 'منسحب', graduated: 'متخرج',
}

const attendanceStatusLabel: Record<string, string> = {
  present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مبرر',
}

export default function GuardianDashboardPage() {
  const [data, setData] = useState<StudentData[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStudent, setActiveStudent] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/guardian/dashboard').then(r => r.json()),
      fetch('/api/notifications?forMe=1').then(r => r.json()),
    ]).then(([dashData, notifData]) => {
      setData(Array.isArray(dashData) ? dashData : [])
      setNotifications(Array.isArray(notifData) ? notifData : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center text-gray-400">
          <p className="text-3xl mb-3">⏳</p>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center text-gray-400">
          <p className="text-4xl mb-3">👪</p>
          <p className="font-medium">لا يوجد أبناء مرتبطون بحسابك حالياً</p>
          <p className="text-sm mt-1">يرجى التواصل مع إدارة المدرسة</p>
        </div>
      </div>
    )
  }

  const current = data[activeStudent]
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount} إشعار جديد</span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>👪</span> لوحة تحكم ولي الأمر
        </h1>
      </div>

      {/* Push Notification Enable — prominent banner */}
      <div className="mb-5 bg-gradient-to-l from-green-700 to-green-800 rounded-2xl p-4 shadow-sm">
        <p className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
          🔔 فعّل إشعارات المتصفح لتصلك تنبيهات غياب ابنك/ابنتك فوراً
        </p>
        <PushEnableButton />
      </div>

      {/* Student tabs if multiple */}
      {data.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {data.map((d, i) => (
            <button
              key={d.student.id}
              onClick={() => setActiveStudent(i)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeStudent === i ? 'bg-green-700 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              {d.student.firstName} {d.student.lastName}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column: student info + groups */}
          <div className="lg:col-span-1 space-y-4">
            {/* Student card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">👨‍🎓</div>
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">{current.student.firstName} {current.student.lastName}</h2>
                  <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{current.student.studentNumber}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">الحالة</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${current.student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {statusLabel[current.student.status] ?? current.student.status}
                  </span>
                </div>
                {current.student.educationalLevel && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">المستوى الدراسي</span>
                    <span className="text-gray-700">{current.student.educationalLevel}</span>
                  </div>
                )}
                {current.student.enrollmentDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">تاريخ التسجيل</span>
                    <span className="text-gray-700">{current.student.enrollmentDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Group / Teacher info */}
            {current.groups.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📚</span> الفوج والمعلم
                </h3>
                {current.groups.filter(g => g.groupName).map((g, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 mb-2 last:mb-0">
                    <p className="font-medium text-gray-800">{g.groupName}</p>
                    {g.groupNumber && <p className="text-xs text-gray-500 font-mono">{g.groupNumber}</p>}
                    {g.teacherName && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <span>👨‍🏫</span> {g.teacherName}
                        </p>
                        {g.teacherPhone && (
                          <a
                            href={`tel:${g.teacherPhone}`}
                            className="mt-1 flex items-center gap-1 text-green-700 hover:text-green-800 text-sm"
                          >
                            <span>📞</span> {g.teacherPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right columns: stats + notes + notifications */}
          <div className="lg:col-span-2 space-y-4">
            {/* This week stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span>📅</span> إحصائيات هذا الأسبوع
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <p className="text-3xl font-bold text-green-700">{current.weekStats.present}</p>
                  <p className="text-sm text-green-600 mt-1">✅ حاضر</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                  <p className="text-3xl font-bold text-red-600">{current.weekStats.absent}</p>
                  <p className="text-sm text-red-500 mt-1">❌ غائب</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
                  <p className="text-3xl font-bold text-yellow-600">{current.weekStats.late}</p>
                  <p className="text-sm text-yellow-600 mt-1">⏰ متأخر</p>
                </div>
              </div>
            </div>

            {/* Total stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span>📊</span> الإجمالي العام
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✅</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{current.totalStats.present}</p>
                    <p className="text-sm text-gray-500">إجمالي الحضور</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">❌</div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{current.totalStats.absent}</p>
                    <p className="text-sm text-gray-500">إجمالي الغياب</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher notes */}
            {current.teacherNotes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📝</span> ملاحظات المعلمين
                </h3>
                <div className="space-y-2">
                  {current.teacherNotes.map((note, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className={`text-sm px-2 py-0.5 rounded-full ${note.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {attendanceStatusLabel[note.status] ?? note.status}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{note.note}</p>
                        <p className="text-xs text-gray-400 mt-1">{note.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🔔</span> الإشعارات
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${n.isRead ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                        <div>
                          <p className={`text-sm font-medium ${n.isRead ? 'text-gray-700' : 'text-blue-800'}`}>{n.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
