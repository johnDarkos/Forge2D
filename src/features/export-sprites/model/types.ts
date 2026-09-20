import type {
  LoadedSpriteSheet,
  NamedSpriteFrame,
  SpriteFrameGeometry,
  SpriteRect,
} from '@/entities/sprite'

/** Именованные ручные вырезки и обычные кадры сетки используют один экспортёр. */
export interface ExportFrameItem extends SpriteFrameGeometry {
  readonly name?: string
}

export interface ExportError {
  readonly code: 'context-unavailable' | 'encoding-failed' | 'download-failed'
  readonly message: string
}

/** Feature экспорта владеет своим состоянием выполнения. */
export type ExportState =
  | { readonly status: 'idle' }
  | { readonly status: 'exporting' }
  | { readonly status: 'error'; readonly error: ExportError }

export interface ExportButtonProps {
  readonly savedFrames?: readonly NamedSpriteFrame[]
  readonly region?: SpriteRect | null
  readonly regionExport?: boolean
  readonly sheet: LoadedSpriteSheet | null
  readonly frames: readonly SpriteFrameGeometry[]
  readonly disabled?: boolean
  readonly onExportingChange: (exporting: boolean) => void
}

/** Нарезка одного кадра без скачивания; ошибка отклоняет Promise. */
export type ExportFrame = (image: HTMLImageElement, frame: SpriteRect) => Promise<Blob>
