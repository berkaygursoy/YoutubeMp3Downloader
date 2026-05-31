import { EventEmitter } from 'events'
import { getRawInfo, parseVideoInfo, createAudioStream } from './youtube'

jest.mock('child_process', () => ({ spawn: jest.fn() }))

import { spawn } from 'child_process'
const mockSpawn = spawn as jest.Mock

function makeFakeProc(stdout: string, stderr: string, exitCode: number | null) {
  const proc = new EventEmitter() as any
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = jest.fn()

  setImmediate(() => {
    if (stdout) proc.stdout.emit('data', Buffer.from(stdout))
    if (stderr) proc.stderr.emit('data', Buffer.from(stderr))
    proc.emit('close', exitCode)
  })

  return proc
}

// ─── getRawInfo ──────────────────────────────────────────────────────────────

describe('getRawInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws INVALID_URL for a non-YouTube URL without spawning', async () => {
    await expect(getRawInfo('not-a-url')).rejects.toMatchObject({ code: 'INVALID_URL' })
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('resolves with parsed JSON on success', async () => {
    const data = { title: 'My Video', duration: 214, thumbnail: 'https://t.jpg' }
    mockSpawn.mockReturnValue(makeFakeProc(JSON.stringify(data), '', 0))
    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).resolves.toEqual(data)
  })

  it('rejects with yt-dlp stderr message on non-zero exit', async () => {
    mockSpawn.mockReturnValue(makeFakeProc('', 'Video unavailable', 1))
    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toThrow(
      'Video unavailable'
    )
  })

  it('rejects when process exits with null code (killed by signal)', async () => {
    mockSpawn.mockReturnValue(makeFakeProc('', 'killed', null))
    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toThrow()
  })

  it('throws YTDLP_NOT_FOUND when binary is missing', async () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    proc.kill = jest.fn()
    setImmediate(() =>
      proc.emit('error', Object.assign(new Error('spawn failed'), { code: 'ENOENT' }))
    )
    mockSpawn.mockReturnValue(proc)

    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toMatchObject({
      code: 'YTDLP_NOT_FOUND',
    })
  })

  it('does not double-reject when close fires after error (settled guard)', async () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    proc.kill = jest.fn()
    setImmediate(() => {
      proc.emit('error', Object.assign(new Error('spawn failed'), { code: 'ENOENT' }))
      proc.emit('close', null)
    })
    mockSpawn.mockReturnValue(proc)

    await expect(getRawInfo('https://www.youtube.com/watch?v=abc')).rejects.toMatchObject({
      code: 'YTDLP_NOT_FOUND',
    })
  })

  it('calls proc.kill when AbortSignal is aborted', () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    // Simulate SIGKILL: emit close with null so the internal timer is cleared
    proc.kill = jest.fn(() => setImmediate(() => proc.emit('close', null)))
    mockSpawn.mockReturnValue(proc)

    const controller = new AbortController()
    getRawInfo('https://www.youtube.com/watch?v=abc', controller.signal).catch(() => {})
    controller.abort()

    expect(proc.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('accepts youtu.be short URLs', async () => {
    const data = { title: 'X', duration: 10, thumbnail: '' }
    mockSpawn.mockReturnValue(makeFakeProc(JSON.stringify(data), '', 0))
    await expect(getRawInfo('https://youtu.be/abc123')).resolves.toBeDefined()
  })

  it('accepts /shorts/ URLs', async () => {
    const data = { title: 'X', duration: 10, thumbnail: '' }
    mockSpawn.mockReturnValue(makeFakeProc(JSON.stringify(data), '', 0))
    await expect(getRawInfo('https://www.youtube.com/shorts/abc123')).resolves.toBeDefined()
  })

  it('accepts /live/ URLs', async () => {
    const data = { title: 'X', duration: 10, thumbnail: '' }
    mockSpawn.mockReturnValue(makeFakeProc(JSON.stringify(data), '', 0))
    await expect(
      getRawInfo('https://www.youtube.com/live/abc123')
    ).resolves.toBeDefined()
  })
})

// ─── parseVideoInfo ───────────────────────────────────────────────────────────

describe('parseVideoInfo', () => {
  it('extracts title, durationSeconds, and thumbnail from yt-dlp JSON', () => {
    expect(
      parseVideoInfo({ title: 'My Video', duration: 214, thumbnail: 'https://t.jpg' })
    ).toEqual({ title: 'My Video', durationSeconds: 214, thumbnail: 'https://t.jpg' })
  })

  it('rounds fractional duration', () => {
    expect(parseVideoInfo({ title: 'X', duration: 214.9, thumbnail: '' }).durationSeconds).toBe(215)
  })

  it('returns "Unknown" when title is missing', () => {
    expect(parseVideoInfo({ duration: 10, thumbnail: '' }).title).toBe('Unknown')
  })

  it('returns empty string for thumbnail when missing', () => {
    expect(parseVideoInfo({ title: 'X', duration: 0 }).thumbnail).toBe('')
  })
})

// ─── createAudioStream ────────────────────────────────────────────────────────

describe('createAudioStream', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns proc.stdout as a Readable', () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    proc.kill = jest.fn()
    mockSpawn.mockReturnValue(proc)

    const stream = createAudioStream('https://www.youtube.com/watch?v=abc')
    expect(stream).toBe(proc.stdout)
  })

  it('destroys proc.stdout on spawn error', () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter() as any
    proc.stdout.destroy = jest.fn()
    proc.stderr = new EventEmitter()
    proc.kill = jest.fn()
    mockSpawn.mockReturnValue(proc)

    createAudioStream('https://www.youtube.com/watch?v=abc')
    const err = new Error('spawn error')
    proc.emit('error', err)

    expect(proc.stdout.destroy).toHaveBeenCalledWith(err)
  })

  it('kills proc and destroys stdout when AbortSignal is aborted', () => {
    const proc = new EventEmitter() as any
    proc.stdout = new EventEmitter() as any
    proc.stdout.destroy = jest.fn()
    proc.stderr = new EventEmitter()
    proc.kill = jest.fn()
    mockSpawn.mockReturnValue(proc)

    const controller = new AbortController()
    createAudioStream('https://www.youtube.com/watch?v=abc', controller.signal)
    controller.abort()

    expect(proc.kill).toHaveBeenCalledWith('SIGKILL')
    expect(proc.stdout.destroy).toHaveBeenCalled()
  })
})
