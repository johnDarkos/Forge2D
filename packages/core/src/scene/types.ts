export const SCENE_SCHEMA_VERSION = 1 as const

export type SceneId = string
export type GameObjectId = string
export type ComponentId = string

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[]
export type JsonObject = { readonly [key: string]: JsonValue }

/** Сериализуемый снимок компонента; type связывает данные с runtime-конструктором. */
export interface ComponentData {
  readonly id: ComponentId
  readonly type: string
  readonly properties: JsonObject
}

/** Корневой объект не содержит parentId; дочерний ссылается на объект той же Scene. */
export interface GameObjectData {
  readonly id: GameObjectId
  readonly name: string
  readonly parentId?: GameObjectId
  readonly components: readonly ComponentData[]
}

export interface SceneDocument {
  readonly version: typeof SCENE_SCHEMA_VERSION
  readonly id: SceneId
  readonly name: string
  readonly objects: readonly GameObjectData[]
}

/** null явно переносит объект в корень, отсутствие поля сохраняет текущего родителя. */
export interface GameObjectPatch {
  readonly name?: string
  readonly parentId?: GameObjectId | null
  readonly components?: readonly ComponentData[]
}

export type SceneValidationCode =
  | 'invalid-json'
  | 'invalid-scene'
  | 'unsupported-version'
  | 'invalid-id'
  | 'invalid-name'
  | 'duplicate-object-id'
  | 'missing-parent'
  | 'cycle'
  | 'invalid-component'
  | 'duplicate-component-id'
  | 'invalid-property'
  | 'object-not-found'
