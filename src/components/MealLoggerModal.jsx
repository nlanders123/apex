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
import { lookupBarcode, searchFood, searchFoodUSDA } from '../lib/api/food'
import { searchCommonFoods } from '../lib/common-foods'
import BarcodeScanner from './BarcodeScanner'

function formatMealLabel(key) {
  if (!key) return ''
  // "meal_1" → "Meal 1", or pass through anything else
  if (key.startsWith('meal_')) return `Meal ${key.split('_')[1]}`
  return key.charAt(0).toUpperCase() + key.slice(1)
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
    serving_size: '1',
    serving_unit: '',
  })

  // Food search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [scanError, setScanError] = useState(null)

  // Quantity picker state (for logging saved meals with serving sizes)
  const [quantityMeal, setQuantityMeal] = useState(null)
  const [quantity, setQuantity] = useState(1)

  const isEdit = !!existingMeal
  const category = mealType

  useEffect(() => {
    if (!isOpen) return
    setScanError(null)
    setQuantityMeal(null)
    setQuantity(1)
    if (existingMeal) {
      setForm({
        name: existingMeal.name ?? 'Quick Add',
        protein: String(existingMeal.protein ?? ''),
        fat: String(existingMeal.fat ?? ''),
        carbs: String(existingMeal.carbs ?? ''),
        fiber: String(existingMeal.fiber ?? ''),
        sodium: String(existingMeal.sodium ?? ''),
        sugar: String(existingMeal.sugar ?? ''),
        serving_size: '1',
        serving_unit: '',
      })
      setView('form')
    } else {
      setForm({ name: 'Quick Add', protein: '', fat: '', carbs: '', fiber: '', sodium: '', sugar: '', serving_size: '1', serving_unit: '' })
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

  const handleLogSaved = (meal) => {
    // If the meal has a serving unit, show quantity picker
    // Otherwise log instantly (backwards compatible)
    if (meal.serving_unit) {
      setQuantityMeal(meal)
      setQuantity(1)
      setView('quantity')
    } else {
      logSavedInstant(meal, 1)
    }
  }

  const logSavedInstant = async (meal, qty) => {
    setLoading(true)
    try {
      const { error } = await logSavedMeal(user.id, meal, selectedDate, qty)
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
        serving_size: Number(formData.serving_size) || 1,
        serving_unit: formData.serving_unit.trim() || null,
      })
      if (error) throw error
      toast('Saved to favourites', 'success')
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
    const query = searchQuery.trim()
    if (!query) return
    setSearching(true)
    setSearchResults([])
    // Show local common foods instantly
    const localResults = searchCommonFoods(query)
    setSearchResults(localResults)
    // Then fetch from USDA (primary) and OFF (fallback)
    const localNames = new Set(localResults.map(r => r.name.toLowerCase()))
    try {
      const [usdaResult, offResult] = await Promise.allSettled([
        searchFoodUSDA(query),
        searchFood(query),
      ])
      const usdaData = usdaResult.status === 'fulfilled' ? (usdaResult.value.data || []) : []
      const offData = offResult.status === 'fulfilled' ? (offResult.value.data || []) : []
      const seen = new Set(localNames)
      const apiResults = []
      for (const item of [...usdaData, ...offData]) {
        const key = item.name.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          apiResults.push(item)
        }
      }
      if (apiResults.length) {
        setSearchResults([...localResults, ...apiResults])
      }
    } catch (_) {}
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

  // Quantity picker view (for saved meals with serving sizes)
  if (view === 'quantity' && quantityMeal) {
    const q = quantity
    const scaledCal = Math.round((quantityMeal.calories || 0) * q)
    const scaledP = Math.round((quantityMeal.protein || 0) * q)
    const scaledF = Math.round((quantityMeal.fat || 0) * q)
    const scaledC = Math.round((quantityMeal.carbs || 0) * q)
    const servingLabel = quantityMeal.serving_unit
      ? `${q * (quantityMeal.serving_size || 1)} ${quantityMeal.serving_unit}`
      : `${q} serving${q !== 1 ? 's' : ''}`

    const QUICK_AMOUNTS = [0.25, 0.5, 1, 1.5, 2, 3]

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setQuantityMeal(null); setView('pick') }}
                className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <h2 className="text-xl font-bold">How much?</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="text-center mb-5">
            <div className="text-lg font-bold">{quantityMeal.name}</div>
            <div className="text-xs text-zinc-500 mt-1">
              Per {quantityMeal.serving_size || 1} {quantityMeal.serving_unit || 'serving'}:
              {' '}{quantityMeal.calories} cal · {quantityMeal.protein}P · {quantityMeal.fat}F · {quantityMeal.carbs}C
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setQuantity(amt)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                  quantity === amt
                    ? 'bg-white text-zinc-950 border-white'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <button
              onClick={() => setQuantity(Math.max(0.1, +(quantity - 0.1).toFixed(2)))}
              className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-xl text-white font-bold text-lg hover:bg-zinc-700 transition"
            >
              -
            </button>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={quantity}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) setQuantity(v)
              }}
              className="w-20 text-center bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2.5 text-white text-lg font-bold outline-none focus:border-zinc-600"
            />
            <button
              onClick={() => setQuantity(+(quantity + 0.1).toFixed(2))}
              className="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-xl text-white font-bold text-lg hover:bg-zinc-700 transition"
            >
              +
            </button>
          </div>

          {/* Scaled preview */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-5">
            <div className="text-xs font-bold text-zinc-500 mb-2">{servingLabel}</div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold">{scaledCal}</div>
                <div className="text-[11px] text-zinc-500">cal</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">{scaledP}g</div>
                <div className="text-[11px] text-zinc-500">protein</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">{scaledF}g</div>
                <div className="text-[11px] text-zinc-500">fat</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">{scaledC}g</div>
                <div className="text-[11px] text-zinc-500">carbs</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => logSavedInstant(quantityMeal, quantity)}
            disabled={loading}
            className="w-full bg-white text-zinc-950 font-bold rounded-xl py-3.5 hover:bg-zinc-200 transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Logging...' : `Log ${servingLabel}`}
          </button>
        </div>
      </div>
    )
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
            <h2 className="text-xl font-bold">Add to {formatMealLabel(mealType)}</h2>
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
                            {meal.serving_unit && (
                              <span className="text-zinc-600 ml-1">
                                per {meal.serving_size || 1} {meal.serving_unit}
                              </span>
                            )}
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

          {/* Serving size (only shown when creating, not editing) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Serving size</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={formData.serving_size}
                  onChange={(e) => setForm({ ...formData, serving_size: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.serving_unit}
                  onChange={(e) => setForm({ ...formData, serving_unit: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none"
                  placeholder="g, cup, slice, scoop..."
                />
              </div>
            </div>
          )}

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
