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
  {
    id: 'grid-10-8-32-32',
    displayNumber: 1,
    row: 0,
    column: 0,
    x: 10,
    y: 8,
    width: 32,
    height: 32,
    selected: false,
  },
  {
    id: 'grid-46-8-32-32',
    displayNumber: 2,
    row: 0,
    column: 1,
    x: 46,
    y: 8,
    width: 32,
    height: 32,
    selected: false,
  },
  {
    id: 'grid-82-8-32-32',
    displayNumber: 3,
    row: 0,
    column: 2,
    x: 82,
    y: 8,
    width: 32,
    height: 32,
    selected: false,
  },
  {
    id: 'grid-10-46-32-32',
    displayNumber: 4,
    row: 1,
    column: 0,
    x: 10,
    y: 46,
    width: 32,
    height: 32,
    selected: false,
  },
  {
    id: 'grid-46-46-32-32',
    displayNumber: 5,
    row: 1,
    column: 1,
    x: 46,
    y: 46,
    width: 32,
    height: 32,
    selected: false,
  },
  {
    id: 'grid-82-46-32-32',
    displayNumber: 6,
    row: 1,
    column: 2,
    x: 82,
    y: 46,
    width: 32,
    height: 32,
    selected: false,
  },
]
