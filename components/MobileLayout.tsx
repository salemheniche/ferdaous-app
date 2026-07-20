'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import dynamic from 'next/dynamic'

const PushNotificationManager = dynamic(() => import('./PushNotificationManager'), { ssr: false })

interface MobileLayoutProps {
  role: 'admin' | 'teacher'
  fullName: string | null
  children: React.ReactNode
}

// SVG icons for bottom nav
const NavIcons = {
  home:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  clipboard: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  qr:        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3"/><path d="M12 12h3"/><path d="M3 12h6"/></svg>,
  book:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  bell:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
}

// Teacher bottom-nav items (mobile only) — no students tab
const teacherBottomNav = [
  { href: '/dashboard',       iconKey: 'home'      as const, label: 'الرئيسية' },
  { href: '/attendance',      iconKey: 'clipboard' as const, label: 'الحضور' },
  { href: '/auto-attendance', iconKey: 'qr'        as const, label: 'QR' },
  { href: '/groups',          iconKey: 'book'      as const, label: 'الأفواج' },
  { href: '/notifications',   iconKey: 'bell'      as const, label: 'الإشعارات' },
]

export default function MobileLayout({ role, fullName, children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isTeacher = role === 'teacher'

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Desktop sidebar (always visible ≥ lg) */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar role={role} fullName={fullName} />
      </div>

      {/* Mobile sidebar overlay — admin only on mobile (teacher uses bottom nav) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-0 right-0 h-full z-50" onClick={e => e.stopPropagation()}>
            <Sidebar role={role} fullName={fullName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        <Header
          role={role}
          fullName={fullName}
          onMenuClick={isTeacher ? undefined : () => setSidebarOpen(true)}
        />
        {/* On mobile for teacher add bottom nav spacing */}
        <main className={`flex-1 p-4 bg-gray-50 overflow-auto md:p-6 ${isTeacher ? 'pb-20 lg:pb-6' : ''}`}>
          {children}
        </main>
      </div>

      {/* ── Teacher Mobile Bottom Nav (mobile only, < lg) ── */}
      {isTeacher && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
          style={{
            background: 'linear-gradient(175deg, #1e6b3e 0%, #0a2b17 100%)',
            boxShadow: '0 -2px 16px rgba(0,0,0,0.25)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            height: 62,
          }}
        >
          {teacherBottomNav.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative"
                style={isActive ? { color: '#fbbf24' } : { color: 'rgba(255,255,255,0.65)' }}>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-yellow-400" />}
                {NavIcons[item.iconKey]}
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}

      <PushNotificationManager />
    </div>
  )
}
