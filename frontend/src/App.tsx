import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import CameraPage from './pages/CameraPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import { useEffect, useState } from 'react'

function Logo({ onDoubleClick }: { onDoubleClick: () => void }) {
  const [clicks, setClicks] = useState(0)
  const handleClick = () => {
    const newClicks = clicks + 1
    setClicks(newClicks)
    setTimeout(() => setClicks(0), 400)
    if (newClicks === 2) {
      setClicks(0)
      onDoubleClick()
    }
  }
  return (
    <div onClick={handleClick} className="flex items-center gap-3 cursor-pointer select-none" title="Double-click for admin">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-glow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 8H3a2 2 0 00-2 2v8a2 2 0 002 2h18a2 2 0 002-2v-8a2 2 0 00-2-2h-4l-2.5-4z"/>
          <circle cx="12" cy="14" r="4"/>
          <path d="M12 2v1"/><path d="M5 6l.7.7"/><path d="M19 6l-.7.7"/>
        </svg>
      </div>
      <span className="font-display font-extrabold text-[22px] tracking-tight text-slate-900">AgeLens</span>
      <span className="hidden sm:inline text-[10px] font-bold tracking-[0.14em] text-sky-600 bg-sky-50 px-2 py-1 rounded-full border border-sky-100">AI POWERED</span>
    </div>
  )
}

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  if (isAdmin) return null
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
        <Logo onDoubleClick={() => navigate('/admin/login')} />
        <nav className="flex items-center gap-2">
          <button onClick={() => navigate('/')} className="hidden md:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Home</button>
          <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})} className="hidden md:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">How it works</button>
          <button onClick={() => navigate('/camera')} className="ml-2 inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-slate-800 transition shadow">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Start Camera
          </button>
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            © {new Date().getFullYear()} AgeLens • Privacy-first AI. Images stored only with consent.
          </div>
          <div className="flex items-center gap-4">
            <span>Double-click logo for admin</span>
            <span className="hidden md:inline">•</span>
            <a className="hover:text-slate-700" href="#">Privacy</a>
            <a className="hover:text-slate-700" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
