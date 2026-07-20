import { cookies } from 'next/headers'
import { db } from '@/db'
import { users, teachers } from '@/db/schemas/schema'
import { eq } from 'drizzle-orm'

export type SessionUser = {
  id: number
  role: 'admin' | 'teacher' | 'guardian'
  username: string
  fullName: string | null
  teacherId?: number | null
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie?.value) return null
    const data = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
    if (!data?.id) return null
    return data as SessionUser
  } catch {
    return null
  }
}

export function createSessionToken(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64')
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password)
  return hashed === hash
}
