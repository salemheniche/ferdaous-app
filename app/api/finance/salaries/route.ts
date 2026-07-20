import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { salaryPayments, teachers } from '@/db/schemas/schema'
import { eq, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await db
    .select({
      id: salaryPayments.id,
      forMonth: salaryPayments.forMonth,
      baseSalary: salaryPayments.baseSalary,
      bonus: salaryPayments.bonus,
      deduction: salaryPayments.deduction,
      netSalary: salaryPayments.netSalary,
      paymentDate: salaryPayments.paymentDate,
      teacherId: salaryPayments.teacherId,
      teacherName: teachers.fullName,
    })
    .from(salaryPayments)
    .leftJoin(teachers, eq(salaryPayments.teacherId, teachers.id))
    .orderBy(desc(salaryPayments.createdAt))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { teacherId, forMonth, baseSalary, bonus, deduction, paymentDate } = await req.json()
  if (!teacherId || !baseSalary) return NextResponse.json({ error: 'المعلم والراتب مطلوبان' }, { status: 400 })
  const base = parseFloat(baseSalary)
  const bon = parseFloat(bonus || '0')
  const ded = parseFloat(deduction || '0')
  const net = (base + bon - ded).toFixed(2)
  const [created] = await db.insert(salaryPayments).values({
    teacherId: parseInt(teacherId), forMonth: forMonth || null,
    baseSalary: baseSalary, bonus: String(bon), deduction: String(ded),
    netSalary: net, paymentDate: paymentDate || null,
  }).returning()
  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.delete(salaryPayments).where(eq(salaryPayments.id, parseInt(id)))
  return NextResponse.json({ success: true })
}
