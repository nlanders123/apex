import { useEffect, useMemo, useState } from 'react'
import { Plus, Copy, ChevronLeft, ChevronRight, Droplets, ChefHat, BarChart3, Calendar, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { getProfile, updateTargets, updateProfile } from '../lib/api/profile'
import { getMealsForDate, copyMealsFromDate, getRecentDatesWithMeals, addWater, getWeekSummary } from '../lib/api/nutrition'
import MealLoggerModal from '../components/MealLoggerModal'
import RecipeBuilderModal from '../components/RecipeBuilderModal'
import NutritionTrendsChart from '../components/NutritionTrendsChart'
import CaloriePlanManager from '../components/CaloriePlanManager'

const DEFAULT_MEAL_COUNT = 6
const WATER_INCREMENTS = [250, 500]

function getMealSlots(count) {
  return Array.from({ length: count }, (_, i) => ({
    key: `meal_${i + 1}`,
    label: `Meal ${i + 1}`,
  }))
}

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLabel(dateStr) {
  const today = isoDate(new Date())
  const yesterday = isoDate(new Date(Date.now() - 86400000))
  const tomorrow = isoDate(new Date(Date.now() + 86400000))
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  if (dateStr === tomorrow) return 'Tomorrow'
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
  const [targetForm, setTargetForm] = useState({ protein: 0, fat: 0, carbs: 0, fiber: 30, sugar: 50, sodium: 2300, saturated_fat: 22, cholesterol: 300, potassium: 3400, vitamin_a: 900, vitamin_c: 90, calcium: 1000, iron: 8 })

  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()))
  const [meals, setMeals] = useState([])
  const [totals, setTotals] = useState({ protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, sodium: 0, sugar: 0, saturated_fat: 0, trans_fat: 0, cholesterol: 0, potassium: 0, vitamin_a: 0, vitamin_c: 0, calcium: 0, iron: 0 })
  const [waterMl, setWaterMl] = useState(0)

  const [activeModalMealType, setActiveModalMealType] = useState(null)
  const [editingMeal, setEditingMeal] = useState(null)
  const [recipeModalOpen, setRecipeModalOpen] = useState(false)
  const [recipeMealType, setRecipeMealType] = useState('Dinner')
  const [weekSummary, setWeekSummary] = useState(null)
  const [showWeekly, setShowWeekly] = useState(false)
  const [copyPickerFor, setCopyPickerFor] = useState(null)
  const [copyDates, setCopyDates] = useState([])
  const [adjustedCalorieTarget, setAdjustedCalorieTarget] = useState(null)
  const [activePlans, setActivePlans] = useState([])
  const [showMicros, setShowMicros] = useState(false)
  const [mealCount, setMealCount] = useState(DEFAULT_MEAL_COUNT)

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
    if (data.meal_count) setMealCount(data.meal_count)
    setTargetForm({
      protein: data.target_protein,
      fat: data.target_fat,
      carbs: data.target_carbs,
      fiber: data.target_fiber ?? 30,
      sugar: data.target_sugar ?? 50,
      sodium: data.target_sodium ?? 2300,
      saturated_fat: data.target_saturated_fat ?? 22,
      cholesterol: data.target_cholesterol ?? 300,
      potassium: data.target_potassium ?? 3400,
      vitamin_a: data.target_vitamin_a ?? 900,
      vitamin_c: data.target_vitamin_c ?? 90,
      calcium: data.target_calcium ?? 1000,
      iron: data.target_iron ?? 8,
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

  const effectiveCalorieTarget = adjustedCalorieTarget ?? profile?.target_calories ?? 0

  const remaining = useMemo(() => {
    if (!profile) return { protein: 0, fat: 0, carbs: 0, calories: 0 }
    return {
      protein: (profile.target_protein || 0) - totals.protein,
      fat: (profile.target_fat || 0) - totals.fat,
      carbs: (profile.target_carbs || 0) - totals.carbs,
      calories: effectiveCalorieTarget - totals.calories,
    }
  }, [profile, totals, effectiveCalorieTarget])

  const handleUpdateTargets = async (e) => {
    e.preventDefault()
    const { data, error } = await updateTargets(user.id, {
      protein: Number(targetForm.protein),
      fat: Number(targetForm.fat),
      carbs: Number(targetForm.carbs),
    })

    if (error) { console.error(error); return }

    await updateProfile(user.id, {
      target_fiber: Number(targetForm.fiber),
      target_sugar: Number(targetForm.sugar),
      target_sodium: Number(targetForm.sodium),
      target_saturated_fat: Number(targetForm.saturated_fat),
      target_cholesterol: Number(targetForm.cholesterol),
      target_potassium: Number(targetForm.potassium),
      target_vitamin_a: Number(targetForm.vitamin_a),
      target_vitamin_c: Number(targetForm.vitamin_c),
      target_calcium: Number(targetForm.calcium),
      target_iron: Number(targetForm.iron),
    })

    setProfile({ ...data,
      target_fiber: Number(targetForm.fiber),
      target_sugar: Number(targetForm.sugar),
      target_sodium: Number(targetForm.sodium),
      target_saturated_fat: Number(targetForm.saturated_fat),
      target_cholesterol: Number(targetForm.cholesterol),
      target_potassium: Number(targetForm.potassium),
      target_vitamin_a: Number(targetForm.vitamin_a),
      target_vitamin_c: Number(targetForm.vitamin_c),
      target_calcium: Number(targetForm.calcium),
      target_iron: Number(targetForm.iron),
    })
    setIsEditingTargets(false)
  }

  const handleOpenCopyPicker = async (mealKey, mealLabel) => {
    const { data: dates } = await getRecentDatesWithMeals(user.id, mealKey)
    const filtered = dates.filter((d) => d !== selectedDate)
    if (filtered.length === 0) {
      toast('No previous meals to copy', 'info')
      return
    }
    setCopyDates(filtered)
    setCopyPickerFor({ key: mealKey, label: mealLabel })
  }

  const handleCopyFromDate = async (fromDate) => {
    const { error } = await copyMealsFromDate(user.id, copyPickerFor.key, fromDate, selectedDate)
    const label = copyPickerFor.label
    setCopyPickerFor(null)

    if (error) {
      toast(error.message, 'error')
      return
    }

    toast(`Copied ${label} from ${formatDateLabel(fromDate)}`, 'success')
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
    setSelectedDate(isoDate(d))
  }

  const openAddModal = (mealKey) => {
    setEditingMeal(null)
    setActiveModalMealType(mealKey)
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
    <div className="min-h-screen bg-zinc-950 text-white pb-24 overflow-x-hidden max-w-lg mx-auto">
      {/* ─── TOP BAR: Date nav ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => setIsEditingTargets(!isEditingTargets)}
          className="text-xs font-bold text-zinc-400"
        >
          {isEditingTargets ? 'Cancel' : 'Edit'}
        </button>
        <div className="flex items-center gap-2">
          <button
            data-testid="date-back"
            onClick={() => navigateDate(-1)}
            className="p-1 text-zinc-400 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSelectedDate(isoDate(new Date()))}
            className="text-sm font-bold"
          >
            {formatDateLabel(selectedDate)}
          </button>
          <label className="text-zinc-600 cursor-pointer">
            <Calendar size={12} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value) }}
              className="sr-only"
            />
          </label>
          <button
            data-testid="date-forward"
            onClick={() => navigateDate(1)}
            className="p-1 text-zinc-400 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={() => setShowMicros(!showMicros)}
          className="text-xs text-zinc-400"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* ─── NUTRIENTS REMAINING (MFP-style) ─── */}
      {!isEditingTargets && (
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="text-xs text-zinc-400 font-bold mb-3">
            Nutrients Remaining
            {activePlans.length > 0 && effectiveCalorieTarget !== (profile?.target_calories || 0) && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                activePlans[0]?.type === 'event' ? 'text-amber-400 bg-amber-400/10' : 'text-blue-400 bg-blue-400/10'
              }`}>
                {activePlans[0]?.type === 'event' ? 'EVENT DAY' : 'BANKING'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Carbs (g)', val: remaining.carbs, color: remaining.carbs < 0 ? 'text-red-400' : 'text-white' },
              { label: 'Fat (g)', val: remaining.fat, color: remaining.fat < 0 ? 'text-red-400' : 'text-white' },
              { label: 'Protein (g)', val: remaining.protein, color: remaining.protein < 0 ? 'text-red-400' : 'text-white' },
              { label: 'Calories', val: remaining.calories, color: remaining.calories < 0 ? 'text-red-400' : 'text-blue-400' },
            ].map((n) => (
              <div key={n.label}>
                <div className={`text-xl font-bold ${n.color}`}>{n.val}</div>
                <div className="text-[10px] text-zinc-500">{n.label}</div>
              </div>
            ))}
          </div>

          {/* Micronutrients (expandable) */}
          {showMicros && (
            <div className="mt-4 pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Micronutrients</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  { label: 'Fiber', val: totals.fiber, target: profile?.target_fiber, unit: 'g' },
                  { label: 'Sugar', val: totals.sugar, target: profile?.target_sugar, unit: 'g' },
                  { label: 'Sat fat', val: totals.saturated_fat, target: profile?.target_saturated_fat, unit: 'g' },
                  { label: 'Sodium', val: totals.sodium, target: profile?.target_sodium, unit: 'mg' },
                  { label: 'Cholesterol', val: totals.cholesterol, target: profile?.target_cholesterol, unit: 'mg' },
                  { label: 'Potassium', val: totals.potassium, target: profile?.target_potassium, unit: 'mg' },
                  { label: 'Calcium', val: totals.calcium, target: profile?.target_calcium, unit: 'mg' },
                  { label: 'Iron', val: totals.iron, target: profile?.target_iron, unit: 'mg' },
                  { label: 'Vit A', val: totals.vitamin_a, target: profile?.target_vitamin_a, unit: 'µg' },
                  { label: 'Vit C', val: totals.vitamin_c, target: profile?.target_vitamin_c, unit: 'mg' },
                ].map((m) => (
                  <div key={m.label} className="flex justify-between text-zinc-500">
                    <span>{m.label}</span>
                    <span>
                      <span className={m.val > 0 ? 'text-zinc-300' : ''}>{m.val || 0}</span>
                      {m.target ? <span className="text-zinc-600"> / {m.target}{m.unit}</span> : <span className="text-zinc-700"> {m.unit}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── EDIT TARGETS FORM ─── */}
      {isEditingTargets && (
        <form onSubmit={handleUpdateTargets} className="px-4 py-4 border-b border-zinc-800">
          <h3 className="font-bold mb-4">Set daily targets</h3>
          <div className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Macros</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { key: 'protein', label: 'Protein (g)' },
              { key: 'fat', label: 'Fat (g)' },
              { key: 'carbs', label: 'Carbs (g)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={targetForm[key]}
                  onChange={(e) => setTargetForm({ ...targetForm, [key]: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-zinc-600"
                />
              </div>
            ))}
          </div>
          <div className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Micronutrients</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { key: 'fiber', label: 'Fiber (g)' },
              { key: 'sugar', label: 'Sugar (g)' },
              { key: 'saturated_fat', label: 'Sat fat (g)' },
              { key: 'sodium', label: 'Sodium (mg)' },
              { key: 'cholesterol', label: 'Cholesterol (mg)' },
              { key: 'potassium', label: 'Potassium (mg)' },
              { key: 'calcium', label: 'Calcium (mg)' },
              { key: 'iron', label: 'Iron (mg)' },
              { key: 'vitamin_a', label: 'Vitamin A (µg)' },
              { key: 'vitamin_c', label: 'Vitamin C (mg)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  value={targetForm[key]}
                  onChange={(e) => setTargetForm({ ...targetForm, [key]: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none focus:border-zinc-600"
                />
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-blue-500 text-white font-bold rounded-lg py-2.5 hover:bg-blue-600 transition">
            Save
          </button>
        </form>
      )}

      {/* ─── MEAL SECTIONS ─── */}
      {getMealSlots(mealCount).map(({ key, label }) => {
        const mealsInSlot = meals.filter((m) => m.category === key)
        const slotCalories = mealsInSlot.reduce((sum, m) => sum + (m.calories || 0), 0)
        const slotTarget = Math.round(effectiveCalorieTarget / mealCount)

        return (
          <div key={key} className="border-b border-zinc-800">
            {/* Meal header */}
            <div className="flex justify-between items-center px-4 py-3 bg-zinc-900/50">
              <div>
                <span className="font-bold">{label}</span>
                <span className="text-xs text-zinc-500 ml-2">
                  Carbs {mealsInSlot.reduce((s, m) => s + (m.carbs || 0), 0)}g
                  {' \u00B7 '}Fat {mealsInSlot.reduce((s, m) => s + (m.fat || 0), 0)}g
                  {' \u00B7 '}Protein {mealsInSlot.reduce((s, m) => s + (m.protein || 0), 0)}g
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-300">
                {slotCalories} <span className="text-zinc-600">of {slotTarget}</span>
              </span>
            </div>

            {/* Food items */}
            {mealsInSlot.map((m) => (
              <button
                key={m.id}
                onClick={() => openEditModal(m)}
                className="w-full text-left flex justify-between items-center px-4 py-3 border-t border-zinc-800/50 hover:bg-zinc-900/30 transition active:bg-zinc-900/50"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    P {m.protein}g \u00B7 F {m.fat}g \u00B7 C {m.carbs}g
                  </div>
                </div>
                <span className="text-sm font-bold text-zinc-300 shrink-0">{m.calories}</span>
              </button>
            ))}

            {mealsInSlot.length === 0 && (
              <div className="px-4 py-3 text-sm text-zinc-600 border-t border-zinc-800/50">
                No foods logged yet.
              </div>
            )}

            {/* ADD FOOD + actions row */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/50">
              <button
                onClick={() => openAddModal(key)}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition"
              >
                ADD FOOD
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenCopyPicker(key, label)}
                  className="text-zinc-500 hover:text-white transition"
                  title="Copy from another day"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => { setRecipeMealType(key); setRecipeModalOpen(true) }}
                  className="text-zinc-500 hover:text-white transition"
                  title="Build recipe"
                >
                  <ChefHat size={16} />
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add / remove meal slot */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-b border-zinc-800">
        {mealCount > 1 && (
          <button
            onClick={async () => {
              const newCount = mealCount - 1
              setMealCount(newCount)
              await updateProfile(user.id, { meal_count: newCount })
            }}
            className="text-xs font-bold text-zinc-500 hover:text-white transition"
          >
            - Remove meal
          </button>
        )}
        <button
          onClick={async () => {
            const newCount = mealCount + 1
            setMealCount(newCount)
            await updateProfile(user.id, { meal_count: newCount })
          }}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
        >
          + Add meal
        </button>
      </div>

      {/* ─── WATER ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Droplets size={16} className="text-blue-400" />
          <span className="font-bold text-sm">Water</span>
          <span className="text-sm text-zinc-300 ml-1">
            {waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)}L` : `${waterMl}ml`}
          </span>
        </div>
        <div className="flex gap-2">
          {WATER_INCREMENTS.map((ml) => (
            <button
              key={ml}
              onClick={() => handleAddWater(ml)}
              className="text-xs font-bold text-blue-400 bg-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition active:scale-95"
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* ─── BELOW-FOLD: Weekly, Plans, Trends ─── */}
      <div className="px-4 pt-4">
        {/* Weekly summary */}
        {weekSummary && (
          <div className="mb-4">
            <button
              onClick={() => setShowWeekly(!showWeekly)}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition mb-2"
            >
              <BarChart3 size={14} />
              {showWeekly ? 'Hide' : 'Show'} weekly averages ({weekSummary.daysLogged} days logged)
            </button>
            {showWeekly && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-2">
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div>
                    <div className="text-lg font-bold">{weekSummary.calories}</div>
                    <div className="text-[10px] text-zinc-500">cal</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">{weekSummary.protein}g</div>
                    <div className="text-[10px] text-zinc-500">protein</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-400">{weekSummary.fat}g</div>
                    <div className="text-[10px] text-zinc-500">fat</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-400">{weekSummary.carbs}g</div>
                    <div className="text-[10px] text-zinc-500">carbs</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calorie planning */}
        <CaloriePlanManager
          baseTarget={profile?.target_calories || 0}
          selectedDate={selectedDate}
          onTargetAdjusted={(target, plans) => {
            setAdjustedCalorieTarget(target)
            setActivePlans(plans)
          }}
        />

        {/* Nutrition trends chart */}
        <NutritionTrendsChart />
      </div>

      {/* ─── COPY PICKER MODAL ─── */}
      {copyPickerFor && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setCopyPickerFor(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Copy {copyPickerFor?.label}</h3>
            <p className="text-xs text-zinc-500 mb-4">Pick a day to copy from</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {copyDates.map((d) => (
                <button
                  key={d}
                  onClick={() => handleCopyFromDate(d)}
                  className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 hover:border-zinc-600 transition"
                >
                  <span className="font-medium">{formatDateLabel(d)}</span>
                  <span className="text-zinc-600 ml-2 text-xs">
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
            <label className="block w-full mt-2 text-center text-sm text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-600 transition cursor-pointer">
              Pick a different date...
              <input
                type="date"
                onChange={(e) => { if (e.target.value) handleCopyFromDate(e.target.value) }}
                className="sr-only"
              />
            </label>
            <button
              onClick={() => setCopyPickerFor(null)}
              className="w-full mt-3 text-sm text-zinc-500 hover:text-white transition py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
