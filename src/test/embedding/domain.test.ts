// @vitest-environment node
import { expect, test } from 'vitest'
import * as domain from '@/entities/sprite/domain'

const sprite = { id: 'abc', name: 'idle', rect: { x: 4, y: 8, width: 24, height: 32 } }
const grid = { cellWidth: 32, cellHeight: 32, offsetX: 0, offsetY: 0, gapX: 0, gapY: 0 }

test('result is an independent plain snapshot containing only public metadata', () => {
  const input = {
    source: { width: 256, height: 128 },
    sprites: [sprite],
    settings: { mode: 'grid' as const, grid },
    zoom: 2,
    pan: { x: 100, y: 50 },
  }
  const result = domain.createSpriteEditorResult(input)
  expect(result).toEqual({ source: input.source, sprites: [sprite], settings: input.settings })
  expect(result).not.toBe(input)
  expect(result.source).not.toBe(input.source)
  expect(result.sprites[0].rect).not.toBe(sprite.rect)
  expect(result.settings.grid).not.toBe(grid)
  expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  expect(typeof document).toBe('undefined')
})

test('manual result omits grid settings and normalization uses the same frame shape', () => {
  const geometry = {
    id: 10,
    row: 1,
    column: 2,
    x: 64,
    y: 32,
    width: 32,
    height: 32,
    selected: true,
  }
  const cell = domain.gridFrameToSprite(geometry)
  const manual = domain.manualFrameToSprite(
    { x: 18, y: 14, width: 71, height: 92 },
    'manual-1',
    'player',
  )
  expect(cell).toEqual({
    id: 'grid-64-32-32-32',
    name: 'frame_011',
    rect: { x: 64, y: 32, width: 32, height: 32 },
  })
  expect(manual).toEqual({
    id: 'manual-1',
    name: 'player',
    rect: { x: 18, y: 14, width: 71, height: 92 },
  })
  expect(
    domain.createSpriteEditorResult({
      source: { width: 256, height: 128 },
      sprites: [cell, manual],
      settings: { mode: 'manual', grid },
    }).settings,
  ).toEqual({ mode: 'manual' })
})

test('rename and removal preserve identity, order and the caller data', () => {
  const input = [sprite, { ...sprite, id: 'second' }]
  const renamed = domain.renameSprite(input, 'abc', 'player_idle')
  expect(renamed[0]).toEqual({ ...sprite, name: 'player_idle' })
  expect(input[0].name).toBe('idle')
  expect(domain.removeSprite(renamed, 'abc')).toEqual([input[1]])
})

for (const rect of [
  { x: -1, y: 0, width: 1, height: 1 },
  { x: 0, y: -1, width: 1, height: 1 },
  { x: 0, y: 0, width: 0, height: 1 },
  { x: 0, y: 0, width: 1, height: -1 },
  { x: 255, y: 0, width: 2, height: 1 },
  { x: 0, y: 127, width: 1, height: 2 },
  { x: NaN, y: 0, width: 1, height: 1 },
  { x: 0.5, y: 0, width: 1, height: 1 },
]) {
  test(`rejects invalid rectangle ${JSON.stringify(rect)}`, () => {
    expect(() =>
      domain.createSpriteEditorResult({
        source: { width: 256, height: 128 },
        sprites: [{ ...sprite, rect }],
        settings: { mode: 'manual' },
      }),
    ).toThrow(/rect|pixel|bound/i)
  })
}

test('rejects duplicate IDs, invalid source and invalid grid settings; empty collection is valid', () => {
  const state = {
    source: { width: 256, height: 128 },
    sprites: [sprite],
    settings: { mode: 'manual' as const },
  }
  expect(() => domain.createSpriteEditorResult({ ...state, sprites: [sprite, sprite] })).toThrow(
    /id/i,
  )
  expect(() =>
    domain.createSpriteEditorResult({ ...state, sprites: [{ ...sprite, id: '' }] }),
  ).toThrow(/id/i)
  expect(() =>
    domain.createSpriteEditorResult({ ...state, source: { width: Infinity, height: 128 } }),
  ).toThrow(/source/i)
  expect(() =>
    domain.createSpriteEditorResult({
      ...state,
      settings: { mode: 'grid', grid: { ...grid, gapX: -1 } },
    }),
  ).toThrow(/grid/i)
  expect(domain.createSpriteEditorResult({ ...state, sprites: [] }).sprites).toEqual([])
})
