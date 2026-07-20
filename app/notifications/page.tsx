'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), { ssr: false })

/* ── Outlined SVG icons ── */
const BellIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)
const SendIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const TrashIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)
const UsersIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const CheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const SmartphoneIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)

type NotificationItem = {
  id: number; title: string; body: string
  targetType: string; targetIds: string | null
  createdAt: string; isRead: boolean
}
type GuardianOption = {
  id: number; fullName: string | null; username: string
  role: string; studentNames?: string
}
type UserOption = { id: number; fullName: string | null; username: string; role: string }

const targetTypeLabels: Record<string, string> = {
  all: 'الجميع', teachers: 'جميع المعلمين',
  guardians: 'جميع أولياء الأمور', specific: 'محددون',
}

export default function NotificationsPage() {
  const [role, setRole] = useState<'admin' | 'teacher' | ''>('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [myGuardians, setMyGuardians] = useState<GuardianOption[]>([])
  const [form, setForm] = useState({
    title: '', body: '', targetType: 'all',
    selectedIds: [] as number[], sendPush: true,
  })

  // Detect role from session
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.role) setRole(d.role) }).catch(() => {})
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/notifications')
    const data = await res.json()
    setNotifications(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  async function openModal() {
    if (role === 'teacher') {
      const res = await fetch('/api/notifications/my-guardians')
      const data = await res.json()
      setMyGuardians(Array.isArray(data) ? data : [])
      setForm({ title: '', body: '', targetType: 'myGuardians', selectedIds: [], sendPush: true })
    } else {
      const res = await fetch('/api/users')
      const data = await res.json()
      setAllUsers(Array.isArray(data) ? data : [])
      setForm({ title: '', body: '', targetType: 'all', selectedIds: [], sendPush: true })
    }
    setShowModal(true)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)

    const payload = {
      title: form.title, body: form.body,
      targetType: form.targetType,
      targetIds: (form.targetType === 'specific' || form.targetType === 'myGuardians')
        ? (form.targetType === 'myGuardians' ? undefined : form.selectedIds)
        : undefined,
    }

    const res = await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    // Send targeted Web Push
    if (form.sendPush) {
      try {
        let pushTargetIds: number[] | undefined
        let pushTargetType = form.targetType
        let pushUrl = '/notifications'

        if (form.targetType === 'myGuardians') {
          pushTargetIds = myGuardians.map(g => g.id)
          pushTargetType = 'specific'
          pushUrl = '/guardian-dashboard'
        } else if (form.targetType === 'specific') {
          pushTargetIds = form.selectedIds
          // If all selected are guardians, direct to guardian-dashboard
          const selectedUsers = allUsers.filter(u => pushTargetIds?.includes(u.id))
          const allGuardians = selectedUsers.every(u => u.role === 'guardian')
          if (allGuardians) pushUrl = '/guardian-dashboard'
        } else if (form.targetType === 'guardians') {
          pushUrl = '/guardian-dashboard'
        }

        const pushRes = await fetch('/api/push/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title, body: form.body,
            targetType: pushTargetType,
            targetIds: pushTargetIds,
            url: pushUrl,
          }),
        })
        const pushData = await pushRes.json()
        if (pushData.sent > 0) {
          toast.success(`✅ وصل الإشعار لـ ${pushData.sent} جهاز`)
        } else if (pushData.total === 0) {
          toast.info('ℹ️ لا توجد أجهزة مفعّلة للإشعارات لدى المستخدمين المستهدفين')
        }
        if (pushData.cleaned > 0) {
          toast.info(`🧹 تم تنظيف ${pushData.cleaned} اشتراك منتهي`)
        }
      } catch { /* silent */ }
    }

    if (res.ok) {
      if (!form.sendPush) toast.success('تم إرسال الإشعار بنجاح')
      setShowModal(false)
      fetchNotifications()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'حدث خطأ أثناء الإرسال')
    }
    setSending(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('هل تريد حذف هذا الإشعار؟')) return
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('تم حذف الإشعار'); fetchNotifications() }
  }

  function toggleId(id: number) {
    setForm(f => ({
      ...f,
      selectedIds: f.selectedIds.includes(id)
        ? f.selectedIds.filter(x => x !== id)
        : [...f.selectedIds, id],
    }))
  }

  const teachers = allUsers.filter(u => u.role === 'teacher')
  const guardians = allUsers.filter(u => u.role === 'guardian')

  // Admin target options
  const adminTargetOptions = [
    { value: 'all',       label: 'الجميع',           desc: 'كل المعلمين وأولياء الأمور' },
    { value: 'teachers',  label: 'جميع المعلمين',    desc: `${teachers.length} معلم` },
    { value: 'guardians', label: 'جميع أولياء الأمور', desc: `${guardians.length} ولي أمر` },
    { value: 'specific',  label: 'محددون يدوياً',    desc: 'اختر من القائمة' },
  ]

  // Teacher target options
  const teacherTargetOptions = [
    { value: 'myGuardians', label: 'جميع أولياء فوجي', desc: `${myGuardians.length} ولي أمر` },
    { value: 'specific',    label: 'أولياء محددون',    desc: 'اختر من فوجك' },
  ]

  const targetOptions = role === 'teacher' ? teacherTargetOptions : adminTargetOptions

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={openModal}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors">
          <SendIcon size={15} />
          إرسال إشعار
        </button>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BellIcon size={22} />
          الإشعارات
        </h1>
      </div>

      {/* Push enable */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <SmartphoneIcon size={16} /> إشعارات المتصفح (على هذا الجهاز)
        </p>
        <PushEnableButton />
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm">جاري التحميل...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <BellIcon size={28} />
            </div>
            <p className="text-gray-500 text-sm font-medium">لا توجد إشعارات مرسلة بعد</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0 text-green-700">
              <BellIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-gray-800 text-sm">{n.title}</h3>
                <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full text-xs">
                  {targetTypeLabels[n.targetType] ?? n.targetType}
                </span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{n.body}</p>
              <p className="text-gray-300 text-xs mt-1.5">
                {new Date(n.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {role === 'admin' && (
              <button onClick={() => handleDelete(n.id)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0">
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Send Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <SendIcon size={18} /> إرسال إشعار جديد
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">عنوان الإشعار *</label>
                <input value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="عنوان الإشعار..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  required />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">نص الإشعار *</label>
                <textarea value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="اكتب نص الإشعار هنا..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  required />
              </div>

              {/* Web Push toggle */}
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer">
                <input type="checkbox" checked={form.sendPush}
                  onChange={e => setForm(f => ({ ...f, sendPush: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                    <SmartphoneIcon size={14} /> إرسال كإشعار متصفح (Web Push)
                  </p>
                  <p className="text-xs text-blue-500">يصل حتى لو كان المتصفح مغلقاً</p>
                </div>
              </label>

              {/* Target selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إرسال إلى</label>
                {role === 'teacher' && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    يمكنك الإرسال لأولياء أمور طلاب أفواجك فقط
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {targetOptions.map(opt => (
                    <label key={opt.value}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${form.targetType === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.targetType === opt.value ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                        {form.targetType === opt.value && <CheckIcon size={10} />}
                      </div>
                      <input type="radio" name="targetType" value={opt.value}
                        checked={form.targetType === opt.value}
                        onChange={e => setForm(f => ({ ...f, targetType: e.target.value, selectedIds: [] }))}
                        className="sr-only" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific user picker */}
              {form.targetType === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <UsersIcon size={14} />
                    {role === 'teacher' ? 'اختر أولياء الأمور' : 'اختر المستخدمين'}
                    <span className="text-green-600 font-bold">({form.selectedIds.length} محدد)</span>
                  </label>
                  <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {(role === 'teacher' ? myGuardians : allUsers.filter(u => u.role !== 'admin')).map(u => (
                      <label key={u.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${form.selectedIds.includes(u.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${form.selectedIds.includes(u.id) ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                          {form.selectedIds.includes(u.id) && <CheckIcon size={10} />}
                        </div>
                        <input type="checkbox" checked={form.selectedIds.includes(u.id)}
                          onChange={() => toggleId(u.id)} className="sr-only" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.fullName ?? u.username}</p>
                          {(u as GuardianOption).studentNames && (
                            <p className="text-xs text-gray-400 truncate">طلاب: {(u as GuardianOption).studentNames}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {u.role === 'teacher' ? 'معلم' : 'ولي أمر'}
                        </span>
                      </label>
                    ))}
                    {((role === 'teacher' ? myGuardians : allUsers.filter(u => u.role !== 'admin')).length === 0) && (
                      <p className="text-center text-gray-400 py-6 text-sm">لا يوجد مستخدمون</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button type="submit"
                  disabled={sending || (form.targetType === 'specific' && form.selectedIds.length === 0)}
                  className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {sending
                    ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> جاري الإرسال...</>
                    : <><SendIcon size={15} /> إرسال الإشعار</>}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors">
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
