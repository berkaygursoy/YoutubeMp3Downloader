import { NextResponse } from 'next/server'

export function mapYoutubeError(err: unknown): NextResponse {
  const e = err as any
  const msg: string = e?.message ?? ''
  const msgLower = msg.toLowerCase()

  if (e?.code === 'YTDLP_NOT_FOUND') {
    return NextResponse.json(
      { error: 'Server configuration error: yt-dlp is not installed.' },
      { status: 503 }
    )
  }
  if (e?.code === 'INVALID_URL') {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL.' },
      { status: 400 }
    )
  }
  if (
    e?.statusCode === 410 ||
    e?.statusCode === 404 ||
    msgLower.includes('410') ||
    msgLower.includes('unavailable') ||
    msgLower.includes('not available') ||
    msgLower.includes('video unavailable') ||
    msgLower.includes('private video') ||
    msgLower.includes('has been removed') ||
    msgLower.includes('no longer available')
  ) {
    return NextResponse.json({ error: 'This video is unavailable.' }, { status: 404 })
  }
  if (msgLower.includes('age') || msgLower.includes('sign in')) {
    return NextResponse.json(
      { error: 'Age-restricted videos cannot be downloaded.' },
      { status: 451 }
    )
  }
  if (e?.statusCode === 429 || msgLower.includes('too many')) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429 }
    )
  }
  if (e?.statusCode === 403 || msgLower.includes('forbidden')) {
    return NextResponse.json(
      { error: 'Access denied. This video cannot be downloaded.' },
      { status: 403 }
    )
  }
  console.error('[youtube-error] statusCode=%s message=%s', e?.statusCode, msg, err)
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 }
  )
}
