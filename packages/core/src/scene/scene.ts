import { SceneValidationError } from './SceneValidationError'
import { SCENE_SCHEMA_VERSION } from './types'
import type {
  ComponentData,
  GameObjectData,
  GameObjectId,
  GameObjectPatch,
  JsonObject,
  JsonValue,
  SceneDocument,
} from './types'

function fail(code: SceneValidationError['code'], path: string, message: string): never {
  throw new SceneValidationError(code, path, message)
}

function record(value: unknown, path: string, code: SceneValidationError['code']) {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    fail(code, path, `${path} must be an object`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null)
    fail(code, path, `${path} must be a plain object`)
  return value as Record<string, unknown>
}

function text(
  value: unknown,
  path: string,
  code: 'invalid-id' | 'invalid-name' | 'invalid-component',
) {
  if (typeof value !== 'string' || !value.trim())
    fail(code, path, `${path} must be a non-empty string`)
  return value
}

function cloneJson(value: unknown, path: string, ancestors = new WeakSet<object>()): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('invalid-property', path, `${path} must be a finite number`)
    return value
  }
  if (typeof value !== 'object')
    fail('invalid-property', path, `${path} contains a value that JSON cannot represent`)
  if (ancestors.has(value)) fail('invalid-property', path, `${path} contains a circular value`)

  ancestors.add(value)
  try {
    if (Array.isArray(value))
      return value.map((item, index) => cloneJson(item, `${path}[${index}]`, ancestors))
    const source = record(value, path, 'invalid-property')
    if (Object.getOwnPropertySymbols(source).length)
      fail('invalid-property', path, `${path} contains a symbol property`)
    return Object.fromEntries(
      Object.entries(source).map(([key, item]) => [
        key,
        cloneJson(item, `${path}.${key}`, ancestors),
      ]),
    ) as JsonObject
  } finally {
    ancestors.delete(value)
  }
}

function cloneComponent(value: unknown, path: string): ComponentData {
  const source = record(value, path, 'invalid-component')
  const properties = record(source.properties, `${path}.properties`, 'invalid-property')
  return {
    id: text(source.id, `${path}.id`, 'invalid-id'),
    type: text(source.type, `${path}.type`, 'invalid-component'),
    properties: cloneJson(properties, `${path}.properties`) as JsonObject,
  }
}

function cloneObject(value: unknown, path: string): GameObjectData {
  const source = record(value, path, 'invalid-scene')
  if (!Array.isArray(source.components))
    fail('invalid-component', `${path}.components`, `${path}.components must be an array`)
  const components = source.components.map((component, index) =>
    cloneComponent(component, `${path}.components[${index}]`),
  )
  const componentIds = new Set<string>()
  for (const [index, component] of components.entries()) {
    if (componentIds.has(component.id))
      fail(
        'duplicate-component-id',
        `${path}.components[${index}].id`,
        `Duplicate component ID: ${component.id}`,
      )
    componentIds.add(component.id)
  }

  let parentId: string | undefined
  if ('parentId' in source && source.parentId !== null) {
    parentId = text(source.parentId, `${path}.parentId`, 'invalid-id')
  }
  return {
    id: text(source.id, `${path}.id`, 'invalid-id'),
    name: text(source.name, `${path}.name`, 'invalid-name'),
    ...(parentId ? { parentId } : {}),
    components,
  }
}

function validateHierarchy(objects: readonly GameObjectData[]) {
  const byId = new Map(objects.map((object) => [object.id, object]))
  for (const [index, object] of objects.entries()) {
    if (object.parentId && !byId.has(object.parentId))
      fail(
        'missing-parent',
        `$.objects[${index}].parentId`,
        `GameObject ${object.id} references missing parent ${object.parentId}`,
      )
  }

  const complete = new Set<GameObjectId>()
  for (const [index, object] of objects.entries()) {
    if (complete.has(object.id)) continue
    const chain = new Set<GameObjectId>()
    let current: GameObjectData | undefined = object
    while (current) {
      if (chain.has(current.id))
        fail('cycle', `$.objects[${index}].parentId`, `Hierarchy cycle includes ${current.id}`)
      if (complete.has(current.id)) break
      chain.add(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    for (const id of chain) complete.add(id)
  }
}

/** Проверяет unknown на границе и возвращает полностью отделённый сериализуемый снимок. */
export function createScene(value: unknown): SceneDocument {
  const source = record(value, '$', 'invalid-scene')
  if (source.version !== SCENE_SCHEMA_VERSION)
    fail('unsupported-version', '$.version', `Unsupported scene version: ${String(source.version)}`)
  if (!Array.isArray(source.objects))
    fail('invalid-scene', '$.objects', '$.objects must be an array')

  const objects = source.objects.map((object, index) => cloneObject(object, `$.objects[${index}]`))
  const objectIds = new Set<GameObjectId>()
  for (const [index, object] of objects.entries()) {
    if (objectIds.has(object.id))
      fail('duplicate-object-id', `$.objects[${index}].id`, `Duplicate GameObject ID: ${object.id}`)
    objectIds.add(object.id)
  }
  validateHierarchy(objects)
  return {
    version: SCENE_SCHEMA_VERSION,
    id: text(source.id, '$.id', 'invalid-id'),
    name: text(source.name, '$.name', 'invalid-name'),
    objects,
  }
}

export function parseScene(json: string): SceneDocument {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    fail('invalid-json', '$', 'Scene JSON is malformed')
  }
  return createScene(value)
}

export function serializeScene(scene: SceneDocument): string {
  return JSON.stringify(createScene(scene), null, 2)
}

export function findGameObject(scene: SceneDocument, id: GameObjectId): GameObjectData | undefined {
  return scene.objects.find((object) => object.id === id)
}

export function addGameObject(scene: SceneDocument, object: GameObjectData): SceneDocument {
  const current = createScene(scene)
  return createScene({ ...current, objects: [...current.objects, object] })
}

export function updateGameObject(
  scene: SceneDocument,
  id: GameObjectId,
  patch: GameObjectPatch,
): SceneDocument {
  const current = createScene(scene)
  const index = current.objects.findIndex((object) => object.id === id)
  if (index < 0) fail('object-not-found', '$.objects', `GameObject not found: ${id}`)
  const object = current.objects[index]
  const parentId = 'parentId' in patch ? (patch.parentId ?? undefined) : object.parentId
  const updated: GameObjectData = {
    id: object.id,
    name: patch.name ?? object.name,
    ...(parentId ? { parentId } : {}),
    components: patch.components ?? object.components,
  }
  return createScene({
    ...current,
    objects: current.objects.map((candidate, candidateIndex) =>
      candidateIndex === index ? updated : candidate,
    ),
  })
}

export function removeGameObject(scene: SceneDocument, id: GameObjectId): SceneDocument {
  const current = createScene(scene)
  if (!current.objects.some((object) => object.id === id)) return current
  const removed = new Set<GameObjectId>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const object of current.objects) {
      if (object.parentId && removed.has(object.parentId) && !removed.has(object.id)) {
        removed.add(object.id)
        changed = true
      }
    }
  }
  return createScene({
    ...current,
    objects: current.objects.filter((object) => !removed.has(object.id)),
  })
}
