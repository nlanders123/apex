import { supabase } from '../supabase'

function isoDate(d) {
  return d.toISOString().split('T')[0]
}

// Get or create today's daily log
async function ensureDailyLog(userId, date) {
  const dateStr = typeof date === 'string' ? date : isoDate(date)

  const { data: existing, error: fetchErr } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle()

  if (fetchErr) return { data: null, error: fetchErr }
  if (existing) return { data: existing, error: null }

  const { data: created, error: createErr } = await supabase
    .from('daily_logs')
    .insert({ user_id: userId, date: dateStr })
    .select('id')
    .single()

  return { data: created, error: createErr }
}

export async function getTodayMeals(userId) {
  const today = isoDate(new Date())

  const { data: logData, error: logErr } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  if (logErr) return { meals: [], totals: { protein: 0, fat: 0, carbs: 0, calories: 0 }, error: logErr }
  if (!logData) return { meals: [], totals: { protein: 0, fat: 0, carbs: 0, calories: 0 }, error: null }

  const { data: meals, error: mealsErr } = await supabase
    .from('logged_meals')
    .select('*')
    .eq('daily_log_id', logData.id)
    .order('created_at', { ascending: true })

  if (mealsErr) return { meals: [], totals: { protein: 0, fat: 0, carbs: 0, calories: 0 }, error: mealsErr }

  const safeMeals = meals ?? []
  const totals = safeMeals.reduce(
    (acc, meal) => ({
      protein: acc.protein + (meal.protein || 0),
      fat: acc.fat + (meal.fat || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      calories: acc.calories + (meal.calories || 0),
    }),
    { protein: 0, fat: 0, carbs: 0, calories: 0 },
  )

  return { meals: safeMeals, totals, error: null }
}

export async function logMeal(userId, { category, name, protein, fat, carbs }) {
  const today = isoDate(new Date())
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data: log, error: logErr } = await ensureDailyLog(userId, today)
  if (logErr) return { data: null, error: logErr }

  const { data, error } = await supabase
    .from('logged_meals')
    .insert({
      daily_log_id: log.id,
      user_id: userId,
      name,
      category,
      protein,
      fat,
      carbs,
      calories,
    })
    .select('*')
    .single()

  return { data, error }
}

export async function updateMeal(userId, mealId, { name, protein, fat, carbs }) {
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data, error } = await supabase
    .from('logged_meals')
    .update({ name, protein, fat, carbs, calories })
    .eq('id', mealId)
    .eq('user_id', userId)
    .select('*')
    .single()

  return { data, error }
}

export async function deleteMeal(userId, mealId) {
  const { error } = await supabase
    .from('logged_meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId)

  return { error }
}

export async function copyYesterdayMeals(userId, category) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = isoDate(today)
  const yStr = isoDate(yesterday)

  // Find yesterday's log
  const { data: yLog, error: yErr } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', yStr)
    .maybeSingle()

  if (yErr) return { error: yErr }
  if (!yLog) return { error: { message: 'No meals found for yesterday.' } }

  // Get yesterday's meals for this category
  const { data: yMeals, error: yMealsErr } = await supabase
    .from('logged_meals')
    .select('*')
    .eq('daily_log_id', yLog.id)
    .eq('category', category)

  if (yMealsErr) return { error: yMealsErr }
  if (!yMeals?.length) return { error: { message: `No ${category} meals found for yesterday.` } }

  // Ensure today's log exists
  const { data: tLog, error: tErr } = await ensureDailyLog(userId, todayStr)
  if (tErr) return { error: tErr }

  // Copy meals
  const inserts = yMeals.map((m) => ({
    daily_log_id: tLog.id,
    user_id: userId,
    name: m.name,
    category: m.category,
    calories: m.calories,
    protein: m.protein,
    fat: m.fat,
    carbs: m.carbs,
  }))

  const { error: insErr } = await supabase.from('logged_meals').insert(inserts)
  return { error: insErr }
}

// --- Saved Meals ---

export async function getSavedMeals(userId) {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('user_id', userId)
    .order('use_count', { ascending: false })

  return { data: data ?? [], error }
}

export async function saveMeal(userId, { name, category, protein, fat, carbs }) {
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data, error } = await supabase
    .from('saved_meals')
    .insert({ user_id: userId, name, category, calories, protein, fat, carbs })
    .select('*')
    .single()

  return { data, error }
}

export async function updateSavedMeal(userId, mealId, { name, category, protein, fat, carbs }) {
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data, error } = await supabase
    .from('saved_meals')
    .update({ name, category, calories, protein, fat, carbs })
    .eq('id', mealId)
    .eq('user_id', userId)
    .select('*')
    .single()

  return { data, error }
}

export async function deleteSavedMeal(userId, mealId) {
  const { error } = await supabase
    .from('saved_meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId)

  return { error }
}

export async function logSavedMeal(userId, savedMeal) {
  const today = isoDate(new Date())

  const { data: log, error: logErr } = await ensureDailyLog(userId, today)
  if (logErr) return { data: null, error: logErr }

  const { data, error } = await supabase
    .from('logged_meals')
    .insert({
      daily_log_id: log.id,
      user_id: userId,
      name: savedMeal.name,
      category: savedMeal.category,
      protein: savedMeal.protein,
      fat: savedMeal.fat,
      carbs: savedMeal.carbs,
      calories: savedMeal.calories,
    })
    .select('*')
    .single()

  if (error) return { data: null, error }

  // Increment use count (fire and forget)
  supabase
    .from('saved_meals')
    .update({ use_count: (savedMeal.use_count || 0) + 1 })
    .eq('id', savedMeal.id)
    .eq('user_id', userId)
    .then(() => {})

  return { data, error: null }
}
