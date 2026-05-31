import ytdl from '@distube/ytdl-core'
import type { Readable } from 'stream'

export interface VideoInfo {
  title: string
  durationSeconds: number
  thumbnail: string
}

export async function getRawInfo(url: string): Promise<ytdl.videoInfo> {
  if (!ytdl.validateURL(url)) {
    const err = new Error('Invalid YouTube URL')
    ;(err as any).code = 'INVALID_URL'
    throw err
  }
  return ytdl.getInfo(url)
}

export function parseVideoInfo(raw: ytdl.videoInfo): VideoInfo {
  const d = raw.videoDetails
  return {
    title: d.title,
    durationSeconds: parseInt(d.lengthSeconds, 10),
    thumbnail: d.thumbnails.at(-1)?.url ?? '',
  }
}

export function createAudioStream(raw: ytdl.videoInfo): Readable {
  return ytdl.downloadFromInfo(raw, { filter: 'audioonly', quality: 'highestaudio' })
}
