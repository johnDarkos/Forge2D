import type {
  SpriteEditorDomainState,
  SpriteEditorResult,
  SpriteFrame,
  SpriteGridSettings,
  SpriteRect,
} from '../model/editor-types'
import type { SpriteFrameGeometry } from '../model/types'

const positive = (value: number) => Number.isSafeInteger(value) && value > 0
const nonnegative = (value: number) => Number.isSafeInteger(value) && value >= 0

/** Создаёт проверенный независимый снимок, копируя только разрешённые поля. */
export function createSpriteEditorResult(state: SpriteEditorDomainState): SpriteEditorResult {
  const { source, sprites, settings } = state
  if (!source || !positive(source.width) || !positive(source.height))
    throw new Error('Invalid source dimensions')
  if (!settings || !['grid', 'manual'].includes(settings.mode))
    throw new Error('Invalid editor mode')
  if (!Array.isArray(sprites)) throw new Error('Invalid sprites list')
  const ids = new Set<string>()
  const resultSprites = sprites.map((sprite) => {
    if (!sprite || typeof sprite.id !== 'string' || !sprite.id.trim() || ids.has(sprite.id))
      throw new Error('Sprite IDs must be non-empty and unique')
    if (typeof sprite.name !== 'string') throw new Error('Invalid sprite name')
    ids.add(sprite.id)
    const r = sprite.rect
    if (
      !r ||
      !nonnegative(r.x) ||
      !nonnegative(r.y) ||
      !positive(r.width) ||
      !positive(r.height) ||
      r.width > source.width - r.x ||
      r.height > source.height - r.y
    )
      throw new Error('Sprite rectangle must use whole pixels within source bounds')
    return {
      id: sprite.id,
      name: sprite.name,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    }
  })
  let grid: SpriteGridSettings | undefined
  if (settings.mode === 'grid') {
    const g = settings.grid
    if (
      !g ||
      !positive(g.cellWidth) ||
      !positive(g.cellHeight) ||
      ![g.offsetX, g.offsetY, g.gapX, g.gapY].every(nonnegative) ||
      g.cellWidth > source.width - g.offsetX ||
      g.cellHeight > source.height - g.offsetY
    )
      throw new Error('Invalid grid settings for source')
    grid = {
      cellWidth: g.cellWidth,
      cellHeight: g.cellHeight,
      offsetX: g.offsetX,
      offsetY: g.offsetY,
      gapX: g.gapX,
      gapY: g.gapY,
    }
  }
  return {
    source: { width: source.width, height: source.height },
    sprites: resultSprites,
    settings: { mode: settings.mode, ...(grid ? { grid } : {}) },
  }
}

export function gridFrameToSprite(
  frame: SpriteFrameGeometry,
  id = `grid-${frame.x}-${frame.y}-${frame.width}-${frame.height}`,
): SpriteFrame {
  return manualFrameToSprite(frame, id, `frame_${String(frame.id + 1).padStart(3, '0')}`)
}
export function manualFrameToSprite(rect: SpriteRect, id: string, name: string): SpriteFrame {
  return { id, name, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }
}
export function renameSprite(
  sprites: readonly SpriteFrame[],
  id: string,
  name: string,
): SpriteFrame[] {
  return sprites.map((sprite) => (sprite.id === id ? { ...sprite, name } : sprite))
}
export function removeSprite(sprites: readonly SpriteFrame[], id: string): SpriteFrame[] {
  return sprites.filter((sprite) => sprite.id !== id)
}
