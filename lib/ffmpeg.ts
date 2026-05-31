import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { PassThrough } from 'stream'
import type { Readable } from 'stream'

if (!ffmpegStatic) throw new Error('ffmpeg-static: no binary found for this platform')
ffmpeg.setFfmpegPath(ffmpegStatic)

export function createMp3Stream(input: Readable): PassThrough {
  const output = new PassThrough()
  ffmpeg(input)
    .noVideo()
    .audioCodec('libmp3lame')
    .audioBitrate(192)
    .format('mp3')
    .on('error', (err) => {
      console.error('[ffmpeg]', err.message)
      output.destroy(err)
    })
    .pipe(output, { end: true })
  return output
}
