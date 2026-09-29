// @vitest-environment node
import { describe, expect, test } from 'vitest'
import {
  SCENE_SCHEMA_VERSION,
  SceneValidationError,
  addGameObject,
  createScene,
  findGameObject,
  parseScene,
  removeGameObject,
  serializeScene,
  updateGameObject,
} from './index'
import type { SceneDocument } from './index'

function sceneFixture(): SceneDocument {
  return {
    version: SCENE_SCHEMA_VERSION,
    id: 'scene-main',
    name: 'Main',
    objects: [
      {
        id: 'player',
        name: 'Player',
        components: [
          {
            id: 'player-transform',
            type: 'Transform',
            properties: {
              x: 100,
              y: 200,
              visible: true,
              tags: ['controllable', 'hero'],
              origin: { x: 0.5, y: 1 },
            },
          },
        ],
      },
      {
        id: 'weapon',
        name: 'Weapon',
        parentId: 'player',
        components: [],
      },
      {
        id: 'muzzle',
        name: 'Muzzle',
        parentId: 'weapon',
        components: [],
      },
    ],
  }
}

function expectSceneError(
  action: () => unknown,
  code: SceneValidationError['code'],
  path?: string,
) {
  let thrown: unknown
  try {
    action()
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(SceneValidationError)
  expect(thrown).toMatchObject({ code, ...(path ? { path } : {}) })
}

describe('Scene Model v1', () => {
  test('creates a detached normalized scene without mutating caller data', () => {
    const input = sceneFixture()
    const scene = createScene(input)

    expect(scene).toEqual(input)
    expect(scene).not.toBe(input)
    expect(scene.objects).not.toBe(input.objects)
    expect(scene.objects[0]).not.toBe(input.objects[0])
    expect(scene.objects[0].components[0]).not.toBe(input.objects[0].components[0])
    expect(scene.objects[0].components[0].properties).not.toBe(
      input.objects[0].components[0].properties,
    )
  })

  test('round-trips a scene through JSON and validates parsed data', () => {
    const scene = createScene(sceneFixture())
    const json = serializeScene(scene)
    const parsed = parseScene(json)

    expect(JSON.parse(json)).toEqual(scene)
    expect(parsed).toEqual(scene)
    expect(parsed).not.toBe(scene)
  })

  test('reports malformed JSON as a domain validation error', () => {
    expectSceneError(() => parseScene('{broken'), 'invalid-json', '$')
  })

  test.each([
    ['version', { ...sceneFixture(), version: 2 }, 'unsupported-version', '$.version'],
    ['scene ID', { ...sceneFixture(), id: '  ' }, 'invalid-id', '$.id'],
    ['scene name', { ...sceneFixture(), name: '' }, 'invalid-name', '$.name'],
    ['objects', { ...sceneFixture(), objects: null }, 'invalid-scene', '$.objects'],
  ] as const)('rejects an invalid %s', (_label, input, code, path) => {
    expectSceneError(() => createScene(input), code, path)
  })

  test('requires unique GameObject IDs', () => {
    const input = sceneFixture()
    expectSceneError(
      () => createScene({ ...input, objects: [...input.objects, { ...input.objects[0] }] }),
      'duplicate-object-id',
      '$.objects[3].id',
    )
  })

  test.each([
    [
      'missing parent',
      () => ({ ...sceneFixture().objects[1], parentId: 'missing' }),
      'missing-parent',
    ],
    ['itself as parent', () => ({ ...sceneFixture().objects[1], parentId: 'weapon' }), 'cycle'],
  ] as const)('rejects %s', (_label, replace, code) => {
    const input = sceneFixture()
    expectSceneError(
      () => createScene({ ...input, objects: [input.objects[0], replace(), input.objects[2]] }),
      code,
    )
  })

  test('rejects longer hierarchy cycles', () => {
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [
            { ...input.objects[0], parentId: 'muzzle' },
            input.objects[1],
            input.objects[2],
          ],
        }),
      'cycle',
    )
  })

  test.each([
    ['non-array components', null, 'invalid-component'],
    ['empty component ID', [{ id: '', type: 'Transform', properties: {} }], 'invalid-id'],
    ['empty component type', [{ id: 'transform', type: ' ', properties: {} }], 'invalid-component'],
    [
      'duplicate component ID',
      [
        { id: 'transform', type: 'Transform', properties: {} },
        { id: 'transform', type: 'Transform', properties: {} },
      ],
      'duplicate-component-id',
    ],
  ] as const)('rejects %s', (_label, components, code) => {
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [{ ...input.objects[0], components }, ...input.objects.slice(1)],
        }),
      code,
    )
  })

  test.each([
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['function', () => undefined],
    ['Date', new Date('2026-01-01')],
  ])('rejects non-JSON component property: %s', (_label, value) => {
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [
            {
              ...input.objects[0],
              components: [
                {
                  id: 'invalid',
                  type: 'Invalid',
                  properties: { value },
                },
              ],
            },
            ...input.objects.slice(1),
          ],
        }),
      'invalid-property',
    )
  })

  test('requires component properties to be an object', () => {
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [
            {
              ...input.objects[0],
              components: [{ id: 'invalid', type: 'Invalid', properties: [] }],
            },
            ...input.objects.slice(1),
          ],
        }),
      'invalid-property',
      '$.objects[0].components[0].properties',
    )
  })

  test('rejects circular component properties', () => {
    const properties: Record<string, unknown> = {}
    properties.self = properties
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [
            {
              ...input.objects[0],
              components: [{ id: 'invalid', type: 'Invalid', properties }],
            },
            ...input.objects.slice(1),
          ],
        }),
      'invalid-property',
    )
  })

  test('rejects symbol keys that JSON would silently discard', () => {
    const properties = { value: 'visible', [Symbol('hidden')]: 'secret' }
    const input = sceneFixture()
    expectSceneError(
      () =>
        createScene({
          ...input,
          objects: [
            {
              ...input.objects[0],
              components: [{ id: 'invalid', type: 'Invalid', properties }],
            },
            ...input.objects.slice(1),
          ],
        }),
      'invalid-property',
    )
  })

  test('adds a GameObject immutably and validates its parent', () => {
    const scene = createScene(sceneFixture())
    const next = addGameObject(scene, {
      id: 'camera',
      name: 'Camera',
      components: [{ id: 'camera-transform', type: 'Transform', properties: { x: 0, y: 0 } }],
    })

    expect(next.objects.map(({ id }) => id)).toEqual(['player', 'weapon', 'muzzle', 'camera'])
    expect(scene.objects).toHaveLength(3)
    expectSceneError(
      () =>
        addGameObject(scene, {
          id: 'orphan',
          name: 'Orphan',
          parentId: 'missing',
          components: [],
        }),
      'missing-parent',
    )
  })

  test('updates name, parent and components without changing identity', () => {
    const scene = createScene(sceneFixture())
    const next = updateGameObject(scene, 'weapon', {
      name: 'Sword',
      parentId: null,
      components: [{ id: 'damage', type: 'Damage', properties: { amount: 10 } }],
    })

    expect(findGameObject(next, 'weapon')).toEqual({
      id: 'weapon',
      name: 'Sword',
      components: [{ id: 'damage', type: 'Damage', properties: { amount: 10 } }],
    })
    expect(findGameObject(scene, 'weapon')?.parentId).toBe('player')
  })

  test('a patch keeps every field it omits, including the current parent', () => {
    const scene = createScene(sceneFixture())
    const next = updateGameObject(scene, 'weapon', { name: 'Sword' })

    expect(findGameObject(next, 'weapon')).toEqual({
      id: 'weapon',
      name: 'Sword',
      parentId: 'player',
      components: [],
    })
    expect(findGameObject(next, 'muzzle')?.parentId).toBe('weapon')
  })

  test('rejects a cycle introduced by reparenting', () => {
    const scene = createScene(sceneFixture())
    expectSceneError(() => updateGameObject(scene, 'player', { parentId: 'muzzle' }), 'cycle')
  })

  test('removes a GameObject together with its descendants', () => {
    const scene = createScene(sceneFixture())
    const next = removeGameObject(scene, 'weapon')

    expect(next.objects.map(({ id }) => id)).toEqual(['player'])
    expect(scene.objects).toHaveLength(3)
  })

  test('reports an unknown update target and treats unknown removal as a no-op', () => {
    const scene = createScene(sceneFixture())
    expectSceneError(() => updateGameObject(scene, 'missing', { name: 'Nope' }), 'object-not-found')
    expect(removeGameObject(scene, 'missing')).toEqual(scene)
    expect(findGameObject(scene, 'missing')).toBeUndefined()
  })
})
