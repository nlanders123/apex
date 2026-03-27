import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getTemplate,
  getTemplateExercises,
  addTemplateExercise,
  removeTemplateExercise,
  startSession,
} from '../../lib/api/workouts'
import { searchExercises, findExerciseByName } from '../../lib/api/exercises'
import { ArrowLeft, Plus, Play, Search } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function TemplateEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [template, setTemplate] = useState(null)
  const [exercises, setExercises] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchTimeout = useRef(null)

  useEffect(() => {
    ;(async () => {
      try {
        await fetchTemplate()
        await fetchExercises()
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const fetchTemplate = async () => {
    const { data, error } = await getTemplate(user.id, id)
    if (error) throw error
    setTemplate(data)
  }

  const fetchExercises = async () => {
    const { data, error } = await getTemplateExercises(user.id, id)
    if (error) { console.error(error); return }
    setExercises(data)
  }

  // Debounced exercise search
  const handleSearchChange = (value) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (value.trim().length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      const { data } = await searchExercises(value)
      setSearchResults(data)
      setShowResults(true)
    }, 200)
  }

  // Add exercise from library (with exercise_id)
  const handleSelectExercise = async (exercise) => {
    const { error } = await addTemplateExercise(user.id, id, exercise.name, exercises.length)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    await fetchExercises()
  }

  // Add custom exercise (free text, no exercise_id yet)
  const handleAddCustom = async (e) => {
    e.preventDefault()
    const name = searchQuery.trim()
    if (!name) return

    // Try to find a matching exercise in the library first
    const { data: match } = await findExerciseByName(name)

    const { error } = await addTemplateExercise(user.id, id, match?.name || name, exercises.length)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    await fetchExercises()
  }

  const handleRemoveExercise = async (exerciseId) => {
    if (!confirm('Remove this exercise from the template?')) return

    const { error } = await removeTemplateExercise(user.id, exerciseId)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    await fetchExercises()
  }

  const handleStartSession = async () => {
    if (!template) return

    const { data: session, error } = await startSession(user.id, template, exercises)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    nav(`/session/${session.id}`)
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template?.name}</h1>
          <p className="text-sm text-zinc-400">Template</p>
        </div>
        <button
          onClick={handleStartSession}
          className="flex items-center gap-2 bg-white text-zinc-950 font-bold px-4 py-2 rounded-xl hover:bg-zinc-200 transition"
        >
          <Play size={16} /> Start
        </button>
      </header>

      {/* Exercise search/add */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
        <form onSubmit={handleAddCustom} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              placeholder="Search exercises or type custom..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-zinc-600"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-3 rounded-xl hover:bg-zinc-700 transition font-bold"
          >
            <Plus size={18} />
          </button>
        </form>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
            {searchResults.map((ex) => (
              <button
                key={ex.id}
                onMouseDown={() => handleSelectExercise(ex)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition flex justify-between items-center border-b border-zinc-800/50 last:border-0"
              >
                <span className="font-medium text-sm">{ex.name}</span>
                <span className="text-xs text-zinc-500 capitalize">
                  {ex.primary_muscle} · {ex.equipment}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {exercises.length === 0 ? (
          <div className="text-sm text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            Search and add exercises to this template.
          </div>
        ) : (
          exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            >
              <div>
                <div className="font-bold">{ex.name}</div>
                <div className="text-xs text-zinc-500">Exercise {ex.order_index + 1}</div>
              </div>
              <button
                onClick={() => handleRemoveExercise(ex.id)}
                className="text-xs font-bold text-zinc-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
