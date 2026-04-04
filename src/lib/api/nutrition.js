import { supabase } from '../supabase'

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

const EMPTY_TOTALS = { protein: 0, fat: 0, carbs: 0, calories: 0, fiber: 0, sodium: 0, sugar: 0, saturated_fat: 0, trans_fat: 0, cholesterol: 0, potassium: 0, vitamin_a: 0, vitamin_c: 0, calcium: 0, iron: 0 }

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
      saturated_fat: acc.saturated_fat + (meal.saturated_fat || 0),
      trans_fat: acc.trans_fat + (meal.trans_fat || 0),
      cholesterol: acc.cholesterol + (meal.cholesterol || 0),
      potassium: acc.potassium + (meal.potassium || 0),
      vitamin_a: acc.vitamin_a + (meal.vitamin_a || 0),
      vitamin_c: acc.vitamin_c + (meal.vitamin_c || 0),
      calcium: acc.calcium + (meal.calcium || 0),
      iron: acc.iron + (meal.iron || 0),
      sugar: acc.sugar + (meal.sugar || 0),
    }),
    { ...EMPTY_TOTALS },
  )

  return { meals: safeMeals, totals, waterMl: logData.water_ml || 0, error: null }
}

export async function logMeal(userId, meal, dateStr) {
  const { category, name, protein, fat, carbs, fiber, sodium, sugar, saturated_fat, trans_fat, cholesterol, potassium, vitamin_a, vitamin_c, calcium, iron } = meal
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
      saturated_fat: saturated_fat || null,
      trans_fat: trans_fat || null,
      cholesterol: cholesterol || null,
      potassium: potassium || null,
      vitamin_a: vitamin_a || null,
      vitamin_c: vitamin_c || null,
      calcium: calcium || null,
      iron: iron || null,
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
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return copyMealsFromDate(userId, category, isoDate(yesterday), isoDate(new Date()))
}

export async function copyMealsFromDate(userId, category, fromDateStr, toDateStr) {
  // Find source day's log
  const { data: srcLog, error: srcErr } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('date', fromDateStr)
    .maybeSingle()

  if (srcErr) return { error: srcErr }
  if (!srcLog) return { error: { message: `No meals found for ${fromDateStr}.` } }

  // Get source meals for this category
  const { data: srcMeals, error: mealsErr } = await supabase
    .from('logged_meals')
    .select('*')
    .eq('daily_log_id', srcLog.id)
    .eq('category', category)

  if (mealsErr) return { error: mealsErr }
  if (!srcMeals?.length) return { error: { message: `No ${category} meals found for ${fromDateStr}.` } }

  // Ensure target day's log exists
  const { data: tLog, error: tErr } = await ensureDailyLog(userId, toDateStr)
  if (tErr) return { error: tErr }

  // Copy meals (including all micronutrients)
  const inserts = srcMeals.map((m) => ({
    daily_log_id: tLog.id,
    user_id: userId,
    name: m.name,
    category: m.category,
    calories: m.calories,
    protein: m.protein,
    fat: m.fat,
    carbs: m.carbs,
    fiber: m.fiber || 0,
    sodium: m.sodium || 0,
    sugar: m.sugar || 0,
    saturated_fat: m.saturated_fat || null,
    trans_fat: m.trans_fat || null,
    cholesterol: m.cholesterol || null,
    potassium: m.potassium || null,
    vitamin_a: m.vitamin_a || null,
    vitamin_c: m.vitamin_c || null,
    calcium: m.calcium || null,
    iron: m.iron || null,
  }))

  const { error: insErr } = await supabase.from('logged_meals').insert(inserts)
  return { error: insErr }
}

// Get recent dates that have meals for a given category (for copy picker)
export async function getRecentDatesWithMeals(userId, category, limit = 14) {
  // Join through daily_logs to get the actual log date (not created_at)
  const { data, error } = await supabase
    .from('logged_meals')
    .select('daily_log_id, daily_logs!inner(date)')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error || !data?.length) return { data: [], error }

  // Extract unique dates from the daily_log.date field
  const seen = new Set()
  const dates = []
  for (const m of data) {
    const dateStr = m.daily_logs?.date
    if (dateStr && !seen.has(dateStr)) {
      seen.add(dateStr)
      dates.push(dateStr)
    }
    if (dates.length >= limit) break
  }

  // Sort descending (most recent first)
  dates.sort((a, b) => b.localeCompare(a))

  return { data: dates, error: null }
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

// --- Recent Meals ---

export async function getRecentMeals(userId, category, limit = 10) {
  // Get meals from the last 14 days for this category, deduplicated by name
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const { data, error } = await supabase
    .from('logged_meals')
    .select('name, protein, fat, carbs, calories, fiber, sodium, sugar, created_at')
    .eq('user_id', userId)
    .eq('category', category)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })

  if (error || !data?.length) return { data: [], error }

  // Deduplicate by name — keep the most recent instance of each
  const seen = new Set()
  const unique = []
  for (const meal of data) {
    if (!seen.has(meal.name)) {
      seen.add(meal.name)
      unique.push(meal)
    }
    if (unique.length >= limit) break
  }

  return { data: unique, error: null }
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

export async function saveMeal(userId, { name, category, protein, fat, carbs, fiber, sodium, sugar, serving_size, serving_unit }) {
  const calories = protein * 4 + carbs * 4 + fat * 9

  const { data, error } = await supabase
    .from('saved_meals')
    .insert({
      user_id: userId, name, category, calories, protein, fat, carbs,
      fiber: fiber || null,
      sodium: sodium || null,
      sugar: sugar || null,
      serving_size: serving_size || 1,
      serving_unit: serving_unit || null,
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

// --- Nutrition History (for trends chart) ---

export async function getNutritionHistory(userId, days = 7) {
  // Build date range
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(isoDate(d))
  }

  const { data: logs, error: logErr } = await supabase
    .from('daily_logs')
    .select('id, date, water_ml')
    .eq('user_id', userId)
    .in('date', dates)

  if (logErr) return { data: [], error: logErr }
  if (!logs?.length) return { data: [], error: null }

  const logIds = logs.map((l) => l.id)
  const { data: meals, error: mealsErr } = await supabase
    .from('logged_meals')
    .select('daily_log_id, calories, protein, fat, carbs')
    .in('daily_log_id', logIds)

  if (mealsErr) return { data: [], error: mealsErr }

  // Build per-day totals
  const mealsByLog = {}
  for (const m of meals ?? []) {
    mealsByLog[m.daily_log_id] = mealsByLog[m.daily_log_id] || []
    mealsByLog[m.daily_log_id].push(m)
  }

  const logByDate = {}
  for (const log of logs) {
    logByDate[log.date] = log
  }

  // Return all dates in range, zero-filled for days with no data
  const result = dates.map((date) => {
    const log = logByDate[date]
    if (!log) return { date, calories: 0, protein: 0, fat: 0, carbs: 0, hasData: false }
    const dayMeals = mealsByLog[log.id] || []
    return {
      date,
      calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
      protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
      fat: dayMeals.reduce((s, m) => s + (m.fat || 0), 0),
      carbs: dayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
      hasData: true,
    }
  })

  return { data: result, error: null }
}

export async function logSavedMeal(userId, savedMeal, dateStr, quantity = 1) {
  const date = dateStr || isoDate(new Date())

  const { data: log, error: logErr } = await ensureDailyLog(userId, date)
  if (logErr) return { data: null, error: logErr }

  // Scale macros by quantity (quantity is relative to serving_size=1)
  const q = quantity
  const scale = (v) => v != null ? Math.round(v * q) : null

  const servingLabel = savedMeal.serving_unit
    ? `${quantity * (savedMeal.serving_size || 1)} ${savedMeal.serving_unit}`
    : null
  const name = servingLabel && quantity !== 1
    ? `${savedMeal.name} (${servingLabel})`
    : savedMeal.name

  const { data, error } = await supabase
    .from('logged_meals')
    .insert({
      daily_log_id: log.id,
      user_id: userId,
      name,
      category: savedMeal.category,
      protein: scale(savedMeal.protein),
      fat: scale(savedMeal.fat),
      carbs: scale(savedMeal.carbs),
      calories: scale(savedMeal.calories),
      fiber: scale(savedMeal.fiber),
      sodium: scale(savedMeal.sodium),
      sugar: scale(savedMeal.sugar),
      saturated_fat: scale(savedMeal.saturated_fat),
      trans_fat: scale(savedMeal.trans_fat),
      cholesterol: scale(savedMeal.cholesterol),
      potassium: scale(savedMeal.potassium),
      vitamin_a: scale(savedMeal.vitamin_a),
      vitamin_c: scale(savedMeal.vitamin_c),
      calcium: scale(savedMeal.calcium),
      iron: scale(savedMeal.iron),
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
