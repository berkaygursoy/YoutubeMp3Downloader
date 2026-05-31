# YouTube MP3 Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js app where users paste a YouTube URL, preview video info, and download the audio as an MP3 via a server-side ffmpeg streaming pipeline.

**Architecture:** Two API routes: `POST /api/info` (metadata only, fast) and `GET /api/download` (streams audio through ffmpeg to the browser). The download pipeline is: ytdl audio stream → fluent-ffmpeg (libmp3lame 192kbps) → PassThrough → Web ReadableStream → NextResponse. No temp files, no full RAM buffering.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `@distube/ytdl-core`, `fluent-ffmpeg`, `ffmpeg-static`, Jest + ts-jest.

---

## File Map

| File | Responsibility |
|---|---|
| `lib/sanitize.ts` | Pure function: strip illegal filename chars, truncate to 100 |
| `lib/youtube.ts` | Wrap ytdl-core: validate URL, fetch raw info, create audio stream |
| `lib/ffmpeg.ts` | Configure ffmpeg binary path; return a PassThrough with MP3 output |
| `lib/errors.ts` | Map ytdl error shapes to typed NextResponse error responses |
| `app/api/info/route.ts` | POST handler: returns `{ title, durationSeconds, thumbnail }` |
| `app/api/download/route.ts` | GET handler: streams MP3 to browser |
| `app/page.tsx` | Single-page UI with 4 states: idle / loading / ready / error |
| `next.config.ts` | Marks ytdl + ffmpeg packages as external (not bundled by webpack) |
| `vercel.json` | Sets `maxDuration` and `memory` per route |

---

## Task 1: Scaffold the Project

**Files:**
- Modify: `package.json` (created by scaffolding)
- Create: `.nvmrc`

- [ ] **Step 1: Run create-next-app inside the project root**

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --import-alias "@/*" --no-src-dir
```

When prompted for any remaining questions (if interactive), choose defaults. Answer No to Turbopack.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @distube/ytdl-core fluent-ffmpeg ffmpeg-static
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D @types/fluent-ffmpeg jest ts-jest @types/jest
```

- [ ] **Step 4: Pin Node.js version**

Create `.nvmrc`:
```
18
```

- [ ] **Step 5: Verify the dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000 with no errors. Stop it with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 14 project with TypeScript, Tailwind, ytdl, ffmpeg"
```

---

## Task 2: Configure Jest

**Files:**
- Create: `jest.config.ts`
- Create: `lib/.gitkeep` (ensures lib/ directory exists before tests)

- [ ] **Step 1: Create jest.config.ts**

```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/*.test.ts'],
}

export default config
```

- [ ] **Step 2: Create the lib directory**

```bash
mkdir lib
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Run jest to verify it finds no tests (exit 0)**

```bash
npm test -- --passWithNoTests
```

Expected: `Test Suites: 0 skipped` — no errors.

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts package.json
git commit -m "feat: configure Jest with ts-jest and @/ path alias"
```

---

## Task 3: lib/sanitize.ts (TDD)

**Files:**
- Create: `lib/sanitize.ts`
- Create: `lib/sanitize.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/sanitize.test.ts`:
```typescript
import { sanitizeFilename } from './sanitize'

describe('sanitizeFilename', () => {
  it('keeps alphanumeric, spaces, hyphens, and underscores', () => {
    expect(sanitizeFilename('Hello World_test-123')).toBe('Hello World_test-123')
  })

  it('removes special characters like colons, exclamation marks, parens', () => {
    expect(sanitizeFilename('Hello: World! (feat. Artist)')).toBe('Hello World feat Artist')
  })

  it('truncates to 100 characters', () => {
    expect(sanitizeFilename('a'.repeat(150))).toHaveLength(100)
  })

  it('trims leading and trailing spaces after sanitization', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello')
  })

  it('returns "untitled" when result is blank', () => {
    expect(sanitizeFilename('!!!')).toBe('untitled')
  })

  it('returns "untitled" for empty string', () => {
    expect(sanitizeFilename('')).toBe('untitled')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test lib/sanitize.test.ts
```

Expected: `FAIL` — `Cannot find module './sanitize'`

- [ ] **Step 3: Implement lib/sanitize.ts**

Create `lib/sanitize.ts`:
```typescript
export function sanitizeFilename(title: string): string {
  const sanitized = title.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 100)
  return sanitized || 'untitled'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test lib/sanitize.test.ts
```

Expected: `PASS` — 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/sanitize.ts lib/sanitize.test.ts
git commit -m "feat: add sanitizeFilename utility"
```

---

## Task 4: lib/youtube.ts (TDD)

**Files:**
- Create: `lib/youtube.ts`
- Create: `lib/youtube.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/youtube.test.ts`:
```typescript
jest.mock('@distube/ytdl-core')

import ytdl from '@distube/ytdl-core'
import { getRawInfo, parseVideoInfo } from './youtube'

const mockValidateURL = ytdl.validateURL as jest.Mock
const mockGetInfo = ytdl.getInfo as jest.Mock

describe('getRawInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws INVALID_URL error for a non-YouTube URL', async () => {
    mockValidateURL.mockReturnValue(false)
    await expect(getRawInfo('not-a-url')).rejects.toMatchObject({
      code: 'INVALID_URL',
    })
  })

  it('calls ytdl.getInfo for a valid URL', async () => {
    mockValidateURL.mockReturnValue(true)
    mockGetInfo.mockResolvedValue({ videoDetails: {} })
    await getRawInfo('https://youtube.com/watch?v=abc')
    expect(mockGetInfo).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })
})

describe('parseVideoInfo', () => {
  it('extracts title, durationSeconds, and last thumbnail URL', () => {
    const raw = {
      videoDetails: {
        title: 'My Video',
        lengthSeconds: '214',
        thumbnails: [
          { url: 'https://thumb-small.jpg', width: 120, height: 90 },
          { url: 'https://thumb-large.jpg', width: 480, height: 360 },
        ],
      },
    } as any

    expect(parseVideoInfo(raw)).toEqual({
      title: 'My Video',
      durationSeconds: 214,
      thumbnail: 'https://thumb-large.jpg',
    })
  })

  it('returns empty string for thumbnail when thumbnails array is empty', () => {
    const raw = {
      videoDetails: { title: 'No Thumb', lengthSeconds: '0', thumbnails: [] },
    } as any
    expect(parseVideoInfo(raw).thumbnail).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test lib/youtube.test.ts
```

Expected: `FAIL` — `Cannot find module './youtube'`

- [ ] **Step 3: Implement lib/youtube.ts**

Create `lib/youtube.ts`:
```typescript
import ytdl from '@distube/ytdl-core'
import type { Readable } from 'stream'

export interface VideoInfo {
  title: string
  durationSeconds: number
  thumbnail: string
}

export async function getRawInfo(url: string): Promise<ytdl.videoInfo> {
  if (!ytdl.validateURL(url)) {
    const err = new Error('Invalid YouTube URL')
    ;(err as any).code = 'INVALID_URL'
    throw err
  }
  return ytdl.getInfo(url)
}

export function parseVideoInfo(raw: ytdl.videoInfo): VideoInfo {
  const d = raw.videoDetails
  return {
    title: d.title,
    durationSeconds: parseInt(d.lengthSeconds, 10),
    thumbnail: d.thumbnails.at(-1)?.url ?? '',
  }
}

export function createAudioStream(raw: ytdl.videoInfo): Readable {
  return ytdl.downloadFromInfo(raw, { filter: 'audioonly', quality: 'highestaudio' })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test lib/youtube.test.ts
```

Expected: `PASS` — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/youtube.ts lib/youtube.test.ts
git commit -m "feat: add YouTube helpers (getRawInfo, parseVideoInfo, createAudioStream)"
```

---

## Task 5: lib/ffmpeg.ts

**Files:**
- Create: `lib/ffmpeg.ts`

No unit test — requires a real ffmpeg binary and audio stream. Verified in Task 11 (E2E).

- [ ] **Step 1: Implement lib/ffmpeg.ts**

Create `lib/ffmpeg.ts`:
```typescript
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { PassThrough } from 'stream'
import type { Readable } from 'stream'

if (!ffmpegStatic) throw new Error('ffmpeg-static: no binary found for this platform')
ffmpeg.setFfmpegPath(ffmpegStatic)

export function createMp3Stream(input: Readable): PassThrough {
  const output = new PassThrough()
  ffmpeg(input)
    .noVideo()
    .audioCodec('libmp3lame')
    .audioBitrate(192)
    .format('mp3')
    .on('error', (err) => {
      console.error('[ffmpeg]', err.message)
      output.destroy(err)
    })
    .pipe(output, { end: true })
  return output
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ffmpeg.ts
git commit -m "feat: add ffmpeg MP3 streaming pipeline"
```

---

## Task 6: lib/errors.ts

**Files:**
- Create: `lib/errors.ts`

- [ ] **Step 1: Implement lib/errors.ts**

Create `lib/errors.ts`:
```typescript
import { NextResponse } from 'next/server'

export function mapYoutubeError(err: unknown): NextResponse {
  const e = err as any
  if (e?.code === 'INVALID_URL') {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL.' },
      { status: 400 }
    )
  }
  if (e?.statusCode === 410 || e?.message?.includes('not available')) {
    return NextResponse.json({ error: 'This video is unavailable.' }, { status: 404 })
  }
  if (e?.message?.toLowerCase().includes('age')) {
    return NextResponse.json(
      { error: 'Age-restricted videos cannot be downloaded.' },
      { status: 451 }
    )
  }
  if (e?.statusCode === 429) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429 }
    )
  }
  console.error('[youtube-error]', err)
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/errors.ts
git commit -m "feat: add shared YouTube error mapper for API routes"
```

---

## Task 7: app/api/info/route.ts

**Files:**
- Create: `app/api/info/route.ts`

- [ ] **Step 1: Implement app/api/info/route.ts**

Create `app/api/info/route.ts`:
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { getRawInfo, parseVideoInfo } from '@/lib/youtube'
import { mapYoutubeError } from '@/lib/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function POST(request: NextRequest) {
  let url: string | undefined

  try {
    const body = await request.json()
    url = body?.url
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL.' },
      { status: 400 }
    )
  }

  try {
    const raw = await getRawInfo(url.trim())
    return NextResponse.json(parseVideoInfo(raw))
  } catch (err) {
    return mapYoutubeError(err)
  }
}
```

- [ ] **Step 2: Start the dev server and test the endpoint manually**

```bash
npm run dev
```

In another terminal:
```bash
curl -s -X POST http://localhost:3000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | jq .
```

Expected: JSON with `title`, `durationSeconds`, `thumbnail` fields.

Test error case:
```bash
curl -s -X POST http://localhost:3000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url":"not-a-url"}' | jq .
```

Expected: `{"error":"Please enter a valid YouTube URL."}` with status 400.

- [ ] **Step 3: Stop dev server, commit**

```bash
git add app/api/info/route.ts
git commit -m "feat: add POST /api/info route for video metadata"
```

---

## Task 8: app/api/download/route.ts

**Files:**
- Create: `app/api/download/route.ts`

- [ ] **Step 1: Implement app/api/download/route.ts**

Create `app/api/download/route.ts`:
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { getRawInfo, parseVideoInfo, createAudioStream } from '@/lib/youtube'
import { createMp3Stream } from '@/lib/ffmpeg'
import { sanitizeFilename } from '@/lib/sanitize'
import { mapYoutubeError } from '@/lib/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL.' },
      { status: 400 }
    )
  }

  let raw: Awaited<ReturnType<typeof getRawInfo>>
  try {
    raw = await getRawInfo(url)
  } catch (err) {
    return mapYoutubeError(err)
  }

  const { title } = parseVideoInfo(raw)
  const filename = `${sanitizeFilename(title)}.mp3`

  const audioStream = createAudioStream(raw)
  const mp3Stream = createMp3Stream(audioStream)

  audioStream.on('error', (err) => {
    console.error('[ytdl]', err.message)
    mp3Stream.destroy(err)
  })

  const webStream = Readable.toWeb(mp3Stream) as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Accel-Buffering': 'no',
    },
  })
}
```

- [ ] **Step 2: Start dev server and test download manually**

```bash
npm run dev
```

In another terminal (substitute a real video ID):
```bash
curl -L "http://localhost:3000/api/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ" \
  -o test.mp3
```

Expected: `test.mp3` created, playable in any audio player.

- [ ] **Step 3: Stop dev server, commit**

```bash
git add app/api/download/route.ts
git commit -m "feat: add GET /api/download streaming MP3 route"
```

---

## Task 9: app/page.tsx

**Files:**
- Modify: `app/page.tsx` (replace default Next.js template)
- Modify: `app/layout.tsx` (set page title and remove default styles)

- [ ] **Step 1: Update app/layout.tsx metadata**

Open `app/layout.tsx` and replace the `metadata` export:
```typescript
export const metadata: Metadata = {
  title: 'YouTube to MP3',
  description: 'Download YouTube audio as MP3',
}
```

- [ ] **Step 2: Replace app/page.tsx with the downloader UI**

Replace the entire contents of `app/page.tsx`:
```typescript
'use client'

import { useState } from 'react'

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
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Home() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<AppState>({ status: 'idle' })

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
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {state.status === 'ready' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex gap-3 items-start">
              {state.thumbnail && (
                <img
                  src={state.thumbnail}
                  alt=""
                  className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                />
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
                href={`/api/download?url=${encodeURIComponent(state.url)}`}
                download
                className="flex-1 block bg-zinc-100 text-zinc-900 font-medium text-sm text-center py-2.5 rounded-lg hover:bg-white transition-colors"
              >
                Download MP3
              </a>
              <button
                onClick={reset}
                className="px-3 py-2.5 text-zinc-400 hover:text-zinc-200 text-sm rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-red-300 text-sm">{state.message}</p>
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
```

- [ ] **Step 3: Start dev server and manually test all UI states**

```bash
npm run dev
```

Open http://localhost:3000 in a browser and verify:
1. **Idle state:** Input and Fetch button visible
2. **Loading state:** Click Fetch — spinner appears, input disabled
3. **Ready state:** Thumbnail, title, duration, Download MP3 button, ✕ reset button
4. **Error state:** Enter `https://youtube.com/watch?v=invalid_id_xyz` — red error message with "Try another" link

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: add single-page downloader UI with 4-state machine"
```

---

## Task 10: next.config.ts + vercel.json

**Files:**
- Modify: `next.config.ts`
- Create: `vercel.json`

- [ ] **Step 1: Update next.config.ts to mark native modules as external**

Replace the contents of `next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@distube/ytdl-core', 'fluent-ffmpeg', 'ffmpeg-static'],
}

export default nextConfig
```

This prevents Next.js from attempting to webpack-bundle the ytdl and ffmpeg packages, which would fail because they contain native binaries and dynamic requires.

- [ ] **Step 2: Create vercel.json**

Create `vercel.json` in the project root:
```json
{
  "functions": {
    "app/api/info/route.ts": {
      "maxDuration": 15,
      "memory": 512
    },
    "app/api/download/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

- [ ] **Step 3: Run a production build to catch bundling errors**

```bash
npm run build
```

Expected: Build completes with no errors. The output should show both API routes listed as dynamic routes.

If you see an error about `ffmpeg-static` or `@distube/ytdl-core` during build, confirm `serverExternalPackages` is set correctly in `next.config.ts`.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts vercel.json
git commit -m "feat: configure Next.js external packages and Vercel function limits"
```

---

## Task 11: End-to-End Test

No code changes — verification only.

- [ ] **Step 1: Start the production build locally**

```bash
npm run build && npm run start
```

- [ ] **Step 2: Test the full happy path in the browser**

Open http://localhost:3000. Use a real short YouTube video URL (under 3 minutes for speed):
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

1. Paste URL → click Fetch
2. Verify the title and thumbnail appear
3. Click "Download MP3"
4. Verify the browser triggers a file download named `<video-title>.mp3`
5. Open the downloaded file in an audio player — verify it plays correctly

- [ ] **Step 3: Test error states**

- Enter `https://not-a-youtube-url.com` → expect "Please enter a valid YouTube URL."
- Enter a known deleted video ID → expect "This video is unavailable."

- [ ] **Step 4: Run all unit tests one final time**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify E2E flow — all tests pass, download confirmed working"
```
