import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { students } from '@/db/schemas/schema'
import { getSession } from '@/lib/auth'
import ExcelJS from 'exceljs'
import { desc } from 'drizzle-orm'

const genderNorm = (v: unknown): 'male' | 'female' | null => {
  const val = String(v ?? '').trim().toLowerCase()
  if (['ذكر', 'm', 'male', 'ولد'].includes(val)) return 'male'
  if (['أنثى', 'انثى', 'f', 'female', 'بنت'].includes(val)) return 'female'
  return null
}

const statusNorm = (v: unknown): 'waiting' | 'active' | 'withdrawn' | 'graduated' => {
  const val = String(v ?? '').trim()
  const map: Record<string, 'waiting' | 'active' | 'withdrawn' | 'graduated'> = {
    'نشط': 'active', 'active': 'active',
    'في الانتظار': 'waiting', 'waiting': 'waiting', 'غير مفوج': 'waiting',
    'منسحب': 'withdrawn', 'withdrawn': 'withdrawn', 'متخلي': 'withdrawn',
    'متخرج': 'graduated', 'graduated': 'graduated',
  }
  return map[val] ?? 'waiting'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const nodeBuffer = Buffer.from(arrayBuffer)
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (workbook.xlsx as unknown as { load(buf: unknown): Promise<void> }).load(nodeBuffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) return NextResponse.json({ error: 'لا يوجد بيانات في الملف' }, { status: 400 })

  // Read headers from first row
  const headers: Record<number, string> = {}
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell, colNum) => {
    headers[colNum] = String(cell.value ?? '').trim()
  })

  // Map header labels to field keys
  const headerMap: Record<string, string> = {
    'رقم التسجيل': 'student_number', 'الاسم الأول': 'first_name',
    'الاسم الأخير': 'last_name', 'الجنس': 'gender', 'تاريخ الميلاد': 'birth_date',
    'رقم الهاتف': 'phone', 'اسم الولي': 'guardian_name',
    'رقم هاتف ولي الأمر': 'guardian_phone', 'هاتف الولي': 'guardian_phone',
    'المستوى الدراسي': 'educational_level', 'تاريخ التسجيل': 'enrollment_date',
    'الحالة': 'status', 'ملاحظات': 'notes',
    // English fallbacks
    'student_number': 'student_number', 'first_name': 'first_name',
    'last_name': 'last_name', 'gender': 'gender',
    'guardian_phone': 'guardian_phone',
  }

  // Get last student ID for numbering
  const [last] = await db.select({ id: students.id }).from(students).orderBy(desc(students.id)).limit(1)
  let nextId = (last?.id ?? 0) + 1

  const imported: string[] = []
  const errors: string[] = []

  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum)
    const rowData: Record<string, unknown> = {}
    row.eachCell((cell, colNum) => {
      const hdr = headers[colNum]
      const key = headerMap[hdr]
      if (key) rowData[key] = cell.value
    })

    const firstName = String(rowData.first_name ?? '').trim()
    const lastName = String(rowData.last_name ?? '').trim()

    if (!firstName && !lastName) continue // skip empty rows
    if (!firstName || !lastName) {
      errors.push(`الصف ${rowNum}: الاسم الأول والأخير مطلوبان`)
      continue
    }

    const studentNumber = String(rowData.student_number ?? '').trim() || `FD${String(nextId).padStart(4, '0')}`
    const enrollDate = String(rowData.enrollment_date ?? '').trim() || new Date().toISOString().split('T')[0]

    try {
      await db.insert(students).values({
        studentNumber,
        firstName,
        lastName,
        gender: genderNorm(rowData.gender),
        birthDate: rowData.birth_date ? String(rowData.birth_date).trim() : null,
        phone: rowData.phone ? String(rowData.phone).trim() : null,
        guardianName: rowData.guardian_name ? String(rowData.guardian_name).trim() : null,
        guardianPhone: rowData.guardian_phone ? String(rowData.guardian_phone).trim() : null,
        educationalLevel: rowData.educational_level ? String(rowData.educational_level).trim() : null,
        enrollmentDate: enrollDate,
        status: statusNorm(rowData.status),
        notes: rowData.notes ? String(rowData.notes).trim() : null,
      })
      imported.push(studentNumber)
      nextId++
    } catch (err) {
      errors.push(`الصف ${rowNum}: ${err instanceof Error ? err.message : 'خطأ في الإدخال'}`)
    }
  }

  return NextResponse.json({
    success: true,
    imported: imported.length,
    errors,
    message: `تم استيراد ${imported.length} طالب بنجاح${errors.length > 0 ? ` مع ${errors.length} أخطاء` : ''}`,
  })
}

// GET - Download template
export async function GET() {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('قالب استيراد الطلاب')
  sheet.views = [{ rightToLeft: true }]

  const headers = [
    { header: 'رقم التسجيل', key: 'student_number', width: 15 },
    { header: 'الاسم الأول', key: 'first_name', width: 20 },
    { header: 'الاسم الأخير', key: 'last_name', width: 20 },
    { header: 'الجنس', key: 'gender', width: 10 },
    { header: 'تاريخ الميلاد', key: 'birth_date', width: 15 },
    { header: 'رقم الهاتف', key: 'phone', width: 15 },
    { header: 'اسم الولي', key: 'guardian_name', width: 20 },
    { header: 'رقم هاتف ولي الأمر', key: 'guardian_phone', width: 20 },
    { header: 'المستوى الدراسي', key: 'educational_level', width: 18 },
    { header: 'تاريخ التسجيل', key: 'enrollment_date', width: 15 },
    { header: 'الحالة', key: 'status', width: 15 },
    { header: 'ملاحظات', key: 'notes', width: 30 },
  ]

  sheet.columns = headers.map(h => ({ header: h.header, key: h.key, width: h.width }))
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1a5c35' } }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 25

  // Add sample row
  sheet.addRow({
    student_number: 'FD0001',
    first_name: 'محمد',
    last_name: 'أحمد',
    gender: 'ذكر',
    birth_date: '2005-01-15',
    phone: '0555123456',
    guardian_name: 'أحمد محمد',
    guardian_phone: '0612345678',
    educational_level: 'متوسط',
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'في الانتظار',
    notes: '',
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename*=UTF-8\'\'students_template.xlsx',
    },
  })
}
