import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { getProfile, updateProfile, updateTargets, calculateTargets } from '../lib/api/profile'
import { exportMeals, exportWorkouts, exportWeight } from '../lib/api/export'
import { supabase } from '../lib/supabase'
import { Calculator, LogOut, Download } from 'lucide-react'

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  very_active: 'Very active (6-7 days/week)',
  extra_active: 'Extra active (athlete/physical job)',
}

const GOAL_LABELS = {
  'lose_1': 'Lose 0.5 kg/week (-500 cal)',
  'lose_0.5': 'Lose 0.25 kg/week (-250 cal)',
  maintain: 'Maintain weight',
  'gain_0.5': 'Gain 0.25 kg/week (+250 cal)',
  gain_1: 'Gain 0.5 kg/week (+500 cal)',
}

export default function Settings() {
  const { user } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Calculator form
  const [form, setForm] = useState({
    height_cm: '',
    weight_kg: '',
    birth_date: '',
    sex: '',
    activity_level: 'moderate',
    weight_goal: 'maintain',
  })

  // Manual targets form
  const [targets, setTargets] = useState({ protein: 0, fat: 0, carbs: 0 })
  const [editingTargets, setEditingTargets] = useState(false)

  // Calculated preview
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getProfile(user.id)
      if (error) { console.error(error); setLoading(false); return }
      setProfile(data)
      setForm({
        height_cm: data.height_cm || '',
        weight_kg: data.weight_kg || '',
        birth_date: data.birth_date || '',
        sex: data.sex || '',
        activity_level: data.activity_level || 'moderate',
        weight_goal: data.weight_goal || 'maintain',
      })
      setTargets({
        protein: data.target_protein || 0,
        fat: data.target_fat || 0,
        carbs: data.target_carbs || 0,
      })
      setLoading(false)
    })()
  }, [])

  // Recalculate preview when form changes
  useEffect(() => {
    const result = calculateTargets({
      heightCm: Number(form.height_cm),
      weightKg: Number(form.weight_kg),
      birthDate: form.birth_date,
      sex: form.sex,
      activityLevel: form.activity_level,
      weightGoal: form.weight_goal,
    })
    setPreview(result)
  }, [form])

  const handleSaveProfile = async () => {
    const { error } = await updateProfile(user.id, {
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      birth_date: form.birth_date || null,
      sex: form.sex || null,
      activity_level: form.activity_level,
      weight_goal: form.weight_goal,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Profile saved', 'success')
  }

  const handleApplyCalculated = async () => {
    if (!preview) return

    const { data, error } = await updateTargets(user.id, {
      protein: preview.protein,
      fat: preview.fat,
      carbs: preview.carbs,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }

    // Also save the calculator inputs
    await updateProfile(user.id, {
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      birth_date: form.birth_date || null,
      sex: form.sex || null,
      activity_level: form.activity_level,
      weight_goal: form.weight_goal,
    })

    setProfile(data)
    setTargets({ protein: preview.protein, fat: preview.fat, carbs: preview.carbs })
    toast('Targets updated from calculator', 'success')
  }

  const handleSaveManualTargets = async () => {
    const { data, error } = await updateTargets(user.id, {
      protein: Number(targets.protein),
      fat: Number(targets.fat),
      carbs: Number(targets.carbs),
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    setProfile(data)
    setEditingTargets(false)
    toast('Targets saved', 'success')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-500 p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>

      {/* Account */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Account</div>
        <div className="text-sm text-zinc-300">{profile?.email}</div>
      </div>

      {/* Current Targets */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Daily Targets</div>
          <button
            onClick={() => setEditingTargets(!editingTargets)}
            className="text-xs font-bold text-zinc-400 hover:text-white transition"
          >
            {editingTargets ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingTargets ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { key: 'protein', label: 'Protein (g)' },
                { key: 'fat', label: 'Fat (g)' },
                { key: 'carbs', label: 'Carbs (g)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={targets[key]}
                    onChange={(e) => setTargets({ ...targets, [key]: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600"
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-zinc-500 mb-3">
              Calories: {Number(targets.protein) * 4 + Number(targets.carbs) * 4 + Number(targets.fat) * 9}
            </div>
            <button
              onClick={handleSaveManualTargets}
              className="w-full bg-white text-zinc-950 font-bold rounded-xl py-2.5 hover:bg-zinc-200 transition"
            >
              Save targets
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold">{profile?.target_calories}</div>
              <div className="text-[11px] text-zinc-500">calories</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{profile?.target_protein}g</div>
              <div className="text-[11px] text-zinc-500">protein</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">{profile?.target_fat}g</div>
              <div className="text-[11px] text-zinc-500">fat</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{profile?.target_carbs}g</div>
              <div className="text-[11px] text-zinc-500">carbs</div>
            </div>
          </div>
        )}
      </div>

      {/* Calorie Calculator */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-zinc-400" />
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Calorie Calculator</div>
        </div>
        <div className="text-xs text-zinc-500 mb-4">Mifflin-St Jeor equation — the same formula MFP uses.</div>

        <div className="space-y-3">
          {/* Sex */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sex</label>
            <div className="grid grid-cols-2 gap-2">
              {['male', 'female'].map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, sex: s })}
                  className={`py-2 rounded-xl text-sm font-bold border transition ${
                    form.sex === s
                      ? 'bg-white text-zinc-950 border-white'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Height, Weight, DOB */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Height (cm)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                placeholder="175"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                placeholder="80"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Birth date</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* Activity level */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Activity level</label>
            <select
              value={form.activity_level}
              onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-zinc-600 appearance-none"
            >
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Weight goal */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Goal</label>
            <select
              value={form.weight_goal}
              onChange={(e) => setForm({ ...form, weight_goal: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-zinc-600 appearance-none"
            >
              {Object.entries(GOAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs font-bold text-zinc-500 mb-2">Calculated targets</div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>BMR: <span className="font-bold">{preview.bmr}</span> cal</div>
                <div>TDEE: <span className="font-bold">{preview.tdee}</span> cal</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold">{preview.calories}</div>
                  <div className="text-[11px] text-zinc-500">calories</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{preview.protein}g</div>
                  <div className="text-[11px] text-zinc-500">protein</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-400">{preview.fat}g</div>
                  <div className="text-[11px] text-zinc-500">fat</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{preview.carbs}g</div>
                  <div className="text-[11px] text-zinc-500">carbs</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleApplyCalculated}
            disabled={!preview}
            className="w-full bg-white text-zinc-950 font-bold rounded-xl py-2.5 hover:bg-zinc-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Apply calculated targets
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={16} className="text-zinc-400" />
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Export Data</div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Meals (CSV)', fn: () => exportMeals(user.id) },
            { label: 'Workouts (CSV)', fn: () => exportWorkouts(user.id) },
            { label: 'Body Weight (CSV)', fn: () => exportWeight(user.id) },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={async () => {
                const { count, error } = await fn()
                if (error) toast(error.message, 'error')
                else toast(`Exported ${count} rows`, 'success')
              }}
              className="w-full text-left bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 hover:border-zinc-600 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-red-400 font-bold rounded-2xl py-3.5 hover:bg-zinc-800 transition mt-4"
      >
        <LogOut size={16} /> Sign out
      </button>

      <div className="text-center text-xs text-zinc-700 mt-4">Apex v0.2.0</div>
    </div>
  )
}
