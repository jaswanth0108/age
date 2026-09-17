import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl, parseJsonResponse } from '../api'

type Capture = {
  id: string
  timestamp: string
  estimatedAge: number
  range: number[]
  confidence: number
  consent: boolean
  hasImage: boolean
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterAge, setFilterAge] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Capture | null>(null)
  const [audit, setAudit] = useState<any[]>([])
  const navigate = useNavigate()

  const token = typeof window !== 'undefined' ? localStorage.getItem('agelens_token') : null
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchAll = async () => {
    try {
      const [sRes, cRes, aRes] = await Promise.all([
        fetch(getApiUrl('/api/admin/stats'), { credentials: 'include', headers: authHeader as any }),
        fetch(getApiUrl(`/api/admin/captures?search=${encodeURIComponent(search)}&filterAge=${encodeURIComponent(filterAge)}&sort=${sort}`), { credentials: 'include', headers: authHeader as any }),
        fetch(getApiUrl('/api/admin/audit'), { credentials: 'include', headers: authHeader as any })
      ])
      if (sRes.status === 401 || cRes.status === 401) {
        navigate('/admin/login')
        return
      }
      if (!sRes.ok) throw new Error(`Failed to load stats (HTTP ${sRes.status})`)
      const sData = await parseJsonResponse(sRes)
      const cData = await parseJsonResponse(cRes)
      const aData = aRes.ok ? await parseJsonResponse(aRes) : []
      setStats(sData)
      setCaptures(cData.items || [])
      setTotal(cData.total || 0)
      setAudit(aData || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [search, filterAge, sort])

  const logout = async () => {
    await fetch(getApiUrl('/api/admin/logout'), { method: 'POST', credentials: 'include', headers: authHeader as any })
    localStorage.removeItem('agelens_token')
    navigate('/admin/login')
  }

  const del = async (id: string) => {
    if (!confirm('Delete this capture and image permanently?')) return
    const res = await fetch(getApiUrl(`/api/admin/images/${id}`), { method: 'DELETE', credentials: 'include', headers: authHeader as any })
    if (res.ok) {
      setCaptures(c => c.filter(x => x.id !== id))
      fetchAll()
    } else {
      alert('Delete failed')
    }
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading admin...</div>
  if (error) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-red-600">{error} <button onClick={()=>navigate('/admin/login')} className="underline">Login</button></div>

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">🛡️</div>
            <span className="font-display font-bold">Admin Dashboard</span>
            <span className="hidden sm:inline text-xs bg-white/10 px-2 py-1 rounded-full">Private</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/')} className="hidden sm:inline text-sm text-white/80 hover:text-white">View Site</button>
            <button onClick={logout} className="bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-100">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Captures', value: stats?.total ?? total, sub: 'All time', icon: '📸' },
            { label: 'Avg Estimated Age', value: stats?.avgAge ?? '-', sub: 'Years', icon: '🎂' },
            { label: 'Avg Confidence', value: `${stats?.avgConf ?? 0}%`, sub: 'Model certainty', icon: '🎯' },
            { label: 'Retention', value: '30 days', sub: 'Auto-delete', icon: '🕒' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex justify-between">
                <div className="text-xs font-bold tracking-widest text-slate-500">{s.label.toUpperCase()}</div>
                <span>{s.icon}</span>
              </div>
              <div className="mt-2 font-display font-extrabold text-2xl text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col lg:flex-row gap-3 items-center">
          <div className="flex-1 w-full flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, age, timestamp..." className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            <select value={filterAge} onChange={e=>setFilterAge(e.target.value)} className="px-3 py-2.5 rounded-full border border-slate-200 bg-white text-sm">
              <option value="">All ages</option>
              <option value="0-17">0-17</option>
              <option value="18-25">18-25</option>
              <option value="26-35">26-35</option>
              <option value="36-50">36-50</option>
              <option value="51-85">51+</option>
            </select>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="px-3 py-2.5 rounded-full border border-slate-200 bg-white text-sm">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="confidence">Confidence</option>
              <option value="age-asc">Age ↑</option>
              <option value="age-desc">Age ↓</option>
            </select>
          </div>
          <div className="text-sm text-slate-500">{total} captures</div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Recent Captures</h3>
              <span className="text-xs bg-slate-900 text-white px-2 py-1 rounded-full">{captures.length} shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs tracking-widest text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Age</th>
                    <th className="text-left px-4 py-3">Range</th>
                    <th className="text-left px-4 py-3">Conf</th>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {captures.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">No captures found. Give consent and capture on /camera.</td></tr>}
                  {captures.map(c => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{c.id.slice(0,8)}…</td>
                      <td className="px-4 py-3 font-bold">{c.estimatedAge}</td>
                      <td className="px-4 py-3 text-slate-600">{c.range[0]}–{c.range[1]}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.confidence>90?'bg-emerald-50 text-emerald-700 border border-emerald-200':c.confidence>80?'bg-amber-50 text-amber-700 border border-amber-200':'bg-red-50 text-red-700 border border-red-200'}`}>{c.confidence}%</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right flex gap-1 justify-end">
                        <button onClick={()=>setSelected(c)} className="px-3 py-1.5 rounded-full bg-white border text-xs font-semibold hover:bg-slate-100">View</button>
                        <button onClick={()=>del(c.id)} className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gallery + Audit */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="font-bold text-slate-900">Private Gallery</h4>
              <p className="text-xs text-slate-500 mt-1">Images are private, never public. Click View to load via authenticated API.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {captures.filter(c=>c.hasImage).slice(0,9).map(c => (
                  <button key={c.id} onClick={()=>setSelected(c)} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img src={getApiUrl(`/api/admin/images/${c.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`)} alt="capture" className="w-full h-full object-cover group-hover:scale-105 transition" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                      <span className="text-white text-xs font-bold">{c.estimatedAge}y</span>
                    </div>
                  </button>
                ))}
                {captures.filter(c=>c.hasImage).length===0 && <div className="col-span-3 text-center py-8 text-sm text-slate-500 border-2 border-dashed rounded-xl">No images yet</div>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="font-bold text-slate-900">Audit Logs</h4>
              <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
                {audit.slice(0,20).map((a:any)=>(
                  <div key={a.id} className="text-xs border border-slate-100 rounded-lg px-3 py-2 bg-slate-50">
                    <div className="flex justify-between font-mono">
                      <span className="font-bold text-slate-700">{a.action}</span>
                      <span className="text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-600 truncate">{a.username} • {a.ip} {a.targetId && `• ${a.targetId.slice(0,8)}`}</div>
                  </div>
                ))}
                {audit.length===0 && <div className="text-sm text-slate-500">No logs yet</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=>setSelected(null)}>
          <div className="bg-white rounded-[20px] max-w-lg w-full overflow-hidden shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="relative bg-slate-900 aspect-[4/3]">
              <img src={getApiUrl(`/api/admin/images/${selected.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`)} alt="capture" className="w-full h-full object-contain" />
              <button onClick={()=>setSelected(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-slate-500">{selected.id}</div>
                  <div className="font-bold text-slate-900 text-lg">Age {selected.estimatedAge} • {selected.range[0]}–{selected.range[1]} • {selected.confidence}%</div>
                  <div className="text-xs text-slate-500">{new Date(selected.timestamp).toLocaleString()} • consent: {selected.consent ? 'yes' : 'no'}</div>
                </div>
                <button onClick={()=>{del(selected.id); setSelected(null)}} className="px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold">Delete</button>
              </div>
              <div className="bg-slate-50 border rounded-xl p-3 text-xs font-mono text-slate-700">
                Metadata stored: id, timestamp, estimatedAge, range, confidence, consent, imagePath (private)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
