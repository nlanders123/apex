import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getMealsForDate } from '../lib/api/nutrition'
import { GRADE_LABELS, GRADE_COLORS } from '../lib/health-score'
import { ScoreCircle } from './FoodHealthBadge'

/**
 * Daily Health Score — aggregates health scores across all logged foods for a date.
 * Score is calorie-weighted: a 500cal junk food counts more than a 20cal condiment.
 *
 * Shows: overall score circle, grade label, food count, and score distribution.
 *
 * Note: Only works for foods that came from Open Food Facts (have barcodes).
 * Quick-add and USDA foods don't have health data.
 */
export default function DailyHealthScore({ selectedDate, compact = false }) {
  const { user } = useAuth()
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!user?.id || !selectedDate) return

    let cancelled = false
    calculateDailyScore(cancelled)

    return () => { cancelled = true }
  }, [user?.id, selectedDate])

  async function calculateDailyScore(cancelled) {
    setLoading(true)
    try {
      const { meals } = await getMealsForDate(user.id, selectedDate)
      if (cancelled) return
      if (!meals?.length) {
        setScore(null)
        setStats(null)
        setLoading(false)
        return
      }

      // For each meal that has a barcode/name match in OFF, calculate health score
      // We use a simplified approach: score foods based on their logged macro profile
      // rather than re-fetching from OFF (which would be too slow for daily aggregation)
      //
      // Scoring heuristic for non-OFF foods:
      // - High protein, low sugar = better
      // - Ultra-processed indicators: very high sodium, high sugar, high sat fat
      let totalWeightedScore = 0
      let totalCalories = 0
      let scoredCount = 0
      const gradeDistribution = { excellent: 0, good: 0, mediocre: 0, poor: 0 }

      for (const meal of meals) {
        const calories = meal.calories || 0
        if (calories === 0) continue

        // Estimate a health score from macros (heuristic for non-OFF foods)
        const mealScore = estimateHealthFromMacros(meal)
        totalWeightedScore += mealScore * calories
        totalCalories += calories
        scoredCount++

        // Categorize
        if (mealScore >= 75) gradeDistribution.excellent++
        else if (mealScore >= 50) gradeDistribution.good++
        else if (mealScore >= 25) gradeDistribution.mediocre++
        else gradeDistribution.poor++
      }

      if (totalCalories === 0 || scoredCount === 0) {
        setScore(null)
        setStats(null)
        setLoading(false)
        return
      }

      const dailyScore = Math.round(totalWeightedScore / totalCalories)
      const grade = dailyScore >= 75 ? 'excellent' : dailyScore >= 50 ? 'good' : dailyScore >= 25 ? 'mediocre' : 'poor'

      setScore(dailyScore)
      setStats({ grade, scoredCount, gradeDistribution })
    } catch (err) {
      console.error('Daily health score error:', err)
      setScore(null)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading || score === null) return null

  const color = GRADE_COLORS[stats.grade]

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ScoreCircle score={score} color={color} size={28} />
        <div>
          <div className="text-[10px] text-zinc-500">Daily Health</div>
          <div className="text-xs font-bold" style={{ color }}>
            {GRADE_LABELS[stats.grade]}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">Daily Health Score</div>
      <div className="flex items-center gap-4">
        <ScoreCircle score={score} color={color} size={52} />
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color }}>
            {GRADE_LABELS[stats.grade]}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            Based on {stats.scoredCount} food{stats.scoredCount !== 1 ? 's' : ''} logged
          </div>
          {/* Grade distribution mini bar */}
          <div className="flex gap-0.5 mt-2 h-1.5 rounded-full overflow-hidden">
            {Object.entries(stats.gradeDistribution).map(([grade, count]) => {
              if (count === 0) return null
              const pct = (count / stats.scoredCount) * 100
              return (
                <div
                  key={grade}
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: GRADE_COLORS[grade],
                    minWidth: count > 0 ? 4 : 0,
                  }}
                />
              )
            })}
          </div>
          <div className="flex gap-3 mt-1.5">
            {Object.entries(stats.gradeDistribution).map(([grade, count]) => {
              if (count === 0) return null
              return (
                <div key={grade} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: GRADE_COLORS[grade] }}
                  />
                  <span className="text-[9px] text-zinc-500">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Estimate a health score from macro data alone (when no OFF data available).
 * This is a simplified heuristic, not a real Nutri-Score calculation.
 *
 * Scoring factors (per 100g equivalent):
 * + High protein ratio → better
 * + Fiber content → better
 * - High sugar → worse
 * - High saturated fat → worse
 * - High sodium → worse
 */
function estimateHealthFromMacros(meal) {
  const cal = meal.calories || 1
  const protein = meal.protein || 0
  const fat = meal.fat || 0
  const carbs = meal.carbs || 0
  const sugar = meal.sugar || 0
  const fiber = meal.fiber || 0
  const sodium = meal.sodium || 0
  const satFat = meal.saturated_fat || 0

  let score = 60 // Start at "decent"

  // Protein ratio bonus (per calorie)
  const proteinRatio = (protein * 4) / cal
  if (proteinRatio > 0.35) score += 15
  else if (proteinRatio > 0.25) score += 10
  else if (proteinRatio > 0.15) score += 5

  // Fiber bonus
  if (fiber > 5) score += 10
  else if (fiber > 2) score += 5

  // Sugar penalty (per calorie)
  const sugarRatio = (sugar * 4) / cal
  if (sugarRatio > 0.5) score -= 25
  else if (sugarRatio > 0.3) score -= 15
  else if (sugarRatio > 0.15) score -= 5

  // Saturated fat penalty
  const satFatRatio = (satFat * 9) / cal
  if (satFatRatio > 0.15) score -= 15
  else if (satFatRatio > 0.1) score -= 5

  // Sodium penalty (mg per calorie)
  const sodiumPerCal = sodium / cal
  if (sodiumPerCal > 2) score -= 15
  else if (sodiumPerCal > 1) score -= 5

  return Math.max(0, Math.min(100, score))
}
