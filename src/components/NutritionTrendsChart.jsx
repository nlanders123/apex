import { useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getNutritionHistory } from '../lib/api/nutrition'

const PERIODS = [7, 14, 30]

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function NutritionTrendsChart() {
  const { user } = useAuth()
  const [days, setDays] = useState(7)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getNutritionHistory(user.id, days).then(({ data }) => {
      if (!cancelled) {
        setHistory(data || [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [user.id, days])

  const daysWithData = useMemo(() => history.filter((d) => d.hasData), [history])

  const calorieChart = useMemo(() => {
    if (daysWithData.length < 2) return null

    const points = daysWithData.map((d) => d.calories)
    const max = Math.max(...points)
    const min = Math.min(...points)
    const range = max - min || 1
    const width = 300
    const height = 100
    const padding = 6
    const chartW = width - padding * 2
    const chartH = height - padding * 2

    const coords = points.map((val, i) => ({
      x: padding + (i / (points.length - 1)) * chartW,
      y: padding + chartH - ((val - min) / range) * chartH,
    }))
    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

    // Gradient area path
    const areaD = pathD + ` L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`

    const avg = Math.round(points.reduce((s, v) => s + v, 0) / points.length)

    return { width, height, coords, pathD, areaD, avg, max, min }
  }, [daysWithData])

  const macroChart = useMemo(() => {
    if (daysWithData.length < 2) return null

    const macros = ['protein', 'fat', 'carbs']
    const colors = { protein: '#60a5fa', fat: '#fbbf24', carbs: '#4ade80' }
    const width = 300
    const height = 60
    const padding = 6
    const chartW = width - padding * 2
    const chartH = height - padding * 2

    // Find global max across all macros for consistent scale
    const allValues = macros.flatMap((m) => daysWithData.map((d) => d[m]))
    const max = Math.max(...allValues)
    const min = 0
    const range = max || 1

    const lines = macros.map((macro) => {
      const points = daysWithData.map((d) => d[macro])
      const coords = points.map((val, i) => ({
        x: padding + (i / (points.length - 1)) * chartW,
        y: padding + chartH - ((val - min) / range) * chartH,
      }))
      const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
      const avg = Math.round(points.reduce((s, v) => s + v, 0) / points.length)
      return { macro, color: colors[macro], pathD, avg }
    })

    return { width, height, lines }
  }, [daysWithData])

  if (loading) return null

  if (daysWithData.length < 2) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nutrition Trends</span>
        </div>
        <div className="text-sm text-zinc-500 text-center py-4">
          Log at least 2 days to see trends
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
      {/* Header + period toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-zinc-500" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nutrition Trends</span>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                days === p
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Calorie chart */}
      {calorieChart && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-bold">Calories</span>
            <span className="text-xs text-zinc-500">avg {calorieChart.avg}/day</span>
          </div>
          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3">
            <svg viewBox={`0 0 ${calorieChart.width} ${calorieChart.height}`} className="w-full" style={{ maxHeight: 100 }}>
              <defs>
                <linearGradient id="calArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={calorieChart.areaD} fill="url(#calArea)" />
              <path d={calorieChart.pathD} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {calorieChart.coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="white" />
              ))}
            </svg>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 px-1">
              <span>{formatShortDate(daysWithData[0].date)}</span>
              <span>{formatShortDate(daysWithData[daysWithData.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Macro chart */}
      {macroChart && (
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-sm font-bold">Macros</span>
            {macroChart.lines.map((l) => (
              <span key={l.macro} className="text-[11px]" style={{ color: l.color }}>
                {l.macro[0].toUpperCase()}: {l.avg}g
              </span>
            ))}
          </div>
          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3">
            <svg viewBox={`0 0 ${macroChart.width} ${macroChart.height}`} className="w-full" style={{ maxHeight: 60 }}>
              {macroChart.lines.map((l) => (
                <path key={l.macro} d={l.pathD} fill="none" stroke={l.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
              ))}
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
