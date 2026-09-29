// @vitest-environment node
import { GameObject, getInspectorFields } from '@forge2d/core'
import { describe, expect, test } from 'vitest'
import {
  RenderValidationError,
  Renderer,
  SpriteRenderer,
  Transform,
  createTextureAsset,
} from './index'
import type { RendererBackend, SpriteRenderCommand, TextureAsset } from './index'

function textureFixture(): TextureAsset {
  return createTextureAsset({
    id: 'texture-player',
    name: 'Player',
    uri: 'assets/player.png',
    width: 64,
    height: 32,
  })
}

function expectRenderError(action: () => unknown, code: RenderValidationError['code']) {
  let thrown: unknown
  try {
    action()
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(RenderValidationError)
  expect(thrown).toMatchObject({ code })
}

class RecordingBackend implements RendererBackend {
  readonly events: string[] = []
  readonly commands: SpriteRenderCommand[] = []
  failOnObjectId: string | undefined

  beginFrame() {
    this.events.push('begin')
  }

  drawSprite(command: SpriteRenderCommand) {
    this.events.push(`draw:${command.gameObjectId}`)
    this.commands.push(command)
    if (command.gameObjectId === this.failOnObjectId) throw new Error('draw failed')
  }

  endFrame() {
    this.events.push('end')
  }
}

function renderable(
  id: string,
  texture: TextureAsset,
  options: { readonly x?: number; readonly y?: number; readonly order?: number } = {},
) {
  const object = new GameObject({ id, name: id })
  object.addComponent(new Transform({ x: options.x, y: options.y }))
  object.addComponent(new SpriteRenderer({ texture, order: options.order }))
  return object
}

describe('TextureAsset', () => {
  test('creates an immutable detached texture descriptor', () => {
    const input = {
      id: 'texture-player',
      name: 'Player',
      uri: 'assets/player.png',
      width: 64,
      height: 32,
    }

    const texture = createTextureAsset(input)

    expect(texture).toEqual(input)
    expect(texture).not.toBe(input)
    expect(Object.isFrozen(texture)).toBe(true)
  })

  test.each([
    ['empty id', { id: '', name: 'Player', uri: 'player.png', width: 1, height: 1 }],
    ['empty name', { id: 'player', name: ' ', uri: 'player.png', width: 1, height: 1 }],
    ['empty URI', { id: 'player', name: 'Player', uri: '', width: 1, height: 1 }],
    ['zero width', { id: 'player', name: 'Player', uri: 'player.png', width: 0, height: 1 }],
    [
      'fractional height',
      { id: 'player', name: 'Player', uri: 'player.png', width: 1, height: 1.5 },
    ],
  ] as const)('rejects %s', (_label, input) => {
    expectRenderError(() => createTextureAsset(input), 'invalid-texture')
  })
})

describe('built-in rendering components', () => {
  test('Transform exposes editable Inspector fields and constructor values', () => {
    const transform = new Transform({ x: 10, y: 20, rotation: 0.5, scaleX: 2, scaleY: 3 })

    expect(getInspectorFields(transform)).toMatchObject([
      { key: 'x', type: 'number', value: 10 },
      { key: 'y', type: 'number', value: 20 },
      { key: 'rotation', type: 'number', value: 0.5 },
      { key: 'scaleX', label: 'Scale X', type: 'number', value: 2 },
      { key: 'scaleY', label: 'Scale Y', type: 'number', value: 3 },
    ])
  })

  test('SpriteRenderer exposes display fields and manages texture regions', () => {
    const texture = textureFixture()
    const sprite = new SpriteRenderer({ opacity: 0.5, visible: false, order: 4 })

    sprite.setTexture(texture, { x: 16, y: 0, width: 16, height: 16 })

    expect(sprite.texture).toEqual(texture)
    expect(sprite.source).toEqual({ x: 16, y: 0, width: 16, height: 16 })
    expect(getInspectorFields(sprite)).toMatchObject([
      { key: 'opacity', value: 0.5, min: 0, max: 1 },
      { key: 'visible', value: false },
      { key: 'order', value: 4 },
    ])

    sprite.setTexture(null)
    expect(sprite.texture).toBeNull()
    expect(sprite.source).toBeNull()
  })

  test.each([
    ['negative origin', { x: -1, y: 0, width: 1, height: 1 }],
    ['zero size', { x: 0, y: 0, width: 0, height: 1 }],
    ['outside texture', { x: 60, y: 0, width: 8, height: 8 }],
    ['fractional coordinate', { x: 0.5, y: 0, width: 1, height: 1 }],
  ] as const)('rejects a %s source region', (_label, source) => {
    const sprite = new SpriteRenderer()
    expectRenderError(() => sprite.setTexture(textureFixture(), source), 'invalid-region')
  })
})

describe('Renderer API', () => {
  test('emits backend-neutral commands ordered by SpriteRenderer order', () => {
    const texture = textureFixture()
    const front = renderable('front', texture, { x: 20, y: 30, order: 10 })
    const back = renderable('back', texture, { x: 5, y: 7, order: -1 })
    const backend = new RecordingBackend()

    const rendered = new Renderer(backend).render([front, back])

    expect(rendered).toBe(2)
    expect(backend.events).toEqual(['begin', 'draw:back', 'draw:front', 'end'])
    expect(backend.commands[0]).toEqual({
      gameObjectId: 'back',
      texture,
      transform: { x: 5, y: 7, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1,
      order: -1,
    })
  })

  test('preserves object order for equal layers and emits immutable cropped commands', () => {
    const texture = textureFixture()
    const first = renderable('first', texture)
    const second = renderable('second', texture)
    second.getComponent(SpriteRenderer)?.setTexture(texture, {
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    })
    const backend = new RecordingBackend()

    new Renderer(backend).render([first, second])

    expect(backend.commands.map(({ gameObjectId }) => gameObjectId)).toEqual(['first', 'second'])
    expect(backend.commands[1]?.source).toEqual({ x: 0, y: 0, width: 16, height: 16 })
    expect(backend.commands.every(Object.isFrozen)).toBe(true)
    expect(backend.commands.every(({ transform }) => Object.isFrozen(transform))).toBe(true)
    expect(Object.isFrozen(backend.commands[1]?.source)).toBe(true)
  })

  test('skips destroyed, invisible and incomplete objects', () => {
    const texture = textureFixture()
    const destroyed = renderable('destroyed', texture)
    destroyed.destroy()
    const invisible = renderable('invisible', texture)
    const invisibleSprite = invisible.getComponent(SpriteRenderer)
    if (invisibleSprite) invisibleSprite.visible = false
    const withoutTexture = new GameObject({ id: 'without-texture', name: 'without-texture' })
    withoutTexture.addComponent(new Transform())
    withoutTexture.addComponent(new SpriteRenderer())
    const withoutTransform = new GameObject({ id: 'without-transform', name: 'without-transform' })
    withoutTransform.addComponent(new SpriteRenderer({ texture }))
    const backend = new RecordingBackend()

    const rendered = new Renderer(backend).render([
      destroyed,
      invisible,
      withoutTexture,
      withoutTransform,
    ])

    expect(rendered).toBe(0)
    expect(backend.events).toEqual(['begin', 'end'])
  })

  test.each([
    [
      'invalid transform',
      (object: GameObject) => {
        object.getComponent(Transform)!.x = Number.NaN
      },
      'invalid-transform',
    ],
    [
      'invalid opacity',
      (object: GameObject) => {
        object.getComponent(SpriteRenderer)!.opacity = 2
      },
      'invalid-sprite',
    ],
    [
      'invalid order',
      (object: GameObject) => {
        object.getComponent(SpriteRenderer)!.order = Number.NaN
      },
      'invalid-sprite',
    ],
  ] as const)('rejects %s before beginning a frame', (_label, mutate, code) => {
    const object = renderable('player', textureFixture())
    mutate(object)
    const backend = new RecordingBackend()

    expectRenderError(() => new Renderer(backend).render([object]), code)
    expect(backend.events).toEqual([])
  })

  test('ends a frame when a backend draw fails', () => {
    const backend = new RecordingBackend()
    backend.failOnObjectId = 'player'
    const renderer = new Renderer(backend)

    expect(() => renderer.render([renderable('player', textureFixture())])).toThrow(/draw failed/)
    expect(backend.events).toEqual(['begin', 'draw:player', 'end'])
  })

  test('has no browser dependency in its public execution path', () => {
    expect(typeof document).toBe('undefined')
    const backend = new RecordingBackend()
    expect(new Renderer(backend).render([])).toBe(0)
  })
})
