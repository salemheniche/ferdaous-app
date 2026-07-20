'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

/** تنسيق التاريخ بأرقام لاتينية وأسماء أشهر بالعربي — مثال: 20 جويلية 2026 */
function formatDateAr(date: Date = new Date()): string {
  const MONTHS = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

type Group = { id: number; name: string; groupNumber: string }
type Student = {
  id: number; studentNumber: string; firstName: string; lastName: string
  educationalLevel: string | null; enrollmentDate: string | null; status: string
  guardianName: string | null; guardianPhone: string | null; gender: string | null
  birthDate: string | null; address: string | null
}
type Stats = {
  students: { total: number; active: number; withdrawn: number; waiting: number; graduated: number }
  teachers: { total: number }
  groups: { total: number }
}
type Teacher = { id: number; fullName: string; teacherNumber: string | null }

const SCHOOL_NAME = 'مؤسسة الفردوس للتضامن والتربية والثقافة والعلوم | فرع الدبيلة'
const ACADEMIC_YEAR = '2025/2026'

// ==================== REPORTS PAGE ====================
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'summary'>('summary')
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups)
    fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => null)
  }, [])

  const currentGroup = groups.find(g => String(g.id) === selectedGroup)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => window.print()} className="no-print border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          🖨️ طباعة التقرير
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📊</span> التقارير
        </h1>
      </div>

      {/* ===== PRINTING CENTER ===== */}
      <div className="bg-white rounded-xl border-2 border-yellow-400 p-5 mb-5 no-print">
        <h3 className="text-yellow-600 font-bold mb-4 flex items-center gap-2">
          <span>🖨️</span> مركز الطباعة
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setActiveTab('groups')}
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">قوائم الأفواج</p>
              <p className="text-gray-400 text-xs">طباعة وتصدير Excel للأفواج</p>
            </div>
          </button>
          <Link href="/reports/cards"
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 text-right transition-all hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer">
            <span className="text-2xl">🪪</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">بطاقات الطلاب</p>
              <p className="text-gray-400 text-xs">بطاقات CR80 مع QR وباركود</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 no-print">
        {[
          { key: 'summary', label: '📈 الملخص الإحصائي' },
          { key: 'groups', label: '📋 قوائم الأفواج' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as 'groups' | 'summary')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg -mb-px border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-green-700 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ===== SUMMARY TAB ===== */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border-r-4 border-blue-500 border border-gray-200 p-5">
              <h3 className="text-blue-600 font-bold mb-4 flex items-center gap-2">
                <span>🎓</span> الملخص الأكاديمي
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'إجمالي الطلاب المسجلين', val: stats?.students?.total ?? '-', color: 'bg-blue-500' },
                  { label: 'الطلاب النشطون', val: stats?.students?.active ?? '-', color: 'bg-green-500' },
                  { label: 'في الانتظار', val: stats?.students?.waiting ?? '-', color: 'bg-yellow-400' },
                  { label: 'إجمالي المعلمين', val: stats?.teachers?.total ?? '-', color: 'bg-purple-500' },
                  { label: 'الأفواج المفعلة', val: stats?.groups?.total ?? '-', color: 'bg-indigo-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-gray-600 text-sm">{item.label}</span>
                    <span className={`${item.color} text-white px-3 py-0.5 rounded-full text-sm font-bold`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border-r-4 border-green-500 border border-gray-200 p-5">
              <h3 className="text-green-600 font-bold mb-4 flex items-center gap-2">
                <span>💰</span> الملخص المالي ({new Date().getFullYear()})
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'رسوم الطلاب', val: '0.00', type: 'دخل', color: 'text-green-600' },
                  { label: 'التبرعات', val: '0.00', type: 'دخل', color: 'text-green-600' },
                  { label: 'رواتب الموظفين', val: '0.00', type: 'مصروف', color: 'text-red-500' },
                  { label: 'المصاريف العامة', val: '0.00', type: 'مصروف', color: 'text-red-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${item.type === 'دخل' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{item.type}</span>
                      <span className="text-gray-600 text-sm">{item.label}</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${item.color}`}>{item.val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
                  <span className="font-bold text-gray-800">الرصيد الصافي</span>
                  <span className="font-bold text-green-600 text-lg">0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== GROUP LIST TAB ===== */}
      {activeTab === 'groups' && (
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 no-print">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفوج</label>
                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">-- اختر الفوج --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedGroup && (
            <GroupListPrint groupId={selectedGroup} groupName={currentGroup?.name ?? ''} groupNumber={currentGroup?.groupNumber ?? ''} />
          )}
          {!selectedGroup && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>اختر فوجاً لعرض قائمته وتصديرها</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===== GROUP LIST PRINT + EXPORT =====
function GroupListPrint({ groupId, groupName, groupNumber }: { groupId: string; groupName: string; groupNumber: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [teacher, setTeacher]   = useState<Teacher | null>(null)
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/groups/${groupId}`).then(r => r.json()),
      fetch(`/api/groups/${groupId}/teacher`).then(r => r.json()),
    ]).then(([studData, teacherData]) => {
      setStudents(Array.isArray(studData) ? studData.filter(Boolean) : [])
      setTeacher(teacherData ?? null)
      setLoading(false)
    })
  }, [groupId])

  async function exportExcel() {
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'منصة الفردوس'
      const ws = wb.addWorksheet(`الفوج ${groupName}`, { views: [{ rightToLeft: true }] })

      // ── Title block ──────────────────────────────────────────
      const titleRows = [
        [`مؤسسة الفردوس للتضامن والتربية والثقافة والعلوم | فرع الدبيلة`],
        [`قائمة بيانات الفوج: ${groupName} (${groupNumber})`],
        [`السنة الدراسية: ${ACADEMIC_YEAR}`],
        [`تاريخ التصدير: ${formatDateAr()}`],
        [],
      ]
      const colCount = 9
      titleRows.forEach((r, ri) => {
        ws.addRow(r)
        if (r.length) {
          ws.mergeCells(ri + 1, 1, ri + 1, colCount)
          const cell = ws.getCell(ri + 1, 1)
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
          if (ri === 0) { cell.font = { bold: true, size: 14, color: { argb: 'FF0F3D22' } }; ws.getRow(ri + 1).height = 28 }
          else if (ri === 1) { cell.font = { bold: true, size: 12 }; ws.getRow(ri + 1).height = 24 }
          else cell.font = { size: 10, color: { argb: 'FF555555' } }
        }
      })

      // ── Table header — matches Excel file format ───────────────
      const headerRow = ws.addRow(['الرقم', 'رقم التسجيل', 'اللقب', 'الاسم', 'الولي', 'الهاتف', 'تاريخ الميلاد', 'المستوى الدراسي', 'العنوان'])
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5C35' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF0F3D22' } } }
      })
      headerRow.height = 22

      // ── Data rows ──────────────────────────────────────────────
      students.forEach((s, i) => {
        const row = ws.addRow([
          String(i + 1).padStart(2, '0'),
          s.studentNumber,
          s.lastName,
          s.firstName,
          s.guardianName ?? '',
          s.guardianPhone ?? '',
          s.birthDate ?? '',
          s.educationalLevel ?? '',
          s.address ?? '',
        ])
        const isEven = i % 2 === 0
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'right', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0FAF4' } }
          cell.font = { size: 10.5 }
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
            right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
          }
        })
        row.height = 18
      })

      // ── Column widths ──────────────────────────────────────────
      ws.getColumn(1).width = 8
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 18
      ws.getColumn(4).width = 18
      ws.getColumn(5).width = 18
      ws.getColumn(6).width = 14
      ws.getColumn(7).width = 14
      ws.getColumn(8).width = 18
      ws.getColumn(9).width = 18

      // ── Footer ────────────────────────────────────────────────
      ws.addRow([])
      const footerRow = ws.addRow([`إجمالي الطلاب: ${students.length} طالب`])
      footerRow.getCell(1).font = { bold: true, size: 11 }

      // ── Download ──────────────────────────────────────────────
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `قائمة_${groupName}_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير ملف Excel بنجاح')
    } catch {
      toast.error('فشل تصدير Excel')
    }
    setExporting(false)
  }

  async function exportPdf() {
    setExportingPdf(true)
    try {
      // Convert logo to base64
      let logoDataUrl = ''
      try {
        const logoRes = await fetch('/logo.png')
        const logoBlob = await logoRes.blob()
        logoDataUrl = await new Promise<string>(resolve => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
      } catch { /* skip if unavailable */ }

      const teacherName = teacher?.fullName ?? '—'
      const printDate = formatDateAr()
      const logoImg = logoDataUrl
        ? `<img src="${logoDataUrl}" style="width:52px;height:52px;object-fit:contain;" />`
        : ''

      const rows = students.map((s, idx) => `
        <tr class="${idx % 2 === 0 ? '' : 'alt'}">
          <td class="center mono">${String(idx + 1).padStart(2, '0')}</td>
          <td class="mono">${s.studentNumber}</td>
          <td>${s.lastName ?? ''}</td>
          <td>${s.firstName ?? ''}</td>
          <td>${s.guardianName ?? ''}</td>
          <td class="mono">${s.guardianPhone ?? ''}</td>
          <td>${s.birthDate ?? ''}</td>
          <td>${s.educationalLevel ?? ''}</td>
          <td>${s.address ?? ''}</td>
        </tr>`).join('')

      const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Cairo, sans-serif; background: #fff; color: #111; font-size: 11pt; }
  @page { size: A4; margin: 12mm 10mm; }
  @media print { body { margin: 0; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  .page-header {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid #1a5c35; padding-bottom: 10px; margin-bottom: 10px;
  }
  .logo-box { width: 60px; text-align: center; }
  .title-box { text-align: center; flex: 1; }
  .title-box h1 { font-size: 14pt; font-weight: 800; color: #0f3d22; }
  .title-box h2 { font-size: 11pt; font-weight: 700; color: #333; margin-top: 3px; }
  .meta { display: flex; justify-content: space-between; font-size: 10pt; color: #444; margin-bottom: 10px; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
  .meta span { display: flex; gap: 4px; align-items: center; }
  .meta strong { color: #1a5c35; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  thead tr { background: #1a5c35; color: #fff; }
  thead th { padding: 6px 5px; font-weight: 700; border: 1px solid #0f3d22; text-align: right; }
  thead th.center { text-align: center; }
  tbody tr td { padding: 5px; border: 1px solid #d1fae5; vertical-align: middle; }
  tbody tr.alt td { background: #f0faf4; }
  tbody tr:not(.alt) td { background: #fff; }
  td.center { text-align: center; }
  td.mono { font-family: monospace; font-size: 9pt; }

  .footer { margin-top: 12px; display: flex; justify-content: space-between; font-size: 9pt; color: #666; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  .sig-box { display: flex; gap: 40px; }
  .sig { text-align: center; }
  .sig .line { width: 120px; border-bottom: 1px solid #333; margin: 20px auto 4px; }
</style>
</head>
<body>
  <div class="page-header">
    <div class="logo-box">${logoImg}</div>
    <div class="title-box">
      <h1>${SCHOOL_NAME}</h1>
      <h2>قائمة بيانات الفوج</h2>
    </div>
    <div class="logo-box">${logoImg}</div>
  </div>

  <div class="meta">
    <span>📚 الفوج: <strong>${groupName}</strong></span>
    <span>👨‍🏫 المعلم: <strong>${teacherName}</strong></span>
    <span>📅 تاريخ الطباعة: <strong>${printDate}</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:36px">الرقم</th>
        <th>ر.التسجيل</th>
        <th>اللقب</th>
        <th>الاسم</th>
        <th>الولي</th>
        <th style="width:90px">الهاتف</th>
        <th style="width:80px">تاريخ الميلاد</th>
        <th>م.الدراسي</th>
        <th style="width:90px">العنوان</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="sig-box">
      <div class="sig"><div class="line"></div>توقيع المعلم</div>
      <div class="sig"><div class="line"></div>توقيع المدير</div>
    </div>
    <span>إجمالي الطلاب: <strong>${students.length}</strong> طالب/ة</span>
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print();window.close();},900);}<\/script>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank', 'width=900,height=700')
      if (!win) toast.error('يرجى السماح بالنوافذ المنبثقة')
      setTimeout(() => URL.revokeObjectURL(url), 15000)
      toast.success('جاري فتح نافذة الطباعة/PDF')
    } catch {
      toast.error('فشل تصدير PDF')
    }
    setExportingPdf(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">جاري التحميل...</div>

  const teacherName = teacher?.fullName ?? '—'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Action buttons */}
      <div className="flex gap-3 mb-5 no-print flex-wrap">
        <button onClick={exportPdf} disabled={exportingPdf || students.length === 0}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          📄 {exportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}
        </button>
        <button onClick={exportExcel} disabled={exporting || students.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          📊 {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
        </button>
        <button onClick={() => window.print()}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          🖨️ طباعة A4
        </button>
        <span className="text-gray-400 text-sm self-center">{students.length} طالب</span>
      </div>

      {/* Print header */}
      <div className="mb-4 border-b pb-4">
        <div className="flex items-center justify-between mb-2">
          {/* Logo right */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="شعار" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          {/* Center title */}
          <div className="text-center flex-1 px-4">
            <h2 className="text-base font-bold text-green-900">{SCHOOL_NAME}</h2>
            <h3 className="text-sm font-bold text-gray-700 mt-0.5">قائمة بيانات الفوج</h3>
          </div>
          {/* Logo left */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="شعار" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100 flex-wrap gap-2">
          <span>📚 الفوج: <strong className="text-green-800">{groupName}</strong></span>
          <span>👨‍🏫 المعلم: <strong className="text-green-800">{teacherName}</strong></span>
          <span>📅 {formatDateAr()}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-green-700 text-white">
              <th className="border border-green-800 p-2 text-center w-10">الرقم</th>
              <th className="border border-green-800 p-2 text-right">رقم التسجيل</th>
              <th className="border border-green-800 p-2 text-right">اللقب</th>
              <th className="border border-green-800 p-2 text-right">الاسم</th>
              <th className="border border-green-800 p-2 text-right">الولي</th>
              <th className="border border-green-800 p-2 text-right">الهاتف</th>
              <th className="border border-green-800 p-2 text-right">تاريخ الميلاد</th>
              <th className="border border-green-800 p-2 text-right">المستوى الدراسي</th>
              <th className="border border-green-800 p-2 text-right">العنوان</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                <td className="border border-gray-300 p-2 text-center text-gray-500 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                <td className="border border-gray-300 p-2 font-mono text-xs">{s.studentNumber}</td>
                <td className="border border-gray-300 p-2 font-medium">{s.lastName}</td>
                <td className="border border-gray-300 p-2 font-medium">{s.firstName}</td>
                <td className="border border-gray-300 p-2 text-gray-600">{s.guardianName ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 font-mono text-xs">{s.guardianPhone ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-500 text-xs font-mono">{s.birthDate ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 text-xs">{s.educationalLevel ?? ''}</td>
                <td className="border border-gray-300 p-2 text-gray-600 text-xs">{s.address ?? ''}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">لا يوجد طلاب في هذا الفوج</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center">
        إجمالي الطلاب: {students.length} طالب | تاريخ الطباعة: {formatDateAr()}
      </div>
    </div>
  )
}
