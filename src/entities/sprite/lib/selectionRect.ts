export interface ImagePoint {
  readonly x: number
  readonly y: number
}
export interface CropRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Нормализует направление жеста, обрезает по изображению и охватывает целые пиксели. */
export function selectionRect(
  start: ImagePoint,
  end: ImagePoint,
  width: number,
  height: number,
): CropRect | null {
  if (
    ![start.x, start.y, end.x, end.y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return null
  const left = Math.max(0, Math.min(width, Math.min(start.x, end.x)))
  const top = Math.max(0, Math.min(height, Math.min(start.y, end.y)))
  const right = Math.max(0, Math.min(width, Math.max(start.x, end.x)))
  const bottom = Math.max(0, Math.min(height, Math.max(start.y, end.y)))
  if (right <= left || bottom <= top) return null
  const x = Math.floor(left)
  const y = Math.floor(top)
  return { x, y, width: Math.ceil(right) - x, height: Math.ceil(bottom) - y }
}
