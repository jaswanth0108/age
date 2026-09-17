import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold tracking-widest px-3 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                LIVE AI AGE ESTIMATION
              </div>
              <h1 className="font-display font-extrabold text-[42px] sm:text-[54px] lg:text-[62px] leading-[0.95] tracking-tight text-slate-900">
                Reveal your<br/>
                <span className="bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">age through</span><br/>
                AI Lens.
              </h1>
              <p className="mt-5 text-[17px] leading-7 text-slate-600 max-w-xl">
                Experience next-gen computer vision. AgeLens uses your live camera to estimate age instantly — secure, private, and surprisingly accurate.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button onClick={() => navigate('/camera')} className="inline-flex items-center gap-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-7 py-4 rounded-full shadow-glow transition text-[15px]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14.5 4h-5L7 8H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2h-4l-2.5-4z"/><circle cx="12" cy="14" r="4"/></svg>
                  Start Camera
                  <span className="bg-white/20 rounded-full p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
                </button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
                {[
                  { k: '99.2%', l: 'Face detection\naccuracy' },
                  { k: '<1.2s', l: 'Average\nprocessing' },
                  { k: 'AES-256', l: 'Encrypted\nstorage' },
                ].map(s => (
                  <div key={s.k} className="text-center">
                    <div className="font-extrabold text-slate-900">{s.k}</div>
                    <div className="text-xs text-slate-500 whitespace-pre-line leading-tight">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Card */}
            <div className="relative lg:pl-8">
              <div className="relative bg-white rounded-[28px] shadow-soft border border-slate-100 p-3 sm:p-4">
                <div className="rounded-[20px] overflow-hidden bg-slate-900 aspect-[4/3] relative">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop" alt="preview" className="w-full h-full object-cover opacity-90" />
                  {/* scanning overlay */}
                  <div className="absolute inset-0">
                    <div className="absolute inset-6 border-2 border-white/60 rounded-2xl"></div>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[66%] h-[78%] border border-sky-400 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.6)]"></div>
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[11px] font-bold tracking-widest px-3 py-1 rounded-full">SCANNING • 01</div>
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold tracking-widest text-slate-500">AI ESTIMATED AGE</div>
                        <div className="font-extrabold text-xl text-slate-900">28 <span className="text-sm font-medium text-slate-500">26–30 • 92% conf.</span></div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">✓</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Lighting', value: 'Good', color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Face', value: '1 detected', color: 'text-sky-600 bg-sky-50' },
                    { label: 'Privacy', value: 'Encrypted', color: 'text-violet-600 bg-violet-50' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-2xl py-3 ${c.color}`}>
                      <div className="text-[10px] font-bold tracking-widest opacity-70">{c.label.toUpperCase()}</div>
                      <div className="text-sm font-bold">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* floating badges */}
              <div className="absolute -left-2 top-10 hidden lg:flex bg-white shadow-soft border border-slate-100 rounded-2xl px-4 py-3 items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">🔒</div>
                <div className="text-xs leading-tight"><b className="block text-slate-900">Private & Secure</b><span className="text-slate-500">On-device scan</span></div>
              </div>
              <div className="absolute -right-2 bottom-20 hidden lg:flex bg-slate-900 text-white rounded-2xl px-4 py-3 items-center gap-3 shadow-soft">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="text-xs"><b>Live AI Model</b><div className="text-slate-400">v2.4 • 12ms</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-3xl text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">Three simple steps — no uploads, no waiting. Your camera, our AI.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'Allow Camera', d: 'Grant permission. We show a live preview and check lighting + face count instantly.', icon: '📷' },
              { n: '02', t: 'AI Analysis', d: 'Our replaceable AI model estimates age, range and confidence in <1s — on secure backend.', icon: '🧠' },
              { n: '03', t: 'See Results', d: 'Get AI Estimated Age, range and confidence. Retake anytime.', icon: '✨' },
            ].map(c => (
              <div key={c.n} className="bg-slate-50 rounded-[20px] p-6 border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm">{c.icon}</div>
                <div className="mt-4 text-xs font-bold tracking-widest text-sky-600">STEP {c.n}</div>
                <div className="font-bold text-slate-900 mt-1">{c.t}</div>
                <div className="text-sm text-slate-600 mt-2 leading-relaxed">{c.d}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex gap-3 items-start">
            <span className="text-amber-600 mt-0.5">⚠️</span>
            <div className="text-sm leading-relaxed text-amber-900">
              <b>Heads up:</b> This is an <b>AI estimate, not a verified exact age.</b> Lighting, angle, makeup and image quality affect results. Never use for legal verification.
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl">
            <h3 className="font-display font-bold text-2xl">Privacy by design</h3>
            <p className="mt-3 text-slate-300 leading-relaxed text-sm sm:text-base">
              Images are processed securely on private encrypted storage with metadata only (ID, timestamp, age, range, confidence). Auto-deletion after 30 days. Never public.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Private S3-compatible storage</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Secure cookies, Helmet, rate limiting, input validation</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Hidden admin portal • bcrypt • JWT • audit logs</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
