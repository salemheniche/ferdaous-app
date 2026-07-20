'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

type Setting = { key: string; value: string | null }

const DEFAULT_SETTINGS: Record<string, string> = {
  school_name: 'مؤسسة الفردوس للتعليم القرآني فرع الديبيلة',
  academic_year: '2025/2026',
  contact_email: 'admin@quran.com',
  contact_phone: '0555000000',
  country_code: '+213',
  default_student_fee: '1500',
  default_teacher_salary: '30000',
  default_admin_salary: '40000',
  msg_absent: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} غائب(ة) عن الحصة اليوم {date}. يرجى التواصل معنا للتوضيح.',
  msg_late: 'السلام عليكم. نعلمكم أن الطالب(ة) {student_name} تأخر(ت) عن الحصة اليوم {date}.',
  primary_color: '#1a5c35',
  auto_attendance: 'true',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('school')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: Setting[]) => {
      const map = { ...DEFAULT_SETTINGS }
      data.forEach(s => { if (s.key && s.value) map[s.key] = s.value })
      setSettings(map)
      setLoading(false)
    })
  }, [])

  async function save(key: string, value: string) {
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await Promise.all(Object.entries(settings).map(([key, value]) => save(key, value)))
    toast.success('تم حفظ الإعدادات بنجاح')
    setSaving(false)
  }

  const F = ({ label, k, type = 'text', rows }: { label: string; k: string; type?: string; rows?: number }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {rows ? (
        <textarea value={settings[k] ?? ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))}
          rows={rows} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
      ) : (
        <input type={type} value={settings[k] ?? ''} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
      )}
    </div>
  )

  const sections = [
    { key: 'school', label: '🏫 بيانات المدرسة', icon: '🏫' },
    { key: 'financial', label: '💰 الإعدادات المالية', icon: '💰' },
    { key: 'messages', label: '📱 رسائل التواصل', icon: '📱' },
    { key: 'system', label: '⚙️ إعدادات النظام', icon: '⚙️' },
  ]

  // Quick-links to dedicated settings sub-pages
  const subPages = [
    { href: '/settings/notifications', icon: '🔔', label: 'إعدادات الإشعارات التلقائية', desc: 'قوالب الغياب والتأخر، قنوات الإرسال' },
    { href: '/settings/barcode-attendance', icon: '📟', label: 'إعدادات تحضير الباركود', desc: 'واجهة، ألوان، ماسح، Excel' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>⚙️</span> إعدادات النظام
      </h1>

      <div className="flex gap-6">
        {/* Section nav */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActiveSection(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-right transition-colors border-b border-gray-100 last:border-0 ${
                  activeSection === s.key ? 'bg-green-50 text-green-700 font-bold border-r-4 border-r-green-600' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span>{s.icon}</span> {s.label.replace(/^[^\s]+\s/, '')}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1">
          <form onSubmit={handleSave}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              {activeSection === 'school' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">🏫 بيانات المدرسة</h2>
                  <F label="اسم المدرسة / المؤسسة" k="school_name" />
                  <div className="grid grid-cols-2 gap-4">
                    <F label="البريد الإلكتروني للتواصل" k="contact_email" type="email" />
                    <F label="رقم الهاتف للتواصل" k="contact_phone" />
                  </div>
                  <F label="السنة الدراسية الحالية" k="academic_year" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اللون الرئيسي للنظام</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.primary_color ?? '#1a5c35'} onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer" />
                      <input value={settings.primary_color ?? '#1a5c35'} onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono w-32 focus:outline-none" placeholder="#1a5c35" />
                      <div className="flex gap-2">
                        {['#1a5c35', '#0d6efd', '#6f42c1', '#dc3545', '#fd7e14'].map(c => (
                          <button key={c} type="button" onClick={() => setSettings(s => ({ ...s, primary_color: c }))}
                            className="w-7 h-7 rounded-full border-2 border-white shadow" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'financial' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">💰 الإعدادات المالية الافتراضية</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <F label="رسوم الطالب الافتراضية (دج)" k="default_student_fee" type="number" />
                    <F label="راتب المعلم الافتراضي (دج)" k="default_teacher_salary" type="number" />
                    <F label="راتب الإداري الافتراضي (دج)" k="default_admin_salary" type="number" />
                  </div>
                </>
              )}

              {activeSection === 'messages' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">📱 إعدادات رسائل التواصل</h2>
                  <F label="رمز الدولة (لمنسق الهاتف)" k="country_code" />
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    المتغيرات المتاحة: <code className="bg-blue-100 px-1 rounded">&#123;student_name&#125;</code> اسم الطالب، <code className="bg-blue-100 px-1 rounded">&#123;date&#125;</code> التاريخ، <code className="bg-blue-100 px-1 rounded">&#123;time&#125;</code> الوقت
                  </div>
                  <F label="رسالة الغياب (واتساب/SMS)" k="msg_absent" rows={3} />
                  <F label="رسالة التأخر (واتساب/SMS)" k="msg_late" rows={3} />
                  <div className="pt-2 border-t border-gray-100">
                    <Link href="/settings/notifications"
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors group">
                      <span className="text-2xl">🔔</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800">إعدادات الإشعارات التلقائية</p>
                        <p className="text-xs text-green-600">تخصيص قوالب إشعارات الغياب والتأخر وقنوات الإرسال</p>
                      </div>
                      <svg className="text-green-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </Link>
                  </div>
                </>
              )}

              {activeSection === 'system' && (
                <>
                  <h2 className="text-lg font-bold text-gray-800 border-b pb-3">⚙️ إعدادات النظام</h2>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">التحضير التلقائي بالـ QR</p>
                      <p className="text-xs text-gray-500">تفعيل/تعطيل خاصية مسح بطاقة الطالب لتسجيل الحضور</p>
                    </div>
                    <button type="button"
                      onClick={() => setSettings(s => ({ ...s, auto_attendance: s.auto_attendance === 'true' ? 'false' : 'true' }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${settings.auto_attendance === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.auto_attendance === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </>
              )}
            </div>

            <button type="submit" disabled={saving}
              className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
              {saving ? 'جاري الحفظ...' : '💾 حفظ وتطبيق الإعدادات'}
            </button>
          </form>
        </div>
      </div>

      {/* Sub-pages quick links */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">إعدادات متخصصة</h2>
        <div className="flex flex-wrap gap-3">
          {subPages.map(p => (
            <Link key={p.href} href={p.href}
              className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all group">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">{p.label}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
              <svg className="mr-1 text-gray-300 group-hover:text-green-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
