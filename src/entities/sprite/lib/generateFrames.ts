import type { GenerateFrames } from '../model/types'
import { gridSummary, zeroGridOptions } from './gridGeometry'

/** Генерирует полные ячейки с отступами, сохраняя четырёхаргументный MVP-контракт. */
export const generateFrames: GenerateFrames = (
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  options = zeroGridOptions,
) => {
  if (
    ![imageWidth, imageHeight, frameWidth, frameHeight].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  ) {
    throw new RangeError('Image and frame dimensions must be positive integers')
  }
  if (
    ![options.offsetX, options.offsetY, options.gapX, options.gapY].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  ) {
    throw new RangeError('Offsets and gaps must be non-negative integers')
  }
  const { columns, frameCount } = gridSummary(
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    options,
  )
  return Array.from({ length: frameCount }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = options.offsetX + column * (frameWidth + options.gapX)
    const y = options.offsetY + row * (frameHeight + options.gapY)
    return {
      id: `grid-${x}-${y}-${frameWidth}-${frameHeight}`,
      displayNumber: index + 1,
      row,
      column,
      x,
      y,
      width: frameWidth,
      height: frameHeight,
      selected: false,
    }
  })
}
