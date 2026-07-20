'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

type AbsenceRecord = {
  attendanceId: number
  status: string
  attendanceDate: string
  studentId: number
  studentFirstName: string
  studentLastName: string
  studentPhone: string | null
  guardianName: string | null
  startTime: string | null
  groupName: string | null
  subjectName: string | null
}

type ContactSettings = {
  countryCode: string
  msgAbsent: string
  msgLate: string
}

function formatPhone(phone: string | null | undefined, countryCode: string): string {
  if (!phone) return ''
  let p = phone.trim()
  if (p.startsWith('0')) p = p.slice(1)
  p = p.replace(/\s+/g, '')
  if (!p.startsWith('+')) {
    const cc = countryCode.replace('+', '')
    return cc + p
  }
  return p.replace('+', '')
}

function formatMessage(template: string, name: string, date: string, time?: string | null): string {
  return template
    .replace('{student_name}', name)
    .replace('{date}', date)
    .replace('{time}', time?.slice(0, 5) ?? '')
}

export default function ContactPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [settings, setSettings] = useState<ContactSettings>({
    countryCode: '+213',
    msgAbsent: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا للتوضيح.',
    msgLate: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.',
  })
  const [loading, setLoading] = useState(false)

  async function fetchAbsences() {
    setLoading(true)
    const res = await fetch(`/api/attendance/contact?date=${date}`)
    const data = await res.json()
    setAbsences(data.absences ?? [])
    if (data.settings) setSettings(data.settings)
    setLoading(false)
  }

  useEffect(() => { fetchAbsences() }, [date])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/attendance"
          className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          ← العودة لإدارة الحضور
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📞</span> الاتصال بأولياء الأمور
        </h1>
      </div>

      {/* Date selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر التاريخ</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <button onClick={fetchAbsences}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
            🔍 بحث
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div>
            <p className="text-yellow-800 font-bold">
              {absences.length === 0
                ? '✅ لا يوجد غياب أو تأخر في هذا اليوم'
                : `${absences.length} حالة غياب/تأخر في ${date}`}
            </p>
            {absences.length > 0 && (
              <p className="text-yellow-600 text-xs mt-0.5">
                غياب: {absences.filter(a => a.status === 'absent').length} |
                تأخر: {absences.filter(a => a.status === 'late').length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : absences.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">لا يوجد غياب أو تأخر مسجل في هذا اليوم</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-right text-gray-600">#</th>
                <th className="p-3 text-right text-gray-600">الطالب</th>
                <th className="p-3 text-right text-gray-600">الفوج / المادة</th>
                <th className="p-3 text-right text-gray-600">الحالة</th>
                <th className="p-3 text-right text-gray-600">الولي / الهاتف</th>
                <th className="p-3 text-right text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {absences.map((a, idx) => {
                const studentName = `${a.studentFirstName} ${a.studentLastName}`
                const targetPhone = a.studentPhone
                const formattedPhone = formatPhone(targetPhone, settings.countryCode)
                const msgTemplate = a.status === 'absent' ? settings.msgAbsent : settings.msgLate
                const message = formatMessage(msgTemplate, studentName, a.attendanceDate, a.startTime)
                const waLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : ''
                const smsLink = formattedPhone ? `sms:+${formattedPhone}?body=${encodeURIComponent(message)}` : ''
                const telLink = formattedPhone ? `tel:+${formattedPhone}` : ''

                return (
                  <tr key={a.attendanceId} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-gray-800">{studentName}</p>
                    </td>
                    <td className="p-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{a.groupName ?? '-'}</span>
                      <br />
                      <span className="text-xs text-gray-500 mt-0.5">
                        {a.subjectName ?? '-'} {a.startTime ? `(${a.startTime.slice(0,5)})` : ''}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === 'absent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-800'
                      }`}>
                        {a.status === 'absent' ? 'غائب' : 'متأخر'}
                      </span>
                    </td>
                    <td className="p-3">
                      {a.guardianName && (
                        <p className="text-gray-700 text-xs font-medium">{a.guardianName}</p>
                      )}
                      {targetPhone ? (
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {targetPhone}
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs">لا يوجد رقم</span>
                      )}
                    </td>
                    <td className="p-3">
                      {formattedPhone ? (
                        <div className="flex gap-1">
                          <a href={telLink}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                            title="اتصال">
                            📞
                          </a>
                          <a href={waLink} target="_blank" rel="noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                            title="واتساب">
                            💬 واتساب
                          </a>
                          <a href={smsLink}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1"
                            title="رسالة نصية">
                            ✉️ SMS
                          </a>
                        </div>
                      ) : (
                        <span className="bg-red-100 text-red-500 px-2 py-1 rounded text-xs">رقم غير متوفر</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
