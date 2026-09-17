import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function AdminLogin() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      if (data.token) localStorage.setItem('agelens_token', data.token)
      navigate('/admin')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            ← Back to site
          </Link>
          <div className="mt-4 w-14 h-14 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xl">🔐</div>
          <h1 className="mt-4 font-display font-extrabold text-2xl text-slate-900">Admin Portal</h1>
          <p className="text-sm text-slate-600 mt-1">Hidden access • Secure session • Rate limited</p>
          <p className="text-xs font-mono bg-amber-50 border border-amber-200 inline-block px-2 py-1 rounded mt-2 text-amber-900">Initial password: admin123 (change via env)</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-[20px] shadow-soft border border-slate-100 p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <div>
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" placeholder="admin" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" placeholder="••••••••" />
          </div>
          <button disabled={loading} className="w-full bg-slate-900 text-white font-semibold py-3 rounded-full hover:bg-black disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
          <div className="text-xs text-slate-500 text-center leading-relaxed">
            Protected by Helmet, secure cookies, JWT (2h), bcrypt & rate limit (5/15min).<br/>All actions are audit-logged.
          </div>
        </form>
      </div>
    </div>
  )
}
