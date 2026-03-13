import { supabase } from '../supabase'

// ==========================================
// TEMPLATES
// ==========================================

export async function getTemplates(userId) {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

export async function createTemplate(userId, name) {
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name })
    .select('*')
    .single()

  return { data, error }
}

export async function deleteTemplate(userId, templateId) {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId)

  return { error }
}

// ==========================================
// TEMPLATE EXERCISES
// ==========================================

export async function getTemplateExercises(userId, templateId) {
  const { data, error } = await supabase
    .from('template_exercises')
    .select('*')
    .eq('template_id', templateId)
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  return { data: data ?? [], error }
}

export async function addTemplateExercise(userId, templateId, name, orderIndex) {
  const { data, error } = await supabase
    .from('template_exercises')
    .insert({
      template_id: templateId,
      user_id: userId,
      name,
      order_index: orderIndex,
    })
    .select('*')
    .single()

  return { data, error }
}

export async function removeTemplateExercise(userId, exerciseId) {
  const { error } = await supabase
    .from('template_exercises')
    .delete()
    .eq('id', exerciseId)
    .eq('user_id', userId)

  return { error }
}

// ==========================================
// SESSIONS
// ==========================================

export async function getSessions(userId, limit = 30) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error }
}

export async function getSession(userId, sessionId) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  return { data, error }
}

export async function startSession(userId, template, exercises) {
  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      template_id: template.id,
      name: template.name,
    })
    .select('*')
    .single()

  if (sessionErr) return { data: null, error: sessionErr }

  // Copy exercises from template into session
  if (exercises.length > 0) {
    const inserts = exercises.map((ex) => ({
      session_id: session.id,
      user_id: userId,
      name: ex.name,
      order_index: ex.order_index,
    }))

    const { error: exErr } = await supabase.from('logged_exercises').insert(inserts)
    if (exErr) return { data: null, error: exErr }
  }

  return { data: session, error: null }
}

// ==========================================
// LOGGED EXERCISES + SETS
// ==========================================

export async function getSessionExercisesAndSets(userId, sessionId) {
  const { data: exercises, error: exErr } = await supabase
    .from('logged_exercises')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('order_index', { ascending: true })

  if (exErr) return { exercises: [], setsByExercise: {}, error: exErr }

  const list = exercises ?? []
  if (list.length === 0) return { exercises: [], setsByExercise: {}, error: null }

  const exIds = list.map((e) => e.id)

  const { data: sets, error: setsErr } = await supabase
    .from('logged_sets')
    .select('*')
    .in('exercise_id', exIds)
    .eq('user_id', userId)
    .order('set_number', { ascending: true })

  if (setsErr) return { exercises: list, setsByExercise: {}, error: setsErr }

  const map = {}
  for (const s of sets ?? []) {
    map[s.exercise_id] = map[s.exercise_id] || []
    map[s.exercise_id].push(s)
  }

  return { exercises: list, setsByExercise: map, error: null }
}

export async function addSet(userId, exerciseId, setNumber) {
  const { data, error } = await supabase
    .from('logged_sets')
    .insert({
      exercise_id: exerciseId,
      user_id: userId,
      set_number: setNumber,
      weight_kg: null,
      reps: null,
      is_warmup: false,
    })
    .select('*')
    .single()

  return { data, error }
}

export async function updateSet(userId, setId, patch) {
  const { data, error } = await supabase
    .from('logged_sets')
    .update(patch)
    .eq('id', setId)
    .eq('user_id', userId)

  return { data, error }
}

// ==========================================
// PROGRESSIVE OVERLOAD
// ==========================================

/**
 * For a given exercise, find the most recent session where it was logged
 * and return all sets. Prefers exercise_id match (normalised), falls back
 * to name match (legacy free-text data).
 */
export async function getLastPerformance(userId, { exerciseId, name }, excludeSessionId) {
  let query = supabase
    .from('logged_exercises')
    .select(`
      id,
      session_id,
      workout_sessions!inner(date)
    `)
    .eq('user_id', userId)
    .neq('session_id', excludeSessionId)
    .order('workout_sessions(date)', { ascending: false })
    .limit(1)

  // Prefer exercise_id match (normalised), fall back to name match
  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  } else {
    query = query.eq('name', name)
  }

  const { data: lastExercise, error: exErr } = await query.maybeSingle()

  if (exErr || !lastExercise) return { sets: [], error: exErr }

  const { data: sets, error: setsErr } = await supabase
    .from('logged_sets')
    .select('set_number, weight_kg, reps, is_warmup')
    .eq('exercise_id', lastExercise.id)
    .eq('user_id', userId)
    .order('set_number', { ascending: true })

  return { sets: sets ?? [], error: setsErr }
}

/**
 * Get full session summary: exercises with their sets and volume totals.
 */
export async function getSessionSummary(userId, sessionId) {
  const { exercises, setsByExercise, error } = await getSessionExercisesAndSets(userId, sessionId)
  if (error) return { exercises: [], totalVolume: 0, totalSets: 0, error }

  let totalVolume = 0
  let totalSets = 0

  const summary = exercises.map((ex) => {
    const sets = (setsByExercise[ex.id] || []).filter((s) => !s.is_warmup)
    const volume = sets.reduce((acc, s) => acc + (s.weight_kg || 0) * (s.reps || 0), 0)
    const bestSet = sets.reduce((best, s) => {
      const w = s.weight_kg || 0
      return w > (best.weight_kg || 0) ? s : best
    }, sets[0] || {})

    totalVolume += volume
    totalSets += sets.length

    return {
      ...ex,
      sets,
      setCount: sets.length,
      volume: Math.round(volume),
      bestWeight: bestSet.weight_kg || 0,
      bestReps: bestSet.reps || 0,
    }
  })

  return { exercises: summary, totalVolume: Math.round(totalVolume), totalSets, error: null }
}

/**
 * Get full history for a specific exercise across all sessions.
 * Returns sessions sorted newest first with their sets.
 */
export async function getExerciseHistory(userId, exerciseName, limit = 20) {
  const { data: loggedExercises, error } = await supabase
    .from('logged_exercises')
    .select(`
      id,
      name,
      session_id,
      workout_sessions!inner(id, name, date)
    `)
    .eq('user_id', userId)
    .eq('name', exerciseName)
    .order('workout_sessions(date)', { ascending: false })
    .limit(limit)

  if (error || !loggedExercises?.length) return { history: [], error }

  const exIds = loggedExercises.map((e) => e.id)
  const { data: allSets, error: setsErr } = await supabase
    .from('logged_sets')
    .select('*')
    .in('exercise_id', exIds)
    .eq('user_id', userId)
    .order('set_number', { ascending: true })

  if (setsErr) return { history: [], error: setsErr }

  const setsMap = {}
  for (const s of allSets ?? []) {
    setsMap[s.exercise_id] = setsMap[s.exercise_id] || []
    setsMap[s.exercise_id].push(s)
  }

  const history = loggedExercises.map((ex) => {
    const sets = (setsMap[ex.id] || []).filter((s) => !s.is_warmup)
    const topSet = sets.reduce((best, s) => {
      const w = s.weight_kg || 0
      return w > (best.weight_kg || 0) ? s : best
    }, sets[0] || {})
    const volume = sets.reduce((acc, s) => acc + (s.weight_kg || 0) * (s.reps || 0), 0)

    return {
      sessionId: ex.session_id,
      sessionName: ex.workout_sessions.name,
      date: ex.workout_sessions.date,
      sets,
      setCount: sets.length,
      topWeight: topSet.weight_kg || 0,
      topReps: topSet.reps || 0,
      volume: Math.round(volume),
    }
  })

  return { history, error: null }
}

/**
 * Get workout stats: weekly count, current streak, total sessions.
 */
export async function getWorkoutStats(userId) {
  // Get total count separately (cheap aggregate)
  const { count, error: countErr } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countErr) return { thisWeek: 0, streak: 0, total: 0, error: countErr }

  const total = count || 0
  if (total === 0) return { thisWeek: 0, streak: 0, total: 0, error: null }

  // Only fetch recent sessions for streak/weekly calc (90 days max)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .gte('date', ninetyDaysAgo.toISOString())
    .order('date', { ascending: false })

  if (error || !sessions?.length) return { thisWeek: 0, streak: 0, total, error }

  // This week (Mon–Sun)
  const now = new Date()
  const dayOfWeek = now.getDay() || 7 // Mon=1, Sun=7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  monday.setHours(0, 0, 0, 0)
  const thisWeek = sessions.filter((s) => new Date(s.date) >= monday).length

  // Streak: consecutive days with workouts (looking back from today)
  const uniqueDays = [...new Set(sessions.map((s) => s.date.split('T')[0]))].sort().reverse()
  let streak = 0
  const today = now.toISOString().split('T')[0]
  let checkDate = new Date(today)

  // Allow streak to start from today or yesterday
  if (uniqueDays[0] !== today) {
    const yesterday = new Date(checkDate)
    yesterday.setDate(yesterday.getDate() - 1)
    if (uniqueDays[0] !== yesterday.toISOString().split('T')[0]) {
      return { thisWeek, streak: 0, total, error: null }
    }
    checkDate = yesterday
  }

  for (const day of uniqueDays) {
    const expected = checkDate.toISOString().split('T')[0]
    if (day === expected) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (day < expected) {
      break
    }
  }

  return { thisWeek, streak, total, error: null }
}

/**
 * Batch version for multiple exercises. Used by SessionLogger on load.
 */
export async function getLastPerformanceBatch(userId, exercises, excludeSessionId) {
  const result = {}

  const promises = exercises.map(async (ex) => {
    const { sets } = await getLastPerformance(
      userId,
      { exerciseId: ex.exercise_id, name: ex.name },
      excludeSessionId,
    )
    // Key by exercise name for UI lookup
    result[ex.name] = sets
  })

  await Promise.all(promises)
  return result
}
