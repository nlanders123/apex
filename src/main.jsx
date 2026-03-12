import React, { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function FatalOverlay({ error }) {
  if (!error) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Apex failed to load</h1>
        <p className="text-zinc-400 mb-6">
          This is a crash screen so we can debug blank-page issues on mobile.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-zinc-500 mb-2">Error</div>
          <pre className="text-xs whitespace-pre-wrap break-words text-red-300">{String(error)}</pre>
        </div>

        <div className="text-xs text-zinc-500 mt-4">
          Tip: screenshot this and send it to Delta.
        </div>
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('React render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return <FatalOverlay error={this.state.error?.stack || this.state.error?.message || this.state.error} />
    }
    return this.props.children
  }
}

function GlobalErrorCatcher({ children }) {
  const [fatal, setFatal] = useState(null)

  useEffect(() => {
    const onError = (event) => {
      const err = event?.error || event?.message || event
      console.error('Window error:', err)
      setFatal(err?.stack || err?.message || String(err))
    }

    const onRejection = (event) => {
      const err = event?.reason || event
      console.error('Unhandled rejection:', err)
      setFatal(err?.stack || err?.message || String(err))
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <>
      <FatalOverlay error={fatal} />
      {children}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorCatcher>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </GlobalErrorCatcher>
  </StrictMode>
)
