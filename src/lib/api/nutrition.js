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

const EMPTY_TOTALS = { protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, sodium: 0, sugar: 0 }

export async function getTodayMeals(userId) {
  return getMealsForDate(userId, isoDate(new Date()))
}

export async function getMealsForDate(userId, dateStr) {
  const { data: logData, error: logErr } = await supabase
    .from('daily_logs')
    .select('id, water_ml')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle()

  if (logErr) return { meals: [], totals: { ...EMPTY_TOTALS }, waterMl: 0, error: logErr }
  if (!logData) return { meals: [], totals: { ...EMPTY_TOTALS }, waterMl: 0, error: null }

  const { data: meals, error: mealsErr } = await supabase
    .from('logged_meals')
    .select('*')
    .eq('daily_log_id', logData.id)
    .order('created_at', { ascending: true })

  if (mealsErr) return { meals: [], totals: { ...EMPTY_TOTALS }, waterMl: 0, error: mealsErr }

  const safeMeals = meals ?? []
  const totals = safeMeals.reduce(
    (acc, meal) => ({
      protein: acc.protein + (meal.protein || 0),
      fat: acc.fat + (meal.fat || 0),
      carbs: acc.carbs + (meal.carbs || 0),
      calories: acc.calories + (meal.calories || 0),
      fiber: acc.fiber + (meal.fiber || 0),
      sodium: acc.sodium + (meal.sodium || 0),
      sugar: acc.sugar + (meal.sugar || 0),
    }),
    { ...EMPTY_TOTALS },
  )

  return { meals: safeMeals, totals, waterMl: logData.water_ml || 0, error: null }
}

export async function logMeal(userId, { category, name, protein, fat, carbs, fiber, sodium, sugar }, dateStr) {
  const date = dateStr || isoDate(new Date())
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data: log, error: logErr } = await ensureDailyLog(userId, date)
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
      fiber: fiber || null,
      sodium: sodium || null,
      sugar: sugar || null,
    })
    .select('*')
    .single()

  return { data, error }
}

// --- Water Tracking ---

export async function logWater(userId, ml, dateStr) {
  const date = dateStr || isoDate(new Date())
  const { data: log, error: logErr } = await ensureDailyLog(userId, date)
  if (logErr) return { data: null, error: logErr }

  const { data, error } = await supabase
    .from('daily_logs')
    .update({ water_ml: ml })
    .eq('id', log.id)
    .eq('user_id', userId)
    .select('water_ml')
    .single()

  return { data, error }
}

export async function addWater(userId, ml, dateStr) {
  const date = dateStr || isoDate(new Date())
  const { data: log, error: logErr } = await ensureDailyLog(userId, date)
  if (logErr) return { data: null, error: logErr }

  // Read current, then add
  const { data: current } = await supabase
    .from('daily_logs')
    .select('water_ml')
    .eq('id', log.id)
    .single()

  const newTotal = (current?.water_ml || 0) + ml

  const { data, error } = await supabase
    .from('daily_logs')
    .update({ water_ml: newTotal })
    .eq('id', log.id)
    .eq('user_id', userId)
    .select('water_ml')
    .single()

  return { data: { water_ml: data?.water_ml ?? newTotal }, error }
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

// --- Weekly Summary ---

export async function getWeekSummary(userId, dateStr) {
  // Get Monday of the week containing dateStr
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay() || 7 // Mon=1, Sun=7
  const monday = new Date(d)
  monday.setDate(d.getDate() - dayOfWeek + 1)

  const days = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    days.push(isoDate(day))
  }

  const { data: logs, error: logErr } = await supabase
    .from('daily_logs')
    .select('id, date, water_ml')
    .eq('user_id', userId)
    .in('date', days)

  if (logErr || !logs?.length) return { days: [], averages: null, error: logErr }

  const logIds = logs.map((l) => l.id)
  const { data: meals, error: mealsErr } = await supabase
    .from('logged_meals')
    .select('daily_log_id, calories, protein, fat, carbs, fiber, sodium, sugar')
    .in('daily_log_id', logIds)

  if (mealsErr) return { days: [], averages: null, error: mealsErr }

  // Build per-day totals
  const mealsByLog = {}
  for (const m of meals ?? []) {
    mealsByLog[m.daily_log_id] = mealsByLog[m.daily_log_id] || []
    mealsByLog[m.daily_log_id].push(m)
  }

  const daySummaries = logs.map((log) => {
    const dayMeals = mealsByLog[log.id] || []
    return {
      date: log.date,
      calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
      protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
      fat: dayMeals.reduce((s, m) => s + (m.fat || 0), 0),
      carbs: dayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
      water_ml: log.water_ml || 0,
    }
  })

  const count = daySummaries.length
  const averages = {
    calories: Math.round(daySummaries.reduce((s, d) => s + d.calories, 0) / count),
    protein: Math.round(daySummaries.reduce((s, d) => s + d.protein, 0) / count),
    fat: Math.round(daySummaries.reduce((s, d) => s + d.fat, 0) / count),
    carbs: Math.round(daySummaries.reduce((s, d) => s + d.carbs, 0) / count),
    water_ml: Math.round(daySummaries.reduce((s, d) => s + d.water_ml, 0) / count),
    daysLogged: count,
  }

  return { days: daySummaries, averages, error: null }
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

export async function saveMeal(userId, { name, category, protein, fat, carbs, fiber, sodium, sugar }) {
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data, error } = await supabase
    .from('saved_meals')
    .insert({
      user_id: userId, name, category, calories, protein, fat, carbs,
      fiber: fiber || null,
      sodium: sodium || null,
      sugar: sugar || null,
    })
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

export async function logSavedMeal(userId, savedMeal, dateStr) {
  const date = dateStr || isoDate(new Date())

  const { data: log, error: logErr } = await ensureDailyLog(userId, date)
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
      fiber: savedMeal.fiber || null,
      sodium: savedMeal.sodium || null,
      sugar: savedMeal.sugar || null,
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
