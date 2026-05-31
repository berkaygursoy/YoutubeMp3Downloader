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
