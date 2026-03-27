import { supabase } from '../supabase'

function toCsv(headers, rows) {
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportMeals(userId) {
  const { data, error } = await supabase
    .from('logged_meals')
    .select('created_at, category, name, calories, protein, fat, carbs, fiber, sugar, sodium')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return { error }

  const headers = ['created_at', 'category', 'name', 'calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodium']
  const csv = toCsv(headers, data)
  downloadCsv(`apex-meals-${new Date().toISOString().split('T')[0]}.csv`, csv)
  return { count: data.length, error: null }
}

export async function exportWorkouts(userId) {
  const { data: sessions, error: sessErr } = await supabase
    .from('workout_sessions')
    .select('id, name, date, duration_minutes, notes')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (sessErr) return { error: sessErr }

  const { data: sets, error: setErr } = await supabase
    .from('logged_sets')
    .select('logged_exercise_id, set_number, weight_kg, reps, is_warmup, logged_exercises(name, workout_session_id)')
    .eq('user_id', userId)
    .order('set_number', { ascending: true })

  if (setErr) return { error: setErr }

  // Build a map of session_id -> session
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]))

  // Flatten sets into rows with session context
  const rows = sets.map((s) => {
    const session = sessionMap[s.logged_exercises?.workout_session_id] || {}
    return {
      date: session.date || '',
      session_name: session.name || '',
      exercise: s.logged_exercises?.name || '',
      set_number: s.set_number,
      weight_kg: s.weight_kg,
      reps: s.reps,
      is_warmup: s.is_warmup ? 'yes' : 'no',
    }
  })

  const headers = ['date', 'session_name', 'exercise', 'set_number', 'weight_kg', 'reps', 'is_warmup']
  const csv = toCsv(headers, rows)
  downloadCsv(`apex-workouts-${new Date().toISOString().split('T')[0]}.csv`, csv)
  return { count: rows.length, error: null }
}

export async function exportWeight(userId) {
  const { data, error } = await supabase
    .from('body_weight')
    .select('date, weight_kg')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error) return { error }

  const headers = ['date', 'weight_kg']
  const csv = toCsv(headers, data)
  downloadCsv(`apex-weight-${new Date().toISOString().split('T')[0]}.csv`, csv)
  return { count: data.length, error: null }
}
