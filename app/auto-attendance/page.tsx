'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type ScannedStudent = {
  id: number
  studentNumber: string
  firstName: string
  lastName: string
  time: string
}

export default function AutoAttendancePage() {
  const [enabled, setEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([])
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const scannedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/settings?key=auto_attendance')
      .then(r => r.json())
      .then(d => setEnabled(d.value === 'true'))
      .catch(() => setEnabled(true))
  }, [])

  // Keep scannedRef in sync with state
  useEffect(() => {
    scannedRef.current = new Set(scannedStudents.map(s => s.studentNumber))
  }, [scannedStudents])

  const processQRCode = useCallback(async (studentNumber: string) => {
    if (scannedRef.current.has(studentNumber)) {
      toast.info(`الطالب ${studentNumber} تم تسجيله مسبقاً`)
      return
    }

    const res = await fetch(`/api/students?search=${encodeURIComponent(studentNumber)}`)
    const students = await res.json()
    const student = students.find((s: { studentNumber: string }) => s.studentNumber === studentNumber)

    if (!student) {
      toast.error(`رقم التسجيل ${studentNumber} غير موجود`)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ studentId: student.id, status: 'present' }],
        date: today,
      }),
    })

    const newRecord: ScannedStudent = {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      time: new Date().toLocaleTimeString('ar-SA'),
    }
    setScannedStudents(prev => [newRecord, ...prev])
    toast.success(`✅ تم تسجيل حضور: ${student.firstName} ${student.lastName}`)
  }, [])

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    if (!processingRef.current) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      processingRef.current = true

      try {
        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data) {
          await processQRCode(code.data)
          // Brief pause after successful scan
          await new Promise(r => setTimeout(r, 1500))
        }
      } catch {
        // Ignore decode errors
      } finally {
        processingRef.current = false
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame)
  }, [processQRCode])

  async function startScanner() {
    setError('')
    setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true)
          setScanning(true)
          animFrameRef.current = requestAnimationFrame(scanFrame)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('تم رفض الإذن للوصول إلى الكاميرا. يرجى السماح للمتصفح باستخدام الكاميرا.')
      } else if (msg.includes('NotFound')) {
        setError('لم يتم العثور على كاميرا. تأكد من توصيل الكاميرا بجهازك.')
      } else {
        setError('تعذر الوصول إلى الكاميرا: ' + msg)
      }
    }
  }

  function stopScanner() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
    setCameraReady(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function processManual() {
    if (!manualCode.trim()) return
    await processQRCode(manualCode.trim())
    setManualCode('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">تفعيل التحضير التلقائي:</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📷</span> التحضير التلقائي (QR Scanner)
        </h1>
      </div>

      {!enabled ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-center">
          <p className="text-yellow-700 font-medium">ميزة التحضير التلقائي معطلة حالياً</p>
          <p className="text-yellow-600 text-sm mt-1">قم بتفعيلها من خلال زر التبديل أعلاه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-700 mb-4 text-center">مسح QR Code ببطاقة الطالب</h2>

            {/* Video preview */}
            <div className="relative w-full rounded-lg overflow-hidden bg-gray-900 min-h-[300px] flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-auto rounded-lg ${scanning ? 'block' : 'hidden'}`}
                playsInline
                muted
              />
              {/* Canvas hidden — used for frame processing only */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Scan overlay */}
              {scanning && cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 border-4 border-green-400 rounded-xl opacity-80 shadow-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                  </div>
                </div>
              )}

              {/* Placeholder when not scanning */}
              {!scanning && (
                <div className="text-center text-gray-400 p-8">
                  <p className="text-5xl mb-3">📷</p>
                  <p className="text-sm">اضغط "تشغيل الكاميرا" لبدء المسح</p>
                </div>
              )}

              {/* Loading indicator */}
              {scanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70">
                  <div className="text-white text-center">
                    <div className="animate-spin text-4xl mb-3">⏳</div>
                    <p className="text-sm">جارٍ تشغيل الكاميرا...</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div className="flex gap-3 mt-4">
              {!scanning ? (
                <button
                  onClick={startScanner}
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  📷 تشغيل الكاميرا
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  ⏹️ إيقاف الكاميرا
                </button>
              )}
            </div>

            {/* Manual entry */}
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-600 mb-2 font-medium">أو إدخال رقم الطالب يدوياً:</p>
              <div className="flex gap-2">
                <input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && processManual()}
                  placeholder="FD0001"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 font-mono"
                />
                <button
                  onClick={processManual}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  تسجيل
                </button>
              </div>
            </div>
          </div>

          {/* Scanned list */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-700">سجل الحضور المسجل اليوم</h2>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {scannedStudents.length} طالب
              </span>
            </div>

            {scannedStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-3">📋</p>
                <p>لم يتم تسجيل أي حضور بعد</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scannedStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-gray-500 font-mono">{s.studentNumber}</p>
                    </div>
                    <div className="text-left">
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">✅ حاضر</span>
                      <p className="text-xs text-gray-400 mt-1">{s.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
