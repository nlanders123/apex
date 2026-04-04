import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getTemplates, createTemplate, getSessions } from '../lib/api/workouts'
import { Plus, ChevronRight } from 'lucide-react'
import { useToast } from '../components/Toast'

export default function Workouts() {
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('sessions')
  const [templates, setTemplates] = useState([])
  const [sessions, setSessions] = useState([])
  const [newTemplateName, setNewTemplateName] = useState('')

  useEffect(() => {
    fetchTemplates()
    fetchSessions()
  }, [])

  const fetchTemplates = async () => {
    const { data, error } = await getTemplates(user.id)
    if (error) { console.error(error); return }
    setTemplates(data)
  }

  const fetchSessions = async () => {
    const { data, error } = await getSessions(user.id)
    if (error) { console.error(error); return }
    setSessions(data)
  }

  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    const name = newTemplateName.trim()
    if (!name) return

    const { data, error } = await createTemplate(user.id, name)
    if (error) {
      console.error(error)
      toast(error.message, 'error')
      return
    }

    setNewTemplateName('')
    await fetchTemplates()
    nav(`/template/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 pb-24 overflow-x-hidden max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
        <p className="text-zinc-400 text-sm mt-1">Templates + session logging.</p>
      </header>

      <div className="flex bg-zinc-900 rounded-lg p-1 mb-6 border border-zinc-800">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition ${
            activeTab === 'sessions' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition ${
            activeTab === 'templates' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Templates
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
              No sessions yet.
            </div>
          ) : (
            sessions.map((s) => {
              const daysDiff = Math.floor((Date.now() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24))
              const timeAgo = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : `${daysDiff}d ago`

              return (
                <button
                  key={s.id}
                  onClick={() => nav(`/session/${s.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(s.date).toLocaleDateString('en-AU', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                      <span className="text-zinc-600 ml-2">{timeAgo}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-zinc-600" size={18} />
                </button>
              )
            })
          )}
        </div>
      ) : (
        <div>
          <form onSubmit={handleCreateTemplate} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <div className="flex gap-2">
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="New template name (e.g. Push Day)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="flex items-center gap-1 bg-white text-zinc-950 font-bold px-4 rounded-xl hover:bg-zinc-200 transition"
              >
                <Plus size={16} /> Create
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
                No templates yet.
              </div>
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => nav(`/template/${t.id}`)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:bg-zinc-800/50 transition flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-zinc-500">Template</div>
                  </div>
                  <ChevronRight className="text-zinc-600" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
