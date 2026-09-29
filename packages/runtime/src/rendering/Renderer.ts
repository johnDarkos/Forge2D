import type { GameObject } from '@forge2d/core'
import { SpriteRenderer, Transform, assertSprite, assertTransform } from './components'
import type { TextureAsset, TextureRegion } from './assets'

export interface RenderTransform {
  readonly x: number
  readonly y: number
  readonly rotation: number
  readonly scaleX: number
  readonly scaleY: number
}

export interface SpriteRenderCommand {
  readonly gameObjectId: string
  readonly texture: TextureAsset
  readonly transform: RenderTransform
  readonly source?: TextureRegion
  readonly opacity: number
  readonly order: number
}

export interface RendererBackend {
  beginFrame(): void
  drawSprite(command: SpriteRenderCommand): void
  endFrame(): void
}

interface OrderedCommand {
  readonly inputOrder: number
  readonly command: SpriteRenderCommand
}

function commandFor(object: GameObject, inputOrder: number): OrderedCommand | undefined {
  const transform = object.getComponent(Transform)
  const sprite = object.getComponent(SpriteRenderer)
  if (!transform || !sprite || !sprite.visible || !sprite.texture) return undefined

  assertTransform(transform)
  assertSprite(sprite)
  const renderTransform = Object.freeze({
    x: transform.x,
    y: transform.y,
    rotation: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  })
  const command = Object.freeze({
    gameObjectId: object.id,
    texture: sprite.texture,
    transform: renderTransform,
    ...(sprite.source ? { source: sprite.source } : {}),
    opacity: sprite.opacity,
    order: sprite.order,
  })
  return { inputOrder, command }
}

/** Преобразует GameObject-компоненты в команды независимого backend API. */
export class Renderer {
  readonly #backend: RendererBackend

  constructor(backend: RendererBackend) {
    this.#backend = backend
  }

  render(objects: readonly GameObject[]) {
    const commands = objects
      .map(commandFor)
      .filter((entry): entry is OrderedCommand => entry !== undefined)
      .sort(
        (left, right) =>
          left.command.order - right.command.order || left.inputOrder - right.inputOrder,
      )

    this.#backend.beginFrame()
    try {
      for (const { command } of commands) this.#backend.drawSprite(command)
    } finally {
      this.#backend.endFrame()
    }
    return commands.length
  }
}
