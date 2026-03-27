import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getSession,
  getSessionExercisesAndSets,
  getSessionSummary,
  addSet,
  updateSet,
  getLastPerformanceBatch,
  finishSession,
  updateSessionNotes,
  updateExerciseNotes,
} from '../../lib/api/workouts'
import { ArrowLeft, Plus, TrendingUp, Clock, StickyNote, Check, Trophy } from 'lucide-react'
import { useToast } from '../../components/Toast'

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function SessionLogger() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [session, setSession] = useState(null)
  const [exercises, setExercises] = useState([])
  const [setsByExercise, setSetsByExercise] = useState({})
  const [lastPerformance, setLastPerformance] = useState({})
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Timer state
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  // Completion state
  const [completed, setCompleted] = useState(false)
  const [completionData, setCompletionData] = useState(null)

  // Notes state
  const [sessionNotes, setSessionNotes] = useState('')
  const [showSessionNotes, setShowSessionNotes] = useState(false)
  const [exerciseNotes, setExerciseNotes] = useState({})
  const [showExerciseNotes, setShowExerciseNotes] = useState({})
  const notesTimeout = useRef({})

  // Detect if this is a past session (older than 12 hours)
  const isPast = session && (Date.now() - new Date(session.date).getTime()) > 12 * 60 * 60 * 1000

  useEffect(() => {
    ;(async () => {
      await fetchAll()
      setLoading(false)
    })()
  }, [id])

  // Start live timer for active sessions
  useEffect(() => {
    if (!session || isPast || completed) return

    const startTime = new Date(session.date).getTime()
    setElapsed(Date.now() - startTime)

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTime)
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [session, isPast, completed])

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

    // Load session notes
    setSessionNotes(sessionResult.data.notes || '')
    setShowSessionNotes(!!sessionResult.data.notes)

    // Load exercise notes
    const exNotes = {}
    const showExNotes = {}
    for (const ex of exerciseResult.exercises) {
      exNotes[ex.id] = ex.notes || ''
      showExNotes[ex.id] = !!ex.notes
    }
    setExerciseNotes(exNotes)
    setShowExerciseNotes(showExNotes)

    // Fetch progressive overload data
    if (exerciseResult.exercises.length > 0) {
      const history = await getLastPerformanceBatch(user.id, exerciseResult.exercises, id)
      setLastPerformance(history)
    }

    // Fetch summary for past sessions
    const sessionDate = new Date(sessionResult.data.date)
    if (Date.now() - sessionDate.getTime() > 12 * 60 * 60 * 1000) {
      const { exercises: summaryExercises, totalVolume, totalSets } = await getSessionSummary(user.id, id)
      setSummary({ exercises: summaryExercises, totalVolume, totalSets })
    }
  }

  const handleAddSet = async (exercise) => {
    const existing = setsByExercise[exercise.id] || []
    const nextNumber = existing.length + 1

    const { error } = await addSet(user.id, exercise.id, nextNumber)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    const { exercises: ex, setsByExercise: sets } = await getSessionExercisesAndSets(user.id, id)
    setExercises(ex)
    setSetsByExercise(sets)
  }

  const handleUpdateSet = async (setId, patch) => {
    const { error } = await updateSet(user.id, setId, patch)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    const { exercises: ex, setsByExercise: sets } = await getSessionExercisesAndSets(user.id, id)
    setExercises(ex)
    setSetsByExercise(sets)
  }

  const handleFinish = async () => {
    const { durationMinutes, error } = await finishSession(user.id, id)
    if (error) {
      toast(error.message, 'error')
      return
    }

    clearInterval(timerRef.current)

    // Get summary for completion view
    const { exercises: summaryExercises, totalVolume, totalSets } = await getSessionSummary(user.id, id)
    setCompletionData({ exercises: summaryExercises, totalVolume, totalSets, durationMinutes })
    setCompleted(true)
  }

  const handleSessionNotesChange = (value) => {
    setSessionNotes(value)
    clearTimeout(notesTimeout.current.session)
    notesTimeout.current.session = setTimeout(async () => {
      const { error } = await updateSessionNotes(user.id, id, value)
      if (error) toast('Failed to save notes', 'error')
    }, 800)
  }

  const handleExerciseNotesChange = (exerciseId, value) => {
    setExerciseNotes((prev) => ({ ...prev, [exerciseId]: value }))
    clearTimeout(notesTimeout.current[exerciseId])
    notesTimeout.current[exerciseId] = setTimeout(async () => {
      const { error } = await updateExerciseNotes(user.id, exerciseId, value)
      if (error) toast('Failed to save notes', 'error')
    }, 800)
  }

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-500 p-6">Loading...</div>
  }

  // Completion view after finishing a workout
  if (completed && completionData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
            <Trophy size={28} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Workout Complete</h1>
          <p className="text-zinc-400">{session?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-xs text-zinc-500 mb-1">Duration</div>
            <div className="text-xl font-bold">{formatMinutes(completionData.durationMinutes)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-xs text-zinc-500 mb-1">Exercises</div>
            <div className="text-xl font-bold">{completionData.exercises.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-xs text-zinc-500 mb-1">Sets</div>
            <div className="text-xl font-bold">{completionData.totalSets}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-xs text-zinc-500 mb-1">Volume</div>
            <div className="text-xl font-bold">{completionData.totalVolume >= 1000 ? `${(completionData.totalVolume / 1000).toFixed(1)}t` : `${completionData.totalVolume}kg`}</div>
          </div>
        </div>

        {/* Exercise breakdown */}
        <div className="space-y-3 mb-8">
          {completionData.exercises.map((ex) => (
            <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{ex.name}</h3>
                <span className="text-xs text-zinc-500">{ex.setCount} sets</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ex.sets.map((s) => (
                  <span
                    key={s.id}
                    className="text-xs bg-zinc-950/50 border border-zinc-800/50 px-2 py-1 rounded-lg text-zinc-300"
                  >
                    {s.weight_kg != null ? `${s.weight_kg}kg` : '?'} x {s.reps ?? '?'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => nav('/workouts')}
          className="w-full bg-white text-zinc-950 font-bold rounded-xl py-3.5 hover:bg-zinc-200 transition active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    )
  }

  // Past session: show read-only summary view
  if (isPast && summary) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => nav('/workouts')}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{session?.name}</h1>
            <p className="text-sm text-zinc-400">
              {new Date(session.date).toLocaleDateString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
              {session.duration_minutes != null && (
                <span className="ml-2">{formatMinutes(session.duration_minutes)}</span>
              )}
            </p>
          </div>
        </header>

        {/* Session notes (past) */}
        {session.notes && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4">
            <div className="text-xs font-bold text-zinc-500 mb-1">Notes</div>
            <div className="text-sm text-zinc-300">{session.notes}</div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Exercises</div>
            <div className="text-lg font-bold">{summary.exercises.length}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Sets</div>
            <div className="text-lg font-bold">{summary.totalSets}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <div className="text-xs text-zinc-500 mb-1">Volume</div>
            <div className="text-lg font-bold">{summary.totalVolume >= 1000 ? `${(summary.totalVolume / 1000).toFixed(1)}t` : `${summary.totalVolume}kg`}</div>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-3">
          {summary.exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => nav(`/exercise-history?name=${encodeURIComponent(ex.name)}`)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{ex.name}</h3>
                <TrendingUp size={14} className="text-zinc-600" />
              </div>
              {ex.notes && (
                <div className="text-xs text-zinc-500 mb-2 italic">{ex.notes}</div>
              )}
              <div className="flex flex-wrap gap-2">
                {ex.sets.map((s) => (
                  <span
                    key={s.id}
                    className="text-xs bg-zinc-950/50 border border-zinc-800/50 px-2 py-1 rounded-lg text-zinc-300"
                  >
                    {s.weight_kg != null ? `${s.weight_kg}kg` : '?'} x {s.reps ?? '?'}
                  </span>
                ))}
              </div>
              {ex.volume > 0 && (
                <div className="text-xs text-zinc-500 mt-2">{ex.volume} kg volume</div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Active session: editable view
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{session?.name}</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock size={14} />
            <span className="font-mono">{formatDuration(elapsed)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowSessionNotes(!showSessionNotes)}
          className={`p-2 rounded-xl border transition ${
            sessionNotes
              ? 'bg-zinc-800 border-zinc-700 text-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
          }`}
          title="Session notes"
        >
          <StickyNote size={16} />
        </button>
      </header>

      {/* Session notes */}
      {showSessionNotes && (
        <div className="mb-4">
          <textarea
            value={sessionNotes}
            onChange={(e) => handleSessionNotesChange(e.target.value)}
            placeholder="Session notes (e.g. felt tired, cut short)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 resize-none"
            rows={2}
          />
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nav(`/exercise-history?name=${encodeURIComponent(ex.name)}`)}
                      className="font-bold text-lg hover:text-zinc-300 transition text-left"
                    >
                      {ex.name}
                    </button>
                    <button
                      onClick={() => setShowExerciseNotes((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                      className={`p-1 rounded-lg transition ${
                        exerciseNotes[ex.id]
                          ? 'text-zinc-400'
                          : 'text-zinc-700 hover:text-zinc-500'
                      }`}
                      title="Exercise notes"
                    >
                      <StickyNote size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddSet(ex)}
                    className="flex items-center gap-1 text-sm font-bold text-zinc-900 bg-white px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition"
                  >
                    <Plus size={16} strokeWidth={3} /> Add set
                  </button>
                </div>

                {/* Exercise notes */}
                {showExerciseNotes[ex.id] && (
                  <div className="mb-3">
                    <textarea
                      value={exerciseNotes[ex.id] || ''}
                      onChange={(e) => handleExerciseNotesChange(ex.id, e.target.value)}
                      placeholder="Notes (e.g. left shoulder tight)..."
                      className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600 resize-none"
                      rows={1}
                    />
                  </div>
                )}

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

      {/* Finish workout button */}
      {!isPast && exercises.length > 0 && (
        <div className="mt-6">
          <button
            onClick={handleFinish}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold rounded-xl py-3.5 hover:bg-green-500 transition active:scale-[0.98]"
          >
            <Check size={18} strokeWidth={3} /> Finish Workout
          </button>
        </div>
      )}
    </div>
  )
}
