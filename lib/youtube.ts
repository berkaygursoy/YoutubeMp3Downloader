import { spawn } from 'child_process'
import type { Readable } from 'stream'

export interface VideoInfo {
  title: string
  durationSeconds: number
  thumbnail: string
}

const YT_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?|shorts\/|live\/)|youtu\.be\/)/

function ytdlpBin(): string {
  return process.env.YTDLP_PATH ?? 'yt-dlp'
}

export async function getRawInfo(url: string): Promise<Record<string, unknown>> {
  if (!YT_URL_RE.test(url)) {
    const err = new Error('Invalid YouTube URL')
    ;(err as any).code = 'INVALID_URL'
    throw err
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpBin(), ['--dump-json', '--no-playlist', url])
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        const err = new Error(stderr.trim() || 'yt-dlp failed')
        reject(err)
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error('Failed to parse yt-dlp output'))
      }
    })

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        const e = new Error('yt-dlp not found. Run: pip install yt-dlp')
        ;(e as any).code = 'YTDLP_NOT_FOUND'
        reject(e)
      } else {
        reject(err)
      }
    })
  })
}

export function parseVideoInfo(raw: Record<string, unknown>): VideoInfo {
  return {
    title: (raw.title as string) ?? 'Unknown',
    durationSeconds: Math.round((raw.duration as number) ?? 0),
    thumbnail: (raw.thumbnail as string) ?? '',
  }
}

export function createAudioStream(url: string): Readable {
  const proc = spawn(ytdlpBin(), [
    '--no-playlist',
    '-f', 'bestaudio',
    '-o', '-',
    url,
  ])

  proc.stderr.on('data', (chunk: Buffer) => {
    console.error('[yt-dlp]', chunk.toString().trim())
  })

  proc.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[yt-dlp spawn error]', err.message)
    proc.stdout.destroy(err)
  })

  return proc.stdout as unknown as Readable
}
