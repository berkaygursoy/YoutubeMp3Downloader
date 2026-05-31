# YouTube MP3 Downloader — Design Spec
Date: 2026-05-31

## Overview

A single-page Next.js (App Router, TypeScript) web application that converts YouTube videos to MP3. The server extracts the audio stream from YouTube and pipes it through FFmpeg directly to the HTTP response — no temp files, no full RAM buffering. Deployed on Vercel Pro.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Unified frontend + API routes |
| Styling | Tailwind CSS + shadcn/ui-inspired | Minimal, clean UI |
| Audio extraction | `@distube/ytdl-core` | Pure Node.js, no binary needed |
| Audio conversion | `fluent-ffmpeg` + `ffmpeg-static` | Native binary via npm, true streaming |
| Deployment | Vercel Pro | 60s max duration, 1GB memory |

---

## File Structure

```
app/
  page.tsx                  # Single-page downloader UI
  api/
    info/
      route.ts              # POST → returns title, duration, thumbnail
    download/
      route.ts              # GET ?url=... → streams MP3 to browser
lib/
  youtube.ts                # ytdl-core helpers (getInfo, getAudioStream)
  ffmpeg.ts                 # fluent-ffmpeg pipeline builder
vercel.json                 # Function config: maxDuration, memory
```

---

## API Design

### `POST /api/info`

**Request body:**
```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

**Success response (200):**
```json
{
  "title": "Video Title",
  "durationSeconds": 214,
  "thumbnail": "https://i.ytimg.com/vi/.../hqdefault.jpg"
}
```

**Error responses:**
- `400` — Invalid or non-YouTube URL
- `404` — Video unavailable or deleted
- `429` — YouTube rate limit hit
- `451` — Age-restricted content
- `500` — Unexpected extraction failure

Uses `ytdl.getBasicInfo(url)` — no audio fetching, fast metadata-only call.

---

### `GET /api/download?url=<encoded-youtube-url>`

Streams the MP3 directly to the browser as a file download.

**Pipeline (in-memory, no disk writes):**
```
ytdl(url, { filter: 'audioonly', quality: 'highestaudio' })
  → Node.js PassThrough stream
    → fluent-ffmpeg: -vn -ab 192k -f mp3
      → Next.js Response (Transfer-Encoding: chunked)
```

**Response headers:**
```
Content-Type: audio/mpeg
Content-Disposition: attachment; filename="<sanitized-title>.mp3"
Transfer-Encoding: chunked
```

Title sanitization: strip characters outside `[a-zA-Z0-9 _-]`, truncate to 100 chars.

**Error responses:** same codes as `/api/info`. If FFmpeg fails mid-stream, the connection is terminated (browser shows a partial download error).

---

## Frontend UI

### States

| State | Trigger | UI |
|---|---|---|
| `idle` | Initial load | URL input + "Fetch" button |
| `loading` | Fetch clicked | Spinner, input disabled |
| `ready` | Info response received | Thumbnail, title, duration + "Download MP3" button |
| `error` | Any API error | Error message + "Try another URL" reset link |

### Download mechanism

Download MP3 button is a plain `<a href="/api/download?url=...">` with `download` attribute. The browser follows the link and handles the file save natively. No `fetch()` + Blob URL needed — avoids loading the entire file into browser memory.

### Component structure

```
page.tsx
  └── <DownloaderCard>
        ├── <UrlInput>          # shadcn Input + Button
        ├── <VideoPreview>      # Thumbnail, title, duration (ready state only)
        ├── <DownloadButton>    # <a> tag, shown in ready state
        └── <StatusMessage>     # Error or loading feedback
```

All state lives in `page.tsx` via `useState`. No external state library needed.

---

## Vercel Configuration (`vercel.json`)

```json
{
  "functions": {
    "app/api/info/route.ts":     { "maxDuration": 15, "memory": 512 },
    "app/api/download/route.ts": { "maxDuration": 60, "memory": 1024 }
  }
}
```

Requires **Vercel Pro** plan for `maxDuration` > 10s.

---

## Error Handling Matrix

| Scenario | HTTP Code | User-facing message |
|---|---|---|
| Invalid / non-YouTube URL | 400 | "Please enter a valid YouTube URL." |
| Video unavailable or deleted | 404 | "This video is unavailable." |
| Age-restricted content | 451 | "Age-restricted videos cannot be downloaded." |
| YouTube rate limit | 429 | "Too many requests. Please try again in a moment." |
| Conversion / server error | 500 | "Something went wrong. Please try again." |

---

## Constraints & Non-Goals

- **No authentication** — public tool, no user accounts
- **No queue / job system** — each request is synchronous; concurrent downloads each get their own function instance (Vercel scales horizontally)
- **No progress percentage** — chunked streaming means unknown total size; UI shows indeterminate spinner during info fetch only
- **No playlist support** — single video URLs only
- **Videos over ~8 minutes** may approach or exceed the 60s Vercel Pro limit under slow network conditions; this is an accepted trade-off given the deployment target
