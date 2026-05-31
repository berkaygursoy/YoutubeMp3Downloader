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
