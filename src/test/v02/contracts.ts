import * as domain from '@/entities/sprite/domain'
import * as exporter from '@/features/export-sprites'
import type { GridFrame, SpriteFrameGeometry } from '@/entities/sprite/domain'

export interface GridOptions {
  offsetX: number
  offsetY: number
  gapX: number
  gapY: number
}
export type GenerateGrid = (
  width: number,
  height: number,
  frameWidth: number,
  frameHeight: number,
  options?: GridOptions,
) => GridFrame[]
// The existing four-argument contract remains valid; v0.2 adds an optional fifth argument.
export const generateGrid = domain.generateFrames as GenerateGrid

export function getExportZip() {
  const module = exporter as unknown as Record<string, unknown>
  if (typeof module.exportFramesZip !== 'function')
    throw new Error('v0.2 not implemented: exportFramesZip')
  return module.exportFramesZip as (
    image: HTMLImageElement,
    frames: readonly SpriteFrameGeometry[],
  ) => Promise<Blob>
}

export const spacedSheet = { name: 'spaced.png', type: 'image/png', width: 114, height: 78 }
export const spacing: GridOptions = { offsetX: 10, offsetY: 8, gapX: 4, gapY: 6 }
export const spacedFrames = [
  { id: 0, row: 0, column: 0, x: 10, y: 8, width: 32, height: 32, selected: false },
  { id: 1, row: 0, column: 1, x: 46, y: 8, width: 32, height: 32, selected: false },
  { id: 2, row: 0, column: 2, x: 82, y: 8, width: 32, height: 32, selected: false },
  { id: 3, row: 1, column: 0, x: 10, y: 46, width: 32, height: 32, selected: false },
  { id: 4, row: 1, column: 1, x: 46, y: 46, width: 32, height: 32, selected: false },
  { id: 5, row: 1, column: 2, x: 82, y: 46, width: 32, height: 32, selected: false },
]
