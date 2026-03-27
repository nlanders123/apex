import { useEffect, useState } from 'react'
import { X, Trash2, Bookmark, ChevronLeft, ScanBarcode, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import {
  logMeal,
  updateMeal,
  deleteMeal,
  getSavedMeals,
  saveMeal,
  logSavedMeal,
  deleteSavedMeal,
  getRecentMeals,
} from '../lib/api/nutrition'
import { lookupBarcode, searchFood } from '../lib/api/food'
import BarcodeScanner from './BarcodeScanner'

function toMealEnum(mealTypeLabel) {
  return mealTypeLabel.toLowerCase() === 'snacks' ? 'snack' : mealTypeLabel.toLowerCase()
}

export default function MealLoggerModal({
  isOpen,
  onClose,
  mealType,
  onLogSuccess,
  existingMeal = null,
  selectedDate = null,
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('pick') // 'pick' | 'form' | 'search' | 'scanner'
  const [savedMeals, setSavedMeals] = useState([])
  const [recentMeals, setRecentMeals] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [formData, setForm] = useState({
    name: 'Quick Add',
    protein: '',
    fat: '',
    carbs: '',
    fiber: '',
    sodium: '',
    sugar: '',
  })

  // Food search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [scanError, setScanError] = useState(null)

  const isEdit = !!existingMeal
  const category = toMealEnum(mealType)

  useEffect(() => {
    if (!isOpen) return
    setScanError(null)
    if (existingMeal) {
      setForm({
        name: existingMeal.name ?? 'Quick Add',
        protein: String(existingMeal.protein ?? ''),
        fat: String(existingMeal.fat ?? ''),
        carbs: String(existingMeal.carbs ?? ''),
        fiber: String(existingMeal.fiber ?? ''),
        sodium: String(existingMeal.sodium ?? ''),
        sugar: String(existingMeal.sugar ?? ''),
      })
      setView('form')
    } else {
      setForm({ name: 'Quick Add', protein: '', fat: '', carbs: '', fiber: '', sodium: '', sugar: '' })
      loadSavedMeals()
    }
  }, [isOpen, existingMeal])

  async function loadSavedMeals() {
    setSavedLoading(true)
    const [savedResult, recentResult] = await Promise.all([
      getSavedMeals(user.id),
      getRecentMeals(user.id, category),
    ])
    const filtered = savedResult.data.filter((m) => m.category === category)
    setSavedMeals(filtered)
    setRecentMeals(recentResult.data || [])
    setView(filtered.length > 0 || recentResult.data?.length > 0 ? 'pick' : 'form')
    setSavedLoading(false)
  }

  if (!isOpen) return null

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    const p = Number(formData.protein) || 0
    const f = Number(formData.fat) || 0
    const c = Number(formData.carbs) || 0
    const fi = Number(formData.fiber) || 0
    const so = Number(formData.sodium) || 0
    const su = Number(formData.sugar) || 0

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
          fiber: fi,
          sodium: so,
          sugar: su,
        }, selectedDate)
        if (error) throw error
      }

      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error logging meal:', error)
      toast(error?.message || 'Failed to log meal', 'error')
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
      toast(error?.message || 'Failed to delete meal', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogRecent = async (meal) => {
    setLoading(true)
    try {
      const { error } = await logMeal(user.id, {
        category,
        name: meal.name,
        protein: meal.protein || 0,
        fat: meal.fat || 0,
        carbs: meal.carbs || 0,
        fiber: meal.fiber || 0,
        sodium: meal.sodium || 0,
        sugar: meal.sugar || 0,
      }, selectedDate)
      if (error) throw error
      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error logging recent meal:', error)
      toast(error?.message || 'Failed to log meal', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogSaved = async (meal) => {
    setLoading(true)
    try {
      const { error } = await logSavedMeal(user.id, meal, selectedDate)
      if (error) throw error
      onLogSuccess()
      onClose()
    } catch (error) {
      console.error('Error logging saved meal:', error)
      toast(error?.message || 'Failed to log meal', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsFavourite = async () => {
    const p = Number(formData.protein) || 0
    const f = Number(formData.fat) || 0
    const c = Number(formData.carbs) || 0

    if (!formData.name || formData.name === 'Quick Add') {
      toast('Give the meal a name before saving it.', 'error')
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
        fiber: Number(formData.fiber) || null,
        sodium: Number(formData.sodium) || null,
        sugar: Number(formData.sugar) || null,
      })
      if (error) throw error
      loadSavedMeals()
    } catch (error) {
      console.error('Error saving meal:', error)
      toast(error?.message || 'Failed to save meal', 'error')
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

  const handleBarcodeScan = async (barcode) => {
    setScanError(null)
    setView('form')
    setLoading(true)

    try {
      const { data, error } = await lookupBarcode(barcode)
      if (error || !data) {
        setScanError(`Barcode ${barcode} not found in database`)
        setLoading(false)
        return
      }

      setForm({
        name: data.name,
        protein: String(data.protein),
        fat: String(data.fat),
        carbs: String(data.carbs),
        fiber: String(data.fiber || ''),
        sodium: String(data.sodium || ''),
        sugar: String(data.sugar || ''),
      })
    } catch (err) {
      setScanError('Failed to look up barcode')
    } finally {
      setLoading(false)
    }
  }

  const handleFoodSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    const { data } = await searchFood(searchQuery.trim())
    setSearchResults(data)
    setSearching(false)
  }

  const handleSelectSearchResult = (food) => {
    setForm({
      name: food.name,
      protein: String(food.protein),
      fat: String(food.fat),
      carbs: String(food.carbs),
      fiber: String(food.fiber || ''),
      sodium: String(food.sodium || ''),
      sugar: String(food.sugar || ''),
    })
    setSearchResults([])
    setSearchQuery('')
    setView('form')
  }

  // Barcode scanner view
  if (view === 'scanner') {
    return (
      <BarcodeScanner
        isOpen={true}
        onClose={() => setView('form')}
        onScan={handleBarcodeScan}
      />
    )
  }

  // Food search view
  if (view === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6 max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView(savedMeals.length > 0 ? 'pick' : 'form')}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <h2 className="text-xl font-bold">Search food</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <form onSubmit={handleFoodSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Greek yoghurt, chicken breast..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {searching ? '...' : <Search size={16} />}
            </button>
          </form>

          <div className="overflow-y-auto flex-1 space-y-2">
            {searchResults.map((food, i) => (
              <button
                key={food.barcode || i}
                onClick={() => handleSelectSearchResult(food)}
                className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition"
              >
                <div className="text-white text-sm font-medium truncate">{food.name}</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  {food.calories} cal · {food.protein}P · {food.fat}F · {food.carbs}C
                  <span className="text-zinc-600 ml-2">per {food.servingSize}</span>
                </div>
              </button>
            ))}
            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="text-zinc-500 text-sm text-center py-4">
                No results. Try a different search term.
              </div>
            )}
          </div>
        </div>
      </div>
    )
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
            <div className="max-h-60 overflow-y-auto mb-4 space-y-3">
              {/* Recent meals */}
              {recentMeals.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-zinc-500 mb-1.5 px-1">Recent</div>
                  <div className="space-y-2">
                    {recentMeals.map((meal, i) => (
                      <button
                        key={`recent-${i}`}
                        onClick={() => handleLogRecent(meal)}
                        disabled={loading}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 hover:bg-zinc-950/70 transition text-left disabled:opacity-50"
                      >
                        <div className="text-white font-medium text-sm">{meal.name}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">
                          {meal.calories} cal · {meal.protein}P · {meal.fat}F · {meal.carbs}C
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved meals */}
              {savedMeals.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-zinc-500 mb-1.5 px-1">Saved</div>
                  <div className="space-y-2">
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
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setView('search')}
              className="w-full flex items-center justify-center gap-2 bg-white text-zinc-950 font-bold rounded-xl py-3.5 hover:bg-zinc-200 transition active:scale-[0.98]"
            >
              <Search size={18} /> Search food database
            </button>
            <button
              type="button"
              onClick={() => setView('scanner')}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold rounded-xl py-3.5 hover:bg-zinc-700 transition active:scale-[0.98]"
            >
              <ScanBarcode size={18} /> Scan barcode
            </button>
            <button
              type="button"
              onClick={() => setView('form')}
              className="w-full bg-zinc-800 text-white font-bold rounded-xl py-3.5 hover:bg-zinc-700 transition active:scale-[0.98]"
            >
              Log custom macros
            </button>
          </div>
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
            {!isEdit && (
              <button
                type="button"
                onClick={() => setView(savedMeals.length > 0 ? 'pick' : 'form')}
                className={`p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition ${savedMeals.length === 0 && 'hidden'}`}
                title="Back to saved meals"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
            )}
            <h2 className="text-xl font-bold">{isEdit ? 'Edit meal' : `Add to ${mealType}`}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setView('scanner')}
                  className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title="Scan barcode"
                >
                  <ScanBarcode size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('search')}
                  className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  title="Search food database"
                >
                  <Search size={16} strokeWidth={2.5} />
                </button>
              </>
            )}
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

        {scanError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl p-3 text-sm mb-4">
            <div>{scanError}</div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setScanError(null); setView('search') }}
                className="text-xs font-bold text-white bg-zinc-800 rounded-lg px-3 py-1.5 hover:bg-zinc-700 transition"
              >
                Search instead
              </button>
              <button
                type="button"
                onClick={() => { setScanError(null); setView('scanner') }}
                className="text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Try again
              </button>
            </div>
          </div>
        )}

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
            {!isEdit && (
              <button
                type="button"
                onClick={handleSaveAsFavourite}
                disabled={loading}
                className="p-3.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 text-zinc-400 hover:text-white transition disabled:opacity-50"
                title="Save as favourite"
              >
                <Bookmark size={18} strokeWidth={2.5} />
              </button>
            )}
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
