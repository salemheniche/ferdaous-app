'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ExcelJS from 'exceljs'

type ScannedRecord = {
  studentNumber: string
  firstName: string
  lastName: string
  groupName?: string | null
  time: string
  status: 'success' | 'duplicate' | 'error'
  message?: string
}

type Group = { id: number; name: string; groupNumber: string }

type BarcodeCfg = {
  pageTitle: string
  pageSubtitle: string
  showGroup: boolean
  showStudentNumber: boolean
  showTime: boolean
  showStats: boolean
  allowManualInput: boolean
  hideDuplicateFromLog: boolean
  logShowErrors: boolean
  scanSound: boolean
  successColor: string
  duplicateColor: string
  errorColor: string
  excelExport: boolean
  excelIncludeErrors: boolean
  scannerGapMs: number
  minCodeLength: number
}

const DEFAULT_CFG: BarcodeCfg = {
  pageTitle: 'تحضير الباركود',
  pageSubtitle: 'منصة الفردوس',
  showGroup: true,
  showStudentNumber: true,
  showTime: true,
  showStats: true,
  allowManualInput: true,
  hideDuplicateFromLog: true,
  logShowErrors: true,
  scanSound: true,
  successColor: '#22c55e',
  duplicateColor: '#f59e0b',
  errorColor: '#ef4444',
  excelExport: true,
  excelIncludeErrors: true,
  scannerGapMs: 200,
  minCodeLength: 3,
}

function parseCfg(raw: Record<string, string>): BarcodeCfg {
  const b = (k: string, def: boolean) => (raw[k] != null ? raw[k] === 'true' : def)
  const n = (k: string, def: number) => (raw[k] != null ? parseInt(raw[k]) || def : def)
  const s = (k: string, def: string) => raw[k] ?? def
  return {
    pageTitle:            s('barcode_page_title',              DEFAULT_CFG.pageTitle),
    pageSubtitle:         s('barcode_page_subtitle',           DEFAULT_CFG.pageSubtitle),
    showGroup:            b('barcode_show_group',              DEFAULT_CFG.showGroup),
    showStudentNumber:    b('barcode_show_student_number',     DEFAULT_CFG.showStudentNumber),
    showTime:             b('barcode_show_time',               DEFAULT_CFG.showTime),
    showStats:            b('barcode_show_stats',              DEFAULT_CFG.showStats),
    allowManualInput:     b('barcode_allow_manual_input',      DEFAULT_CFG.allowManualInput),
    hideDuplicateFromLog: b('barcode_hide_duplicate_from_log', DEFAULT_CFG.hideDuplicateFromLog),
    logShowErrors:        b('barcode_log_show_errors',         DEFAULT_CFG.logShowErrors),
    scanSound:            b('barcode_scan_sound',              DEFAULT_CFG.scanSound),
    successColor:         s('barcode_success_color',           DEFAULT_CFG.successColor),
    duplicateColor:       s('barcode_duplicate_color',         DEFAULT_CFG.duplicateColor),
    errorColor:           s('barcode_error_color',             DEFAULT_CFG.errorColor),
    excelExport:          b('barcode_excel_export',            DEFAULT_CFG.excelExport),
    excelIncludeErrors:   b('barcode_excel_include_errors',    DEFAULT_CFG.excelIncludeErrors),
    scannerGapMs:         n('barcode_scanner_gap_ms',          DEFAULT_CFG.scannerGapMs),
    minCodeLength:        n('barcode_min_code_length',         DEFAULT_CFG.minCodeLength),
  }
}

export default function BarcodeAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [records, setRecords] = useState<ScannedRecord[]>([])
  const [inputBuffer, setInputBuffer] = useState('')
  const [lastScan, setLastScan] = useState<ScannedRecord | null>(null)
  const [processing, setProcessing] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scannedSet, setScannedSet] = useState<Set<string>>(new Set())
  const [cfg, setCfg] = useState<BarcodeCfg>(DEFAULT_CFG)
  const inputRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef('')
  const lastKeyTime = useRef(0)
  const flashRef = useRef<NodeJS.Timeout | null>(null)

  // Load settings from DB
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((data: { key: string; value: string | null }[]) => {
      const map: Record<string, string> = {}
      data.forEach(s => { if (s.key && s.value != null) map[s.key] = s.value })
      setCfg(parseCfg(map))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(setGroups).catch(() => {})
  }, [])

  // Keep focus on hidden input for barcode scanner
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus()
    focusInput()
    document.addEventListener('click', focusInput)
    return () => document.removeEventListener('click', focusInput)
  }, [])

  // Beep sound on scan
  const playSound = useCallback((type: 'success' | 'error') => {
    if (!cfg.scanSound) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = type === 'success' ? 880 : 220
      osc.type = type === 'success' ? 'sine' : 'square'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
    } catch { /* browser may block until user interaction */ }
  }, [cfg.scanSound])

  const processCode = useCallback(async (code: string) => {
    const clean = code.trim()
    if (!clean || processing) return
    setProcessing(true)

    if (scannedSet.has(clean)) {
      const existing = records.find(r => r.studentNumber === clean && r.status === 'success')
      const dup: ScannedRecord = {
        studentNumber: clean,
        firstName: existing?.firstName ?? '—',
        lastName: existing?.lastName ?? '—',
        groupName: existing?.groupName ?? null,
        time: new Date().toLocaleTimeString('ar-SA'),
        status: 'duplicate', message: 'تم تسجيله مسبقاً',
      }
      setLastScan(dup)
      playSound('error')
      if (!cfg.hideDuplicateFromLog) setRecords(prev => [dup, ...prev])
      setProcessing(false)
      return
    }

    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(clean)}&includeGroup=true`)
      const students = await res.json()
      const student = students.find((s: { studentNumber: string }) => s.studentNumber === clean)

      if (!student) {
        const err: ScannedRecord = {
          studentNumber: clean, firstName: '—', lastName: '—',
          time: new Date().toLocaleTimeString('ar-SA'),
          status: 'error', message: 'رقم غير موجود',
        }
        setLastScan(err)
        playSound('error')
        if (cfg.logShowErrors) setRecords(prev => [err, ...prev])
        setProcessing(false)
        return
      }

      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ studentId: student.id, status: 'present', scheduleId: null }],
          date,
        }),
      })

      const rec: ScannedRecord = {
        studentNumber: student.studentNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        groupName: student.groupName ?? null,
        time: new Date().toLocaleTimeString('ar-SA'),
        status: 'success',
      }
      setLastScan(rec)
      playSound('success')
      setScannedSet(prev => new Set(prev).add(clean))
      setRecords(prev => [rec, ...prev])
    } catch {
      const err: ScannedRecord = {
        studentNumber: clean, firstName: '—', lastName: '—',
        time: new Date().toLocaleTimeString('ar-SA'),
        status: 'error', message: 'خطأ في الاتصال',
      }
      setLastScan(err)
      playSound('error')
      if (cfg.logShowErrors) setRecords(prev => [err, ...prev])
    }
    setProcessing(false)
  }, [date, processing, scannedSet, records, cfg, playSound])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const now = Date.now()
    if (now - lastKeyTime.current > cfg.scannerGapMs) bufferRef.current = ''
    lastKeyTime.current = now

    if (e.key === 'Enter') {
      if (bufferRef.current.length >= cfg.minCodeLength) {
        processCode(bufferRef.current)
        bufferRef.current = ''
        setInputBuffer('')
      }
    } else if (e.key.length === 1) {
      bufferRef.current += e.key
      setInputBuffer(bufferRef.current)
    }
  }, [processCode, cfg.scannerGapMs, cfg.minCodeLength])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualInput.trim()) { processCode(manualInput.trim()); setManualInput('') }
  }

  function clearAll() {
    setRecords([]); setScannedSet(new Set()); setLastScan(null)
  }

  async function exportToExcel() {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'منصة الفردوس'; wb.created = new Date()
    const ws = wb.addWorksheet('سجل التحضير', { views: [{ rightToLeft: true }] })

    ws.mergeCells('A1:E1')
    const titleCell = ws.getCell('A1')
    titleCell.value = `سجل تحضير الباركود — ${date}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } }
    ws.getRow(1).height = 32

    ws.mergeCells('A2:E2')
    const statsCell = ws.getCell('A2')
    statsCell.value = `الحاضرون: ${successCount}   |   الأخطاء: ${errorCount}   |   إجمالي المسح: ${records.length}`
    statsCell.font = { size: 11, color: { argb: 'FF374151' } }
    statsCell.alignment = { horizontal: 'center', vertical: 'middle' }
    statsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
    ws.getRow(2).height = 22

    const headerRow = ws.addRow(['#', 'رقم الطالب', 'اسم الطالب', 'الفوج', 'وقت المسح'])
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF166534' } } }
    })
    headerRow.height = 24
    ws.getColumn(1).width = 6;  ws.getColumn(2).width = 16
    ws.getColumn(3).width = 26; ws.getColumn(4).width = 24; ws.getColumn(5).width = 14

    records.filter(r => r.status === 'success').forEach((r, idx) => {
      const row = ws.addRow([idx + 1, r.studentNumber, `${r.firstName} ${r.lastName}`, r.groupName ?? '—', r.time])
      const isEven = idx % 2 === 0
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0FDF4' } }
        cell.font = { size: 10.5 }
      })
      row.height = 20
    })

    if (cfg.excelIncludeErrors && errorCount > 0) {
      ws.addRow([])
      const errH = ws.addRow(['', 'أرقام غير موجودة في النظام', '', '', ''])
      errH.getCell(2).font = { bold: true, color: { argb: 'FFDC2626' } }
      records.filter(r => r.status === 'error').forEach((r, idx) => {
        const row = ws.addRow([idx + 1, r.studentNumber, r.message ?? '—', '', r.time])
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } }
          cell.font = { size: 10.5, color: { argb: 'FFDC2626' } }
        })
        row.height = 20
      })
    }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `تحضير-الباركود-${date}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const successCount   = records.filter(r => r.status === 'success').length
  const errorCount     = records.filter(r => r.status === 'error').length
  const duplicateCount = scannedSet.size > successCount ? scannedSet.size - successCount : 0

  const statusColor = (s: ScannedRecord['status']) =>
    s === 'success' ? cfg.successColor : s === 'duplicate' ? cfg.duplicateColor : cfg.errorColor

  // suppress unused warning
  void flashRef.current

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: '#0f172a', fontFamily: 'Cairo, sans-serif' }}>
      <input ref={inputRef} className="sr-only" readOnly value={inputBuffer} onChange={() => {}} aria-hidden />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e293b', background: '#0f172a' }}>
        <div className="flex items-center gap-4">
          <input type="date" value={date}
            onChange={e => { setDate(e.target.value); clearAll() }}
            className="border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white bg-gray-800 focus:outline-none focus:border-green-500" />
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white bg-gray-800 focus:outline-none focus:border-green-500">
            <option value="">جميع الأفواج</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.groupNumber})</option>)}
          </select>
          <button onClick={clearAll}
            className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">
            مسح السجل
          </button>
        </div>
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={cfg.successColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
            <line x1="21" y1="10" x2="21" y2="21"/><line x1="10" y1="3" x2="10" y2="10"/><line x1="3" y1="10" x2="10" y2="10"/>
            <line x1="16" y1="10" x2="10" y2="10"/><line x1="10" y1="16" x2="10" y2="21"/>
          </svg>
          <div>
            <p className="text-white font-bold text-sm">{cfg.pageTitle}</p>
            <p className="text-gray-400 text-xs">{cfg.pageSubtitle}</p>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 gap-0">

        {/* Left: scan display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ minWidth: 0 }}>

          {/* Stats bar */}
          {cfg.showStats && (
            <div className="flex gap-6 mb-8">
              {[
                { label: 'تم التسجيل',   value: successCount,   color: cfg.successColor },
                { label: 'مسجّل مسبقاً', value: duplicateCount, color: cfg.duplicateColor },
                { label: 'خطأ',           value: errorCount,     color: cfg.errorColor },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-4xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Scan result card */}
          <div className="w-full max-w-md rounded-3xl flex flex-col items-center justify-center py-12 px-8 transition-all duration-300"
            style={{
              background: lastScan ? `${statusColor(lastScan.status)}18` : 'rgba(255,255,255,0.03)',
              border: `2px solid ${lastScan ? statusColor(lastScan.status) : '#1e293b'}`,
            }}>
            {processing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 rounded-full animate-spin"
                  style={{ borderColor: `${cfg.successColor}40`, borderTopColor: cfg.successColor }} />
                <p className="text-sm" style={{ color: cfg.successColor }}>جاري المعالجة...</p>
              </div>
            ) : lastScan ? (
              <>
                <div className="text-6xl mb-4">
                  {lastScan.status === 'success' ? '✅' : lastScan.status === 'duplicate' ? '⚠️' : '❌'}
                </div>
                {lastScan.status === 'success' ? (
                  <>
                    <p className="text-white text-3xl font-bold text-center">{lastScan.firstName} {lastScan.lastName}</p>
                    {cfg.showGroup && lastScan.groupName && (
                      <p className="text-blue-400 text-base font-semibold mt-1 text-center">📚 {lastScan.groupName}</p>
                    )}
                    {cfg.showStudentNumber && (
                      <p className="text-sm mt-2 font-mono" style={{ color: cfg.successColor }}>{lastScan.studentNumber}</p>
                    )}
                    <p className="text-lg font-bold mt-3" style={{ color: cfg.successColor }}>تم تسجيل الحضور ✓</p>
                    {cfg.showTime && <p className="text-gray-500 text-xs mt-1">{lastScan.time}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 text-2xl font-bold text-center">
                      {lastScan.firstName !== '—' ? `${lastScan.firstName} ${lastScan.lastName}` : lastScan.studentNumber}
                    </p>
                    {cfg.showGroup && lastScan.groupName && (
                      <p className="text-blue-400 text-base font-semibold mt-1 text-center">📚 {lastScan.groupName}</p>
                    )}
                    <p className="mt-3 text-sm font-semibold" style={{ color: statusColor(lastScan.status) }}>{lastScan.message}</p>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
                  <line x1="21" y1="10" x2="21" y2="21"/><line x1="10" y1="3" x2="10" y2="10"/><line x1="3" y1="10" x2="10" y2="10"/>
                  <line x1="16" y1="10" x2="10" y2="10"/><line x1="10" y1="16" x2="10" y2="21"/>
                </svg>
                <p className="text-gray-500 text-lg font-medium">في انتظار المسح...</p>
                <p className="text-gray-600 text-sm">وجّه الباركود نحو الماسح</p>
              </div>
            )}
          </div>

          {/* Manual input */}
          {cfg.allowManualInput && (
            <form onSubmit={handleManualSubmit} className="mt-6 flex gap-2 w-full max-w-sm">
              <input value={manualInput} onChange={e => setManualInput(e.target.value)}
                placeholder="إدخال يدوي لرقم الطالب..."
                className="flex-1 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white bg-gray-800 focus:outline-none focus:border-green-500"
                onFocus={e => e.stopPropagation()} />
              <button type="submit" className="text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors hover:opacity-90"
                style={{ background: cfg.successColor }}>
                تسجيل
              </button>
            </form>
          )}
          <p className="text-gray-600 text-xs mt-3">{date} | {records.length} عملية مسح</p>
        </div>

        {/* Right: log */}
        <div className="w-80 flex-shrink-0 border-r flex flex-col" style={{ borderColor: '#1e293b', background: '#0a0f1a' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
            <span className="text-white text-sm font-bold">سجل المسح</span>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full border"
                style={{ color: cfg.successColor, borderColor: cfg.successColor + '55', background: cfg.successColor + '18' }}>
                {successCount} حاضر
              </span>
              {cfg.excelExport && (
                <button onClick={exportToExcel} disabled={successCount === 0} title="تصدير إلى Excel"
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderColor: '#166534', color: '#4ade80', background: 'rgba(21,128,61,0.15)' }}
                  onMouseEnter={e => { if (successCount > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(21,128,61,0.3)' }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(21,128,61,0.15)'}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Excel
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
            {records.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-8">لا يوجد سجلات بعد</p>
            ) : records.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: '#0f172a' }}>
                <span className="text-sm flex-shrink-0">
                  {r.status === 'success' ? '✅' : r.status === 'duplicate' ? '⚠️' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: statusColor(r.status) }}>
                    {r.status === 'success' ? `${r.firstName} ${r.lastName}` : r.studentNumber}
                  </p>
                  {r.status === 'success' && cfg.showGroup && r.groupName && (
                    <p className="text-blue-400 text-[10px] truncate">{r.groupName}</p>
                  )}
                  <p className="text-gray-600 text-[10px]">{r.status === 'success' ? r.studentNumber : r.message}</p>
                </div>
                <p className="text-gray-600 text-[10px] flex-shrink-0">{r.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
