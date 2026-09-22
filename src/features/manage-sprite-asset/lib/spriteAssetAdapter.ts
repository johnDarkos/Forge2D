import {
  ASSET_SCHEMA_VERSION,
  createSpriteAsset,
  createTextureAsset,
} from '@/entities/project/domain'
import type {
  AssetSpriteFrame,
  AssetSpriteSettings,
  SpriteAsset,
  TextureAsset,
} from '@/entities/project/domain'
import { createSpriteEditorResult } from '@/entities/sprite/domain'
import type {
  SpriteEditorImage,
  SpriteEditorInitialData,
  SpriteEditorResult,
} from '@/entities/sprite/domain'

export interface SpriteEditorResultToAssetInput {
  readonly id: string
  readonly name: string
  readonly texture: TextureAsset
  readonly result: SpriteEditorResult
}

export interface SpriteAssetToEditorInput {
  readonly asset: SpriteAsset
  readonly texture: TextureAsset
}

export interface SpriteEditorAssetInput {
  readonly image: SpriteEditorImage
  readonly initialData: SpriteEditorInitialData
}

function normalizeTexture(texture: TextureAsset): TextureAsset {
  if (texture.schemaVersion !== ASSET_SCHEMA_VERSION)
    throw new Error(`Unsupported asset schema version: ${String(texture.schemaVersion)}`)
  return createTextureAsset(texture)
}

function mapSprites(sprites: SpriteEditorResult['sprites']): AssetSpriteFrame[] {
  return sprites.map(({ id, name, rect }) => ({
    id,
    name,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  }))
}

function mapSettings(settings: SpriteEditorResult['settings']): AssetSpriteSettings {
  if (settings.mode === 'manual') return { mode: 'manual' }
  const grid = settings.grid!
  return {
    mode: 'grid',
    grid: {
      cellWidth: grid.cellWidth,
      cellHeight: grid.cellHeight,
      offsetX: grid.offsetX,
      offsetY: grid.offsetY,
      gapX: grid.gapX,
      gapY: grid.gapY,
    },
  }
}

export function spriteEditorResultToSpriteAsset({
  id,
  name,
  texture,
  result,
}: SpriteEditorResultToAssetInput): SpriteAsset {
  const normalizedTexture = normalizeTexture(texture)
  const normalizedResult = createSpriteEditorResult(result)
  if (
    normalizedResult.source.width !== normalizedTexture.width ||
    normalizedResult.source.height !== normalizedTexture.height
  )
    throw new Error('Sprite editor source dimensions do not match texture asset')
  return createSpriteAsset(
    {
      id,
      name,
      textureId: normalizedTexture.id,
      sprites: mapSprites(normalizedResult.sprites),
      settings: mapSettings(normalizedResult.settings),
    },
    normalizedTexture,
  )
}

export function spriteAssetToEditorInput({
  asset,
  texture,
}: SpriteAssetToEditorInput): SpriteEditorAssetInput {
  if (asset.schemaVersion !== ASSET_SCHEMA_VERSION)
    throw new Error(`Unsupported asset schema version: ${String(asset.schemaVersion)}`)
  const normalizedTexture = normalizeTexture(texture)
  const normalizedAsset = createSpriteAsset(
    {
      id: asset.id,
      name: asset.name,
      textureId: asset.textureId,
      sprites: asset.sprites,
      settings: asset.settings,
    },
    normalizedTexture,
  )
  const result = createSpriteEditorResult({
    source: { width: normalizedTexture.width, height: normalizedTexture.height },
    sprites: normalizedAsset.sprites,
    settings: normalizedAsset.settings,
  })
  const settings: SpriteEditorInitialData['settings'] =
    normalizedAsset.settings.mode === 'grid'
      ? {
          mode: 'grid',
          grid: {
            cellWidth: normalizedAsset.settings.grid.cellWidth,
            cellHeight: normalizedAsset.settings.grid.cellHeight,
            offsetX: normalizedAsset.settings.grid.offsetX,
            offsetY: normalizedAsset.settings.grid.offsetY,
            gapX: normalizedAsset.settings.grid.gapX,
            gapY: normalizedAsset.settings.grid.gapY,
          },
        }
      : { mode: 'manual' }
  return {
    image: { src: normalizedTexture.uri, name: normalizedTexture.name },
    initialData: {
      sprites: result.sprites,
      settings,
    },
  }
}
