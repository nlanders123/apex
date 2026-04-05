import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../lib/api/profile'
import { getTodayMeals } from '../lib/api/nutrition'
import { getSessions, getTemplates, getWorkoutStats } from '../lib/api/workouts'
import { getLatestWeight, logWeight, getWeightHistory } from '../lib/api/weight'
import { useToast } from '../components/Toast'
import { Utensils, Dumbbell, ChevronRight, Play, Scale, X, TrendingUp, TrendingDown, Droplets, Plus } from 'lucide-react'
import { addWater } from '../lib/api/nutrition'
import CalorieRing from '../components/CalorieRing'
import DailyHealthScore from '../components/DailyHealthScore'

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [profile, setProfile] = useState(null)
  const [todayTotals, setTodayTotals] = useState({ protein: 0, fat: 0, carbs: 0, calories: 0 })
  const [lastSession, setLastSession] = useState(null)
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState({ thisWeek: 0, streak: 0, total: 0 })
  const [latestWeight, setLatestWeight] = useState(null)
  const [weightHistory, setWeightHistory] = useState([])
  const [weightInput, setWeightInput] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      const [profileResult, mealsResult, sessionsResult, templatesResult, statsResult, weightResult, historyResult] = await Promise.all([
        getProfile(user.id),
        getTodayMeals(user.id),
        getSessions(user.id, 1),
        getTemplates(user.id),
        getWorkoutStats(user.id),
        getLatestWeight(user.id),
        getWeightHistory(user.id, 30),
      ])

      if (profileResult.data) setProfile(profileResult.data)
      if (!mealsResult.error) setTodayTotals(mealsResult.totals)
      if (sessionsResult.data?.length) setLastSession(sessionsResult.data[0])
      if (templatesResult.data) setTemplates(templatesResult.data)
      if (!statsResult.error) setStats(statsResult)
      if (weightResult.data) setLatestWeight(weightResult.data)
      if (historyResult.data?.length) setWeightHistory(historyResult.data)

      setLoading(false)
    })()
  }, [])

  const weightChart = useMemo(() => {
    if (weightHistory.length < 2) return null
    const points = [...weightHistory].reverse().map((h) => h.weight_kg)
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

    const oldest = weightHistory[weightHistory.length - 1]
    const newest = weightHistory[0]
    const diff = (newest.weight_kg - oldest.weight_kg).toFixed(1)

    return {
      width,
      height,
      coords,
      pathD,
      diff,
      isUp: diff > 0,
      startDate: new Date(oldest.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      endDate: new Date(newest.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    }
  }, [weightHistory])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    )
  }

  const calorieTarget = profile?.target_calories || 0
  const proteinTarget = profile?.target_protein || 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 pb-24 overflow-x-hidden max-w-lg mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Apex</h1>
        <p className="text-zinc-500 text-sm">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {/* Today's nutrition summary */}
      <button
        onClick={() => nav('/nutrition')}
        className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 hover:bg-zinc-800/50 transition"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Utensils size={16} className="text-zinc-500" />
            <span className="text-sm font-bold text-zinc-400">Today&apos;s Nutrition</span>
          </div>
          <ChevronRight size={16} className="text-zinc-600" />
        </div>

        <CalorieRing
          calories={todayTotals.calories}
          calorieTarget={calorieTarget}
          protein={todayTotals.protein}
          proteinTarget={proteinTarget}
          fat={todayTotals.fat}
          fatTarget={profile?.target_fat || 0}
          carbs={todayTotals.carbs}
          carbsTarget={profile?.target_carbs || 0}
          compact
        />
      </button>

      {/* Daily health score */}
      <div className="mb-4">
        <DailyHealthScore selectedDate={new Date().toLocaleDateString('en-CA')} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            onClick={() => nav(`/nutrition?add=meal_${n}`)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-center hover:bg-zinc-800/50 transition active:scale-95"
          >
            <Plus size={14} className="mx-auto text-zinc-400 mb-1" />
            <div className="text-[10px] font-bold text-zinc-500">Meal {n}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={async () => {
            const today = new Date().toISOString().split('T')[0]
            const { error } = await addWater(user.id, 500, today)
            if (error) toast(error.message, 'error')
            else toast('+500ml water', 'success')
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-zinc-800/50 transition active:scale-95"
        >
          <Droplets size={14} className="text-blue-400" />
          <span className="text-xs font-bold text-zinc-400">+500ml Water</span>
        </button>
        {templates.length > 0 && (
          <button
            onClick={() => nav(`/template/${templates[0].id}`)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-zinc-800/50 transition active:scale-95"
          >
            <Play size={14} className="text-zinc-400" />
            <span className="text-xs font-bold text-zinc-400 truncate">{templates[0].name}</span>
          </button>
        )}
      </div>

      {/* Last workout */}
      {lastSession && (
        <button
          onClick={() => nav(`/session/${lastSession.id}`)}
          className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 hover:bg-zinc-800/50 transition"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Dumbbell size={16} className="text-zinc-500" />
              <span className="text-sm font-bold text-zinc-400">Last Workout</span>
            </div>
            <ChevronRight size={16} className="text-zinc-600" />
          </div>
          <div className="font-bold text-lg">{lastSession.name}</div>
          <div className="text-xs text-zinc-500">
            {new Date(lastSession.date).toLocaleDateString('en-AU', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
            {lastSession.duration_minutes ? ` · ${lastSession.duration_minutes} min` : ''}
          </div>
        </button>
      )}

      {/* Workout stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <div className="text-xs text-zinc-500">This week</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.streak}</div>
            <div className="text-xs text-zinc-500">Day streak</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-zinc-500">Total</div>
          </div>
        </div>
      )}

      {/* Body weight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-zinc-500" />
            <span className="text-sm font-bold text-zinc-400">Body Weight</span>
          </div>
          {!showWeightInput && (
            <button
              onClick={() => {
                setShowWeightInput(true)
                setWeightInput(latestWeight?.weight_kg?.toString() || '')
              }}
              className="text-xs font-bold text-zinc-400 hover:text-white transition"
            >
              {latestWeight ? 'Update' : 'Log'}
            </button>
          )}
        </div>

        {showWeightInput ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const kg = parseFloat(weightInput)
              if (!kg || kg < 20 || kg > 300) {
                toast('Enter a valid weight', 'error')
                return
              }
              const { data, error } = await logWeight(user.id, kg)
              if (error) {
                toast(error.message, 'error')
                return
              }
              setLatestWeight(data)
              setShowWeightInput(false)
              toast('Weight logged', 'success')
              const { data: updated } = await getWeightHistory(user.id, 30)
              if (updated?.length) setWeightHistory(updated)
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="e.g. 85.0"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-zinc-600"
                autoFocus
              />
              <span className="absolute right-3 top-2.5 text-zinc-600 text-sm">kg</span>
            </div>
            <button type="submit" className="bg-white text-zinc-950 font-bold px-4 rounded-xl hover:bg-zinc-200 transition">
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowWeightInput(false)}
              className="text-zinc-400 hover:text-white px-2"
            >
              <X size={16} />
            </button>
          </form>
        ) : latestWeight ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{latestWeight.weight_kg} kg</span>
              <span className="text-xs text-zinc-500">
                {new Date(latestWeight.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
              {weightChart && (
                <span className={`flex items-center gap-0.5 text-xs ml-auto ${weightChart.isUp ? 'text-red-400' : 'text-green-400'}`}>
                  {weightChart.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {weightChart.isUp ? '+' : ''}{weightChart.diff} kg
                </span>
              )}
            </div>

            {weightChart && (
              <div className="mt-4 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3">
                <svg viewBox={`0 0 ${weightChart.width} ${weightChart.height}`} className="w-full" style={{ maxHeight: 80 }}>
                  <path d={weightChart.pathD} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {weightChart.coords.map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r="3" fill="white" />
                  ))}
                </svg>
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 px-1">
                  <span>{weightChart.startDate}</span>
                  <span>{weightChart.endDate}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">No weight logged yet. Tap Log to start tracking.</div>
        )}
      </div>

      {/* Quick start */}
      {templates.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="text-sm font-bold text-zinc-400 mb-3">Quick Start</div>
          <div className="space-y-2">
            {templates.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => nav(`/template/${t.id}`)}
                className="w-full text-left flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-950/70 transition"
              >
                <span className="font-medium text-sm">{t.name}</span>
                <Play size={14} className="text-zinc-500" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
