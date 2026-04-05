import { X, Leaf, FlaskConical, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { searchAlternatives } from '../lib/api/food'
import { ScoreCircle, NutriScorePill, NovaPill } from './FoodHealthBadge'
import {
  calculateHealthScore,
  GRADE_LABELS,
  GRADE_COLORS,
  NUTRI_SCORE_COLORS,
  NOVA_LABELS,
  NOVA_COLORS,
  NOVA_DESCRIPTIONS,
} from '../lib/health-score'
import { RISK_LABELS, RISK_COLORS, RISK_BG_COLORS } from '../lib/additive-risks'

/**
 * Full-screen modal showing detailed health analysis for a food product.
 * Shows: health score breakdown, Nutri-Score, NOVA classification,
 * additive list with risk levels, and ingredients.
 */
export default function FoodDetailModal({ isOpen, onClose, health, food }) {
  const [showAdditives, setShowAdditives] = useState(true)
  const [showIngredients, setShowIngredients] = useState(false)
  const [alternatives, setAlternatives] = useState([])
  const [altLoading, setAltLoading] = useState(false)

  // Fetch healthier alternatives when modal opens for a mediocre/poor product
  useEffect(() => {
    if (!isOpen || !food || !health) { setAlternatives([]); return }
    // Only suggest alternatives for non-excellent products with category data
    if (health.score >= 75 || !food.categories?.length) { setAlternatives([]); return }

    let cancelled = false
    setAltLoading(true)
    // Use the most specific category (last in the array is usually most specific)
    const cat = food.categories[food.categories.length - 1]
    searchAlternatives(cat).then(({ data }) => {
      if (cancelled) return
      // Filter out the current product
      const filtered = (data || []).filter((p) => p.name !== food.name)
      setAlternatives(filtered)
      setAltLoading(false)
    })
    return () => { cancelled = true }
  }, [isOpen, food?.name])

  if (!isOpen || !health || !food) return null

  const scoreColor = GRADE_COLORS[health.grade]
  const additives = health.additiveAnalysis?.additives || []

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-zinc-800">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-lg font-bold leading-tight">{food.name}</h2>
            {food.servingSize && (
              <div className="text-xs text-zinc-500 mt-0.5">per {food.servingSize}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition shrink-0"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Score overview */}
          <div className="flex items-center gap-5">
            <ScoreCircle score={health.score} color={scoreColor} size={72} />
            <div className="flex-1">
              <div className="text-lg font-bold" style={{ color: scoreColor }}>
                {GRADE_LABELS[health.grade]}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Health score: {health.score}/100</div>
              {health.isOrganic && (
                <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                  <Leaf size={12} /> Organic certified
                </div>
              )}
            </div>
          </div>

          {/* Score breakdown bar */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">Score Breakdown</div>
            <div className="space-y-2.5">
              <BreakdownRow
                label="Nutritional quality"
                value={health.breakdown.nutrition}
                max={60}
                color="#3b82f6"
                sublabel={health.nutriScore ? `Nutri-Score ${health.nutriScore.toUpperCase()}` : null}
              />
              <BreakdownRow
                label="Additives"
                value={health.breakdown.additives}
                max={30}
                color={additives.length === 0 ? '#22c55e' : health.additiveAnalysis.hasHighRisk ? '#ef4444' : '#f97316'}
                sublabel={additives.length === 0 ? 'No additives' : `${additives.length} additive${additives.length !== 1 ? 's' : ''}`}
              />
              <BreakdownRow
                label="Organic"
                value={health.breakdown.organic}
                max={10}
                color="#22c55e"
                sublabel={health.isOrganic ? 'Certified' : 'Not organic'}
              />
            </div>
          </div>

          {/* Nutri-Score */}
          {health.nutriScore && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">Nutri-Score</div>
              <div className="flex items-center gap-1">
                {['a', 'b', 'c', 'd', 'e'].map((g) => {
                  const isActive = g === health.nutriScore
                  const color = NUTRI_SCORE_COLORS[g]
                  return (
                    <div
                      key={g}
                      className="flex-1 flex items-center justify-center rounded-lg font-black uppercase transition-all"
                      style={{
                        backgroundColor: isActive ? color : `${color}15`,
                        color: isActive ? (g === 'a' || g === 'b' ? '#000' : '#fff') : `${color}60`,
                        height: isActive ? 40 : 32,
                        fontSize: isActive ? 18 : 14,
                      }}
                    >
                      {g}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* NOVA Classification */}
          {health.novaGroup && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">Processing Level (NOVA)</div>
              <div className="flex items-center gap-3 mb-2">
                <NovaPill group={health.novaGroup} />
                <span className="text-sm font-bold" style={{ color: NOVA_COLORS[health.novaGroup] }}>
                  {NOVA_LABELS[health.novaGroup]}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {NOVA_DESCRIPTIONS[health.novaGroup]}
              </p>
            </div>
          )}

          {/* Additives */}
          {additives.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdditives(!showAdditives)}
                className="flex items-center justify-between w-full p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical size={14} className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">
                    Additives ({additives.length})
                  </span>
                  {health.additiveAnalysis.hasHighRisk && (
                    <AlertTriangle size={12} className="text-red-400" />
                  )}
                </div>
                {showAdditives ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
              </button>
              {showAdditives && (
                <div className="px-4 pb-4 space-y-1.5">
                  {additives.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: a.bgColor }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="text-xs font-bold text-zinc-300 shrink-0">{a.eNumber}</span>
                        <span className="text-xs text-zinc-400 truncate">{a.name}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold shrink-0 ml-2"
                        style={{ color: a.color }}
                      >
                        {a.riskLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ingredients */}
          {food.ingredients && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowIngredients(!showIngredients)}
                className="flex items-center justify-between w-full p-4 text-left"
              >
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Ingredients</span>
                {showIngredients ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
              </button>
              {showIngredients && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">{food.ingredients}</p>
                </div>
              )}
            </div>
          )}

          {/* Healthier alternatives */}
          {(alternatives.length > 0 || altLoading) && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">
                Healthier Alternatives
              </div>
              {altLoading ? (
                <div className="text-xs text-zinc-600 py-2">Finding better options...</div>
              ) : (
                <div className="space-y-2">
                  {alternatives.map((alt, i) => {
                    const altHealth = calculateHealthScore({
                      nutriScore: alt.nutriScore,
                      novaGroup: alt.novaGroup,
                      additives: alt.additives || [],
                      labels: alt.labels || [],
                    })
                    const altColor = GRADE_COLORS[altHealth.grade]
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-zinc-900/50"
                      >
                        <ScoreCircle score={altHealth.score} color={altColor} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-200 truncate">{alt.name}</div>
                          <div className="text-[10px] text-zinc-500">
                            {alt.calories} cal · {alt.protein}P · {alt.fat}F · {alt.carbs}C
                          </div>
                        </div>
                        {alt.nutriScore && (
                          <NutriScorePill grade={alt.nutriScore} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Macros summary */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] text-zinc-500 font-bold uppercase mb-3">Nutrition</div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <MacroItem label="Calories" value={food.calories} unit="" />
              <MacroItem label="Protein" value={food.protein} unit="g" color="text-blue-400" />
              <MacroItem label="Fat" value={food.fat} unit="g" color="text-amber-400" />
              <MacroItem label="Carbs" value={food.carbs} unit="g" color="text-green-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakdownRow({ label, value, max, color, sublabel }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-bold text-zinc-300">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      {sublabel && (
        <div className="text-[10px] text-zinc-600 mt-0.5">{sublabel}</div>
      )}
    </div>
  )
}

function MacroItem({ label, value, unit, color = 'text-white' }) {
  return (
    <div>
      <div className={`text-lg font-bold ${color}`}>{value}{unit}</div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  )
}
