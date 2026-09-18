/** Публичные данные FEAT-001; никаких ресурсов браузера или UI selection. */
export interface SpriteRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}
export interface SpriteFrame {
  readonly id: string
  readonly name: string
  readonly rect: SpriteRect
}
export interface SpriteSource {
  readonly width: number
  readonly height: number
}
export type SpriteEditorMode = 'grid' | 'manual'
export interface SpriteGridSettings {
  readonly cellWidth: number
  readonly cellHeight: number
  readonly offsetX: number
  readonly offsetY: number
  readonly gapX: number
  readonly gapY: number
}
export interface SpriteEditorSettings {
  readonly mode: SpriteEditorMode
  readonly grid?: SpriteGridSettings
}
export interface SpriteEditorResult {
  readonly source: SpriteSource
  readonly sprites: readonly SpriteFrame[]
  readonly settings: SpriteEditorSettings
}
export interface SpriteEditorDomainState {
  readonly source: SpriteSource
  readonly sprites: readonly SpriteFrame[]
  readonly settings: SpriteEditorSettings
}
export interface SpriteEditorImage {
  readonly src: string
  readonly name?: string
}
export interface SpriteEditorInitialData {
  readonly sprites?: readonly SpriteFrame[]
  readonly settings?: {
    readonly mode?: SpriteEditorMode
    readonly grid?: SpriteGridSettings
  }
}
