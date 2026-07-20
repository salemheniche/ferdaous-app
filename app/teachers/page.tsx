'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type Teacher = {
  id: number; teacherNumber: string; fullName: string
  qualification: string | null; phone: string | null; email: string | null
  hireDate: string | null; baseSalary: string | null; status: string; userId: number | null
}
type Group = { id: number; name: string; groupNumber: string }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [teacherGroups, setTeacherGroups] = useState<number[]>([])
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState({
    fullName: '', qualification: '', phone: '', email: '',
    hireDate: '', baseSalary: '', status: 'active',
    createAccount: false, password: '',
  })

  async function fetchTeachers() {
    setLoading(true)
    const res = await fetch('/api/teachers')
    const data = await res.json()
    setTeachers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTeachers()
    fetch('/api/groups').then(r => r.json()).then(setAllGroups)
  }, [])

  async function openGroupAssign(t: Teacher) {
    setSelectedTeacher(t)
    const res = await fetch(`/api/teachers/${t.id}/groups`)
    const data = await res.json()
    setTeacherGroups((data as Group[]).map(g => g.id))
    setShowGroupModal(true)
  }

  async function saveGroupAssign() {
    if (!selectedTeacher) return
    const res = await fetch(`/api/teachers/${selectedTeacher.id}/groups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds: teacherGroups }),
    })
    if (res.ok) {
      toast.success(`تم تحديث أفواج ${selectedTeacher.fullName}`)
      setShowGroupModal(false)
    }
  }

  function openAdd() {
    setEditTeacher(null)
    setForm({ fullName: '', qualification: '', phone: '', email: '', hireDate: '', baseSalary: '', status: 'active', createAccount: false, password: '' })
    setShowModal(true)
  }

  function openEdit(t: Teacher) {
    setEditTeacher(t)
    setForm({
      fullName: t.fullName, qualification: t.qualification ?? '', phone: t.phone ?? '',
      email: t.email ?? '', hireDate: t.hireDate ?? '', baseSalary: t.baseSalary ?? '',
      status: t.status, createAccount: false, password: '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editTeacher ? `/api/teachers/${editTeacher.id}` : '/api/teachers'
    const method = editTeacher ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editTeacher ? 'تم تحديث بيانات المعلم' : 'تم إضافة المعلم')
      setShowModal(false)
      fetchTeachers()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟')) return
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchTeachers() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          + إضافة معلم
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>👨‍🏫</span> المعلمين
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-right text-gray-600">رقم المعلم</th>
                <th className="p-3 text-right text-gray-600">الاسم الكامل</th>
                <th className="p-3 text-right text-gray-600">الهاتف</th>
                <th className="p-3 text-right text-gray-600">المؤهل</th>
                <th className="p-3 text-right text-gray-600">حساب المستخدم</th>
                <th className="p-3 text-right text-gray-600">الحالة</th>
                <th className="p-3 text-right text-gray-600">الأفواج</th>
                <th className="p-3 text-right text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teachers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-3"><span className="bg-green-700 text-white px-2 py-1 rounded text-xs font-mono">{t.teacherNumber}</span></td>
                  <td className="p-3 font-medium text-gray-800">{t.fullName}</td>
                  <td className="p-3 text-gray-600 font-mono">{t.phone ?? '-'}</td>
                  <td className="p-3 text-gray-600">{t.qualification ?? '-'}</td>
                  <td className="p-3">
                    {t.userId ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">✅ لديه حساب</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs">لا يوجد</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {t.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => openGroupAssign(t)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      📚 تخصيص الأفواج
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(t.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(t)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && teachers.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا يوجد معلمون</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editTeacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المؤهل العلمي</label>
                  <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              {!editTeacher && (
                <div className="border border-dashed border-blue-300 rounded-lg p-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={form.createAccount} onChange={e => setForm(f => ({ ...f, createAccount: e.target.checked }))} />
                    <span className="text-sm font-medium text-blue-700">إنشاء حساب مستخدم لهذا المعلم</span>
                  </label>
                  {form.createAccount && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">سيتم استخدام رقم الهاتف كاسم مستخدم</p>
                      <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور *</label>
                      <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">💾 حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign groups modal */}
      {showGroupModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">📚 تخصيص الأفواج</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTeacher.fullName} — اختر الأفواج المخصصة لهذا المعلم</p>
              </div>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5">
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {allGroups.map(g => (
                  <label key={g.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    teacherGroups.includes(g.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={teacherGroups.includes(g.id)}
                      onChange={() => setTeacherGroups(prev =>
                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                      )}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{g.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{g.groupNumber}</p>
                    </div>
                  </label>
                ))}
                {allGroups.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">لا توجد أفواج مضافة</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={saveGroupAssign} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg text-sm">
                  💾 حفظ التخصيص ({teacherGroups.length} فوج)
                </button>
                <button onClick={() => setShowGroupModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
