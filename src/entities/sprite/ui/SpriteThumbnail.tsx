import { useEffect, useRef } from 'react'
import type { LoadedSpriteSheet } from '../model/browser-types'
import type { SpriteFrameGeometry } from '../model/types'

interface SpriteThumbnailProps {
  readonly sheet: LoadedSpriteSheet
  readonly frame: SpriteFrameGeometry
  readonly label: string
}

/** Миниатюра вырезки из исходника без создания дополнительных Blob/Object URL. */
export function SpriteThumbnail({ sheet, frame, label }: SpriteThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = false
    context.drawImage(
      sheet.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      frame.width,
      frame.height,
    )
  }, [sheet, frame])
  return <canvas ref={ref} width={frame.width} height={frame.height} aria-label={label} />
}
