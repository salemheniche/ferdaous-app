'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

type User = {
  id: number; role: string; username: string; phone: string | null
  fullName: string | null; email: string | null; status: string; teacherId: number | null; createdAt: string
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'مدير النظام', color: 'bg-red-500 text-white' },
  teacher: { label: 'معلم', color: 'bg-blue-500 text-white' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'admin', phone: '', email: '', status: 'active' })

  async function load() {
    setLoading(true)
    const data = await fetch('/api/users').then(r => r.json())
    setUsers(data); setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditUser(null)
    setForm({ username: '', password: '', fullName: '', role: 'admin', phone: '', email: '', status: 'active' })
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditUser(u)
    setForm({ username: u.username, password: '', fullName: u.fullName ?? '', role: u.role, phone: u.phone ?? '', email: u.email ?? '', status: u.status })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editUser ? `/api/users/${editUser.id}` : '/api/users'
    const method = editUser ? 'PUT' : 'POST'
    const body = editUser
      ? { fullName: form.fullName, role: form.role, phone: form.phone, email: form.email, status: form.status, ...(form.password ? { password: form.password } : {}) }
      : form
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast.success(editUser ? 'تم تحديث المستخدم' : 'تم إضافة المستخدم'); setShowModal(false); load() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم الحذف'); load() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={openAdd} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          + إضافة مستخدم
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>👥</span> إدارة المستخدمين والصلاحيات
        </h1>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { role: 'admin', icon: '👑', label: 'مدير النظام', desc: 'صلاحيات كاملة على جميع وظائف النظام — الطلاب، المعلمون، المالية، الإعدادات' },
          { role: 'teacher', icon: '👨‍🏫', label: 'معلم', desc: 'صلاحيات محدودة — تسجيل حضور الأفواج المخصصة فقط، بدون الوصول للإعدادات أو المالية' },
        ].map(r => (
          <div key={r.role} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
            <span className="text-2xl">{r.icon}</span>
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_LABELS[r.role].color}`}>{r.label}</span>
              <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-right">اسم المستخدم</th>
                <th className="p-3 text-right">الاسم الكامل</th>
                <th className="p-3 text-right">الدور</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">تاريخ الإنشاء</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono font-bold text-gray-800">{u.username}</td>
                  <td className="p-3 text-gray-700">{u.fullName ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[u.role]?.color ?? 'bg-gray-400 text-white'}`}>
                      {ROLE_LABELS[u.role]?.label ?? u.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">{u.phone ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {u.status === 'active' ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(u.id)} className="bg-red-500 text-white p-1.5 rounded text-xs">🗑️</button>
                      <button onClick={() => openEdit(u)} className="bg-blue-500 text-white p-1.5 rounded text-xs">✏️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا يوجد مستخدمون</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {!editUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم *</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {editUser ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}
                </label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editUser} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                  <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="admin">مدير النظام</option>
                    <option value="teacher">معلم</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
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
