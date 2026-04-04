import { supabase } from '../supabase'

function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function getCaloriePlans(userId) {
  const { data, error } = await supabase
    .from('calorie_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('event_date', { ascending: true })

  return { data: data ?? [], error }
}

export async function createCaloriePlan(userId, { name, eventDate, eventCalories, prepDays }) {
  const { data, error } = await supabase
    .from('calorie_plans')
    .insert({
      user_id: userId,
      name,
      event_date: eventDate,
      event_calories: eventCalories,
      prep_days: prepDays,
    })
    .select('*')
    .single()

  return { data, error }
}

export async function deleteCaloriePlan(userId, planId) {
  const { error } = await supabase
    .from('calorie_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId)

  return { error }
}

/**
 * Calculate the adjusted calorie target for a given date based on active plans.
 *
 * Logic:
 * - If `date` IS the event day → target = plan.event_calories
 * - If `date` falls within the prep window (event_date - prep_days ... event_date - 1)
 *   → daily target is reduced by (event_calories - baseTarget) / prep_days
 * - Multiple plans can stack (rare but supported)
 *
 * Returns { adjustedTarget, activePlans[] } where activePlans has the plan + its
 * effect on today's target.
 */
export function getAdjustedTarget(plans, baseTarget, dateStr) {
  if (!plans?.length || !baseTarget) return { adjustedTarget: baseTarget, activePlans: [] }

  let adjustment = 0
  const activePlans = []

  for (const plan of plans) {
    const eventDate = new Date(plan.event_date + 'T00:00:00')
    const checkDate = new Date(dateStr + 'T00:00:00')
    const prepStart = new Date(eventDate)
    prepStart.setDate(eventDate.getDate() - plan.prep_days)

    const extra = plan.event_calories - baseTarget
    const dailyBank = Math.round(extra / plan.prep_days)

    if (dateStr === plan.event_date) {
      // Event day — eat the banked calories
      adjustment += extra
      activePlans.push({ ...plan, effect: `+${extra} cal (event day)`, type: 'event' })
    } else if (checkDate >= prepStart && checkDate < eventDate) {
      // Prep window — bank calories
      adjustment -= dailyBank
      const daysUntil = Math.ceil((eventDate - checkDate) / 86400000)
      activePlans.push({ ...plan, effect: `-${dailyBank} cal/day (${daysUntil}d to go)`, type: 'prep' })
    }
  }

  return {
    adjustedTarget: Math.max(1200, baseTarget + adjustment), // floor at 1200 for safety
    activePlans,
  }
}
