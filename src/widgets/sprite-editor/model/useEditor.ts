import { useEffect, useMemo, useRef, useState } from 'react'
import { generateFrames, isSupportedImageType, validateGrid } from '@/entities/sprite'
import {
  createSpriteEditorResult,
  gridFrameToSprite,
  manualFrameToSprite,
  renameSprite,
  removeSprite,
} from '@/entities/sprite/domain'
import type {
  GridOptionsInput,
  NamedSpriteFrame,
  SpriteFrame,
  SpriteFrameGeometry,
  SpriteGridSettings,
} from '@/entities/sprite'
import type { UploadError } from '@/features/upload-sprite-sheet'
import type { EditorState, SpriteEditorProps, SpriteEditorViewProps } from './types'

type SourceRequest = { id: number; initialize: boolean } & (
  { kind: 'file'; file: File } | { kind: 'external'; src: string; name: string }
)

const sameRect = (a: SpriteFrame['rect'], b: SpriteFrame['rect']) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Номера карточек относятся к UI; строковые domain ID не зависят от порядка и имени. */
function storeSprites(state: EditorState, sprites: readonly SpriteFrame[]): EditorState {
  const spriteNumbers = new Map(state.spriteNumbers)
  let nextManualFrameId = state.nextManualFrameId
  for (const sprite of sprites) {
    if (!spriteNumbers.has(sprite.id)) spriteNumbers.set(sprite.id, nextManualFrameId++)
  }
  return { ...state, sprites, spriteNumbers, nextManualFrameId }
}
function mergeSprites(saved: readonly SpriteFrame[], added: readonly SpriteFrame[]): SpriteFrame[] {
  const ids = new Set(saved.map((sprite) => sprite.id))
  return [...saved, ...added.filter((sprite) => !ids.has(sprite.id))]
}
function initialState({
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
      spriteNumbers: new Map(),
      nextManualFrameId: 0,
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
function gridSettings(state: EditorState): SpriteGridSettings {
  return {
    cellWidth: Number(state.frameSizeInput.width),
    cellHeight: Number(state.frameSizeInput.height),
    offsetX: Number(state.gridOptionsInput.offsetX),
    offsetY: Number(state.gridOptionsInput.offsetY),
    gapX: Number(state.gridOptionsInput.gapX),
    gapY: Number(state.gridOptionsInput.gapY),
  }
}

/** Владеет одной сессией источника; внешний src меняется через key контейнера. */
export function useEditor(props: SpriteEditorProps): SpriteEditorViewProps {
  const { image: externalImage, onSave, onCancel } = props
  const [initial] = useState(() => initialState(props))
  const [initialData] = useState(() =>
    props.initialData
      ? {
          sprites: initial.sprites,
          settings: {
            mode: initial.selectionMode,
            ...(props.initialData.settings?.grid ? { grid: gridSettings(initial) } : {}),
          },
        }
      : null,
  )
  const [state, setState] = useState<EditorState>(initial)
  const [request, setRequest] = useState<SourceRequest | null>(() =>
    externalImage
      ? {
          kind: 'external',
          src: externalImage.src,
          name: externalImage.name ?? 'sprite-sheet',
          id: 0,
          initialize: true,
        }
      : null,
  )
  const [uploadError, setUploadError] = useState<UploadError | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const actionRunning = useRef(false)
  const mounted = useRef(true)
  const sequence = useRef(0)
  const gridIds = useRef(new Map<string, string>())
  const usedIds = useRef(new Set(initial.sprites.map((sprite) => sprite.id)))
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!request) return
    const file = request.kind === 'file' ? request.file : null
    if (file && !isSupportedImageType(file.type)) return
    let cancelled = false
    let ownedUrl: string | null = null
    const image = new Image()
    const release = () => {
      if (ownedUrl) {
        URL.revokeObjectURL(ownedUrl)
        ownedUrl = null
      }
    }
    const fail = (message = 'Unable to load image') => {
      release()
      if (!cancelled)
        setState((previous) => ({
          ...previous,
          source: { status: 'error', error: { code: 'decode-failed', message } },
        }))
    }
    image.onload = () => {
      if (cancelled) return
      if (!image.naturalWidth || !image.naturalHeight) {
        fail()
        return
      }
      let hydrated = initial.sprites
      if (request.initialize && initialData) {
        try {
          const source = { width: image.naturalWidth, height: image.naturalHeight }
          // Validate all imported rectangles even when the current grid is unusable.
          hydrated = createSpriteEditorResult({
            source,
            sprites: initialData.sprites,
            settings: { mode: 'manual' },
          }).sprites
          if (!['grid', 'manual'].includes(initialData.settings.mode))
            throw new Error('Invalid slicing mode')
          if (initialData.settings.grid)
            createSpriteEditorResult({
              source,
              sprites: hydrated,
              settings: { mode: 'grid', grid: initialData.settings.grid },
            })
        } catch (error) {
          fail(
            `Invalid initial data: ${error instanceof Error ? error.message : 'Unable to initialize sprites'}`,
          )
          return
        }
      }
      const url = request.kind === 'external' ? request.src : ownedUrl
      if (!url) {
        fail()
        return
      }
      const sheet = {
        file,
        url,
        image,
        metadata: {
          name: request.kind === 'external' ? request.name : request.file.name,
          type: file && isSupportedImageType(file.type) ? file.type : null,
          size: file?.size ?? null,
          width: image.naturalWidth,
          height: image.naturalHeight,
        },
      }
      setState((previous) => {
        const loaded: EditorState = { ...previous, source: { status: 'ready', sheet } }
        return request.initialize ? storeSprites(loaded, hydrated) : loaded
      })
    }
    image.onerror = () => fail()
    try {
      if (request.kind === 'external') {
        const url = new URL(request.src, window.location.href)
        if (!request.src.trim() || !['blob:', 'data:', 'http:', 'https:'].includes(url.protocol))
          throw new Error('Unsupported image URL')
        if (url.protocol === 'http:' || url.protocol === 'https:') image.crossOrigin = 'anonymous'
        image.src = request.src
      } else {
        ownedUrl = URL.createObjectURL(request.file)
        image.src = ownedUrl
      }
    } catch {
      fail()
    }
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
      release()
    }
  }, [request, initial, initialData])

  const busy = state.isExporting || saving
  const sheet = state.source.status === 'ready' ? state.source.sheet : null
  const grid = useMemo(
    () =>
      sheet
        ? validateGrid(
            state.frameSizeInput,
            sheet.metadata.width,
            sheet.metadata.height,
            state.gridOptionsInput,
          )
        : null,
    [sheet, state.frameSizeInput, state.gridOptionsInput],
  )
  const geometry = useMemo(
    () =>
      sheet && grid?.status === 'valid'
        ? generateFrames(
            sheet.metadata.width,
            sheet.metadata.height,
            grid.size.width,
            grid.size.height,
            {
              offsetX: Number(state.gridOptionsInput.offsetX),
              offsetY: Number(state.gridOptionsInput.offsetY),
              gapX: Number(state.gridOptionsInput.gapX),
              gapY: Number(state.gridOptionsInput.gapY),
            },
          )
        : [],
    [sheet, grid, state.gridOptionsInput],
  )
  const frames = useMemo(
    () => geometry.map((frame) => ({ ...frame, selected: state.selectedIds.has(frame.id) })),
    [geometry, state.selectedIds],
  )
  const selectedFrames = frames.filter((frame) => frame.selected)
  const isManual = state.selectionMode === 'manual'
  const regionFrame = state.manualRegion
    ? { ...state.manualRegion, id: 0, row: 0, column: 0 }
    : null
  const savedFrames: NamedSpriteFrame[] = state.sprites.map((sprite) => ({
    id: state.spriteNumbers.get(sprite.id)!,
    name: sprite.name,
    ...sprite.rect,
    row: 0,
    column: 0,
  }))
  const domainId = (number: number) =>
    state.sprites.find((sprite) => state.spriteNumbers.get(sprite.id) === number)?.id
  const normalizeGrid = (frame: SpriteFrameGeometry, saved: readonly SpriteFrame[]) => {
    const existing = saved.find((sprite) => sameRect(sprite.rect, frame))
    if (existing) return existing
    const normalized = gridFrameToSprite(frame)
    let id = gridIds.current.get(normalized.id)
    if (!id) {
      id = normalized.id
      let suffix = 2
      while (usedIds.current.has(id)) id = `${normalized.id}-${suffix++}`
      usedIds.current.add(id)
      gridIds.current.set(normalized.id, id)
    }
    return { ...normalized, id }
  }
  const changeSize = (key: 'width' | 'height', value: string) =>
    setState((previous) =>
      busy
        ? previous
        : {
            ...previous,
            frameSizeInput: { ...previous.frameSizeInput, [key]: value },
            selectedIds: new Set(),
            activeFrameId: null,
          },
    )
  const changeSpacing = (key: keyof GridOptionsInput, value: string) =>
    setState((previous) =>
      busy
        ? previous
        : {
            ...previous,
            gridOptionsInput: { ...previous.gridOptionsInput, [key]: value },
            selectedIds: new Set(),
            activeFrameId: null,
          },
    )
  const saveDisabled =
    !sheet ||
    busy ||
    state.isDrawing ||
    (isManual ? !!state.manualRegion : grid?.status !== 'valid')

  return {
    actions: {
      showSave: !!onSave,
      showCancel: !!onCancel,
      saveDisabled,
      cancelDisabled: busy,
      saving,
      error: actionError,
      hint:
        isManual && state.manualRegion ? 'Add or clear the current region before saving.' : null,
      onSave: () => {
        if (!onSave || !sheet || saveDisabled || actionRunning.current) return
        actionRunning.current = true
        setSaving(true)
        setActionError(null)
        void (async () => {
          try {
            const sprites = mergeSprites(
              state.sprites,
              isManual ? [] : selectedFrames.map((frame) => normalizeGrid(frame, state.sprites)),
            )
            const result = createSpriteEditorResult({
              source: { width: sheet.metadata.width, height: sheet.metadata.height },
              sprites,
              settings: {
                mode: state.selectionMode,
                ...(!isManual ? { grid: gridSettings(state) } : {}),
              },
            })
            await onSave(result)
          } catch {
            if (mounted.current) setActionError('Unable to save sprites. Please try again.')
          } finally {
            actionRunning.current = false
            if (mounted.current) setSaving(false)
          }
        })()
      },
      onCancel: () => {
        if (!onCancel || busy) return
        setActionError(null)
        try {
          void Promise.resolve(onCancel()).catch(() => {
            if (mounted.current) setActionError('Unable to cancel. Please try again.')
          })
        } catch {
          setActionError('Unable to cancel. Please try again.')
        }
      },
    },
    manualFrames: {
      sheet,
      frames: savedFrames,
      canAdd: !!sheet && isManual && !!state.manualRegion && !state.isDrawing,
      disabled: busy,
      onAdd: () => {
        if (
          busy ||
          state.source.status !== 'ready' ||
          !isManual ||
          !state.manualRegion ||
          state.isDrawing
        )
          return
        let id = `sprite-${state.nextManualFrameId + 1}`
        let suffix = 2
        while (usedIds.current.has(id)) id = `sprite-${state.nextManualFrameId + 1}-${suffix++}`
        usedIds.current.add(id)
        const sprite = manualFrameToSprite(
          state.manualRegion,
          id,
          `frame_${String(state.nextManualFrameId + 1).padStart(3, '0')}`,
        )
        setState((previous) =>
          previous.manualRegion
            ? storeSprites({ ...previous, manualRegion: null }, [...previous.sprites, sprite])
            : previous,
        )
      },
      onRename: (number, name) => {
        const id = domainId(number)
        if (id && !busy)
          setState((previous) => ({
            ...previous,
            sprites: renameSprite(previous.sprites, id, name),
          }))
      },
      onRemove: (number) => {
        const id = domainId(number)
        if (!id || busy) return
        setState((previous) => {
          const removed = previous.sprites.find((sprite) => sprite.id === id)
          const selectedIds = new Set(previous.selectedIds)
          for (const frame of geometry)
            if (removed && sameRect(frame, removed.rect)) selectedIds.delete(frame.id)
          return {
            ...previous,
            sprites: removeSprite(previous.sprites, id),
            selectedIds,
            activeFrameId:
              previous.activeFrameId !== null && selectedIds.has(previous.activeFrameId)
                ? previous.activeFrameId
                : null,
          }
        })
      },
    },
    uploader: {
      status: state.source.status,
      disabled: busy || !!externalImage,
      error: uploadError ?? (state.source.status === 'error' ? state.source.error : null),
      onError: setUploadError,
      onFileSelected: (file) => {
        if (busy || externalImage) return
        setUploadError(null)
        setActionError(null)
        const id = ++sequence.current
        gridIds.current.clear()
        usedIds.current = new Set(id === 1 ? initial.sprites.map((sprite) => sprite.id) : [])
        setState((previous) => ({
          ...previous,
          viewport: { zoom: 1, x: 0, y: 0 },
          source: { status: 'loading', file, requestId: id },
          manualRegion: null,
          sprites: [],
          spriteNumbers: new Map(),
          nextManualFrameId: 0,
          isDrawing: false,
          selectedIds: new Set(),
          activeFrameId: null,
        }))
        setRequest({ kind: 'file', file, id, initialize: id === 1 })
      },
    },
    settings: {
      value: state.frameSizeInput,
      spacing: state.gridOptionsInput,
      onSpacingChange: changeSpacing,
      disabled: !sheet || busy,
      errors: grid?.status === 'invalid' ? grid.errors : {},
      summary: grid?.status === 'valid' ? grid.summary : null,
      onFrameWidthChange: (value) => changeSize('width', value),
      onFrameHeightChange: (value) => changeSize('height', value),
    },
    canvas: {
      sheet,
      frames,
      disabled: !sheet || (!isManual && grid?.status !== 'valid') || busy,
      viewport: state.viewport,
      isDrawing: state.isDrawing,
      onViewportChange: (viewport) =>
        setState((previous) => (previous.isDrawing ? previous : { ...previous, viewport })),
      mode: state.selectionMode,
      region: state.manualRegion,
      modeDisabled: !sheet || busy,
      onModeChange: (selectionMode) => {
        if (busy || state.isDrawing || selectionMode === state.selectionMode) return
        const committed = isManual
          ? state.sprites
          : mergeSprites(
              state.sprites,
              selectedFrames.map((frame) => normalizeGrid(frame, state.sprites)),
            )
        setState((previous) =>
          storeSprites(
            {
              ...previous,
              selectionMode,
              manualRegion: null,
              isDrawing: false,
              selectedIds: new Set(),
              activeFrameId: null,
            },
            committed,
          ),
        )
      },
      onRegionChange: (manualRegion) =>
        setState((previous) => (busy ? previous : { ...previous, manualRegion })),
      onDrawingChange: (isDrawing) => setState((previous) => ({ ...previous, isDrawing })),
      onSelectAll: () =>
        setState((previous) =>
          busy
            ? previous
            : { ...previous, selectedIds: new Set(geometry.map((frame) => frame.id)) },
        ),
      onClearSelection: () =>
        setState((previous) =>
          busy ? previous : { ...previous, selectedIds: new Set(), activeFrameId: null },
        ),
      onFrameClick: (id) =>
        setState((previous) => {
          if (busy || !geometry.some((frame) => frame.id === id)) return previous
          const selectedIds = new Set(previous.selectedIds)
          if (selectedIds.has(id)) {
            selectedIds.delete(id)
            return {
              ...previous,
              selectedIds,
              activeFrameId: previous.activeFrameId === id ? null : previous.activeFrameId,
            }
          }
          selectedIds.add(id)
          return { ...previous, selectedIds, activeFrameId: id }
        }),
    },
    preview: {
      sheet,
      region: isManual,
      frame: isManual
        ? regionFrame
        : (selectedFrames.find((frame) => frame.id === state.activeFrameId) ?? null),
    },
    exportButton: {
      sheet,
      frames: isManual ? (regionFrame ? [regionFrame] : []) : selectedFrames,
      savedFrames,
      regionExport: isManual,
      disabled: !sheet || (!isManual && grid?.status !== 'valid') || state.isDrawing || saving,
      onExportingChange: (isExporting) => setState((previous) => ({ ...previous, isExporting })),
    },
  }
}
