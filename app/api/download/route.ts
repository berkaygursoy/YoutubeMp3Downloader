import { type NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { getRawInfo, parseVideoInfo, createAudioStream, isValidYouTubeUrl } from '@/lib/youtube'
import { createMp3Stream } from '@/lib/ffmpeg'
import { sanitizeFilename } from '@/lib/sanitize'
import { mapYoutubeError } from '@/lib/errors'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams
  const url = searchParams.get('url')
  const titleParam = searchParams.get('title')

  if (!url || !isValidYouTubeUrl(url.trim())) {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL.' },
      { status: 400 }
    )
  }

  const trimmedUrl = url.trim()
  let filename: string

  if (titleParam && titleParam.trim()) {
    // Title supplied by the client (already fetched via /api/info) — avoid a
    // second full yt-dlp extraction just to learn the filename.
    filename = `${sanitizeFilename(titleParam.trim())}.mp3`
  } else {
    // No title provided: fall back to extracting metadata server-side.
    let raw: Awaited<ReturnType<typeof getRawInfo>>
    try {
      raw = await getRawInfo(trimmedUrl, request.signal)
    } catch (err) {
      return mapYoutubeError(err)
    }
    const { title } = parseVideoInfo(raw)
    filename = `${sanitizeFilename(title)}.mp3`
  }

  const audioStream = createAudioStream(trimmedUrl, request.signal)
  const mp3Stream = createMp3Stream(audioStream, request.signal)

  const webStream = Readable.toWeb(mp3Stream) as ReadableStream

  // RFC 5987 filename* for full Unicode title support.
  const encodedName = encodeURIComponent(filename)

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedName}`,
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-store',
    },
  })
}
