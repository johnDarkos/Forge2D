import type { CropRect, LoadedSpriteSheet, GridFrame, SpriteFrameId } from '@/entities/sprite'

export type SelectionMode = 'grid' | 'manual'

/** Только состояние отображения, координаты исходных кадров не меняет. */
export interface CanvasViewport {
  readonly zoom: number
  readonly x: number
  readonly y: number
}

export interface SpriteCanvasProps {
  readonly viewport: CanvasViewport
  readonly onViewportChange: (viewport: CanvasViewport) => void
  readonly isDrawing: boolean
  readonly mode: SelectionMode
  readonly region: CropRect | null
  readonly modeDisabled: boolean
  readonly onModeChange: (mode: SelectionMode) => void
  readonly onRegionChange: (region: CropRect | null) => void
  readonly onDrawingChange: (drawing: boolean) => void
  readonly sheet: LoadedSpriteSheet | null
  readonly frames: readonly GridFrame[]
  readonly disabled?: boolean
  readonly onSelectAll: () => void
  readonly onClearSelection: () => void
  readonly onFrameClick: (id: SpriteFrameId) => void
}

export type SpriteCanvasToolsProps = Pick<
  SpriteCanvasProps,
  | 'sheet'
  | 'frames'
  | 'disabled'
  | 'mode'
  | 'region'
  | 'modeDisabled'
  | 'onModeChange'
  | 'onRegionChange'
  | 'onSelectAll'
  | 'onClearSelection'
  | 'viewport'
  | 'onViewportChange'
  | 'isDrawing'
>
