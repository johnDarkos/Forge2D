import { Component, field } from '@forge2d/core'
import { RenderValidationError } from './RenderValidationError'
import { createTextureAsset, createTextureRegion } from './assets'
import type { TextureAsset, TextureRegion } from './assets'

export interface TransformOptions {
  readonly x?: number | undefined
  readonly y?: number | undefined
  readonly rotation?: number | undefined
  readonly scaleX?: number | undefined
  readonly scaleY?: number | undefined
}

export class Transform extends Component {
  @field()
  x: number

  @field()
  y: number

  @field()
  rotation: number

  @field()
  scaleX: number

  @field()
  scaleY: number

  constructor(options: TransformOptions = {}) {
    super()
    this.x = options.x ?? 0
    this.y = options.y ?? 0
    this.rotation = options.rotation ?? 0
    this.scaleX = options.scaleX ?? 1
    this.scaleY = options.scaleY ?? 1
    assertTransform(this)
  }
}

export interface SpriteRendererOptions {
  readonly texture?: TextureAsset | null | undefined
  readonly source?: TextureRegion | null | undefined
  readonly opacity?: number | undefined
  readonly visible?: boolean | undefined
  readonly order?: number | undefined
}

export class SpriteRenderer extends Component {
  @field({ min: 0, max: 1, step: 0.05 })
  opacity: number

  @field()
  visible: boolean

  @field()
  order: number

  #texture: TextureAsset | null = null
  #source: TextureRegion | null = null

  constructor(options: SpriteRendererOptions = {}) {
    super()
    this.opacity = options.opacity ?? 1
    this.visible = options.visible ?? true
    this.order = options.order ?? 0
    assertSprite(this)
    this.setTexture(options.texture ?? null, options.source ?? null)
  }

  get texture() {
    return this.#texture
  }

  get source() {
    return this.#source
  }

  setTexture(texture: TextureAsset | null, source: TextureRegion | null = null) {
    if (!texture) {
      if (source)
        throw new RenderValidationError('invalid-region', 'A source region requires a texture')
      this.#texture = null
      this.#source = null
      return
    }

    const normalized = createTextureAsset(texture)
    this.#texture = normalized
    this.#source = source ? createTextureRegion(source, normalized) : null
  }
}

function finite(value: number) {
  return Number.isFinite(value)
}

export function assertTransform(transform: Transform) {
  if (
    !finite(transform.x) ||
    !finite(transform.y) ||
    !finite(transform.rotation) ||
    !finite(transform.scaleX) ||
    !finite(transform.scaleY)
  )
    throw new RenderValidationError('invalid-transform', 'Transform values must be finite numbers')
}

export function assertSprite(sprite: SpriteRenderer) {
  if (!finite(sprite.opacity) || sprite.opacity < 0 || sprite.opacity > 1)
    throw new RenderValidationError('invalid-sprite', 'Sprite opacity must be between 0 and 1')
  if (typeof sprite.visible !== 'boolean')
    throw new RenderValidationError('invalid-sprite', 'Sprite visibility must be a boolean')
  if (!finite(sprite.order))
    throw new RenderValidationError('invalid-sprite', 'Sprite order must be a finite number')
}
