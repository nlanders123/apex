import { useEffect, useState } from 'react'
import { X, Trash2, Bookmark, ChevronLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  logMeal,
  updateMeal,
  deleteMeal,
  getSavedMeals,
  saveMeal,
  logSavedMeal,
  deleteSavedMeal,
} from '../lib/api/nutrition'

function toMealEnum(mealTypeLabel) {
  return mealTypeLabel.toLowerCase() === 'snacks' ? 'snack' : mealTypeLabel.toLowerCase()
}

export default function MealLoggerModal({
  isOpen,
  onClose,
  mealType,
  onLogSuccess,
  existingMeal = null,
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('pick') // 'pick' | 'form'
  const [savedMeals, setSavedMeals] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [formData, setForm] = useState({
    name: 'Quick Add',
    protein: '',
    fat: '',
    carbs: '',
  })

  const isEdit = !!existingMeal
  const category = toMealEnum(mealType)

  useEffect(() => {
    if (!isOpen) return
    if (existingMeal) {
      setForm({
        name: existingMeal.name ?? 'Quick Add',
        protein: String(existingMeal.protein ?? ''),
        fat: String(existingMeal.fat ?? ''),
        carbs: String(existingMeal.carbs ?? ''),
      })
      setView('form')
    } else {
      setForm({ name: 'Quick Add', protein: '', fat: '', carbs: '' })
      loadSavedMeals()
    }
  }, [isOpen, existingMeal])

  async function loadSavedMeals() {
    setSavedLoading(true)
    const { data } = await getSavedMeals(user.id)
    const filtered = data.filter((m) => m.category === category)
    setSavedMeals(filtered)
    // If no saved meals, go straight to form
    setView(filtered.length > 0 ? 'pick' : 'form')
    setSavedLoading(false)
  }

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const p = Number(formData.protein) || 0
    const f = Number(formData.fat) || 0
    const c = Number(formData.carbs) || 0

    try {
      if (isEdit) {
        const { error } = await updateMeal(user.id, existingMeal.id, {
          name: formData.name,
          protein: p,
          fat: f,
          carbs: c,
        })
        if (error) throw error
      } else {
        const { error } = await logMeal(user.id, {
          category,
          name: formData.name,
          protein: p,
          fat: f,
          carbs: c,
        })
        if (error) throw error
      }

      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error logging meal:', error)
      alert(error?.message || 'Failed to log meal')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingMeal) return
    if (!confirm('Delete this meal?')) return

    setLoading(true)
    try {
      const { error } = await deleteMeal(user.id, existingMeal.id)
      if (error) throw error

      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert(error?.message || 'Failed to delete meal')
    } finally {
      setLoading(false)
    }
  }

  const handleLogSaved = async (meal) => {
    setLoading(true)
    try {
      const { error } = await logSavedMeal(user.id, meal)
      if (error) throw error
      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error logging saved meal:', error)
      alert(error?.message || 'Failed to log meal')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsFavourite = async () => {
    const p = Number(formData.protein) || 0
    const f = Number(formData.fat) || 0
    const c = Number(formData.carbs) || 0

    if (!formData.name || formData.name === 'Quick Add') {
      alert('Give the meal a name before saving it.')
      return
    }

    setLoading(true)
    try {
      const { error } = await saveMeal(user.id, {
        name: formData.name,
        category,
        protein: p,
        fat: f,
        carbs: c,
      })
      if (error) throw error
      // Refresh saved meals list
      loadSavedMeals()
    } catch (error) {
      console.error('Error saving meal:', error)
      alert(error?.message || 'Failed to save meal')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSaved = async (e, meal) => {
    e.stopPropagation()
    if (!confirm(`Remove "${meal.name}" from saved meals?`)) return

    try {
      const { error } = await deleteSavedMeal(user.id, meal.id)
      if (error) throw error
      setSavedMeals((prev) => prev.filter((m) => m.id !== meal.id))
    } catch (error) {
      console.error('Error deleting saved meal:', error)
    }
  }

  // Saved meals picker view
  if (view === 'pick' && !isEdit) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold">Add to {mealType}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {savedLoading ? (
            <div className="text-zinc-500 text-sm py-4">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {savedMeals.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => handleLogSaved(meal)}
                  disabled={loading}
                  className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 hover:bg-zinc-950/70 transition text-left disabled:opacity-50"
                >
                  <div>
                    <div className="text-white font-medium text-sm">{meal.name}</div>
                    <div className="text-zinc-500 text-xs mt-0.5">
                      {meal.calories} cal · {meal.protein}P · {meal.fat}F · {meal.carbs}C
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSaved(e, meal)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition"
                    title="Remove saved meal"
                  >
                    <X size={14} />
                  </button>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setView('form')}
            className="w-full bg-white text-zinc-950 font-bold rounded-xl py-3.5 hover:bg-zinc-200 transition active:scale-[0.98]"
          >
            Log custom meal
          </button>
        </div>
      </div>
    )
  }

  // Manual entry form view
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {!isEdit && savedMeals.length > 0 && (
              <button
                type="button"
                onClick={() => setView('pick')}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                title="Back to saved meals"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
            )}
            <h2 className="text-xl font-bold">{isEdit ? 'Edit meal' : `Add to ${mealType}`}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition disabled:opacity-50"
                title="Delete"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              title="Close"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Meal Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setForm({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none"
              placeholder="e.g. Steak and potatoes"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'protein', label: 'Protein' },
              { key: 'fat', label: 'Fat' },
              { key: 'carbs', label: 'Carbs' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-bold text-zinc-400 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData[key]}
                    onChange={(e) => setForm({ ...formData, [key]: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white font-bold focus:border-zinc-500 outline-none"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-3 text-zinc-600 font-medium">g</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleSaveAsFavourite}
              disabled={loading}
              className="p-3.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 text-zinc-400 hover:text-white transition disabled:opacity-50"
              title="Save as favourite"
            >
              <Bookmark size={18} strokeWidth={2.5} />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-zinc-950 font-bold rounded-xl py-3.5 hover:bg-zinc-200 transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Log macros'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
