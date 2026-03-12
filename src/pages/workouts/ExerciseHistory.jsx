import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getExerciseHistory } from '../../lib/api/workouts'
import { ArrowLeft, TrendingUp } from 'lucide-react'

function MiniChart({ history }) {
  if (history.length < 2) return null

  // Show weight progression (newest on right)
  const points = [...history].reverse().map((h) => h.topWeight)
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1

  const width = 280
  const height = 80
  const padding = 4
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const coords = points.map((val, i) => ({
    x: padding + (i / (points.length - 1)) * chartW,
    y: padding + chartH - ((val - min) / range) * chartH,
  }))

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  return (
    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 mb-4">
      <div className="text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1.5">
        <TrendingUp size={12} /> Top weight over time
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 80 }}>
        <path d={pathD} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill="white" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>{new Date(history[history.length - 1].date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(history[0].date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

export default function ExerciseHistory() {
  const [searchParams] = useSearchParams()
  const exerciseName = searchParams.get('name')
  const nav = useNavigate()
  const { user } = useAuth()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!exerciseName) return
    ;(async () => {
      const { history: data } = await getExerciseHistory(user.id, exerciseName)
      setHistory(data)
      setLoading(false)
    })()
  }, [exerciseName])

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-500 p-6">Loading...</div>
  }

  // Calculate PR
  const pr = history.reduce((best, h) => {
    return h.topWeight > (best?.topWeight || 0) ? h : best
  }, null)

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => nav(-1)}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{exerciseName}</h1>
          <p className="text-sm text-zinc-400">{history.length} session{history.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      {/* PR badge */}
      {pr && pr.topWeight > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-zinc-500 mb-1">Personal Record</div>
            <div className="text-2xl font-bold">{pr.topWeight}kg <span className="text-zinc-500 text-sm font-medium">x {pr.topReps}</span></div>
          </div>
          <div className="text-xs text-zinc-500">
            {new Date(pr.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* Weight progression chart */}
      <MiniChart history={history} />

      {/* Session list */}
      <div className="space-y-3">
        {history.map((h) => (
          <button
            key={h.sessionId}
            onClick={() => nav(`/session/${h.sessionId}`)}
            className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs text-zinc-500">
                {new Date(h.date).toLocaleDateString('en-AU', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}
              </div>
              <div className="text-xs text-zinc-500">{h.volume} kg vol</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {h.sets.map((s) => (
                <span
                  key={s.id}
                  className="text-xs bg-zinc-950/50 border border-zinc-800/50 px-2 py-1 rounded-lg text-zinc-300"
                >
                  {s.weight_kg != null ? `${s.weight_kg}kg` : '?'} x {s.reps ?? '?'}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {history.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
          No history for this exercise yet.
        </div>
      )}
    </div>
  )
}
