import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendances, students, notifications, pushSubscriptions, settings } from '@/db/schemas/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getVapidConfig } from '@/lib/vapid'
import webpush, { type PushSubscription as WPSubscription } from 'web-push'

/* ── Load a single setting value with a fallback ── */
async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).limit(1)
  return row?.value ?? fallback
}

/* ── Replace template variables ── */
function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{${k}}`, v),
    template
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { date, type = 'absent' } = body   // type: 'absent' | 'late'
  if (!date) return NextResponse.json({ error: 'date مطلوب' }, { status: 400 })

  const attendanceStatus = type === 'late' ? 'late' : 'absent'

  // ── Load settings ────────────────────────────────────────────
  const [
    titleTpl, bodyTpl,
    notifEnabled, pushEnabledSetting, inappEnabled,
  ] = await Promise.all([
    getSetting(
      type === 'late' ? 'notif_late_title' : 'notif_absent_title',
      type === 'late'
        ? 'إشعار تأخر — {student_name}'
        : 'إشعار غياب — {student_name}'
    ),
    getSetting(
      type === 'late' ? 'notif_late_body' : 'notif_absent_body',
      type === 'late'
        ? 'تأخر(ت) ابنكم/ابنتكم {student_name} ({student_number}) عن الحصة بتاريخ {date}.'
        : 'تغيّب(ت) ابنكم/ابنتكم {student_name} ({student_number}) عن الحصة بتاريخ {date}. يرجى التواصل مع الإدارة.'
    ),
    getSetting(type === 'late' ? 'notif_late_enabled' : 'notif_absent_enabled', 'true'),
    getSetting('notif_push_enabled', 'true'),
    getSetting('notif_inapp_enabled', 'true'),
  ])

  // Respect enabled flags
  if (notifEnabled !== 'true') {
    return NextResponse.json({
      success: false,
      message: `إشعارات ${type === 'late' ? 'التأخر' : 'الغياب'} معطّلة من الإعدادات`,
      sent: 0,
    })
  }

  // ── VAPID: read at runtime ────────────────────────────────────
  let vapidOk = false
  if (pushEnabledSetting === 'true') {
    try {
      const vapid = getVapidConfig()
      webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
      vapidOk = true
    } catch {
      // Push disabled for this request — in-app notifications still work
      vapidOk = false
    }
  }

  const pushActive  = pushEnabledSetting === 'true' && vapidOk
  const inappActive = inappEnabled === 'true'

  // ── Fetch absent/late records ────────────────────────────────
  const records = await db
    .select({ studentId: attendances.studentId })
    .from(attendances)
    .where(and(
      eq(attendances.attendanceDate, date),
      eq(attendances.status, attendanceStatus as 'absent' | 'late')
    ))

  if (records.length === 0) {
    return NextResponse.json({
      message: `لا يوجد ${type === 'late' ? 'تأخر' : 'غياب'} لهذا التاريخ`,
      sent: 0,
    })
  }

  let sentCount = 0
  let pushSent  = 0
  const expiredEndpoints: string[] = []

  for (const record of records) {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, record.studentId))
      .limit(1)

    if (!student?.guardianUserId) continue

    const vars = {
      student_name:   `${student.firstName} ${student.lastName}`,
      student_number: student.studentNumber ?? '',
      date,
      guardian_name:  student.guardianName ?? 'ولي الأمر',
    }

    const title = applyTemplate(titleTpl, vars)
    const body  = applyTemplate(bodyTpl,  vars)

    // 1) In-app notification
    if (inappActive) {
      await db.insert(notifications).values({
        title,
        body,
        senderId: session.id,
        targetType: 'specific',
        targetIds: JSON.stringify([student.guardianUserId]),
        isReadBy: '[]',
      })
      sentCount++
    }

    // 2) Web Push
    if (pushActive) {
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, student.guardianUserId))

      if (subs.length === 0) continue

      const payload = JSON.stringify({
        title, body,
        icon:  '/icon-192x192.png',
        badge: '/icon-192x192.png',
        dir: 'rtl', lang: 'ar',
        data: { url: '/guardian-dashboard' },
      })

      const pushResults = await Promise.allSettled(
        subs.map(sub => {
          const wpSub: WPSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }
          return webpush
            .sendNotification(wpSub, payload, { TTL: 86400 })
            .catch(err => {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                expiredEndpoints.push(sub.endpoint)
              }
              throw err
            })
        })
      )
      pushSent += pushResults.filter(r => r.status === 'fulfilled').length
    }
  }

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    await Promise.allSettled(
      expiredEndpoints.map(ep =>
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, ep))
      )
    )
  }

  return NextResponse.json({
    success: true,
    sent: sentCount,
    pushSent,
    cleaned: expiredEndpoints.length,
    total: records.length,
    message: `تم إرسال ${sentCount} إشعار داخلي و${pushSent} إشعار متصفح`,
  })
}
