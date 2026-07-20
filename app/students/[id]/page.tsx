import { db } from '@/db'
import { students, groupStudents, groups } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [student] = await db.select().from(students).where(eq(students.id, parseInt(id))).limit(1)
  if (!student) notFound()

  // Get groups
  const studentGroups = await db
    .select({ group: groups })
    .from(groupStudents)
    .leftJoin(groups, eq(groupStudents.groupId, groups.id))
    .where(eq(groupStudents.studentId, student.id))

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'نشط', color: 'bg-green-500 text-white' },
    waiting: { label: 'في الانتظار', color: 'bg-yellow-400 text-gray-800' },
    withdrawn: { label: 'منسحب', color: 'bg-red-500 text-white' },
    graduated: { label: 'متخرج', color: 'bg-blue-500 text-white' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/students" className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            رجوع → قائمة الطلاب
          </Link>
          <Link href={`/students/${id}/print`} target="_blank"
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            🖨️ طباعة الملف
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">ملف الطالب</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {student.firstName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
              <span className="bg-gray-700 text-white px-3 py-1 rounded text-sm font-mono">{student.studentNumber}</span>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[student.status]?.color ?? 'bg-gray-200'}`}>
                  {statusConfig[student.status]?.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">الجنس</p>
              <p className="text-gray-800">{student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">تاريخ الميلاد</p>
              <p className="text-gray-800">{student.birthDate ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">رقم الهاتف</p>
              <p className="text-gray-800 font-mono">{student.phone ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">اسم الولي</p>
              <p className="text-gray-800">{student.guardianName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">المستوى الدراسي</p>
              <p className="text-gray-800">{student.educationalLevel ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase mb-1">تاريخ التسجيل</p>
              <p className="text-gray-800">{student.enrollmentDate ?? '-'}</p>
            </div>
          </div>

          {student.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">ملاحظات</p>
              <p className="text-gray-700 text-sm">{student.notes}</p>
            </div>
          )}
        </div>

        {/* Groups */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-700 mb-4">الأفواج المرتبطة</h3>
          {studentGroups.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">لم يتم إدراجه في فوج بعد</p>
          ) : (
            <div className="space-y-2">
              {studentGroups.map(sg => sg.group && (
                <div key={sg.group.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-medium text-gray-800">{sg.group.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{sg.group.groupNumber}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
