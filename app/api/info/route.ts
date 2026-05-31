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
