import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession, hashPassword } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await db.select({
    id: users.id, role: users.role, username: users.username,
    phone: users.phone, fullName: users.fullName, email: users.email,
    status: users.status, teacherId: users.teacherId, createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { username, password, fullName, role, phone, email } = await req.json()
  if (!username || !password) return NextResponse.json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }, { status: 400 })
  const hashed = await hashPassword(password)
  const [created] = await db.insert(users).values({
    username, password: hashed, fullName: fullName || null,
    role: role || 'admin', phone: phone || null, email: email || null, status: 'active',
  }).returning({ id: users.id, username: users.username, role: users.role, fullName: users.fullName })
  return NextResponse.json(created, { status: 201 })
}
