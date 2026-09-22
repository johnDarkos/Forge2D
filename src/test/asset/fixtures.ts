import type { SpriteEditorResult } from '@/entities/sprite/domain'

export const textureInput = {
  id: 'texture-player',
  name: 'player.png',
  uri: '/assets/player.png',
  width: 256,
  height: 128,
} as const

export const manualResult = {
  source: { width: 256, height: 128 },
  sprites: [
    { id: 'idle-1', name: 'idle', rect: { x: 0, y: 0, width: 32, height: 32 } },
    { id: 'run-1', name: 'run', rect: { x: 64, y: 32, width: 32, height: 32 } },
  ],
  settings: { mode: 'manual' },
} satisfies SpriteEditorResult

export const gridResult = {
  ...manualResult,
  settings: {
    mode: 'grid',
    grid: { cellWidth: 32, cellHeight: 32, offsetX: 4, offsetY: 2, gapX: 3, gapY: 1 },
  },
} satisfies SpriteEditorResult

export const invalidRects = [
  { label: 'fractional coordinate', rect: { x: 0.5, y: 0, width: 32, height: 32 } },
  { label: 'zero size', rect: { x: 0, y: 0, width: 0, height: 32 } },
  { label: 'outside texture', rect: { x: 250, y: 0, width: 32, height: 32 } },
] as const
