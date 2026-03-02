import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus } from 'lucide-react'

export default function Nutrition() {
  const { user } = useAuth()
  
  // State
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditingTargets, setIsEditingTargets] = useState(false)
  const [targetForm, setTargetForm] = useState({ protein: 0, fat: 0, carbs: 0 })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (error) throw error
      setProfile(data)
      setTargetForm({
        protein: data.target_protein,
        fat: data.target_fat,
        carbs: data.target_carbs
      })
    } catch (error) {
      console.error('Error fetching profile:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateTargets = async (e) => {
    e.preventDefault()
    
    // Calculate total calories (P*4 + C*4 + F*9)
    const calories = (Number(targetForm.protein) * 4) + 
                     (Number(targetForm.carbs) * 4) + 
                     (Number(targetForm.fat) * 9)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          target_protein: Number(targetForm.protein),
          target_fat: Number(targetForm.fat),
          target_carbs: Number(targetForm.carbs),
          target_calories: calories
        })
        .eq('id', user.id)

      if (error) throw error
      
      setProfile({
        ...profile,
        target_protein: targetForm.protein,
        target_fat: targetForm.fat,
        target_carbs: targetForm.carbs,
        target_calories: calories
      })
      setIsEditingTargets(false)
    } catch (error) {
      console.error('Error updating targets:', error.message)
    }
  }

  if (loading) return <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center text-zinc-500">Loading...</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24 font-sans">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrition</h1>
          <p className="text-zinc-400 text-sm mt-1">Today's macros and logging.</p>
        </div>
        <button 
          onClick={() => setIsEditingTargets(!isEditingTargets)}
          className="text-xs font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 hover:text-white transition"
        >
          {isEditingTargets ? 'Cancel' : 'Edit Targets'}
        </button>
      </header>

      {/* Targets Dashboard */}
      {isEditingTargets ? (
        <form onSubmit={updateTargets} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
          <h3 className="font-bold mb-4">Set Daily Targets</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Protein (g)</label>
              <input type="number" value={targetForm.protein} onChange={e => setTargetForm({...targetForm, protein: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Fat (g)</label>
              <input type="number" value={targetForm.fat} onChange={e => setTargetForm({...targetForm, fat: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Carbs (g)</label>
              <input type="number" value={targetForm.carbs} onChange={e => setTargetForm({...targetForm, carbs: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600" />
            </div>
          </div>
          <button type="submit" className="w-full bg-white text-zinc-950 font-bold rounded-xl py-2.5 hover:bg-zinc-200 transition">
            Save Targets
          </button>
        </form>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Calories Remaining</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{profile?.target_calories || 0}</span>
                <span className="text-zinc-500 font-medium pb-1">kcal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
              <div className="text-zinc-500 text-xs font-bold mb-1">Protein</div>
              <div className="font-bold">0 <span className="text-zinc-600">/ {profile?.target_protein}g</span></div>
            </div>
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
              <div className="text-zinc-500 text-xs font-bold mb-1">Fat</div>
              <div className="font-bold">0 <span className="text-zinc-600">/ {profile?.target_fat}g</span></div>
            </div>
            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
              <div className="text-zinc-500 text-xs font-bold mb-1">Carbs</div>
              <div className="font-bold">0 <span className="text-zinc-600">/ {profile?.target_carbs}g</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Meal Categories */}
      <div className="space-y-4">
        {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map(meal => (
          <div key={meal} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">{meal}</h3>
              <button className="flex items-center gap-1 text-sm font-bold text-zinc-900 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition">
                <Plus size={16} strokeWidth={3} /> Add
              </button>
            </div>
            
            {/* Empty State */}
            <div className="text-sm text-zinc-500 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-center border-dashed">
              No foods logged yet.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
