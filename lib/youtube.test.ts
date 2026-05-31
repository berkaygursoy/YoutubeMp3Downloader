jest.mock('@distube/ytdl-core')

import ytdl from '@distube/ytdl-core'
import { getRawInfo, parseVideoInfo } from './youtube'

const mockValidateURL = ytdl.validateURL as jest.Mock
const mockGetInfo = ytdl.getInfo as jest.Mock

describe('getRawInfo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws INVALID_URL error for a non-YouTube URL', async () => {
    mockValidateURL.mockReturnValue(false)
    await expect(getRawInfo('not-a-url')).rejects.toMatchObject({
      code: 'INVALID_URL',
    })
  })

  it('calls ytdl.getInfo for a valid URL', async () => {
    mockValidateURL.mockReturnValue(true)
    mockGetInfo.mockResolvedValue({ videoDetails: {} })
    await getRawInfo('https://youtube.com/watch?v=abc')
    expect(mockGetInfo).toHaveBeenCalledWith('https://youtube.com/watch?v=abc')
  })
})

describe('parseVideoInfo', () => {
  it('extracts title, durationSeconds, and last thumbnail URL', () => {
    const raw = {
      videoDetails: {
        title: 'My Video',
        lengthSeconds: '214',
        thumbnails: [
          { url: 'https://thumb-small.jpg', width: 120, height: 90 },
          { url: 'https://thumb-large.jpg', width: 480, height: 360 },
        ],
      },
    } as any

    expect(parseVideoInfo(raw)).toEqual({
      title: 'My Video',
      durationSeconds: 214,
      thumbnail: 'https://thumb-large.jpg',
    })
  })

  it('returns empty string for thumbnail when thumbnails array is empty', () => {
    const raw = {
      videoDetails: { title: 'No Thumb', lengthSeconds: '0', thumbnails: [] },
    } as any
    expect(parseVideoInfo(raw).thumbnail).toBe('')
  })
})
