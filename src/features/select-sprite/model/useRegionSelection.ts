import { useRef, useState } from 'react'
import type { PointerEvent, RefObject } from 'react'
import { selectionRect } from '@/entities/sprite/domain'
import type { CropRect, ImagePoint } from '@/entities/sprite/domain'

/** Локальный черновик жеста; в сессию попадает только завершённая область. */
export function useRegionSelection(
  canvas: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  onCommit: (region: CropRect) => void,
  onDrawingChange: (drawing: boolean) => void,
) {
  const [draft, setDraft] = useState<CropRect | null>(null)
  const gesture = useRef<{ start: ImagePoint; pointerId: number } | null>(null)
  const point = (event: PointerEvent<HTMLCanvasElement>): ImagePoint | null => {
    const node = canvas.current
    if (!node) return null
    const box = node.getBoundingClientRect()
    if (!box.width || !box.height) return null
    return {
      x: ((event.clientX - box.left) * node.width) / box.width,
      y: ((event.clientY - box.top) * node.height) / box.height,
    }
  }
  const cancel = () => {
    const previous = gesture.current
    gesture.current = null
    setDraft(null)
    if (previous) {
      onDrawingChange(false)
      if (canvas.current?.hasPointerCapture(previous.pointerId))
        canvas.current.releasePointerCapture(previous.pointerId)
    }
  }
  return {
    draft,
    cancel,
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => {
      if (!enabled || event.button !== 0 || gesture.current) return
      const start = point(event)
      const node = canvas.current
      if (
        !start ||
        !node ||
        start.x < 0 ||
        start.y < 0 ||
        start.x >= node.width ||
        start.y >= node.height
      )
        return
      event.preventDefault()
      node.focus({ preventScroll: true })
      gesture.current = { start, pointerId: event.pointerId }
      node.setPointerCapture(event.pointerId)
      setDraft(null)
      onDrawingChange(true)
    },
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => {
      if (!gesture.current || gesture.current.pointerId !== event.pointerId) return
      const end = point(event)
      const node = canvas.current
      if (end && node) setDraft(selectionRect(gesture.current.start, end, node.width, node.height))
    },
    onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => {
      if (!gesture.current || gesture.current.pointerId !== event.pointerId) return
      const end = point(event)
      const node = canvas.current
      const result =
        end && node ? selectionRect(gesture.current.start, end, node.width, node.height) : null
      cancel()
      if (enabled && result) onCommit(result)
    },
  }
}
