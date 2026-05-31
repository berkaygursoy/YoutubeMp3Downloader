'use client'

import { useState } from 'react'
import Image from 'next/image'

type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      title: string
      durationSeconds: number
      thumbnail: string
      url: string
    }
  | { status: 'error'; message: string }

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export default function Home() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<AppState>({ status: 'idle' })
  const [downloading, setDownloading] = useState(false)

  async function handleFetch() {
    const trimmed = input.trim()
    if (!trimmed) return
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? 'Something went wrong.' })
        return
      }
      setState({
        status: 'ready',
        title: data.title,
        durationSeconds: data.durationSeconds,
        thumbnail: data.thumbnail,
        url: trimmed,
      })
    } catch {
      setState({ status: 'error', message: 'Network error. Please try again.' })
    }
  }

  function reset() {
    setState({ status: 'idle' })
    setInput('')
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            YouTube to MP3
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Paste a YouTube URL to download audio
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={state.status === 'loading'}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          />
          <button
            onClick={handleFetch}
            disabled={state.status === 'loading' || !input.trim()}
            className="bg-zinc-100 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state.status === 'loading' ? 'Fetching…' : 'Fetch'}
          </button>
        </div>

        {state.status === 'loading' && (
          <div role="status" aria-label="Loading" className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {state.status === 'ready' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex gap-3 items-start">
              {state.thumbnail && (
                <div className="relative w-20 h-14 flex-shrink-0">
                  <Image
                    src={state.thumbnail}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-medium leading-snug line-clamp-2">
                  {state.title}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  {formatDuration(state.durationSeconds)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/download?url=${encodeURIComponent(state.url)}&title=${encodeURIComponent(state.title)}`}
                download
                onClick={() => {
                  setDownloading(true)
                  setTimeout(() => setDownloading(false), 3000)
                }}
                className={`flex-1 block bg-zinc-100 text-zinc-900 font-medium text-sm text-center py-2.5 rounded-lg hover:bg-white transition-colors${downloading ? ' pointer-events-none opacity-50' : ''}`}
              >
                Download MP3
              </a>
              <button
                onClick={reset}
                aria-label="Clear"
                className="px-3 py-2.5 text-zinc-400 hover:text-zinc-200 text-sm rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-red-300 text-sm line-clamp-3">{state.message}</p>
            <button
              onClick={reset}
              className="text-red-400 hover:text-red-200 text-xs flex-shrink-0 transition-colors"
            >
              Try another
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
