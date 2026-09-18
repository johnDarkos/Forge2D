/** ID кадра в порядке строк, начиная с нуля. */
export type SpriteFrameId = number

/** Геометрия полного кадра в исходных пикселях; не зависит от масштаба Canvas. */
export interface SpriteFrameGeometry {
  readonly id: SpriteFrameId
  readonly row: number
  readonly column: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** selected вычисляется из набора выбранных ID в сессии. */
export interface GridFrame extends SpriteFrameGeometry {
  selected: boolean
}

/** Сохранённая ручная вырезка; ID стабилен при удалении соседних кадров. */
export interface NamedSpriteFrame extends SpriteFrameGeometry {
  readonly name: string
}

export type SupportedImageType = 'image/png' | 'image/jpeg' | 'image/webp'

export interface SpriteSheetMetadata {
  readonly name: string
  readonly type: SupportedImageType
  readonly size: number
  readonly width: number
  readonly height: number
}

/** Валидность целых положительных значений проверяется во время выполнения. */
export interface FrameSize {
  readonly width: number
  readonly height: number
}

/** Строки сохраняют пустой и промежуточный ввод пользователя. */
export interface FrameSizeInput {
  readonly width: string
  readonly height: string
}

export interface GridSummary {
  readonly columns: number
  readonly rows: number
  readonly frameCount: number
}

export interface GridOptions {
  readonly offsetX: number
  readonly offsetY: number
  readonly gapX: number
  readonly gapY: number
}

export type GridOptionsInput = { readonly [Key in keyof GridOptions]: string }

export interface FrameSizeErrors {
  readonly offsetX?: string
  readonly offsetY?: string
  readonly gapX?: string
  readonly gapY?: string
  readonly width?: string
  readonly height?: string
  readonly grid?: string
}

export type GridValidation =
  | { readonly status: 'invalid'; readonly errors: FrameSizeErrors }
  | { readonly status: 'valid'; readonly size: FrameSize; readonly summary: GridSummary }

export type GenerateFrames = (
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  options?: GridOptions,
) => GridFrame[]

/** Сериализуемое описание исходника, без файла и URL браузера. */
export interface SpriteEditorSource {
  readonly fileName: string
  readonly width: number
  readonly height: number
}
