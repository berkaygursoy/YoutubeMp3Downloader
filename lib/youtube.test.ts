import { EventEmitter } from 'events'
import { getRawInfo, parseVideoInfo } from './youtube'

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}))

import { spawn } from 'child_process'
const mockSpawn = spawn as jest.Mock

function makeFakeProc(stdout: string, stderr: string, exitCode: number) {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()

  setImmediate(() => {
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout))
    if (stderr) proc.stderr.emit('data', Buffer.from(stderr))
    proc.emit('close', exitCode)
  })

  return proc
}

describe('getRawInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws INVALID_URL for a non-YouTube URL', async () => {
    await expect(getRawInfo('not-a-url')).rejects.toMatchObject({ code: 'INVALID_URL' })
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('resolves with parsed JSON on success', async () => {
    const data = { title: 'My Video', duration: 214, thumbnail: 'https://thumb.jpg' }
    mockSpawn.mockReturnValue(makeFakeProc(JSON.stringify(data), '', 0))

    const result = await getRawInfo('https://www.youtube.com/watch?v=abc')
    expect(result).toEqual(data)
  })

  it('rejects with yt-dlp stderr message on non-zero exit', async () => {
    mockSpawn.mockReturnValue(makeFakeProc('', 'Video unavailable', 1))

    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toThrow(
      'Video unavailable'
    )
  })

  it('throws YTDLP_NOT_FOUND when binary is missing', async () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    setImmediate(() => proc.emit('error', Object.assign(new Error('spawn failed'), { code: 'ENOENT' })))
    mockSpawn.mockReturnValue(proc)

    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toMatchObject({
      code: 'YTDLP_NOT_FOUND',
    })
  })
})

describe('parseVideoInfo', () => {
  it('extracts title, durationSeconds, and thumbnail from yt-dlp JSON', () => {
    const raw = { title: 'My Video', duration: 214, thumbnail: 'https://thumb.jpg' }
    expect(parseVideoInfo(raw)).toEqual({
      title: 'My Video',
      durationSeconds: 214,
      thumbnail: 'https://thumb.jpg',
    })
  })

  it('rounds fractional duration', () => {
    const raw = { title: 'X', duration: 214.9, thumbnail: '' }
    expect(parseVideoInfo(raw).durationSeconds).toBe(215)
  })

  it('returns empty string for thumbnail when missing', () => {
    const raw = { title: 'No Thumb', duration: 0 }
    expect(parseVideoInfo(raw).thumbnail).toBe('')
  })
})
