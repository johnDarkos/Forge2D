import type {
  CropRect,
  FrameSizeInput,
  GridOptionsInput,
  LoadedSpriteSheet,
  SpriteFrame,
  SpriteEditorImage,
  SpriteEditorInitialData,
  SpriteEditorResult,
  SpriteFrameId,
} from '@/entities/sprite'
import type { ManualFramesProps } from '@/features/manage-manual-frames'
import type { GridSettingsProps } from '@/features/configure-grid'
import type { ExportButtonProps } from '@/features/export-sprites'
import type { CanvasViewport, SelectionMode, SpriteCanvasProps } from '@/features/select-sprite'
import type { SpriteUploaderProps, UploadError } from '@/features/upload-sprite-sheet'
import type { SpritePreviewProps } from '@/entities/sprite'

/** Взаимоисключающие состояния исключают ready без загруженного ресурса. */
export type ImageLoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly file: File | null; readonly requestId: number }
  | { readonly status: 'ready'; readonly sheet: LoadedSpriteSheet }
  | { readonly status: 'error'; readonly error: UploadError }

/** Только исходные данные: кадры, счётчики и activeFrame вычисляются отдельно. */
export interface EditorState {
  readonly viewport: CanvasViewport
  readonly selectionMode: SelectionMode
  readonly manualRegion: CropRect | null
  readonly sprites: readonly SpriteFrame[]
  readonly displayNumbers: ReadonlyMap<string, number>
  readonly nextDisplayNumber: number
  readonly isDrawing: boolean
  readonly source: ImageLoadState
  readonly frameSizeInput: FrameSizeInput
  readonly gridOptionsInput: GridOptionsInput
  readonly selectedIds: ReadonlySet<SpriteFrameId>
  readonly activeFrameId: SpriteFrameId | null
  readonly isExporting: boolean
}

export interface SpriteEditorProps {
  readonly image?: SpriteEditorImage
  readonly initialData?: SpriteEditorInitialData
  readonly onSave?: (result: SpriteEditorResult) => void
  readonly onCancel?: () => void
  readonly initialFrameSize?: FrameSizeInput
}

/** Контракт представления; контейнер подготовит данные и обработчики из сессии. */
export interface SpriteEditorViewProps {
  readonly actions: {
    readonly showSave: boolean
    readonly showCancel: boolean
    readonly saveDisabled: boolean
    readonly cancelDisabled: boolean
    readonly saving: boolean
    readonly error: string | null
    readonly hint: string | null
    readonly onSave: () => void
    readonly onCancel: () => void
  }
  readonly manualFrames: ManualFramesProps
  readonly uploader: SpriteUploaderProps
  readonly settings: GridSettingsProps
  readonly canvas: SpriteCanvasProps
  readonly preview: SpritePreviewProps
  readonly exportButton: ExportButtonProps
}
