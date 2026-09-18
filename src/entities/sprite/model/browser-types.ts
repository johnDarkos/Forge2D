import type { SpriteFrameGeometry, SpriteSheetMetadata } from './types'

/** Готовый локальный ресурс. Владелец сессии отвечает за освобождение URL. */
export interface LoadedSpriteSheet {
  readonly file: File
  readonly url: string
  readonly image: HTMLImageElement
  readonly metadata: SpriteSheetMetadata
}

export interface SpritePreviewProps {
  readonly region?: boolean
  readonly sheet: LoadedSpriteSheet | null
  readonly frame: SpriteFrameGeometry | null
}
