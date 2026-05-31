jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
    })),
  },
}))

import { mapYoutubeError } from './errors'

type FakeResponse = { _body: { error: string }; status: number }

function call(err: unknown): FakeResponse {
  return mapYoutubeError(err) as unknown as FakeResponse
}

describe('mapYoutubeError', () => {
  it('returns 503 for YTDLP_NOT_FOUND', () => {
    const r = call(Object.assign(new Error('not found'), { code: 'YTDLP_NOT_FOUND' }))
    expect(r.status).toBe(503)
    expect(r._body.error).toMatch(/yt-dlp/)
  })

  it('returns 400 for INVALID_URL', () => {
    const r = call(Object.assign(new Error('bad url'), { code: 'INVALID_URL' }))
    expect(r.status).toBe(400)
    expect(r._body.error).toMatch(/YouTube URL/)
  })

  it('returns 404 for "Video unavailable" message', () => {
    const r = call(new Error('Video unavailable'))
    expect(r.status).toBe(404)
  })

  it('returns 404 for "private video" message', () => {
    const r = call(new Error('This is a private video'))
    expect(r.status).toBe(404)
  })

  it('returns 404 for statusCode 410', () => {
    const r = call(Object.assign(new Error('gone'), { statusCode: 410 }))
    expect(r.status).toBe(404)
  })

  it('returns 451 for age-restricted message', () => {
    const r = call(new Error('Sign in to confirm your age'))
    expect(r.status).toBe(451)
  })

  it('returns 429 for rate-limit message', () => {
    const r = call(new Error('Too many requests'))
    expect(r.status).toBe(429)
  })

  it('returns 403 for forbidden message', () => {
    const r = call(new Error('Forbidden'))
    expect(r.status).toBe(403)
  })

  it('returns 500 for unknown errors', () => {
    const r = call(new Error('some unexpected failure'))
    expect(r.status).toBe(500)
    expect(r._body.error).toMatch(/wrong/)
  })

  it('returns 500 for null/undefined error', () => {
    expect(call(null).status).toBe(500)
    expect(call(undefined).status).toBe(500)
  })
})
