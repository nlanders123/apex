import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getSession,
  getSessionExercisesAndSets,
  addSet,
  updateSet,
  getLastPerformanceBatch,
} from '../../lib/api/workouts'
import { ArrowLeft, Plus } from 'lucide-react'

export default function SessionLogger() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState(null)
  const [exercises, setExercises] = useState([])
  const [setsByExercise, setSetsByExercise] = useState({})
  const [lastPerformance, setLastPerformance] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      await fetchAll()
      setLoading(false)
    })()
  }, [id])

  const fetchAll = async () => {
    const [sessionResult, exerciseResult] = await Promise.all([
      getSession(user.id, id),
      getSessionExercisesAndSets(user.id, id),
    ])

    if (sessionResult.error) { console.error(sessionResult.error); return }
    if (exerciseResult.error) { console.error(exerciseResult.error); return }

    setSession(sessionResult.data)
    setExercises(exerciseResult.exercises)
    setSetsByExercise(exerciseResult.setsByExercise)

    // Fetch progressive overload data (pass full exercise objects for exercise_id matching)
    if (exerciseResult.exercises.length > 0) {
      const history = await getLastPerformanceBatch(user.id, exerciseResult.exercises, id)
      setLastPerformance(history)
    }
  }

  const handleAddSet = async (exercise) => {
    const existing = setsByExercise[exercise.id] || []
    const nextNumber = existing.length + 1

    const { error } = await addSet(user.id, exercise.id, nextNumber)
    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    // Refresh exercises and sets
    const { exercises: ex, setsByExercise: sets } = await getSessionExercisesAndSets(user.id, id)
    setExercises(ex)
    setSetsByExercise(sets)
  }

  const handleUpdateSet = async (setId, patch) => {
    const { error } = await updateSet(user.id, setId, patch)
    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    const { exercises: ex, setsByExercise: sets } = await getSessionExercisesAndSets(user.id, id)
    setExercises(ex)
    setSetsByExercise(sets)
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-500 p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => nav('/workouts')}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{session?.name}</h1>
          <p className="text-sm text-zinc-400">Session</p>
        </div>
      </header>

      {exercises.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-500 text-center">
          This session has no exercises yet.
        </div>
      ) : (
        <div className="space-y-4">
          {exercises.map((ex) => {
            const lastSets = lastPerformance[ex.name] || []

            return (
              <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg">{ex.name}</h3>
                  <button
                    onClick={() => handleAddSet(ex)}
                    className="flex items-center gap-1 text-sm font-bold text-zinc-900 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition"
                  >
                    <Plus size={16} strokeWidth={3} /> Add set
                  </button>
                </div>

                {/* Progressive overload: show last session's data */}
                {lastSets.length > 0 && (
                  <div className="mb-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3">
                    <div className="text-xs font-bold text-zinc-500 mb-1.5">Last time</div>
                    <div className="flex flex-wrap gap-2">
                      {lastSets.filter((s) => !s.is_warmup).map((s) => (
                        <span
                          key={s.set_number}
                          className="text-xs bg-zinc-800 px-2 py-1 rounded-lg text-zinc-300"
                        >
                          {s.weight_kg != null ? `${s.weight_kg}kg` : '?'} x {s.reps ?? '?'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {(setsByExercise[ex.id] || []).length === 0 ? (
                    <div className="text-sm text-zinc-500 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-center border-dashed">
                      No sets logged.
                    </div>
                  ) : (
                    (setsByExercise[ex.id] || []).map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-12 gap-2 items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50"
                      >
                        <div className="col-span-2 text-xs font-bold text-zinc-500">Set {s.set_number}</div>
                        <div className="col-span-5">
                          <input
                            inputMode="decimal"
                            placeholder="kg"
                            value={s.weight_kg ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(s.id, {
                                weight_kg: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-zinc-600"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            inputMode="numeric"
                            placeholder="reps"
                            value={s.reps ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(s.id, {
                                reps: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white outline-none focus:border-zinc-600"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
