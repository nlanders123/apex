import { useEffect, useMemo, useState } from 'react'
import { Plus, Copy, ChevronLeft, ChevronRight, Droplets, ChefHat, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { getProfile, updateTargets } from '../lib/api/profile'
import { getMealsForDate, copyYesterdayMeals, addWater, getWeekSummary } from '../lib/api/nutrition'
import MealLoggerModal from '../components/MealLoggerModal'
import RecipeBuilderModal from '../components/RecipeBuilderModal'

const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const WATER_INCREMENTS = [250, 500]

function labelToEnum(label) {
  return label.toLowerCase() === 'snacks' ? 'snack' : label.toLowerCase()
}

function isoDate(d) {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr) {
  const today = isoDate(new Date())
  const yesterday = isoDate(new Date(Date.now() - 86400000))
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function Nutrition() {
  const { user } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditingTargets, setIsEditingTargets] = useState(false)
  const [targetForm, setTargetForm] = useState({ protein: 0, fat: 0, carbs: 0 })

  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()))
  const [meals, setMeals] = useState([])
  const [totals, setTotals] = useState({ protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, sodium: 0, sugar: 0 })
  const [waterMl, setWaterMl] = useState(0)

  const [activeModalMealType, setActiveModalMealType] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [recipeMealType, setRecipeMealType] = useState('Dinner')
  const [weekSummary, setWeekSummary] = useState(null)
  const [showWeekly, setShowWeekly] = useState(false)

  const isToday = selectedDate === isoDate(new Date())

  useEffect(() => {
    ;(async () => {
      await fetchProfile()
      await fetchMeals()
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchMeals()
      fetchWeekSummary()
    }
  }, [selectedDate])

  const fetchProfile = async () => {
    const { data, error } = await getProfile(user.id)
    if (error) { console.error(error); return }

    setProfile(data)
    setTargetForm({
      protein: data.target_protein,
      fat: data.target_fat,
      carbs: data.target_carbs,
    })
  }

  const fetchWeekSummary = async () => {
    const { averages, error } = await getWeekSummary(user.id, selectedDate)
    if (!error && averages) setWeekSummary(averages)
  }

  const fetchMeals = async () => {
    const { meals: m, totals: t, waterMl: w, error } = await getMealsForDate(user.id, selectedDate)
    if (error) { console.error(error); return }

    setMeals(m)
    setTotals(t)
    setWaterMl(w)
  }

  const remaining = useMemo(() => {
    if (!profile) return { protein: 0, fat: 0, carbs: 0, calories: 0 }
    return {
      protein: Math.max(0, (profile.target_protein || 0) - totals.protein),
      fat: Math.max(0, (profile.target_fat || 0) - totals.fat),
      carbs: Math.max(0, (profile.target_carbs || 0) - totals.carbs),
      calories: Math.max(0, (profile.target_calories || 0) - totals.calories),
    }
  }, [profile, totals])

  const handleUpdateTargets = async (e) => {
    e.preventDefault()
    const { data, error } = await updateTargets(user.id, {
      protein: Number(targetForm.protein),
      fat: Number(targetForm.fat),
      carbs: Number(targetForm.carbs),
    })

    if (error) { console.error(error); return }

    setProfile(data)
    setIsEditingTargets(false)
  }

  const handleCopyYesterday = async (mealLabel) => {
    const category = labelToEnum(mealLabel)
    const { error } = await copyYesterdayMeals(user.id, category)

    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    await fetchMeals()
  }

  const handleAddWater = async (ml) => {
    const { error } = await addWater(user.id, ml, selectedDate)
    if (error) {
      toast(error.message || 'Failed to log water', 'error')
      return
    }
    setWaterMl((prev) => prev + ml)
    toast(`+${ml}ml water`, 'success')
  }

  const navigateDate = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    // Don't allow future dates
    if (d > new Date()) return
    setSelectedDate(isoDate(d))
  }

  const openAddModal = (mealLabel) => {
    setEditingMeal(null)
    setActiveModalMealType(mealLabel)
  }

  const openEditModal = (meal) => {
    setActiveModalMealType(null)
    setEditingMeal(meal)
  }

  const closeModal = () => {
    setActiveModalMealType(null)
    setEditingMeal(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      {/* Header with date navigation */}
      <header className="mb-6">
        <div className="flex justify-between items-end mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Nutrition</h1>
          <button
            onClick={() => setIsEditingTargets(!isEditingTargets)}
            className="text-xs font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 hover:text-white transition"
          >
            {isEditingTargets ? 'Cancel' : 'Edit targets'}
          </button>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSelectedDate(isoDate(new Date()))}
            className={`text-sm font-bold px-3 py-1 rounded-lg transition ${isToday ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {formatDateLabel(selectedDate)}
          </button>
          <button
            onClick={() => navigateDate(1)}
            disabled={isToday}
            className="p-2 text-zinc-400 hover:text-white transition disabled:text-zinc-700 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {isEditingTargets ? (
        <form onSubmit={handleUpdateTargets} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <h3 className="font-bold mb-4">Set daily targets</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { key: 'protein', label: 'Protein (g)' },
              { key: 'fat', label: 'Fat (g)' },
              { key: 'carbs', label: 'Carbs (g)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={targetForm[key]}
                  onChange={(e) => setTargetForm({ ...targetForm, [key]: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600"
                />
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-white text-zinc-950 font-bold rounded-xl py-2.5 hover:bg-zinc-200 transition">
            Save
          </button>
        </form>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Calories</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totals.calories}</span>
                <span className="text-zinc-500 font-medium">/ {profile?.target_calories || 0}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Remaining: <span className="text-zinc-200 font-semibold">{remaining.calories}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            {[
              { label: 'Protein', value: totals.protein, target: profile?.target_protein, rem: remaining.protein },
              { label: 'Fat', value: totals.fat, target: profile?.target_fat, rem: remaining.fat },
              { label: 'Carbs', value: totals.carbs, target: profile?.target_carbs, rem: remaining.carbs },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                <div className="text-zinc-500 text-xs font-bold mb-1">{m.label}</div>
                <div className="font-bold">
                  {m.value} <span className="text-zinc-600">/ {m.target}g</span>
                </div>
                <div className="text-[11px] text-zinc-600 mt-1">Rem: {m.rem}g</div>
              </div>
            ))}
          </div>

          {/* Micronutrients row */}
          {(totals.fiber > 0 || totals.sugar > 0 || totals.sodium > 0) && (
            <div className="flex gap-4 text-xs text-zinc-500 border-t border-zinc-800/50 pt-3">
              {totals.fiber > 0 && <span>Fiber: <span className="text-zinc-300">{totals.fiber}g</span></span>}
              {totals.sugar > 0 && <span>Sugar: <span className="text-zinc-300">{totals.sugar}g</span></span>}
              {totals.sodium > 0 && <span>Sodium: <span className="text-zinc-300">{totals.sodium}mg</span></span>}
            </div>
          )}
        </div>
      )}

      {/* Water tracking */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-zinc-400">Water</span>
            <span className="text-lg font-bold text-white ml-2">
              {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
            </span>
          </div>
          <div className="flex gap-2">
            {WATER_INCREMENTS.map((ml) => (
              <button
                key={ml}
                onClick={() => handleAddWater(ml)}
                className="text-xs font-bold text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition active:scale-95"
              >
                +{ml}ml
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly summary toggle */}
      {weekSummary && (
        <div className="mb-6">
          <button
            onClick={() => setShowWeekly(!showWeekly)}
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition mb-2"
          >
            <BarChart3 size={14} />
            {showWeekly ? 'Hide' : 'Show'} weekly averages ({weekSummary.daysLogged} days logged)
          </button>
          {showWeekly && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">Weekly Average (per day)</div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold">{weekSummary.calories}</div>
                  <div className="text-[11px] text-zinc-500">cal</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{weekSummary.protein}g</div>
                  <div className="text-[11px] text-zinc-500">protein</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-400">{weekSummary.fat}g</div>
                  <div className="text-[11px] text-zinc-500">fat</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{weekSummary.carbs}g</div>
                  <div className="text-[11px] text-zinc-500">carbs</div>
                </div>
              </div>
              {weekSummary.water_ml > 0 && (
                <div className="text-xs text-zinc-500 mt-2 border-t border-zinc-800/50 pt-2">
                  Avg water: <span className="text-zinc-300">{weekSummary.water_ml >= 1000 ? `${(weekSummary.water_ml / 1000).toFixed(1)}L` : `${weekSummary.water_ml}ml`}</span>/day
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meal categories */}
      <div className="space-y-4">
        {MEAL_CATEGORIES.map((mealLabel) => {
          const mealsInCategory = meals.filter((m) => m.category === labelToEnum(mealLabel))
          const categoryCalories = mealsInCategory.reduce((sum, m) => sum + (m.calories || 0), 0)

          return (
            <div key={mealLabel} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-bold text-lg">{mealLabel}</h3>
                  {categoryCalories > 0 && (
                    <span className="text-xs text-zinc-500 font-medium">{categoryCalories} cal</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isToday && (
                    <button
                      onClick={() => handleCopyYesterday(mealLabel)}
                      className="flex items-center gap-1 text-xs font-bold text-zinc-300 bg-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-700 transition"
                      title="Copy yesterday"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  )}
                  <button
                    onClick={() => { setRecipeMealType(mealLabel); setRecipeModalOpen(true) }}
                    className="flex items-center gap-1 text-xs font-bold text-zinc-300 bg-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-700 transition"
                    title="Build recipe"
                  >
                    <ChefHat size={14} />
                  </button>
                  <button
                    onClick={() => openAddModal(mealLabel)}
                    className="flex items-center gap-1 text-sm font-bold text-zinc-900 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition"
                  >
                    <Plus size={16} strokeWidth={3} /> Add
                  </button>
                </div>
              </div>

              {mealsInCategory.length === 0 ? (
                <div className="text-sm text-zinc-500 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-center border-dashed">
                  No foods logged yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {mealsInCategory.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => openEditModal(m)}
                      className="w-full text-left flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-950/70 transition"
                      title="Click to edit"
                    >
                      <span className="font-medium text-sm">{m.name}</span>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400 font-bold">{m.calories} cal</div>
                        <div className="text-[11px] text-zinc-600">
                          {m.protein}P  {m.fat}F  {m.carbs}C
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <MealLoggerModal
        isOpen={!!activeModalMealType}
        onClose={closeModal}
        mealType={activeModalMealType || ''}
        onLogSuccess={fetchMeals}
        selectedDate={selectedDate}
      />

      <MealLoggerModal
        isOpen={!!editingMeal}
        onClose={closeModal}
        mealType={editingMeal?.category || ''}
        existingMeal={editingMeal}
        onLogSuccess={fetchMeals}
        selectedDate={selectedDate}
      />

      <RecipeBuilderModal
        isOpen={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        mealType={recipeMealType}
        onLogSuccess={fetchMeals}
        selectedDate={selectedDate}
      />
    </div>
  )
}
