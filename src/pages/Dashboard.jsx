import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../lib/api/profile'
import { getTodayMeals } from '../lib/api/nutrition'
import { getSessions, getTemplates } from '../lib/api/workouts'
import { Utensils, Dumbbell, ChevronRight, Play } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [profile, setProfile] = useState(null)
  const [todayTotals, setTodayTotals] = useState({ protein: 0, fat: 0, carbs: 0, calories: 0 })
  const [lastSession, setLastSession] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [profileResult, mealsResult, sessionsResult, templatesResult] = await Promise.all([
        getProfile(user.id),
        getTodayMeals(user.id),
        getSessions(user.id, 1),
        getTemplates(user.id),
      ])

      if (profileResult.data) setProfile(profileResult.data)
      if (!mealsResult.error) setTodayTotals(mealsResult.totals)
      if (sessionsResult.data?.length) setLastSession(sessionsResult.data[0])
      if (templatesResult.data) setTemplates(templatesResult.data)

      setLoading(false)
    })()
  }, [])

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    )
  }

  const calorieTarget = profile?.target_calories || 0
  const caloriePercent = calorieTarget > 0 ? Math.min(100, Math.round((todayTotals.calories / calorieTarget) * 100)) : 0
  const proteinTarget = profile?.target_protein || 0
  const proteinPercent = proteinTarget > 0 ? Math.min(100, Math.round((todayTotals.protein / proteinTarget) * 100)) : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Apex</h1>
          <p className="text-zinc-500 text-sm">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={handleSignOut} className="text-sm font-medium text-zinc-400 hover:text-white">
          Sign out
        </button>
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

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold">{todayTotals.calories}</span>
          <span className="text-zinc-500 text-sm">/ {calorieTarget} cal</span>
          <span className="text-zinc-600 text-xs ml-auto">{caloriePercent}%</span>
        </div>

        {/* Calorie progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${caloriePercent}%` }}
          />
        </div>

        {/* Macro breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', value: todayTotals.protein, target: proteinTarget, color: 'text-blue-400' },
            { label: 'Fat', value: todayTotals.fat, target: profile?.target_fat || 0, color: 'text-amber-400' },
            { label: 'Carbs', value: todayTotals.carbs, target: profile?.target_carbs || 0, color: 'text-green-400' },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-xs text-zinc-500 mb-0.5">{m.label}</div>
              <div className="text-sm font-bold">
                <span className={m.color}>{m.value}g</span>
                <span className="text-zinc-600"> / {m.target}g</span>
              </div>
            </div>
          ))}
        </div>
      </button>

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
