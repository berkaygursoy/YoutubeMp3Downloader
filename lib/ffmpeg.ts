import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { PassThrough } from 'stream'
import type { Readable } from 'stream'

if (!ffmpegStatic) throw new Error('ffmpeg-static: no binary found for this platform')
ffmpeg.setFfmpegPath(ffmpegStatic)

export function createMp3Stream(input: Readable, signal?: AbortSignal): PassThrough {
  const output = new PassThrough()
  ffmpeg(input)
    .noVideo()
    .audioCodec('libmp3lame')
    .audioBitrate(192)
    .format('mp3')
    .on('error', (err) => {
      console.error('[ffmpeg]', err.message)
      // Tear down the upstream source too, otherwise yt-dlp keeps producing
      // audio with no consumer.
      input.destroy()
      output.destroy(err)
    })
    .pipe(output, { end: true })

  // Abort the whole pipeline on client disconnect.
  if (signal) {
    signal.addEventListener('abort', () => {
      input.destroy()
      output.destroy()
    })
  }

  return output
}
