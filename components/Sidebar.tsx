'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const PushEnableButton = dynamic(() => import('@/components/PushEnableButton'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
      <span>🔔</span><span>الإشعارات</span>
    </div>
  ),
})

/* ── Outlined SVG icon map ── */
const S = 17 // default size
const icons: Record<string, React.ReactElement> = {
  'home':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  'clipboard':     <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  'qr':            <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3"/><path d="M12 16v.01"/><path d="M12 12h3"/><path d="M3 12h6"/></svg>,
  'barcode':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M15 5v14"/><path d="M19 5v14"/><rect x="1" y="3" width="22" height="18" rx="2"/></svg>,
  'book':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  'bell':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  'users':         <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'user-check':    <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  'calendar':      <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'grid':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  'users-2':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'dollar':        <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  'bar-chart':     <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  'settings-users':<svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>,
  'settings':      <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  'list':          <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  'archive':       <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
}

type NavItem = {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
  teacherVisible?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard',       label: 'لوحة التحكم',          icon: 'home' },
  { href: '/attendance',      label: 'الحضور والغياب',       icon: 'clipboard' },
  { href: '/auto-attendance', label: 'تحضير بالـ QR',        icon: 'qr' },
  { href: '/barcode-attendance', label: 'تحضير بالباركود',   icon: 'barcode', adminOnly: true },
  { href: '/groups',          label: 'الأفواج',              icon: 'book' },
  { href: '/notifications',   label: 'الإشعارات',            icon: 'bell', teacherVisible: true },
  { href: '/students',        label: 'الطلاب',               icon: 'users', adminOnly: true },
  { href: '/teachers',        label: 'المعلمين',             icon: 'user-check', adminOnly: true },
  { href: '/schedules',       label: 'الجداول الدراسية',     icon: 'calendar', adminOnly: true },
  { href: '/rooms',           label: 'القاعات',              icon: 'grid', adminOnly: true },
  { href: '/guardians',       label: 'أولياء الأمور',        icon: 'users-2', adminOnly: true },
  { href: '/finance',         label: 'المالية والرسوم',      icon: 'dollar', adminOnly: true },
  { href: '/reports',         label: 'التقارير',             icon: 'bar-chart', adminOnly: true },
  { href: '/users',           label: 'المستخدمون والأدوار',  icon: 'settings-users', adminOnly: true },
  { href: '/settings',              label: 'إعدادات النظام',       icon: 'settings', adminOnly: true },
  { href: '/settings/activity-logs', label: 'سجل العمليات',        icon: 'list', adminOnly: true },
  { href: '/backup',                label: 'النسخ الاحتياطي',      icon: 'archive', adminOnly: true },
]

interface SidebarProps {
  role: 'admin' | 'teacher'
  fullName: string | null
  onClose?: () => void
}

export default function Sidebar({ role, fullName, onClose }: SidebarProps) {
  const pathname = usePathname()

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    window.location.href = '/login'
  }

  const visibleItems = navItems.filter(item =>
    role === 'admin' || (!item.adminOnly) || item.teacherVisible
  )

  const generalItems = visibleItems.filter(i =>
    ['/dashboard', '/attendance', '/auto-attendance', '/barcode-attendance', '/groups', '/notifications'].includes(i.href)
  )
  const adminItems = visibleItems.filter(i =>
    !['/dashboard', '/attendance', '/auto-attendance', '/barcode-attendance', '/groups', '/notifications'].includes(i.href)
  )

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 248,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'linear-gradient(175deg, #1e6b3e 0%, #0f3d22 60%, #071a0e 100%)',
        boxShadow: '3px 0 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex-shrink-0 shadow-lg ring-2 ring-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="شعار منصة الفردوس" width={40} height={40} className="object-contain w-full h-full" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">منصة الفردوس</p>
          <p className="text-green-300/80 text-xs truncate">إدارة المدارس القرآنية</p>
        </div>
      </div>

      {/* ── Scrollable nav ── */}
      <div className="flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent', minHeight: 0 }}>
        <div className="px-2 mb-1">
          <p className="text-green-400/60 text-[10px] font-semibold uppercase tracking-widest px-2 py-1.5">عام</p>
          {generalItems.map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
          ))}
        </div>
        {adminItems.length > 0 && (
          <div className="px-2 mt-2">
            <p className="text-green-400/60 text-[10px] font-semibold uppercase tracking-widest px-2 py-1.5">إدارة النظام</p>
            {adminItems.map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} />
            ))}
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* ── Push Notifications ── */}
      <div className="px-3 py-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <PushEnableButton compact />
      </div>

      {/* ── User info + logout ── */}
      <div className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
            style={{ background: 'rgba(255,255,255,0.18)' }}>
            {fullName?.[0] ?? 'م'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate">{fullName ?? 'مستخدم'}</p>
            <p className="text-green-300/80 text-[11px]">{role === 'admin' ? 'مدير النظام' : 'معلم'}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full text-white text-xs font-semibold py-2 rounded-lg transition-all"
          style={{ background: 'rgba(220,38,38,0.75)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.75)')}>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose?: () => void }) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  return (
    <Link href={item.href} onClick={onClose}
      className="flex items-center gap-2.5 mb-0.5 px-3 py-2 rounded-xl text-sm transition-all"
      style={isActive
        ? { background: 'rgba(255,255,255,0.15)', color: '#fbbf24', fontWeight: 700, borderRight: '3px solid #fbbf24' }
        : { color: 'rgba(255,255,255,0.72)', borderRight: '3px solid transparent' }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <span className="flex-shrink-0 opacity-90">{icons[item.icon] ?? <span style={{ width: 17 }} />}</span>
      <span style={{ fontSize: 13.5 }} className="truncate">{item.label}</span>
    </Link>
  )
}
