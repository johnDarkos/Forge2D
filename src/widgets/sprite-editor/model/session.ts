import { renameSprite, removeSprite } from '@/entities/sprite/domain'
import type {
  CropRect,
  GridOptionsInput,
  LoadedSpriteSheet,
  SpriteEditorMode,
  SpriteFrame,
  SpriteGridSettings,
} from '@/entities/sprite'
import type { UploadError } from '@/features/upload-sprite-sheet'
import type { CanvasViewport } from '@/features/select-sprite'
import type { EditorState, SpriteEditorProps } from './types'

export type EditorSessionAction =
  | { readonly type: 'frameSizeChanged'; readonly key: 'width' | 'height'; readonly value: string }
  | {
      readonly type: 'spacingChanged'
      readonly key: keyof GridOptionsInput
      readonly value: string
    }
  | { readonly type: 'selectionReplaced'; readonly ids: readonly string[] }
  | { readonly type: 'selectionCleared' }
  | { readonly type: 'frameToggled'; readonly id: string }
  | { readonly type: 'spriteAdded'; readonly sprite: SpriteFrame }
  | { readonly type: 'spriteRenamed'; readonly id: string; readonly name: string }
  | {
      readonly type: 'spriteRemoved'
      readonly id: string
      readonly selectedGridIds: readonly string[]
    }
  | {
      readonly type: 'sourceLoading'
      readonly file: File
      readonly requestId: number
    }
  | {
      readonly type: 'sourceReady'
      readonly sheet: LoadedSpriteSheet
      readonly sprites: readonly SpriteFrame[] | null
    }
  | { readonly type: 'sourceFailed'; readonly error: UploadError }
  | {
      readonly type: 'modeChanged'
      readonly mode: SpriteEditorMode
      readonly sprites: readonly SpriteFrame[]
    }
  | { readonly type: 'viewportChanged'; readonly viewport: CanvasViewport }
  | { readonly type: 'regionChanged'; readonly region: CropRect | null }
  | { readonly type: 'drawingChanged'; readonly isDrawing: boolean }
  | { readonly type: 'exportChanged'; readonly isExporting: boolean }

export const sameRect = (a: SpriteFrame['rect'], b: SpriteFrame['rect']) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Номера карточек относятся к UI; строковые domain ID не зависят от порядка и имени. */
export function storeSprites(state: EditorState, sprites: readonly SpriteFrame[]): EditorState {
  const displayNumbers = new Map(state.displayNumbers)
  let nextDisplayNumber = state.nextDisplayNumber
  for (const sprite of sprites) {
    if (!displayNumbers.has(sprite.id)) displayNumbers.set(sprite.id, nextDisplayNumber++)
  }
  return { ...state, sprites, displayNumbers, nextDisplayNumber }
}

export function mergeSprites(
  saved: readonly SpriteFrame[],
  added: readonly SpriteFrame[],
): SpriteFrame[] {
  const ids = new Set(saved.map((sprite) => sprite.id))
  return [...saved, ...added.filter((sprite) => !ids.has(sprite.id))]
}

export function createInitialEditorState({
  initialFrameSize = { width: '32', height: '32' },
  initialData,
  image,
}: SpriteEditorProps): EditorState {
  const grid = initialData?.settings?.grid
  return storeSprites(
    {
      viewport: { zoom: 1, x: 0, y: 0 },
      selectionMode: initialData?.settings?.mode ?? 'grid',
      manualRegion: null,
      isDrawing: false,
      sprites: [],
      displayNumbers: new Map(),
      nextDisplayNumber: 1,
      source: image ? { status: 'loading', file: null, requestId: 0 } : { status: 'idle' },
      frameSizeInput: grid
        ? { width: String(grid.cellWidth), height: String(grid.cellHeight) }
        : { ...initialFrameSize },
      gridOptionsInput: {
        offsetX: String(grid?.offsetX ?? 0),
        offsetY: String(grid?.offsetY ?? 0),
        gapX: String(grid?.gapX ?? 0),
        gapY: String(grid?.gapY ?? 0),
      },
      selectedIds: new Set(),
      activeFrameId: null,
      isExporting: false,
    },
    (initialData?.sprites ?? []).map((sprite) => ({ ...sprite, rect: { ...sprite.rect } })),
  )
}

export function gridSettingsFromState(state: EditorState): SpriteGridSettings {
  return {
    cellWidth: Number(state.frameSizeInput.width),
    cellHeight: Number(state.frameSizeInput.height),
    offsetX: Number(state.gridOptionsInput.offsetX),
    offsetY: Number(state.gridOptionsInput.offsetY),
    gapX: Number(state.gridOptionsInput.gapX),
    gapY: Number(state.gridOptionsInput.gapY),
  }
}

export function isEditorBusy(state: EditorState, saving: boolean) {
  return state.isExporting || saving
}

function resetSelection(state: EditorState): EditorState {
  return { ...state, selectedIds: new Set(), activeFrameId: null }
}

export function editorSessionReducer(state: EditorState, action: EditorSessionAction): EditorState {
  switch (action.type) {
    case 'frameSizeChanged':
      return resetSelection({
        ...state,
        frameSizeInput: { ...state.frameSizeInput, [action.key]: action.value },
      })
    case 'spacingChanged':
      return resetSelection({
        ...state,
        gridOptionsInput: { ...state.gridOptionsInput, [action.key]: action.value },
      })
    case 'selectionReplaced':
      return { ...state, selectedIds: new Set(action.ids) }
    case 'selectionCleared':
      return resetSelection(state)
    case 'frameToggled': {
      const selectedIds = new Set(state.selectedIds)
      if (selectedIds.has(action.id)) {
        selectedIds.delete(action.id)
        return {
          ...state,
          selectedIds,
          activeFrameId: state.activeFrameId === action.id ? null : state.activeFrameId,
        }
      }
      selectedIds.add(action.id)
      return { ...state, selectedIds, activeFrameId: action.id }
    }
    case 'spriteAdded':
      return state.manualRegion
        ? storeSprites({ ...state, manualRegion: null }, [...state.sprites, action.sprite])
        : state
    case 'spriteRenamed':
      return { ...state, sprites: renameSprite(state.sprites, action.id, action.name) }
    case 'spriteRemoved': {
      const selectedIds = new Set(state.selectedIds)
      for (const id of action.selectedGridIds) selectedIds.delete(id)
      return {
        ...state,
        sprites: removeSprite(state.sprites, action.id),
        selectedIds,
        activeFrameId:
          state.activeFrameId !== null && selectedIds.has(state.activeFrameId)
            ? state.activeFrameId
            : null,
      }
    }
    case 'sourceLoading':
      return {
        ...state,
        viewport: { zoom: 1, x: 0, y: 0 },
        source: { status: 'loading', file: action.file, requestId: action.requestId },
        manualRegion: null,
        sprites: [],
        displayNumbers: new Map(),
        nextDisplayNumber: 1,
        isDrawing: false,
        selectedIds: new Set(),
        activeFrameId: null,
      }
    case 'sourceReady': {
      const loaded = { ...state, source: { status: 'ready', sheet: action.sheet } } as EditorState
      return action.sprites ? storeSprites(loaded, action.sprites) : loaded
    }
    case 'sourceFailed':
      return { ...state, source: { status: 'error', error: action.error } }
    case 'modeChanged':
      return storeSprites(
        {
          ...state,
          selectionMode: action.mode,
          manualRegion: null,
          isDrawing: false,
          selectedIds: new Set(),
          activeFrameId: null,
        },
        action.sprites,
      )
    case 'viewportChanged':
      return state.isDrawing ? state : { ...state, viewport: action.viewport }
    case 'regionChanged':
      return { ...state, manualRegion: action.region }
    case 'drawingChanged':
      return { ...state, isDrawing: action.isDrawing }
    case 'exportChanged':
      return { ...state, isExporting: action.isExporting }
  }
}
