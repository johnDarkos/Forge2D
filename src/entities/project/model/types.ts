export const PROJECT_SCHEMA_VERSION = 1 as const
export const ASSET_SCHEMA_VERSION = 1 as const

export type AssetId = string
export type AssetType = 'texture' | 'sprite'

export interface AssetBase {
  readonly id: AssetId
  readonly type: AssetType
  readonly name: string
  readonly schemaVersion: typeof ASSET_SCHEMA_VERSION
}

export interface TextureAsset extends AssetBase {
  readonly type: 'texture'
  readonly uri: string
  readonly width: number
  readonly height: number
}

export interface AssetRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface AssetSpriteFrame {
  readonly id: string
  readonly name: string
  readonly rect: AssetRect
}

export interface AssetSpriteGridSettings {
  readonly cellWidth: number
  readonly cellHeight: number
  readonly offsetX: number
  readonly offsetY: number
  readonly gapX: number
  readonly gapY: number
}

export type AssetSpriteSettings =
  { readonly mode: 'manual' } | { readonly mode: 'grid'; readonly grid: AssetSpriteGridSettings }

export interface SpriteAsset extends AssetBase {
  readonly type: 'sprite'
  readonly textureId: AssetId
  readonly sprites: readonly AssetSpriteFrame[]
  readonly settings: AssetSpriteSettings
}

export type Asset = TextureAsset | SpriteAsset

export interface Project {
  readonly name: string
  readonly schemaVersion: typeof PROJECT_SCHEMA_VERSION
  readonly assets: readonly Asset[]
}

export type TextureAssetInput = Omit<TextureAsset, 'type' | 'schemaVersion'>
export type SpriteAssetInput = Omit<SpriteAsset, 'type' | 'schemaVersion'>
export interface ProjectInput {
  readonly name: string
  readonly assets?: readonly Asset[]
}
