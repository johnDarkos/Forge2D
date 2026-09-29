export { SceneValidationError } from './SceneValidationError'
export {
  addGameObject,
  createScene,
  findGameObject,
  parseScene,
  removeGameObject,
  serializeScene,
  updateGameObject,
} from './scene'
export { SCENE_SCHEMA_VERSION } from './types'
export type {
  ComponentData,
  ComponentId,
  GameObjectData,
  GameObjectId,
  GameObjectPatch,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  SceneDocument,
  SceneId,
  SceneValidationCode,
} from './types'
