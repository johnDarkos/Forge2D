import {
  ASSET_SCHEMA_VERSION,
  PROJECT_SCHEMA_VERSION,
  type Asset,
  type AssetBase,
  type AssetId,
  type AssetRect,
  type AssetSpriteFrame,
  type AssetSpriteGridSettings,
  type AssetSpriteSettings,
  type Project,
  type ProjectInput,
  type SpriteAsset,
  type SpriteAssetInput,
  type TextureAsset,
  type TextureAssetInput,
} from '../model/types'

const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0
const nonnegativeInteger = (value: number) => Number.isSafeInteger(value) && value >= 0

function requireText(value: string, field: 'ID' | 'name') {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Asset ${field} must not be empty`)
}

function requireAssetBase(asset: AssetBase) {
  requireText(asset.id, 'ID')
  requireText(asset.name, 'name')
  if (asset.schemaVersion !== ASSET_SCHEMA_VERSION)
    throw new Error(`Unsupported asset schema version: ${String(asset.schemaVersion)}`)
}

/**
 * Нормализует URI так же, как URL-парсер браузера (WHATWG): удаляет tab/LF/CR в любом месте
 * и ведущие C0-символы с пробелом. Без этого `' blob:…'` прошёл бы как относительный путь.
 */
function uriScheme(uri: string) {
  const isEdge = (char: string) => char.charCodeAt(0) <= 0x20
  const chars = [...uri].filter((char) => char !== '\t' && char !== '\n' && char !== '\r')
  while (chars.length && isEdge(chars[0])) chars.shift()
  return /^([a-z][a-z\d+.-]*):/i.exec(chars.join(''))?.[1]?.toLowerCase()
}

function requirePersistentUri(uri: string) {
  if (typeof uri !== 'string' || !uri.trim()) throw new Error('Texture URI must be persistent')
  const scheme = uriScheme(uri)
  if (scheme === 'blob') throw new Error('Texture URI must be persistent')
  if (scheme && !['http', 'https', 'data'].includes(scheme))
    throw new Error(`Unsupported texture URI scheme: ${scheme}`)
}

function cloneTexture(asset: TextureAsset): TextureAsset {
  requireAssetBase(asset)
  if (asset.type !== 'texture') throw new Error('Expected a texture asset')
  requirePersistentUri(asset.uri)
  if (!positiveInteger(asset.width) || !positiveInteger(asset.height))
    throw new Error('Texture dimensions must be positive integers')
  return {
    id: asset.id,
    type: 'texture',
    name: asset.name,
    schemaVersion: ASSET_SCHEMA_VERSION,
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  }
}

function cloneRect(rect: AssetRect, texture: TextureAsset): AssetRect {
  if (
    !rect ||
    !nonnegativeInteger(rect.x) ||
    !nonnegativeInteger(rect.y) ||
    !positiveInteger(rect.width) ||
    !positiveInteger(rect.height) ||
    rect.width > texture.width - rect.x ||
    rect.height > texture.height - rect.y
  )
    throw new Error('Sprite rectangle must use whole pixels within texture bounds')
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

function cloneSprites(
  sprites: readonly AssetSpriteFrame[],
  texture: TextureAsset,
): AssetSpriteFrame[] {
  if (!Array.isArray(sprites)) throw new Error('Invalid sprites list')
  const ids = new Set<string>()
  return sprites.map((sprite) => {
    if (!sprite || typeof sprite.id !== 'string' || !sprite.id.trim() || ids.has(sprite.id))
      throw new Error('Frame IDs must be non-empty and unique')
    if (typeof sprite.name !== 'string') throw new Error('Invalid frame name')
    ids.add(sprite.id)
    return { id: sprite.id, name: sprite.name, rect: cloneRect(sprite.rect, texture) }
  })
}

function cloneGrid(grid: AssetSpriteGridSettings, texture: TextureAsset): AssetSpriteGridSettings {
  if (
    !grid ||
    !positiveInteger(grid.cellWidth) ||
    !positiveInteger(grid.cellHeight) ||
    ![grid.offsetX, grid.offsetY, grid.gapX, grid.gapY].every(nonnegativeInteger) ||
    grid.cellWidth > texture.width - grid.offsetX ||
    grid.cellHeight > texture.height - grid.offsetY
  )
    throw new Error('Invalid sprite grid settings for texture')
  return {
    cellWidth: grid.cellWidth,
    cellHeight: grid.cellHeight,
    offsetX: grid.offsetX,
    offsetY: grid.offsetY,
    gapX: grid.gapX,
    gapY: grid.gapY,
  }
}

function cloneSettings(settings: AssetSpriteSettings, texture: TextureAsset): AssetSpriteSettings {
  if (!settings || !['grid', 'manual'].includes(settings.mode))
    throw new Error('Invalid sprite editor mode')
  if (settings.mode === 'manual') return { mode: 'manual' }
  return { mode: 'grid', grid: cloneGrid(settings.grid, texture) }
}

function cloneSprite(asset: SpriteAsset, texture: TextureAsset): SpriteAsset {
  requireAssetBase(asset)
  if (asset.type !== 'sprite') throw new Error('Expected a sprite asset')
  requireText(asset.textureId, 'ID')
  if (asset.textureId !== texture.id)
    throw new Error(`Sprite asset references missing texture: ${asset.textureId}`)
  return {
    id: asset.id,
    type: 'sprite',
    name: asset.name,
    schemaVersion: ASSET_SCHEMA_VERSION,
    textureId: asset.textureId,
    sprites: cloneSprites(asset.sprites, texture),
    settings: cloneSettings(asset.settings, texture),
  }
}

export function createTextureAsset(input: TextureAssetInput): TextureAsset {
  return cloneTexture({ ...input, type: 'texture', schemaVersion: ASSET_SCHEMA_VERSION })
}

export function createSpriteAsset(input: SpriteAssetInput, texture: TextureAsset): SpriteAsset {
  return cloneSprite(
    { ...input, type: 'sprite', schemaVersion: ASSET_SCHEMA_VERSION },
    cloneTexture(texture),
  )
}

export function createProject(input: ProjectInput): Project {
  if (typeof input.name !== 'string' || !input.name.trim())
    throw new Error('Project name must not be empty')
  const assets = input.assets ?? []
  if (!Array.isArray(assets)) throw new Error('Project assets must be an array')
  const ids = new Set<AssetId>()
  for (const asset of assets) {
    requireAssetBase(asset)
    if (ids.has(asset.id)) throw new Error('Asset IDs must be unique within a project')
    ids.add(asset.id)
    if (!['texture', 'sprite'].includes(asset.type)) throw new Error('Unsupported asset type')
  }

  const textures = new Map<AssetId, TextureAsset>()
  for (const asset of assets)
    if (asset.type === 'texture') textures.set(asset.id, cloneTexture(asset))
  const normalized = assets.map((asset): Asset => {
    if (asset.type === 'texture') return textures.get(asset.id)!
    const texture = textures.get(asset.textureId)
    if (!texture) throw new Error(`Sprite asset references missing texture: ${asset.textureId}`)
    return cloneSprite(asset, texture)
  })
  return { name: input.name, schemaVersion: PROJECT_SCHEMA_VERSION, assets: normalized }
}

function normalizeProject(project: Project): Project {
  if (project.schemaVersion !== PROJECT_SCHEMA_VERSION)
    throw new Error(`Unsupported project schema version: ${String(project.schemaVersion)}`)
  return createProject({ name: project.name, assets: project.assets })
}

export function upsertProjectAsset(project: Project, asset: Asset): Project {
  const current = normalizeProject(project)
  const index = current.assets.findIndex(({ id }) => id === asset.id)
  const assets = [...current.assets]
  if (index < 0) assets.push(asset)
  else assets[index] = asset
  return createProject({ name: current.name, assets })
}

export function removeProjectAsset(project: Project, id: AssetId): Project {
  const current = normalizeProject(project)
  const asset = current.assets.find((candidate) => candidate.id === id)
  if (!asset) return project
  if (
    asset.type === 'texture' &&
    current.assets.some((candidate) => candidate.type === 'sprite' && candidate.textureId === id)
  )
    throw new Error('Cannot remove a referenced texture asset')
  return createProject({
    name: current.name,
    assets: current.assets.filter((candidate) => candidate.id !== id),
  })
}

export function findTextureAsset(project: Project, id: AssetId): TextureAsset | undefined {
  const asset = project.assets.find((candidate) => candidate.id === id)
  return asset?.type === 'texture' ? asset : undefined
}

export function findSpriteAsset(project: Project, id: AssetId): SpriteAsset | undefined {
  const asset = project.assets.find((candidate) => candidate.id === id)
  return asset?.type === 'sprite' ? asset : undefined
}
