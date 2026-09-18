import type { SpriteFrameGeometry, SpriteSheetMetadata } from './types'

/** Готовый локальный ресурс. Владелец сессии отвечает за освобождение URL. */
export interface LoadedSpriteSheet {
  readonly file: File | null
  readonly url: string
  readonly image: HTMLImageElement
  readonly metadata: Omit<SpriteSheetMetadata, 'type' | 'size'> & {
    readonly type: SpriteSheetMetadata['type'] | null
    readonly size: number | null
  }
}

export interface SpritePreviewProps {
  readonly region?: boolean
  readonly sheet: LoadedSpriteSheet | null
  readonly frame: SpriteFrameGeometry | null
}
