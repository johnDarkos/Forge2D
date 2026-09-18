import { useEffect, useRef, useState } from 'react'
import { useRegionSelection } from '../model/useRegionSelection'
import type { SpriteCanvasProps } from '../model/types'

/** Canvas хранит исходные пиксели; Zoom/Pan меняют только CSS-преобразование. */
export function SpriteCanvas({
  sheet,
  frames,
  disabled,
  mode,
  region,
  onRegionChange,
  onDrawingChange,
  onFrameClick,
  viewport,
  onViewportChange,
}: SpriteCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const manual = mode === 'manual'
  const selection = useRegionSelection(ref, manual && !disabled, onRegionChange, onDrawingChange)
  const displayedRegion = manual ? (selection.draft ?? region) : null
  const [keyboardId, setKeyboardId] = useState(0)
  const [focused, setFocused] = useState(false)
  const { zoom, x, y } = viewport
  const drag = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const keyboardFrame = frames[Math.min(keyboardId, Math.max(0, frames.length - 1))]
  const columns = frames.length ? frames[frames.length - 1].column + 1 : 0
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !sheet) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = false
    context.drawImage(sheet.image, 0, 0)
    context.strokeStyle = 'rgba(100, 116, 139, 0.8)'
    context.lineWidth = 1
    for (const frame of manual ? [] : frames)
      context.strokeRect(frame.x, frame.y, frame.width, frame.height)
    context.fillStyle = 'rgba(99, 102, 241, 0.35)'
    context.strokeStyle = '#818cf8'
    context.lineWidth = 2
    for (const frame of manual ? [] : frames) {
      if (frame.selected) {
        context.fillRect(frame.x, frame.y, frame.width, frame.height)
        context.strokeRect(frame.x, frame.y, frame.width, frame.height)
      }
    }
    if (displayedRegion) {
      context.fillRect(
        displayedRegion.x,
        displayedRegion.y,
        displayedRegion.width,
        displayedRegion.height,
      )
      context.strokeRect(
        displayedRegion.x,
        displayedRegion.y,
        displayedRegion.width,
        displayedRegion.height,
      )
    }
    if (!manual && focused && keyboardFrame) {
      context.strokeStyle = '#fbbf24'
      context.strokeRect(
        keyboardFrame.x,
        keyboardFrame.y,
        keyboardFrame.width,
        keyboardFrame.height,
      )
    }
  }, [sheet, frames, focused, keyboardFrame, manual, displayedRegion])
  return (
    <>
      {sheet ? (
        <>
          <section
            className="canvas-wrap"
            aria-label="Sprite viewport"
            onPointerDown={(event) => {
              if (event.button !== 1) return
              event.preventDefault()
              drag.current = { clientX: event.clientX, clientY: event.clientY, x, y }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!drag.current) return
              onViewportChange({
                zoom,
                x: drag.current.x + event.clientX - drag.current.clientX,
                y: drag.current.y + event.clientY - drag.current.clientY,
              })
            }}
            onPointerUp={(event) => {
              if (!drag.current) return
              drag.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
            onLostPointerCapture={() => {
              drag.current = null
            }}
            onAuxClick={(event) => {
              if (event.button === 1) event.preventDefault()
            }}
          >
            <canvas
              ref={ref}
              aria-label="Sprite sheet"
              tabIndex={disabled ? -1 : 0}
              style={{
                transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
              aria-disabled={disabled}
              width={sheet.metadata.width}
              height={sheet.metadata.height}
              className={manual ? 'manual-selection' : undefined}
              onPointerDown={selection.onPointerDown}
              onPointerMove={selection.onPointerMove}
              onPointerUp={selection.onPointerUp}
              onPointerCancel={selection.cancel}
              onLostPointerCapture={selection.cancel}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onClick={(event) => {
                if (manual || disabled || event.button !== 0 || !frames.length) return
                const rect = event.currentTarget.getBoundingClientRect()
                if (!rect.width || !rect.height) return
                const x = ((event.clientX - rect.left) * sheet.metadata.width) / rect.width
                const y = ((event.clientY - rect.top) * sheet.metadata.height) / rect.height
                const frame = frames.find(
                  (candidate) =>
                    x >= candidate.x &&
                    y >= candidate.y &&
                    x < candidate.x + candidate.width &&
                    y < candidate.y + candidate.height,
                )
                if (!frame) return
                setKeyboardId(frame.id)
                onFrameClick(frame.id)
              }}
              onKeyDown={(event) => {
                if (manual) {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    selection.cancel()
                  }
                  return
                }
                if (disabled || !keyboardFrame) return
                const deltas: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -columns,
                  ArrowDown: columns,
                }
                if (event.key in deltas) {
                  event.preventDefault()
                  setKeyboardId(
                    Math.max(0, Math.min(frames.length - 1, keyboardFrame.id + deltas[event.key])),
                  )
                } else if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  onFrameClick(keyboardFrame.id)
                }
              }}
            />
          </section>
          <p className="muted canvas-help">
            {manual
              ? 'Drag around your sprite with the left mouse button. Escape cancels. Middle-button drag to pan.'
              : 'Click to toggle frames. Middle-button drag to pan. Keyboard: arrows, Enter or Space.'}
          </p>
        </>
      ) : (
        <div className="empty-state">Choose an image to start cutting sprites.</div>
      )}
    </>
  )
}
