import { useEffect, useMemo, useRef, useState } from 'react'
import { generateFrames, isSupportedImageType, validateGrid } from '@/entities/sprite'
import type { FrameSizeInput, GridOptionsInput } from '@/entities/sprite'
import type { UploadError } from '@/features/upload-sprite-sheet'
import type { EditorState, SpriteEditorViewProps } from './types'

/** Владеет ресурсом изображения и связывает события независимых features. */
export function useEditor(
  initialFrameSize: FrameSizeInput = { width: '32', height: '32' },
): SpriteEditorViewProps {
  const [state, setState] = useState<EditorState>({
    viewport: { zoom: 1, x: 0, y: 0 },
    selectionMode: 'grid',
    manualRegion: null,
    isDrawing: false,
    savedFrames: [],
    nextManualFrameId: 0,
    source: { status: 'idle' },
    frameSizeInput: initialFrameSize,
    gridOptionsInput: { offsetX: '0', offsetY: '0', gapX: '0', gapY: '0' },
    selectedIds: new Set(),
    activeFrameId: null,
    isExporting: false,
  })
  const [request, setRequest] = useState<{ file: File; id: number } | null>(null)
  const [uploadError, setUploadError] = useState<UploadError | null>(null)
  const sequence = useRef(0)

  useEffect(() => {
    if (!request) return
    const { file } = request
    if (!isSupportedImageType(file.type)) return
    const type = file.type
    let cancelled = false
    let url: string | null = null
    const image = new Image()
    const release = () => {
      if (url) {
        URL.revokeObjectURL(url)
        url = null
      }
    }
    const fail = () => {
      release()
      if (!cancelled)
        setState((previous) => ({
          ...previous,
          source: {
            status: 'error',
            error: { code: 'decode-failed', message: 'Unable to load image' },
          },
        }))
    }
    image.onload = () => {
      if (cancelled) return
      if (!image.naturalWidth || !image.naturalHeight || !url) {
        fail()
        return
      }
      const imageUrl = url
      setState((previous) => ({
        ...previous,
        source: {
          status: 'ready',
          sheet: {
            file,
            url: imageUrl,
            image,
            metadata: {
              name: file.name,
              type,
              size: file.size,
              width: image.naturalWidth,
              height: image.naturalHeight,
            },
          },
        },
      }))
    }
    image.onerror = fail
    try {
      url = URL.createObjectURL(file)
      image.src = url
    } catch {
      fail()
    }
    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
      release()
    }
  }, [request])

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
  const exportFrames = isManual ? (regionFrame ? [regionFrame] : []) : selectedFrames
  const changeSize = (key: 'width' | 'height', value: string) =>
    setState((previous) => ({
      ...previous,
      frameSizeInput: { ...previous.frameSizeInput, [key]: value },
      selectedIds: new Set(),
      activeFrameId: null,
    }))

  const changeSpacing = (key: keyof GridOptionsInput, value: string) =>
    setState((previous) =>
      previous.isExporting
        ? previous
        : {
            ...previous,
            gridOptionsInput: { ...previous.gridOptionsInput, [key]: value },
            selectedIds: new Set(),
            activeFrameId: null,
          },
    )

  return {
    manualFrames: {
      sheet,
      frames: state.savedFrames,
      canAdd: !!sheet && isManual && !!state.manualRegion && !state.isDrawing,
      disabled: state.isExporting,
      onAdd: () =>
        setState((previous) => {
          if (
            previous.source.status !== 'ready' ||
            previous.selectionMode !== 'manual' ||
            !previous.manualRegion ||
            previous.isDrawing ||
            previous.isExporting
          )
            return previous
          const id = previous.nextManualFrameId
          return {
            ...previous,
            manualRegion: null,
            nextManualFrameId: id + 1,
            savedFrames: [
              ...previous.savedFrames,
              {
                ...previous.manualRegion,
                id,
                row: 0,
                column: 0,
                name: `frame_${String(id + 1).padStart(3, '0')}`,
              },
            ],
          }
        }),
      onRename: (id, name) =>
        setState((previous) =>
          previous.isExporting
            ? previous
            : {
                ...previous,
                savedFrames: previous.savedFrames.map((frame) =>
                  frame.id === id ? { ...frame, name } : frame,
                ),
              },
        ),
      onRemove: (id) =>
        setState((previous) =>
          previous.isExporting
            ? previous
            : {
                ...previous,
                savedFrames: previous.savedFrames.filter((frame) => frame.id !== id),
              },
        ),
    },
    uploader: {
      status: state.source.status,
      disabled: state.isExporting,
      error: uploadError ?? (state.source.status === 'error' ? state.source.error : null),
      onError: setUploadError,
      onFileSelected: (file) => {
        if (state.isExporting) return
        setUploadError(null)
        const id = ++sequence.current
        setState((previous) => ({
          ...previous,
          viewport: { zoom: 1, x: 0, y: 0 },
          source: { status: 'loading', file, requestId: id },
          manualRegion: null,
          savedFrames: [],
          nextManualFrameId: 0,
          isDrawing: false,
          selectedIds: new Set(),
          activeFrameId: null,
        }))
        setRequest({ file, id })
      },
    },
    settings: {
      value: state.frameSizeInput,
      spacing: state.gridOptionsInput,
      onSpacingChange: changeSpacing,
      disabled: !sheet || state.isExporting,
      errors: grid?.status === 'invalid' ? grid.errors : {},
      summary: grid?.status === 'valid' ? grid.summary : null,
      onFrameWidthChange: (value) => changeSize('width', value),
      onFrameHeightChange: (value) => changeSize('height', value),
    },
    canvas: {
      sheet,
      frames,
      disabled: !sheet || (!isManual && grid?.status !== 'valid') || state.isExporting,
      viewport: state.viewport,
      isDrawing: state.isDrawing,
      onViewportChange: (viewport) =>
        setState((previous) => (previous.isDrawing ? previous : { ...previous, viewport })),
      mode: state.selectionMode,
      region: state.manualRegion,
      modeDisabled: !sheet || state.isExporting,
      onModeChange: (selectionMode) =>
        setState((previous) =>
          previous.isExporting || previous.isDrawing || selectionMode === previous.selectionMode
            ? previous
            : {
                ...previous,
                selectionMode,
                manualRegion: null,
                isDrawing: false,
                selectedIds: new Set(),
                activeFrameId: null,
              },
        ),
      onRegionChange: (manualRegion) =>
        setState((previous) => (previous.isExporting ? previous : { ...previous, manualRegion })),
      onDrawingChange: (isDrawing) => setState((previous) => ({ ...previous, isDrawing })),
      onSelectAll: () =>
        setState((previous) =>
          previous.isExporting
            ? previous
            : {
                ...previous,
                selectedIds: new Set(geometry.map((frame) => frame.id)),
              },
        ),
      onClearSelection: () =>
        setState((previous) =>
          previous.isExporting
            ? previous
            : {
                ...previous,
                selectedIds: new Set(),
                activeFrameId: null,
              },
        ),
      onFrameClick: (id) =>
        setState((previous) => {
          if (!geometry.some((frame) => frame.id === id) || previous.isExporting) return previous
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
      frames: exportFrames,
      savedFrames: state.savedFrames,
      regionExport: isManual,
      disabled: !sheet || (!isManual && grid?.status !== 'valid') || state.isDrawing,
      onExportingChange: (isExporting) => setState((previous) => ({ ...previous, isExporting })),
    },
  }
}
