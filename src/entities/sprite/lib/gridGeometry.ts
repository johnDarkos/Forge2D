import type { GridOptions, GridSummary } from '../model/types'

export const zeroGridOptions: GridOptions = { offsetX: 0, offsetY: 0, gapX: 0, gapY: 0 }

/** Последняя полная ячейка не требует промежутка после себя. */
export function gridSummary(
  width: number,
  height: number,
  frameWidth: number,
  frameHeight: number,
  options: GridOptions,
): GridSummary {
  const columns =
    width - options.offsetX < frameWidth
      ? 0
      : 1 + Math.floor((width - options.offsetX - frameWidth) / (frameWidth + options.gapX))
  const rows =
    height - options.offsetY < frameHeight
      ? 0
      : 1 + Math.floor((height - options.offsetY - frameHeight) / (frameHeight + options.gapY))
  return { columns, rows, frameCount: columns * rows }
}
