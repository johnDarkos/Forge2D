import { useEffect, useRef } from 'react'
import type { SpritePreviewProps } from '../model/browser-types'

/** Preview использует исходное изображение, поэтому линии сетки не попадают в кадр. */
export function SpritePreview({ sheet, frame, region = false }: SpritePreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !sheet || !frame) return
    const context = canvas.getContext('2d')
    if (!context) return
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
  return (
    <>
      <h2>Preview</h2>
      {sheet && frame ? (
        <>
          <div className="preview-wrap">
            <canvas
              ref={ref}
              aria-label="Frame preview"
              width={frame.width}
              height={frame.height}
            />
          </div>
          <p className="muted">
            {region ? 'Selected region' : `Frame ${frame.id}`} · {frame.width} × {frame.height} px ·
            ({frame.x}, {frame.y})
          </p>
        </>
      ) : (
        <p className="muted">
          {region ? 'Draw a rectangle to preview your sprite.' : 'Select a frame to preview it.'}
        </p>
      )}
    </>
  )
}
