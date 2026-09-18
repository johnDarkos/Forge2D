import type { ExportFrame, ExportError } from '../model/types'

export class SpriteExportError extends Error {
  readonly code: ExportError['code']

  constructor(code: ExportError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'SpriteExportError'
  }
}

/** Кодирует область исходного изображения без сетки и подсветки редактора. */
export const exportFrame: ExportFrame = async (image, frame) => {
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height
  const context = canvas.getContext('2d')
  if (!context)
    throw new SpriteExportError(
      'context-unavailable',
      'Unable to export PNG: Canvas is unavailable',
    )
  context.imageSmoothingEnabled = false
  context.drawImage(
    image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    0,
    0,
    frame.width,
    frame.height,
  )
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new SpriteExportError('encoding-failed', 'Unable to encode PNG for export'))
    }, 'image/png')
  })
}
