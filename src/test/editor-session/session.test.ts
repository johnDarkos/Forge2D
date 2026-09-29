import { expect, test } from 'vitest'
import type { LoadedSpriteSheet, SpriteFrame, SpriteFrameGeometry } from '@/entities/sprite'
import {
  commitGridFrames,
  createInitialEditorState,
  editorSessionReducer,
  gridSettingsFromState,
  isEditorBusy,
  mergeSprites,
} from '@/widgets/sprite-editor/model/session'

const sprites: readonly SpriteFrame[] = [
  { id: 'idle', name: 'idle', rect: { x: 0, y: 0, width: 32, height: 32 } },
  { id: 'run', name: 'run', rect: { x: 32, y: 0, width: 32, height: 32 } },
]

function initial() {
  return createInitialEditorState({
    initialData: {
      sprites,
      settings: {
        mode: 'grid',
        grid: { cellWidth: 32, cellHeight: 24, offsetX: 4, offsetY: 2, gapX: 3, gapY: 1 },
      },
    },
  })
}

function sheet(): LoadedSpriteSheet {
  return {
    file: null,
    url: '/player.png',
    image: document.createElement('img'),
    metadata: {
      name: 'player.png',
      type: null,
      size: null,
      width: 256,
      height: 128,
    },
  }
}

/** Ячейка сетки: ID полностью кодирует геометрию, как в generateFrames. */
function cell(x: number, y: number, size = 32, displayNumber = 1): SpriteFrameGeometry {
  return {
    id: `grid-${x}-${y}-${size}-${size}`,
    displayNumber,
    row: 0,
    column: 0,
    x,
    y,
    width: size,
    height: size,
  }
}

test('initial state copies external data and assigns stable presentation numbers', () => {
  const state = initial()
  expect(state.selectionMode).toBe('grid')
  expect(state.sprites).toEqual(sprites)
  expect(state.sprites).not.toBe(sprites)
  expect(state.sprites[0].rect).not.toBe(sprites[0].rect)
  expect([...state.displayNumbers]).toEqual([
    ['idle', 1],
    ['run', 2],
  ])
  expect(state.nextDisplayNumber).toBe(3)
  expect([...state.usedIds]).toEqual(['idle', 'run'])
  expect(state.gridAliases.size).toBe(0)
  expect(gridSettingsFromState(state)).toEqual({
    cellWidth: 32,
    cellHeight: 24,
    offsetX: 4,
    offsetY: 2,
    gapX: 3,
    gapY: 1,
  })
})

test('grid edits clear stale selection while preserving sprites and viewport', () => {
  const active = editorSessionReducer(initial(), { type: 'frameToggled', id: 'grid-1' })
  expect(active.selectedIds.has('grid-1')).toBe(true)
  expect(active.activeFrameId).toBe('grid-1')
  const resized = editorSessionReducer(active, {
    type: 'frameSizeChanged',
    key: 'width',
    value: '64',
  })
  expect(resized.frameSizeInput.width).toBe('64')
  expect(resized.selectedIds.size).toBe(0)
  expect(resized.activeFrameId).toBeNull()
  expect(resized.sprites).toBe(active.sprites)
  const spaced = editorSessionReducer(active, { type: 'spacingChanged', key: 'gapX', value: '8' })
  expect(spaced.gridOptionsInput.gapX).toBe('8')
  expect(spaced.selectedIds.size).toBe(0)
})

test('selection toggle tracks the active frame and clear removes both', () => {
  let state = editorSessionReducer(initial(), { type: 'frameToggled', id: 'grid-a' })
  state = editorSessionReducer(state, { type: 'frameToggled', id: 'grid-b' })
  expect([...state.selectedIds]).toEqual(['grid-a', 'grid-b'])
  expect(state.activeFrameId).toBe('grid-b')
  state = editorSessionReducer(state, {
    type: 'selectionReplaced',
    ids: ['grid-a', 'grid-b', 'grid-c'],
  })
  expect(state.activeFrameId).toBe('grid-b')
  state = editorSessionReducer(state, { type: 'frameToggled', id: 'grid-b' })
  expect([...state.selectedIds]).toEqual(['grid-a', 'grid-c'])
  expect(state.activeFrameId).toBeNull()
  state = editorSessionReducer(state, { type: 'selectionCleared' })
  expect(state.selectedIds.size).toBe(0)
})

test('manual frame transitions preserve IDs and never reuse display numbers', () => {
  const withRegion = editorSessionReducer(initial(), {
    type: 'regionChanged',
    region: { x: 10, y: 20, width: 40, height: 50 },
  })
  const added = editorSessionReducer(withRegion, { type: 'manualFrameAdded' })
  expect(added.sprites[2]).toMatchObject({
    id: 'sprite-3',
    name: 'frame_003',
    rect: { x: 10, y: 20, width: 40, height: 50 },
  })
  expect(added.displayNumbers.get('sprite-3')).toBe(3)
  expect(added.usedIds.has('sprite-3')).toBe(true)
  const renamed = editorSessionReducer(added, {
    type: 'spriteRenamed',
    id: 'sprite-3',
    name: 'jump_updated',
  })
  expect(renamed.sprites[2]).toMatchObject({ id: 'sprite-3', name: 'jump_updated' })
  const removed = editorSessionReducer(renamed, {
    type: 'spriteRemoved',
    id: 'sprite-3',
    selectedGridIds: [],
  })
  const nextRegion = editorSessionReducer(removed, {
    type: 'regionChanged',
    region: { x: 1, y: 2, width: 3, height: 4 },
  })
  const next = editorSessionReducer(nextRegion, { type: 'manualFrameAdded' })
  expect(next.sprites[2]).toMatchObject({ id: 'sprite-4', name: 'frame_004' })
  expect(next.displayNumbers.get('sprite-4')).toBe(4)
  expect(next.nextDisplayNumber).toBe(5)
})

test('source loading resets source-owned state and source ready hydrates sprites', () => {
  const changed = {
    ...initial(),
    viewport: { zoom: 2, x: 50, y: 25 },
    manualRegion: { x: 1, y: 2, width: 3, height: 4 },
    selectedIds: new Set(['grid-a']),
  }
  const loading = editorSessionReducer(changed, {
    type: 'sourceLoading',
    file: new File(['png'], 'next.png', { type: 'image/png' }),
    requestId: 2,
  })
  expect(loading.source).toMatchObject({ status: 'loading', requestId: 2 })
  expect(loading.viewport).toEqual({ zoom: 1, x: 0, y: 0 })
  expect(loading.sprites).toEqual([])
  expect(loading.manualRegion).toBeNull()
  expect(loading.usedIds.size).toBe(0)
  expect(loading.gridAliases.size).toBe(0)
  const ready = editorSessionReducer(loading, {
    type: 'sourceReady',
    sheet: sheet(),
    sprites,
  })
  expect(ready.source.status).toBe('ready')
  expect(ready.sprites).toEqual(sprites)
  expect(ready.displayNumbers.get('run')).toBe(2)
  expect([...ready.usedIds]).toEqual(['idle', 'run'])
})

test('mode change commits supplied sprites and resets transient interaction state', () => {
  const state = {
    ...initial(),
    manualRegion: { x: 1, y: 2, width: 3, height: 4 },
    isDrawing: true,
    selectedIds: new Set(['grid-a']),
    activeFrameId: 'grid-a',
  }
  const next = editorSessionReducer(state, {
    type: 'modeChanged',
    mode: 'manual',
    frames: [cell(64, 0, 32, 3)],
  })
  expect(next.selectionMode).toBe('manual')
  expect(next.sprites).toHaveLength(3)
  expect(next.sprites[2]).toMatchObject({ id: 'grid-64-0-32-32', name: 'frame_003' })
  expect(next.manualRegion).toBeNull()
  expect(next.isDrawing).toBe(false)
  expect(next.selectedIds.size).toBe(0)
  expect(next.activeFrameId).toBeNull()
})

test('viewport cannot change during drawing but drawing state and region remain explicit', () => {
  let state = editorSessionReducer(initial(), { type: 'drawingChanged', isDrawing: true })
  const blocked = editorSessionReducer(state, {
    type: 'viewportChanged',
    viewport: { zoom: 2, x: 10, y: 20 },
  })
  expect(blocked).toBe(state)
  state = editorSessionReducer(state, { type: 'drawingChanged', isDrawing: false })
  state = editorSessionReducer(state, {
    type: 'regionChanged',
    region: { x: 4, y: 8, width: 16, height: 20 },
  })
  expect(state.manualRegion).toEqual({ x: 4, y: 8, width: 16, height: 20 })
})

test('busy state has one rule for asynchronous Save and file export', () => {
  expect(isEditorBusy(initial(), false)).toBe(false)
  expect(isEditorBusy(initial(), true)).toBe(true)
  expect(isEditorBusy({ ...initial(), isExporting: true }, false)).toBe(true)
})

test('mergeSprites keeps saved order and ignores duplicate IDs', () => {
  expect(
    mergeSprites(sprites, [
      { ...sprites[0], name: 'ignored' },
      { id: 'jump', name: 'jump', rect: { x: 64, y: 0, width: 32, height: 32 } },
    ]),
  ).toEqual([
    ...sprites,
    { id: 'jump', name: 'jump', rect: { x: 64, y: 0, width: 32, height: 32 } },
  ])
})

test('repeated grid commits issue one stable ID for the same cell', () => {
  const state = createInitialEditorState({})
  expect(commitGridFrames(state, [cell(0, 0)]).sprites.map((sprite) => sprite.id)).toEqual([
    'grid-0-0-32-32',
  ])
  const committed = editorSessionReducer(state, {
    type: 'gridFramesCommitted',
    frames: [cell(0, 0)],
  })
  expect(committed.sprites).toEqual([])
  expect(commitGridFrames(committed, [cell(0, 0)]).sprites.map((sprite) => sprite.id)).toEqual([
    'grid-0-0-32-32',
  ])
})

test('a grid ID taken by another sprite is suffixed instead of stolen', () => {
  const state = createInitialEditorState({
    initialData: {
      sprites: [
        { id: 'grid-0-0-32-32', name: 'taken', rect: { x: 96, y: 96, width: 16, height: 16 } },
      ],
      settings: { mode: 'grid' },
    },
  })
  const { sprites, registry } = commitGridFrames(state, [cell(0, 0)])
  expect(sprites.map((sprite) => sprite.id)).toEqual(['grid-0-0-32-32', 'grid-0-0-32-32-2'])
  expect(registry.gridAliases.get('grid-0-0-32-32')).toBe('grid-0-0-32-32-2')
})

test('a cell already saved under its own rectangle reuses that sprite', () => {
  const state = createInitialEditorState({
    initialData: {
      sprites: [{ id: 'hero', name: 'hero', rect: { x: 0, y: 0, width: 32, height: 32 } }],
      settings: { mode: 'grid' },
    },
  })
  const { sprites, registry } = commitGridFrames(state, [cell(0, 0)])
  expect(sprites.map((sprite) => sprite.id)).toEqual(['hero'])
  expect(registry.gridAliases.size).toBe(0)
})

test('IDs of removed sprites are never reissued', () => {
  let state = editorSessionReducer(createInitialEditorState({}), {
    type: 'regionChanged',
    region: { x: 0, y: 0, width: 8, height: 8 },
  })
  state = editorSessionReducer(state, { type: 'manualFrameAdded' })
  const [added] = state.sprites
  state = editorSessionReducer(state, {
    type: 'spriteRemoved',
    id: added.id,
    selectedGridIds: [],
  })
  expect(state.sprites).toEqual([])
  expect(state.usedIds.has(added.id)).toBe(true)
  state = editorSessionReducer(state, {
    type: 'regionChanged',
    region: { x: 0, y: 0, width: 8, height: 8 },
  })
  state = editorSessionReducer(state, { type: 'manualFrameAdded' })
  expect(state.sprites[0].id).not.toBe(added.id)
})

test('grid aliases survive a cell resize because the cell ID encodes geometry', () => {
  const state = editorSessionReducer(createInitialEditorState({}), {
    type: 'gridFramesCommitted',
    frames: [cell(0, 0, 32)],
  })
  const resized = commitGridFrames(state, [cell(0, 0, 64)])
  expect(resized.sprites.map((sprite) => sprite.id)).toEqual(['grid-0-0-64-64'])
  expect(resized.registry.gridAliases.get('grid-0-0-32-32')).toBe('grid-0-0-32-32')
})
