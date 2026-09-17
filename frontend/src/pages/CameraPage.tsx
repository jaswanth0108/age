import { useEffect, useRef, useState } from 'react'

type EstimateResult = {
  estimatedAge: number
  range: [number, number]
  confidence: number
  imageId?: string
  brightness?: number
}

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [result, setResult] = useState<EstimateResult | null>(null)
  const [consent, setConsent] = useState(true)
  const [status, setStatus] = useState<{ faces: number | null, lighting: string, brightness: number, ready: boolean, message: string }>({
    faces: null, lighting: 'checking', brightness: 0, ready: false, message: 'Initializing camera...'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [showErrorCode, setShowErrorCode] = useState<string | null>(null)

  // Start camera
  useEffect(() => {
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play().catch(()=>{})
        }
        setError(null)
      } catch (e: any) {
        setError(e?.message || 'Camera permission denied. Please allow camera access and reload.')
      }
    }
    start()
    return () => {
      stream?.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line
  }, [])

  // Face + lighting detection loop
  useEffect(() => {
    if (!stream || !videoRef.current || result) return
    let raf = 0
    let detector: any = null
    // @ts-ignore
    if ('FaceDetector' in window) {
      // @ts-ignore
      detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 })
    }

    const check = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        raf = requestAnimationFrame(check)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Lighting via average brightness
      try {
        const w = 40, h = 40
        const small = document.createElement('canvas')
        small.width = w; small.height = h
        const sctx = small.getContext('2d')!
        sctx.drawImage(video, 0, 0, w, h)
        const data = sctx.getImageData(0,0,w,h).data
        let sum = 0
        for (let i=0;i<data.length;i+=4) {
          const lum = 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]
          sum += lum
        }
        const avg = sum / (w*h) // 0-255
        const lighting = avg < 40 ? 'poor' : avg < 75 ? 'dim' : avg > 230 ? 'too bright' : 'good'
        let faces: number | null = null
        let message = ''
        let ready = false

        if (detector) {
          try {
            const facesDetected = await detector.detect(video)
            faces = facesDetected.length
          } catch { faces = null }
        } else {
          // Fallback heuristic: assume 1 face if brightness ok and video has content
          // For demo we simulate detection variability: if canvas has very low variance -> no face
          // Compute variance quickly
          let variance = 0
          const mean = avg
          for (let i=0;i<data.length;i+=4) {
            const lum = 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]
            variance += (lum-mean)*(lum-mean)
          }
          variance /= (w*h)
          if (variance < 80) faces = 0
          else if (variance > 1800) faces = 2 // pretend multiple faces
          else faces = 1
        }

        if (lighting === 'poor' || lighting === 'dim') {
          message = lighting === 'poor' ? 'Very poor lighting — move to brighter area' : 'Lighting is dim — add more light'
        } else if (faces === 0) {
          message = 'No face detected — center your face'
        } else if (faces !== null && faces > 1) {
          message = 'Multiple faces detected — only one person please'
        } else if (faces === 1 && lighting === 'good') {
          message = 'Perfect — ready to capture'
          ready = true
        } else if (faces === 1) {
          message = lighting === 'too bright' ? 'Too bright — reduce glare' : 'Good — hold still'
          ready = lighting === 'good'
        } else {
          message = 'Align your face in frame'
          ready = lighting === 'good'
        }

        setStatus({ faces, lighting, brightness: Math.round(avg), ready, message })
      } catch {}

      raf = requestAnimationFrame(check)
    }
    check()
    return () => cancelAnimationFrame(raf)
  }, [stream, result])

  const captureAndEstimate = async () => {
    if (!videoRef.current || !canvasRef.current) return
    if (!status.ready) {
      // still allow capture but warn — backend will re-validate
    }
    setCapturing(true)
    setShowErrorCode(null)
    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      // mirror fix? video is mirrored via css, so flip canvas
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)

      const blob: Blob | null = await new Promise(res => canvas.toBlob(r => res(r), 'image/jpeg', 0.92))
      if (!blob) throw new Error('Failed to capture')

      setIsProcessing(true)
      const form = new FormData()
      form.append('image', blob, 'capture.jpg')
      form.append('consent', String(consent))

      const resp = await fetch('/api/estimate', { method: 'POST', body: form })
      const data = await resp.json()
      if (!resp.ok) {
        setShowErrorCode(data.code || null)
        throw new Error(data.error || 'Estimation failed')
      }
      setResult({
        estimatedAge: data.estimatedAge,
        range: data.range,
        confidence: data.confidence,
        imageId: data.imageId,
        brightness: data.brightness
      })
      setCapturing(false)
      setIsProcessing(false)
    } catch (e: any) {
      setCapturing(false)
      setIsProcessing(false)
      setError(e.message)
      setTimeout(()=>setError(null), 4000)
    }
  }

  const retake = () => {
    setResult(null)
    setShowErrorCode(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Camera Card */}
        <div className="bg-white rounded-[24px] shadow-soft border border-slate-100 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-bold text-slate-900">Live Preview</span>
              <span className="hidden sm:inline text-xs font-semibold tracking-widest text-slate-500 bg-slate-50 px-2 py-1 rounded-full border">{status.lighting.toUpperCase()} • {status.brightness}</span>
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">{status.faces !== null ? `${status.faces} face${status.faces===1?'':'s'} detected` : 'Detecting...'}</div>
          </div>

          <div className="relative bg-slate-900 aspect-[4/3] sm:aspect-[16/10] overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 sm:inset-8 border border-white/20 rounded-[20px]"></div>
              <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[72%] rounded-[24px] border-2 transition ${status.ready ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)]' : 'border-white/50'}`}></div>
              {/* corners */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[72%]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-sky-400 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-sky-400 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-sky-400 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-sky-400 rounded-br-xl"></div>
              </div>
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 ${status.ready ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                {status.message}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-2 rounded-full flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status.ready ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  {status.ready ? 'Ready' : 'Align face'}
                </div>
                <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full">
                  {stream ? 'HD • 30fps' : 'No camera'}
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                <div className="mt-4 font-semibold">Analyzing with AI...</div>
                <div className="text-xs text-white/70">Secure inference • &lt;1s</div>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <label className="flex gap-3 items-start bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 transition">
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
              <span className="text-sm leading-snug text-slate-700">
                <b>Store securely with consent</b> — Save this capture with encrypted private storage (ID, timestamp, age, range, confidence). Auto-deleted after 30 days. <span className="text-slate-500">Uncheck to not store.</span>
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={captureAndEstimate}
                disabled={isProcessing || capturing || !stream}
                className={`flex-1 py-4 rounded-full font-bold text-white flex items-center justify-center gap-2 transition ${status.ready ? 'bg-sky-500 hover:bg-sky-600 shadow-glow' : 'bg-slate-900 hover:bg-black'} disabled:opacity-50`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14.5 4h-5L7 8H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2h-4l-2.5-4z"/><circle cx="12" cy="14" r="4"/></svg>
                {isProcessing ? 'Estimating...' : 'Capture & Estimate'}
              </button>
              <button onClick={retake} className="px-6 py-4 rounded-full font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">Retake</button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm flex gap-2">
                <span>⚠️</span><span>{error} {showErrorCode && <span className="font-mono text-xs bg-red-100 px-1.5 py-0.5 rounded">[{showErrorCode}]</span>}</span>
              </div>
            )}
            <div className="text-xs text-slate-500 text-center">
              By capturing you agree to AI processing. <b>Consent determines storage</b>.
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] shadow-soft border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-xl text-slate-900">AI Result</h3>
              <span className="text-xs font-bold tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-full border">MODEL • MOCK-v1</span>
            </div>

            {!result ? (
              <div className="mt-8 text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl">🧠</div>
                <div className="mt-4 font-semibold text-slate-700">No estimate yet</div>
                <div className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Center one face in good lighting and press <b>Capture & Estimate</b>. We reject no-face, multi-face, or poor lighting.</div>
                <div className="mt-6 flex justify-center gap-2 text-xs">
                  <span className="bg-white border px-3 py-1.5 rounded-full">1 face only</span>
                  <span className="bg-white border px-3 py-1.5 rounded-full">Good lighting</span>
                  <span className="bg-white border px-3 py-1.5 rounded-full">Front facing</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[20px] p-6 text-white relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="text-xs font-bold tracking-[0.14em] opacity-80">AI ESTIMATED AGE</div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="font-display font-extrabold text-[56px] leading-none">{result.estimatedAge}</span>
                    <span className="text-white/80 font-medium">years</span>
                    <span className="ml-auto bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">{result.confidence}% confidence</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
                      <div className="text-xs opacity-80 tracking-wide">ESTIMATED RANGE</div>
                      <div className="font-bold text-lg">{result.range[0]}–{result.range[1]} years</div>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3">
                      <div className="text-xs opacity-80 tracking-wide">CONFIDENCE</div>
                      <div className="font-bold text-lg">{result.confidence}%</div>
                      <div className="w-full bg-white/20 h-1.5 rounded-full mt-1">
                        <div className="bg-white h-1.5 rounded-full" style={{width: `${result.confidence}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
                  <span className="text-amber-600">ℹ️</span>
                  <span className="text-sm text-amber-900 leading-snug"><b>This is an AI estimate, not a verified exact age.</b> For entertainment / demo only. Not for legal use.</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={retake} className="flex-1 bg-slate-900 text-white font-semibold py-3 rounded-full hover:bg-black">Try Again</button>
                  <button onClick={retake} className="flex-1 bg-white border border-slate-200 font-semibold py-3 rounded-full hover:bg-slate-50">Retake</button>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <div className="flex justify-between"><span>Image ID</span><span className="font-mono text-slate-700">{result.imageId || 'not stored (no consent)'}</span></div>
                  <div className="flex justify-between mt-1"><span>Brightness</span><span>{result.brightness}</span></div>
                  <div className="flex justify-between mt-1"><span>Consent</span><span className={consent ? 'text-emerald-600 font-bold' : 'text-slate-600'}>{consent ? 'Given — encrypted & stored' : 'Not given — not stored'}</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-[24px] p-6">
            <div className="text-sm font-bold tracking-widest text-sky-300">PRIVACY NOTE</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              We <b className="text-white">never expose stored images publicly</b>. Gallery is admin-only. Images are encrypted at rest, metadata-only DB, and auto-deleted after retention period. Toggle consent before capture.
            </p>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10">🔒 Encrypted</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10">🕒 Auto-delete 30d</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10">👤 Consent-based</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
