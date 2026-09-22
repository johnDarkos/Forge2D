import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { generateFrames, isSupportedImageType, validateGrid } from '@/entities/sprite'
import {
  createSpriteEditorResult,
  gridFrameToSprite,
  manualFrameToSprite,
} from '@/entities/sprite/domain'
import type { NamedSpriteFrame, SpriteFrame, SpriteFrameGeometry } from '@/entities/sprite'
import type { UploadError } from '@/features/upload-sprite-sheet'
import {
  createInitialEditorState,
  editorSessionReducer,
  gridSettingsFromState,
  isEditorBusy,
  mergeSprites,
  sameRect,
} from './session'
import type { EditorSessionAction } from './session'
import type { SpriteEditorProps, SpriteEditorViewProps } from './types'

type SourceRequest = { id: number; initialize: boolean } & (
  { kind: 'file'; file: File } | { kind: 'external'; src: string; name: string }
)

/** Владеет одной сессией источника; внешний src меняется через key контейнера. */
export function useEditor(props: SpriteEditorProps): SpriteEditorViewProps {
  const { image: externalImage, onSave, onCancel } = props
  const [initial] = useState(() => createInitialEditorState(props))
  const [initialData] = useState(() =>
    props.initialData
      ? {
          sprites: initial.sprites,
          settings: {
            mode: initial.selectionMode,
            ...(props.initialData.settings?.grid ? { grid: gridSettingsFromState(initial) } : {}),
          },
        }
      : null,
  )
  const [state, dispatch] = useReducer(editorSessionReducer, initial)
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
        dispatch({
          type: 'sourceFailed',
          error: { code: 'decode-failed', message },
        })
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
      dispatch({
        type: 'sourceReady',
        sheet,
        sprites: request.initialize ? hydrated : null,
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

  const busy = isEditorBusy(state, saving)
  const dispatchWhenIdle = (action: EditorSessionAction) => {
    if (!busy) dispatch(action)
  }
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
  const savedFrames: NamedSpriteFrame[] = state.sprites.map((sprite) => ({
    id: sprite.id,
    displayNumber: state.displayNumbers.get(sprite.id)!,
    name: sprite.name,
    ...sprite.rect,
    row: 0,
    column: 0,
  }))
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
    dispatchWhenIdle({ type: 'frameSizeChanged', key, value })
  const changeSpacing: SpriteEditorViewProps['settings']['onSpacingChange'] = (key, value) =>
    dispatchWhenIdle({ type: 'spacingChanged', key, value })
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
                ...(!isManual ? { grid: gridSettingsFromState(state) } : {}),
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
        let id = `sprite-${state.nextDisplayNumber}`
        let suffix = 2
        while (usedIds.current.has(id)) id = `sprite-${state.nextDisplayNumber}-${suffix++}`
        usedIds.current.add(id)
        const sprite = manualFrameToSprite(
          state.manualRegion,
          id,
          `frame_${String(state.nextDisplayNumber).padStart(3, '0')}`,
        )
        dispatch({ type: 'spriteAdded', sprite })
      },
      onRename: (id, name) => dispatchWhenIdle({ type: 'spriteRenamed', id, name }),
      onRemove: (id) => {
        if (busy) return
        const removed = state.sprites.find((sprite) => sprite.id === id)
        const selectedGridIds = removed
          ? geometry.filter((frame) => sameRect(frame, removed.rect)).map((frame) => frame.id)
          : []
        dispatch({ type: 'spriteRemoved', id, selectedGridIds })
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
        dispatch({ type: 'sourceLoading', file, requestId: id })
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
      onViewportChange: (viewport) => dispatch({ type: 'viewportChanged', viewport }),
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
        dispatch({ type: 'modeChanged', mode: selectionMode, sprites: committed })
      },
      onRegionChange: (manualRegion) =>
        dispatchWhenIdle({ type: 'regionChanged', region: manualRegion }),
      onDrawingChange: (isDrawing) => dispatch({ type: 'drawingChanged', isDrawing }),
      onSelectAll: () =>
        dispatchWhenIdle({
          type: 'selectionReplaced',
          ids: geometry.map((frame) => frame.id),
        }),
      onClearSelection: () => dispatchWhenIdle({ type: 'selectionCleared' }),
      onFrameClick: (id) => {
        if (!geometry.some((frame) => frame.id === id)) return
        dispatchWhenIdle({ type: 'frameToggled', id })
      },
    },
    preview: {
      sheet,
      region: isManual,
      frame: isManual
        ? state.manualRegion
        : (selectedFrames.find((frame) => frame.id === state.activeFrameId) ?? null),
    },
    exportButton: {
      sheet,
      frames: isManual ? [] : selectedFrames,
      savedFrames,
      region: isManual ? state.manualRegion : null,
      regionExport: isManual,
      disabled: !sheet || (!isManual && grid?.status !== 'valid') || state.isDrawing || saving,
      onExportingChange: (isExporting) => dispatch({ type: 'exportChanged', isExporting }),
    },
  }
}
