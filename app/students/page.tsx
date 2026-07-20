'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Student = {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: string | null
  status: string
  enrollmentDate: string | null
  phone: string | null
  guardianName: string | null
  guardianPhone: string | null
  educationalLevel: string | null
  address: string | null
  createdAt: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'نشط', color: 'bg-green-500 text-white' },
  waiting: { label: 'في الانتظار (غير مفوج)', color: 'bg-yellow-400 text-gray-800' },
  withdrawn: { label: 'منسحب', color: 'bg-red-500 text-white' },
  graduated: { label: 'متخرج', color: 'bg-blue-500 text-white' },
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: '', birthDate: '', phone: '',
    guardianName: '', guardianPhone: '', educationalLevel: '', enrollmentDate: '', status: 'waiting', address: '', notes: '',
  })

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (genderFilter) params.set('gender', genderFilter)
    const res = await fetch(`/api/students?${params}`)
    const data = await res.json()
    setStudents(data)
    setLoading(false)
  }, [search, statusFilter, genderFilter])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  function openAdd() {
    setEditStudent(null)
    setForm({ firstName: '', lastName: '', gender: '', birthDate: '', phone: '', guardianName: '', guardianPhone: '', educationalLevel: '', enrollmentDate: '', status: 'waiting', address: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(s: Student) {
    setEditStudent(s)
    setForm({
      firstName: s.firstName, lastName: s.lastName, gender: s.gender ?? '',
      birthDate: s.birthDate ?? '',
      phone: s.phone ?? '', guardianName: s.guardianName ?? '',
      guardianPhone: s.guardianPhone ?? '',
      educationalLevel: s.educationalLevel ?? '',
      enrollmentDate: s.enrollmentDate ?? '', status: s.status,
      address: s.address ?? '', notes: '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editStudent ? `/api/students/${editStudent.id}` : '/api/students'
    const method = editStudent ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editStudent ? 'تم تحديث بيانات الطالب' : 'تم إضافة الطالب بنجاح')
      setShowModal(false)
      fetchStudents()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleExport() {
    toast.info('جاري تحضير ملف التصدير...')
    const res = await fetch('/api/students/export')
    if (!res.ok) { toast.error('فشل التصدير'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير البيانات بنجاح')
  }

  async function handleDownloadTemplate() {
    const res = await fetch('/api/students/import')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'students_template.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/students/import', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.success) {
      toast.success(data.message)
      if (data.errors?.length > 0) {
        data.errors.forEach((err: string) => toast.warning(err))
      }
      fetchStudents()
    } else {
      toast.error(data.error ?? 'فشل الاستيراد')
    }
    setImporting(false)
    if (importRef.current) importRef.current.value = ''
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('تم حذف الطالب')
      fetchStudents()
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <span>+</span> إضافة طالب
          </button>
          <div className="relative group">
            <button
              disabled={importing}
              onClick={() => importRef.current?.click()}
              className="border border-green-600 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              📥 {importing ? 'جاري الاستيراد...' : 'استيراد من إكسيل'}
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="absolute top-full right-0 mt-1 hidden group-hover:flex bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-1.5 text-xs text-blue-600 whitespace-nowrap z-10 items-center gap-1 hover:bg-blue-50"
            >
              ⬇️ تحميل قالب الاستيراد
            </button>
          </div>
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={handleExport}
            className="border border-blue-600 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            📤 تصدير إلى إكسيل
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>👨‍🎓</span> الطلاب
        </h1>
      </div>

      {/* Total count */}
      <div className="flex justify-end mb-3">
        <span className="bg-gray-700 text-white px-4 py-1 rounded-full text-sm flex items-center gap-2">
          <span>👥</span> إجمالي الطلاب: {students.length}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم أو رقم الطالب ..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-9 text-right text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none"
          >
            <option value="">الجنس - الكل</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none"
          >
            <option value="">الحالة - الكل</option>
            <option value="active">نشط</option>
            <option value="waiting">في الانتظار</option>
            <option value="withdrawn">منسحب</option>
            <option value="graduated">متخرج</option>
          </select>
        </div>
        <button onClick={fetchStudents} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
          ▼ تصفية
        </button>
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap gap-3 items-center">
        <span className="text-gray-600 text-sm font-medium flex items-center gap-1">ℹ️ دليل الحالات:</span>
        {Object.entries(statusConfig).map(([key, val]) => (
          <span key={key} className={`px-3 py-1 rounded-full text-xs font-medium ${val.color}`}>{val.label}</span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-right text-gray-600">رقم التسجيل</th>
                <th className="p-3 text-right text-gray-600">اسم الطالب</th>
                <th className="p-3 text-right text-gray-600">الجنس</th>
                <th className="p-3 text-right text-gray-600">المستوى الدراسي</th>
                <th className="p-3 text-right text-gray-600">الحالة</th>
                <th className="p-3 text-right text-gray-600">تاريخ التسجيل</th>
                <th className="p-3 text-right text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3">
                    <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono">{s.studentNumber}</span>
                  </td>
                  <td className="p-3 font-medium text-gray-800">{s.firstName} {s.lastName}</td>
                  <td className="p-3 text-gray-600">{s.gender === 'male' ? 'ذكر' : s.gender === 'female' ? 'أنثى' : '-'}</td>
                  <td className="p-3 text-gray-600">{s.educationalLevel || '-'}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[s.status]?.color ?? 'bg-gray-200 text-gray-700'}`}>
                      {statusConfig[s.status]?.label ?? s.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{s.enrollmentDate ?? '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(s.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(s)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs">✏️</button>
                      <Link href={`/students/${s.id}`} className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded text-xs">👁️</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && students.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا يوجد طلاب</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">{editStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الإسم *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللقب *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسجيل</label>
                  <input type="date" value={form.enrollmentDate} onChange={e => setForm(f => ({ ...f, enrollmentDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الولي</label>
                  <input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                    placeholder="اسم ولي أمر الطالب"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">هاتف الولي</label>
                  <input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                    placeholder="0612345678"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none font-mono" />
                  <p className="text-xs text-gray-400 mt-1">سيُنشأ حساب ولي الأمر تلقائياً</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المستوى الدراسي</label>
                <input value={form.educationalLevel} onChange={e => setForm(f => ({ ...f, educationalLevel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              {editStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="waiting">في الانتظار</option>
                    <option value="active">نشط</option>
                    <option value="withdrawn">منسحب</option>
                    <option value="graduated">متخرج</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="المدينة، الحي، الشارع..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">
                  💾 حفظ
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
