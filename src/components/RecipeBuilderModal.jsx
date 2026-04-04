import { useState } from 'react'
import { X, Plus, Search, ScanBarcode, Trash2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { logMeal, saveMeal } from '../lib/api/nutrition'
import { searchFood, searchFoodUSDA, lookupBarcode } from '../lib/api/food'
import { searchCommonFoods } from '../lib/common-foods'
import BarcodeScanner from './BarcodeScanner'

export default function RecipeBuilderModal({ isOpen, onClose, mealType, onLogSuccess, selectedDate = null }) {
  const { user } = useAuth()
  const toast = useToast()

  const [recipeName, setRecipeName] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(false)

  // Sub-views for adding ingredients
  const [subView, setSubView] = useState(null) // 'search' | 'scanner' | 'manual'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [manualForm, setManualForm] = useState({ name: '', protein: '', fat: '', carbs: '' })

  if (!isOpen) return null

  const category = mealType?.toLowerCase() === 'snacks' ? 'snack' : (mealType?.toLowerCase() || 'dinner')

  const totals = ingredients.reduce(
    (acc, ing) => ({
      protein: acc.protein + (ing.protein || 0),
      fat: acc.fat + (ing.fat || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      calories: acc.calories + (ing.calories || 0),
      fiber: acc.fiber + (ing.fiber || 0),
      sodium: acc.sodium + (ing.sodium || 0),
      sugar: acc.sugar + (ing.sugar || 0),
    }),
    { protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, sodium: 0, sugar: 0 },
  )

  const perServing = {
    protein: Math.round(totals.protein / servings),
    fat: Math.round(totals.fat / servings),
    carbs: Math.round(totals.carbs / servings),
    calories: Math.round(totals.calories / servings),
    fiber: Math.round(totals.fiber / servings),
    sodium: Math.round(totals.sodium / servings),
    sugar: Math.round(totals.sugar / servings),
  }

  const addIngredient = (food) => {
    setIngredients((prev) => [...prev, {
      id: Date.now() + Math.random(),
      name: food.name,
      protein: food.protein || 0,
      fat: food.fat || 0,
      carbs: food.carbs || 0,
      calories: food.calories || (food.protein * 4 + food.carbs * 4 + food.fat * 9),
      fiber: food.fiber || 0,
      sodium: food.sodium || 0,
      sugar: food.sugar || 0,
    }])
    setSubView(null)
    setSearchResults([])
    setSearchQuery('')
    setManualForm({ name: '', protein: '', fat: '', carbs: '' })
  }

  const removeIngredient = (id) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    const query = searchQuery.trim()
    const localResults = searchCommonFoods(query)
    setSearchResults(localResults)
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
        if (!seen.has(key)) { seen.add(key); apiResults.push(item) }
      }
      if (apiResults.length) setSearchResults([...localResults, ...apiResults])
    } catch (_) {}
    setSearching(false)
  }

  const handleBarcodeScan = async (barcode) => {
    const { data, error } = await lookupBarcode(barcode)
    if (error || !data) {
      toast(`Barcode ${barcode} not found`, 'error')
      setSubView(null)
      return
    }
    addIngredient(data)
  }

  const handleManualAdd = (e) => {
    e.preventDefault()
    const p = Number(manualForm.protein) || 0
    const f = Number(manualForm.fat) || 0
    const c = Number(manualForm.carbs) || 0
    addIngredient({
      name: manualForm.name || 'Ingredient',
      protein: p,
      fat: f,
      carbs: c,
      calories: p * 4 + c * 4 + f * 9,
    })
  }

  const handleLogRecipe = async () => {
    if (ingredients.length === 0) {
      toast('Add at least one ingredient', 'error')
      return
    }
    setLoading(true)
    const name = recipeName || `Recipe (${ingredients.length} items)`

    const { error } = await logMeal(user.id, {
      category,
      name,
      ...perServing,
    }, selectedDate)

    if (error) {
      toast(error.message || 'Failed to log recipe', 'error')
    } else {
      onLogSuccess()
      onClose()
      resetState()
    }
    setLoading(false)
  }

  const handleSaveAndLog = async () => {
    if (ingredients.length === 0) {
      toast('Add at least one ingredient', 'error')
      return
    }
    if (!recipeName) {
      toast('Give the recipe a name to save it', 'error')
      return
    }
    setLoading(true)

    // Save as favourite
    const { error: saveErr } = await saveMeal(user.id, {
      name: recipeName,
      category,
      ...perServing,
    })
    if (saveErr) {
      toast(saveErr.message || 'Failed to save recipe', 'error')
      setLoading(false)
      return
    }

    // Also log it
    const { error: logErr } = await logMeal(user.id, {
      category,
      name: recipeName,
      ...perServing,
    }, selectedDate)

    if (logErr) {
      toast('Saved but failed to log', 'error')
    } else {
      toast('Recipe saved and logged', 'success')
      onLogSuccess()
      onClose()
      resetState()
    }
    setLoading(false)
  }

  const resetState = () => {
    setRecipeName('')
    setServings(1)
    setIngredients([])
    setSubView(null)
  }

  // Barcode scanner sub-view
  if (subView === 'scanner') {
    return (
      <BarcodeScanner
        isOpen={true}
        onClose={() => setSubView(null)}
        onScan={handleBarcodeScan}
      />
    )
  }

  // Search sub-view
  if (subView === 'search') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6 max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSubView(null)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <h2 className="text-xl font-bold">Add ingredient</h2>
            </div>
            <button type="button" onClick={() => { setSubView(null); onClose() }} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none text-sm"
              autoFocus
            />
            <button type="submit" disabled={searching} className="px-4 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-200 transition disabled:opacity-50">
              {searching ? '...' : <Search size={16} />}
            </button>
          </form>

          <div className="overflow-y-auto flex-1 space-y-2">
            {searchResults.map((food, i) => (
              <button
                key={food.barcode || i}
                onClick={() => addIngredient(food)}
                className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition"
              >
                <div className="text-white text-sm font-medium truncate">{food.name}</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  {food.calories} cal · {food.protein}P · {food.fat}F · {food.carbs}C
                  <span className="text-zinc-600 ml-2">per {food.servingSize}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Manual ingredient sub-view
  if (subView === 'manual') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSubView(null)} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <h2 className="text-xl font-bold">Add ingredient</h2>
            </div>
          </div>
          <form onSubmit={handleManualAdd} className="space-y-3">
            <input
              type="text"
              value={manualForm.name}
              onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
              placeholder="Ingredient name"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-zinc-500 outline-none"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-3">
              {['protein', 'fat', 'carbs'].map((key) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 capitalize">{key}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={manualForm[key]}
                      onChange={(e) => setManualForm({ ...manualForm, [key]: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white font-bold focus:border-zinc-500 outline-none"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-3 text-zinc-600 font-medium">g</span>
                  </div>
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-white text-zinc-950 font-bold rounded-xl py-3 hover:bg-zinc-200 transition">
              Add
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Main recipe builder view
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Build Recipe</h2>
          <button type="button" onClick={() => { onClose(); resetState() }} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Recipe name + servings */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Recipe name"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-zinc-500 outline-none text-sm"
          />
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3">
            <label className="text-xs text-zinc-500 whitespace-nowrap">Serves</label>
            <input
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
              className="w-10 bg-transparent text-white font-bold text-center outline-none"
            />
          </div>
        </div>

        {/* Per-serving totals */}
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 mb-4">
          <div className="text-xs text-zinc-500 font-bold mb-1">
            Per serving {servings > 1 ? `(1 of ${servings})` : ''}
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-bold">{perServing.calories} cal</span>
            <span className="text-zinc-400">{perServing.protein}P · {perServing.fat}F · {perServing.carbs}C</span>
          </div>
        </div>

        {/* Ingredients list */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {ingredients.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
              No ingredients yet. Add some below.
            </div>
          ) : (
            ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-white">{ing.name}</div>
                  <div className="text-[11px] text-zinc-500">{ing.calories} cal · {ing.protein}P · {ing.fat}F · {ing.carbs}C</div>
                </div>
                <button onClick={() => removeIngredient(ing.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add ingredient buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSubView('search')}
            className="flex items-center justify-center gap-1.5 bg-zinc-800 text-white text-xs font-bold rounded-xl py-2.5 hover:bg-zinc-700 transition"
          >
            <Search size={14} /> Search
          </button>
          <button
            type="button"
            onClick={() => setSubView('scanner')}
            className="flex items-center justify-center gap-1.5 bg-zinc-800 text-white text-xs font-bold rounded-xl py-2.5 hover:bg-zinc-700 transition"
          >
            <ScanBarcode size={14} /> Scan
          </button>
          <button
            type="button"
            onClick={() => setSubView('manual')}
            className="flex items-center justify-center gap-1.5 bg-zinc-800 text-white text-xs font-bold rounded-xl py-2.5 hover:bg-zinc-700 transition"
          >
            <Plus size={14} /> Manual
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSaveAndLog}
            disabled={loading || ingredients.length === 0}
            className="flex-1 bg-zinc-800 text-white font-bold rounded-xl py-3 hover:bg-zinc-700 transition disabled:opacity-50 text-sm"
          >
            Save & Log
          </button>
          <button
            onClick={handleLogRecipe}
            disabled={loading || ingredients.length === 0}
            className="flex-1 bg-white text-zinc-950 font-bold rounded-xl py-3 hover:bg-zinc-200 transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Logging...' : 'Log once'}
          </button>
        </div>
      </div>
    </div>
  )
}
