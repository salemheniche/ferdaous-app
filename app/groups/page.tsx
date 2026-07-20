'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

type Group = {
  id: number
  groupNumber: string
  name: string
  groupType: string | null
  capacity: number | null
  status: string
}

type Student = {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  gender: string | null
  birthDate: string | null
  status: string
  phone: string | null
  guardianName: string | null
  guardianPhone: string | null
  educationalLevel: string | null
  enrollmentDate: string | null
  address: string | null
}

type UserRole = 'admin' | 'teacher' | 'guardian'

export default function GroupsPage() {
  const [groups, setGroups]               = useState<Group[]>([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [editGroup, setEditGroup]         = useState<Group | null>(null)
  const [viewGroup, setViewGroup]         = useState<Group | null>(null)
  const [groupStudents, setGroupStudents] = useState<Student[]>([])
  const [allStudents, setAllStudents]     = useState<Student[]>([])
  const [form, setForm]                   = useState({ name: '', groupType: '', capacity: '', status: 'open' })
  const [userRole, setUserRole]           = useState<UserRole>('admin')

  // Add-students modal state
  const [showAddModal, setShowAddModal]             = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [studentSearch, setStudentSearch]           = useState('')
  const searchRef                                   = useRef<HTMLInputElement>(null)

  // Edit-student modal state (for teacher in group view)
  const [editStudentModal, setEditStudentModal] = useState<Student | null>(null)
  const [studentForm, setStudentForm]           = useState({
    firstName: '', lastName: '', gender: '', birthDate: '', phone: '',
    guardianName: '', guardianPhone: '', educationalLevel: '',
    enrollmentDate: '', status: 'active', address: '',
  })

  /* ── Fetch user role ── */
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.role) setUserRole(data.role)
    }).catch(() => {})
  }, [])

  /* ── Data fetching ── */
  async function fetchGroups() {
    setLoading(true)
    const data = await fetch('/api/groups').then(r => r.json())
    setGroups(data)
    setLoading(false)
  }

  useEffect(() => { fetchGroups() }, [])

  async function openView(g: Group) {
    setViewGroup(g)
    const [studentsRes, allRes] = await Promise.all([
      fetch(`/api/groups/${g.id}`),
      fetch('/api/students'),
    ])
    setGroupStudents(await studentsRes.json())
    setAllStudents((await allRes.json()).filter((s: Student) => s.status !== 'graduated'))
  }

  async function refreshView() {
    if (!viewGroup) return
    const [studentsRes, allRes] = await Promise.all([
      fetch(`/api/groups/${viewGroup.id}`),
      fetch('/api/students'),
    ])
    setGroupStudents(await studentsRes.json())
    setAllStudents((await allRes.json()).filter((s: Student) => s.status !== 'graduated'))
  }

  /* ── Group CRUD (admin only) ── */
  function openAdd() {
    setEditGroup(null)
    setForm({ name: '', groupType: '', capacity: '', status: 'open' })
    setShowModal(true)
  }

  function openEdit(g: Group) {
    setEditGroup(g)
    setForm({ name: g.name, groupType: g.groupType ?? '', capacity: g.capacity?.toString() ?? '', status: g.status })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url    = editGroup ? `/api/groups/${editGroup.id}` : '/api/groups'
    const method = editGroup ? 'PUT' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast.success(editGroup ? 'تم تحديث الفوج' : 'تم إضافة الفوج')
      setShowModal(false)
      fetchGroups()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد؟')) return
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); fetchGroups() }
  }

  /* ── Student removal ── */
  async function removeStudentFromGroup(studentId: number) {
    if (!viewGroup) return
    const res = await fetch(`/api/groups/${viewGroup.id}/students`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    })
    if (res.ok) { toast.success('تم إزالة الطالب'); refreshView() }
    else { const err = await res.json(); toast.error(err.error ?? 'حدث خطأ') }
  }

  /* ── Edit student in group (teacher) ── */
  function openEditStudent(s: Student) {
    setEditStudentModal(s)
    setStudentForm({
      firstName: s.firstName, lastName: s.lastName, gender: s.gender ?? '',
      birthDate: s.birthDate ?? '',
      phone: s.phone ?? '', guardianName: s.guardianName ?? '',
      guardianPhone: s.guardianPhone ?? '', educationalLevel: s.educationalLevel ?? '',
      enrollmentDate: s.enrollmentDate ?? '', status: s.status,
      address: s.address ?? '',
    })
  }

  async function handleEditStudentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editStudentModal) return
    const res = await fetch(`/api/students/${editStudentModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentForm),
    })
    if (res.ok) {
      toast.success('تم تحديث بيانات الطالب')
      setEditStudentModal(null)
      refreshView()
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'حدث خطأ')
    }
  }

  /* ── Add-students modal ── */
  function openAddModal() {
    setSelectedStudentIds([])
    setStudentSearch('')
    setShowAddModal(true)
    setTimeout(() => searchRef.current?.focus(), 80)
  }

  function closeAddModal() {
    setShowAddModal(false)
    setSelectedStudentIds([])
    setStudentSearch('')
  }

  function toggleStudent(id: number) {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll(ids: number[]) {
    const allSel = ids.every(id => selectedStudentIds.includes(id))
    if (allSel) {
      setSelectedStudentIds(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...ids])))
    }
  }

  async function addStudentsToGroup() {
    if (selectedStudentIds.length === 0 || !viewGroup) return
    const res = await fetch(`/api/groups/${viewGroup.id}/students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: selectedStudentIds }),
    })
    if (res.ok) {
      const data = await res.json()
      toast.success(
        data.skipped > 0 && data.added > 0
          ? `تم إضافة ${data.added} طالب، و${data.skipped} كانوا مضافين مسبقاً`
          : `تم إضافة ${data.added} طالب للفوج`
      )
      closeAddModal()
      refreshView()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  /* ══════════════════════════════════════════
     VIEW: group detail
  ══════════════════════════════════════════ */
  if (viewGroup) {
    const notInGroup = allStudents.filter(s => !groupStudents.some(gs => gs?.id === s.id))

    const filtered = notInGroup.filter(s => {
      const q = studentSearch.trim().toLowerCase()
      if (!q) return true
      return (
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q)
      )
    })
    const filteredIds        = filtered.map(s => s.id)
    const allFilteredChecked = filteredIds.length > 0 && filteredIds.every(id => selectedStudentIds.includes(id))

    return (
      <div dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewGroup(null)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            ← رجوع
          </button>
          <h1 className="text-2xl font-bold text-gray-800">فوج: {viewGroup.name}</h1>
          <button
            onClick={openAddModal}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow"
          >
            <span className="text-base leading-none">＋</span> إضافة طلاب
          </button>
        </div>

        {/* Teacher notice */}
        {userRole === 'teacher' && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
            <span>ℹ️</span>
            <span>يمكنك إضافة وحذف وتعديل بيانات طلاب فوجك فقط</span>
          </div>
        )}

        {/* Students table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <span className="font-bold text-gray-700">
              طلاب الفوج
              <span className="mr-2 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {groupStudents.filter(Boolean).length}
              </span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-right">رقم التسجيل</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">المستوى</th>
                  <th className="p-3 text-right">ولي الأمر</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupStudents.filter(Boolean).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{s.studentNumber}</td>
                    <td className="p-3 font-medium">{s.firstName} {s.lastName}</td>
                    <td className="p-3 text-gray-500 text-xs">{s.educationalLevel ?? '-'}</td>
                    <td className="p-3 text-gray-500 text-xs">{s.guardianName ?? '-'}</td>
                    <td className="p-3">
                      <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">نشط</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditStudent(s)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs"
                          title="تعديل بيانات الطالب"
                        >✏️</button>
                        <button
                          onClick={() => removeStudentFromGroup(s.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs"
                          title="إزالة من الفوج"
                        >✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {groupStudents.filter(Boolean).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">👥</span>
                        <span>لا يوجد طلاب في هذا الفوج</span>
                        <button
                          onClick={openAddModal}
                          className="mt-1 text-green-700 underline text-sm hover:text-green-900"
                        >إضافة طلاب الآن</button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ Edit student modal ══ */}
        {editStudentModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            dir="rtl"
            onClick={e => { if (e.target === e.currentTarget) setEditStudentModal(null) }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800">تعديل بيانات الطالب</h2>
                <button onClick={() => setEditStudentModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <form onSubmit={handleEditStudentSubmit} className="p-5 space-y-4">
                {/* الإسم | اللقب */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الإسم *</label>
                    <input value={studentForm.firstName} onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))}
                      required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اللقب *</label>
                    <input value={studentForm.lastName} onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))}
                      required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
                {/* الجنس | تاريخ الميلاد */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                    <select value={studentForm.gender} onChange={e => setStudentForm(f => ({ ...f, gender: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                      <option value="">اختر</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                    <input type="date" value={studentForm.birthDate} onChange={e => setStudentForm(f => ({ ...f, birthDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
                {/* رقم الهاتف | تاريخ التسجيل */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input value={studentForm.phone} onChange={e => setStudentForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسجيل</label>
                    <input type="date" value={studentForm.enrollmentDate} onChange={e => setStudentForm(f => ({ ...f, enrollmentDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                {/* اسم الولي | هاتف الولي */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الولي</label>
                    <input value={studentForm.guardianName} onChange={e => setStudentForm(f => ({ ...f, guardianName: e.target.value }))}
                      placeholder="اسم ولي أمر الطالب"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">هاتف الولي</label>
                    <input value={studentForm.guardianPhone} onChange={e => setStudentForm(f => ({ ...f, guardianPhone: e.target.value }))}
                      placeholder="0612345678"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none font-mono" />
                    <p className="text-xs text-gray-400 mt-1">سيُنشأ حساب ولي الأمر تلقائياً</p>
                  </div>
                </div>
                {/* المستوى الدراسي */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المستوى الدراسي</label>
                  <input value={studentForm.educationalLevel} onChange={e => setStudentForm(f => ({ ...f, educationalLevel: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                {/* الحالة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={studentForm.status} onChange={e => setStudentForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="waiting">في الانتظار</option>
                    <option value="active">نشط</option>
                    <option value="withdrawn">منسحب</option>
                    <option value="graduated">متخرج</option>
                  </select>
                </div>
                {/* العنوان */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input value={studentForm.address} onChange={e => setStudentForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="المدينة، الحي، الشارع..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">💾 حفظ</button>
                  <button type="button" onClick={() => setEditStudentModal(null)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══ Add-students modal ══ */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            dir="rtl"
            onClick={e => { if (e.target === e.currentTarget) closeAddModal() }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">إضافة طلاب</h2>
                  <p className="text-xs text-gray-400 mt-0.5">فوج: {viewGroup.name}</p>
                </div>
                <button
                  onClick={closeAddModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                >×</button>
              </div>

              {/* Search */}
              <div className="px-6 pt-4 pb-3">
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="ابحث بالاسم أو رقم التسجيل..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              {/* Select-all bar */}
              {filtered.length > 0 && (
                <div className="px-6 pb-2">
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 font-medium">
                      <input
                        type="checkbox"
                        checked={allFilteredChecked}
                        onChange={() => toggleSelectAll(filteredIds)}
                        className="w-4 h-4 accent-green-700 cursor-pointer"
                      />
                      تحديد الكل
                      <span className="text-gray-400 font-normal">({filtered.length})</span>
                    </label>
                    {selectedStudentIds.length > 0 && (
                      <button
                        onClick={() => setSelectedStudentIds([])}
                        className="text-xs text-red-500 hover:text-red-700"
                      >إلغاء التحديد</button>
                    )}
                  </div>
                </div>
              )}

              {/* Student list */}
              <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
                {notInGroup.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                    <span className="text-3xl">✅</span>
                    <span className="text-sm">جميع الطلاب مضافون لهذا الفوج</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                    <span className="text-3xl">🔍</span>
                    <span className="text-sm">لا توجد نتائج للبحث</span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                    {filtered.map(s => {
                      const checked = selectedStudentIds.includes(s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            checked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudent(s.id)}
                            className="w-4 h-4 accent-green-700 cursor-pointer flex-shrink-0"
                          />
                          <span className="font-medium text-sm text-gray-800 flex-1">
                            {s.firstName} {s.lastName}
                          </span>
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {s.studentNumber}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <span className="text-sm text-gray-500">
                  {selectedStudentIds.length > 0
                    ? <span className="font-bold text-green-700">{selectedStudentIds.length} طالب محدد</span>
                    : 'لم يتم التحديد بعد'}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={closeAddModal}
                    className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                  >إلغاء</button>
                  <button
                    onClick={addStudentsToGroup}
                    disabled={selectedStudentIds.length === 0}
                    className="bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                  >
                    إضافة
                    {selectedStudentIds.length > 0 && (
                      <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedStudentIds.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    )
  }

  /* ══════════════════════════════════════════
     VIEW: groups list
  ══════════════════════════════════════════ */
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        {userRole === 'admin' ? (
          <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + إضافة فوج
          </button>
        ) : <div />}
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📚</span> الأفواج
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-right">رقم الفوج</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">السعة</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <span className="bg-green-700 text-white px-2 py-1 rounded text-xs font-mono">{g.groupNumber}</span>
                    </td>
                    <td className="p-3 font-medium text-gray-800">{g.name}</td>
                    <td className="p-3 text-gray-600">{g.groupType ?? '-'}</td>
                    <td className="p-3 text-gray-600">{g.capacity ?? '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.status === 'open' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                        {g.status === 'open' ? 'مفتوح' : 'مغلق'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {userRole === 'admin' && (
                          <>
                            <button onClick={() => handleDelete(g.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded text-xs">🗑️</button>
                            <button onClick={() => openEdit(g)} className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs">✏️</button>
                          </>
                        )}
                        <button onClick={() => openView(g)} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded text-xs">
                          {userRole === 'teacher' ? '📚 الطلاب' : '👁️ الطلاب'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أفواج</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Group add/edit modal (admin only) ── */}
      {showModal && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editGroup ? 'تعديل الفوج' : 'إضافة فوج جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفوج *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                  <input
                    value={form.groupType}
                    onChange={e => setForm(f => ({ ...f, groupType: e.target.value }))}
                    placeholder="حفظ / تجويد / ..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعة</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg">💾 حفظ</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
