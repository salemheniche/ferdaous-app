/**
 * /api/push/send
 *
 * POST — Sends a Web Push notification to target users.
 *        Requires admin or teacher session.
 *        Auto-cleans expired / unsubscribed endpoints (410 / 404).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pushSubscriptions, users } from '@/db/schemas/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { getVapidConfig } from '@/lib/vapid'
import webpush, { type PushSubscription as WPSubscription } from 'web-push'

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // VAPID — read at runtime, throw if missing
  let vapid: ReturnType<typeof getVapidConfig>
  try {
    vapid = getVapidConfig()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'VAPID configuration error'
    console.error('[Push/Send]', message)
    return NextResponse.json({ error: message }, { status: 503 })
  }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  // Parse body
  let body: {
    title?: string; body?: string; icon?: string
    targetType?: string; targetIds?: number[]; url?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    title, body: notifBody, icon,
    targetType = 'all', targetIds = [], url = '/notifications',
  } = body

  if (!title || !notifBody) {
    return NextResponse.json({ error: 'العنوان والنص مطلوبان' }, { status: 400 })
  }

  // ── Resolve target user IDs ───────────────────────────────
  let targetUserIds: number[] | null = null

  if (targetType === 'teachers') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'teacher'))
    targetUserIds = rows.map(u => u.id)
  } else if (targetType === 'guardians') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'guardian'))
    targetUserIds = rows.map(u => u.id)
  } else if (targetType === 'specific' && Array.isArray(targetIds) && targetIds.length > 0) {
    targetUserIds = targetIds.map(Number).filter(Boolean)
  }

  // ── Fetch subscriptions ───────────────────────────────────
  const subs = targetUserIds === null
    ? await db.select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth }).from(pushSubscriptions)
    : targetUserIds.length === 0
      ? []
      : await db.select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, targetUserIds))

  if (subs.length === 0) {
    return NextResponse.json({
      success: true, sent: 0, failed: 0, cleaned: 0, total: 0,
      message: 'لا توجد اشتراكات نشطة للمستخدمين المستهدفين',
    })
  }

  // ── Build payload ─────────────────────────────────────────
  const payload = JSON.stringify({
    title, body: notifBody,
    icon: icon ?? '/icon-192x192.png',
    badge: '/icon-192x192.png',
    dir: 'rtl', lang: 'ar',
    data: { url, tag: `ferdous-${Date.now()}` },
  })

  // ── Send in parallel ──────────────────────────────────────
  const expiredEndpoints: string[] = []

  const results = await Promise.allSettled(
    subs.map(sub => {
      const wpSub: WPSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      return webpush
        .sendNotification(wpSub, payload, { TTL: 86400 })
        .catch((err: { statusCode?: number }) => {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint)
          }
          throw err
        })
    })
  )

  // ── Cleanup expired ───────────────────────────────────────
  if (expiredEndpoints.length > 0) {
    await Promise.allSettled(
      expiredEndpoints.map(ep =>
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, ep))
      )
    )
  }

  return NextResponse.json({
    success: true,
    sent:    results.filter(r => r.status === 'fulfilled').length,
    failed:  results.filter(r => r.status === 'rejected').length,
    cleaned: expiredEndpoints.length,
    total:   subs.length,
  })
}
