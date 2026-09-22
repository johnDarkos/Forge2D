/** Публичный Forge2D Project domain без React, DOM и Sprite Editor. */
export { ASSET_SCHEMA_VERSION, PROJECT_SCHEMA_VERSION } from './model/types'
export type {
  AssetId,
  AssetType,
  AssetBase,
  AssetRect,
  AssetSpriteFrame,
  AssetSpriteGridSettings,
  AssetSpriteSettings,
  TextureAsset,
  SpriteAsset,
  Asset,
  Project,
  TextureAssetInput,
  SpriteAssetInput,
  ProjectInput,
} from './model/types'
export {
  createTextureAsset,
  createSpriteAsset,
  createProject,
  upsertProjectAsset,
  removeProjectAsset,
  findTextureAsset,
  findSpriteAsset,
} from './lib/project'
