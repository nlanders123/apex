import { useEffect, useState } from 'react'
import { CalendarHeart, Plus, Trash2, X, Flame } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { getCaloriePlans, createCaloriePlan, deleteCaloriePlan, getAdjustedTarget } from '../lib/api/calorie-plans'

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date(isoDate(new Date()) + 'T00:00:00')
  return Math.ceil((target - today) / 86400000)
}

export default function CaloriePlanManager({ baseTarget, selectedDate, onTargetAdjusted }) {
  const { user } = useAuth()
  const toast = useToast()
  const [plans, setPlans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    name: '',
    eventDate: '',
    eventCalories: '',
    prepDays: '7',
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    if (plans.length && baseTarget) {
      const { adjustedTarget, activePlans } = getAdjustedTarget(plans, baseTarget, selectedDate)
      onTargetAdjusted(adjustedTarget, activePlans)
    } else {
      onTargetAdjusted(baseTarget, [])
    }
  }, [plans, baseTarget, selectedDate])

  const fetchPlans = async () => {
    const { data } = await getCaloriePlans(user.id)
    setPlans(data)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const eventCalories = Number(form.eventCalories)
    const prepDays = Number(form.prepDays)
    if (!form.name || !form.eventDate || !eventCalories || !prepDays) {
      toast('Fill in all fields', 'error')
      return
    }
    if (eventCalories <= baseTarget) {
      toast('Event calories should be higher than your daily target', 'error')
      return
    }
    if (prepDays < 1 || prepDays > 30) {
      toast('Prep days must be 1-30', 'error')
      return
    }

    const { error } = await createCaloriePlan(user.id, {
      name: form.name,
      eventDate: form.eventDate,
      eventCalories,
      prepDays,
    })

    if (error) {
      toast(error.message, 'error')
      return
    }

    const extra = eventCalories - baseTarget
    const dailyBank = Math.round(extra / prepDays)
    toast(`Plan created — banking ${dailyBank} cal/day for ${prepDays} days`, 'success')
    setForm({ name: '', eventDate: '', eventCalories: '', prepDays: '7' })
    setShowForm(false)
    fetchPlans()
  }

  const handleDelete = async (planId) => {
    const { error } = await deleteCaloriePlan(user.id, planId)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Plan removed', 'success')
    fetchPlans()
  }

  // Compute active info for display
  const { activePlans } = getAdjustedTarget(plans, baseTarget, selectedDate)
  const hasActivePlan = activePlans.length > 0

  return (
    <div className="mb-6">
      {/* Compact header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition mb-2"
      >
        <CalendarHeart size={14} className={hasActivePlan ? 'text-amber-400' : ''} />
        {hasActivePlan
          ? `Calorie plan active — ${activePlans[0].effect}`
          : `Calorie planning${plans.length ? ` (${plans.length} plan${plans.length > 1 ? 's' : ''})` : ''}`
        }
      </button>

      {expanded && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Calorie Plans</div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 text-xs font-bold text-zinc-300 bg-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-700 transition"
            >
              {showForm ? <X size={12} /> : <Plus size={12} />}
              {showForm ? 'Cancel' : 'New plan'}
            </button>
          </div>

          {/* Explanation */}
          {!plans.length && !showForm && (
            <div className="text-sm text-zinc-500 text-center py-3">
              Plan ahead for big meals. Bank calories in advance so you can enjoy events guilt-free.
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreate} className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Event name (e.g., Birthday dinner)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-zinc-600"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">Event date</label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white text-sm outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">Event calories</label>
                  <input
                    type="number"
                    placeholder="3500"
                    value={form.eventCalories}
                    onChange={(e) => setForm({ ...form, eventCalories: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white text-sm outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">Prep days</label>
                  <input
                    type="number"
                    value={form.prepDays}
                    onChange={(e) => setForm({ ...form, prepDays: e.target.value })}
                    min="1"
                    max="30"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-white text-sm outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Preview */}
              {form.eventCalories && Number(form.eventCalories) > baseTarget && form.prepDays && (() => {
                const extra = Number(form.eventCalories) - baseTarget
                const daily = Math.round(extra / Number(form.prepDays))
                const adjusted = Math.max(1200, baseTarget - daily)
                return (
                  <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-xs text-zinc-400 space-y-1">
                    <div><Flame size={12} className="inline text-amber-400 mr-1" />
                      Bank <span className="text-white font-bold">{daily}</span> cal/day for <span className="text-white font-bold">{form.prepDays}</span> days
                    </div>
                    <div>Daily target: <span className="text-white font-bold">{adjusted}</span> cal during prep</div>
                    <div>Event day: <span className="text-amber-400 font-bold">{form.eventCalories}</span> cal</div>
                  </div>
                )
              })()}

              <button type="submit" className="w-full bg-white text-zinc-950 font-bold rounded-xl py-2.5 hover:bg-zinc-200 transition text-sm">
                Create plan
              </button>
            </form>
          )}

          {/* Existing plans */}
          {plans.length > 0 && (
            <div className="space-y-2">
              {plans.map((plan) => {
                const days = daysUntil(plan.event_date)
                const extra = plan.event_calories - baseTarget
                const dailyBank = Math.round(extra / plan.prep_days)
                const isPast = days < 0
                const isEventDay = days === 0
                const isPrepping = days > 0 && days <= plan.prep_days

                return (
                  <div
                    key={plan.id}
                    className={`flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border ${
                      isEventDay ? 'border-amber-500/50' : isPrepping ? 'border-amber-500/20' : 'border-zinc-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{plan.name}</span>
                        {isEventDay && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">TODAY</span>}
                        {isPrepping && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">BANKING</span>}
                        {isPast && <span className="text-[10px] font-bold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">PAST</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {formatDateShort(plan.event_date)}
                        {' · '}{plan.event_calories} cal
                        {' · '}{isPrepping ? `${days}d to go · -${dailyBank} cal/day` : isPast ? 'completed' : `${days}d away`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
