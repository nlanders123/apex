import { supabase } from '../supabase'

/**
 * Search exercises by name. Returns global + user's custom exercises.
 */
export async function searchExercises(query, limit = 15) {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, primary_muscle, equipment')
    .ilike('canonical_name', `%${query.toLowerCase().trim()}%`)
    .order('name')
    .limit(limit)

  return { data: data ?? [], error }
}

/**
 * Get all exercises, optionally filtered by muscle group.
 */
export async function getExercises({ muscle = null, limit = 100 } = {}) {
  let query = supabase
    .from('exercises')
    .select('id, name, primary_muscle, secondary_muscles, equipment')
    .order('name')
    .limit(limit)

  if (muscle) {
    query = query.eq('primary_muscle', muscle)
  }

  const { data, error } = await query
  return { data: data ?? [], error }
}

/**
 * Get a single exercise by ID.
 */
export async function getExercise(exerciseId) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single()

  return { data, error }
}

/**
 * Create a custom exercise for the user.
 */
export async function createExercise(userId, { name, primaryMuscle, equipment = 'barbell' }) {
  const canonicalName = name.toLowerCase().trim()

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: userId,
      name,
      canonical_name: canonicalName,
      primary_muscle: primaryMuscle,
      equipment,
    })
    .select('*')
    .single()

  return { data, error }
}

/**
 * Find an exercise by canonical name (case-insensitive exact match).
 * Used when linking free-text exercise names to the library.
 */
export async function findExerciseByName(name) {
  const canonical = name.toLowerCase().trim()

  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, primary_muscle, equipment')
    .eq('canonical_name', canonical)
    .maybeSingle()

  return { data, error }
}
