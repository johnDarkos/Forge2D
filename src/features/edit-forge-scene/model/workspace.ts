import {
  Component,
  GameObject,
  createScene,
  getInspectorFields,
  setInspectorFieldValue,
  updateGameObject,
} from '@forge2d/core'
import type {
  ComponentData,
  GameObjectData,
  InspectorField,
  InspectorFieldValue,
  SceneDocument,
} from '@forge2d/core'
import { Renderer, SpriteRenderer, Transform } from '@forge2d/runtime'
import type { RendererBackend, SpriteRenderCommand, TextureRegion } from '@forge2d/runtime'
import { createProject, findSpriteAsset, findTextureAsset } from '@/entities/project/domain'
import type { AssetId, Project } from '@/entities/project/domain'

export interface EditorComponentFactoryContext {
  readonly data: ComponentData
  readonly project: Project
}

export type EditorComponentFactory = (context: EditorComponentFactoryContext) => Component
export type EditorComponentFactories = Readonly<Record<string, EditorComponentFactory>>

export interface RuntimeComponentBinding {
  readonly id: string
  readonly type: string
  readonly component: Component
}

export interface RuntimeObjectBinding {
  readonly data: GameObjectData
  readonly object: GameObject
  readonly components: readonly RuntimeComponentBinding[]
}

export interface ForgeEditorWorkspace {
  readonly project: Project
  readonly scene: SceneDocument
  readonly selectedObjectId: string | null
  readonly selectedAssetId: AssetId | null
  readonly runtimeObjects: readonly RuntimeObjectBinding[]
  readonly componentFactories: EditorComponentFactories
}

export interface CreateForgeEditorWorkspaceInput {
  readonly project: Project
  readonly scene: SceneDocument
  readonly selectedObjectId?: string | null
  readonly selectedAssetId?: AssetId | null
  readonly componentFactories?: EditorComponentFactories
}

export interface HierarchyRow {
  readonly id: string
  readonly name: string
  readonly depth: number
}

export interface InspectorGroup {
  readonly componentId: string
  readonly type: string
  readonly fields: readonly InspectorField[]
}

function numberProperty(data: ComponentData, key: string, fallback: number) {
  const value = data.properties[key]
  if (value === undefined) return fallback
  if (typeof value !== 'number') throw new Error(`${data.type}.${key} must be a number`)
  return value
}

function booleanProperty(data: ComponentData, key: string, fallback: boolean) {
  const value = data.properties[key]
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new Error(`${data.type}.${key} must be a boolean`)
  return value
}

function stringProperty(data: ComponentData, key: string) {
  const value = data.properties[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${data.type}.${key} must be a string`)
  return value
}

function transformFactory({ data }: EditorComponentFactoryContext) {
  return new Transform({
    x: numberProperty(data, 'x', 0),
    y: numberProperty(data, 'y', 0),
    rotation: numberProperty(data, 'rotation', 0),
    scaleX: numberProperty(data, 'scaleX', 1),
    scaleY: numberProperty(data, 'scaleY', 1),
  })
}

function spriteAssetRegion(
  project: Project,
  assetId: string | undefined,
  frameId: string | undefined,
) {
  if (!assetId) return {}
  const texture = findTextureAsset(project, assetId)
  if (texture) return { texture }

  const sprite = findSpriteAsset(project, assetId)
  if (!sprite) return {}
  const source = frameId
    ? sprite.sprites.find((frame) => frame.id === frameId)?.rect
    : sprite.sprites[0]?.rect
  const spriteTexture = findTextureAsset(project, sprite.textureId)
  return spriteTexture && source ? { texture: spriteTexture, source } : {}
}

function spriteRendererFactory({ data, project }: EditorComponentFactoryContext) {
  const resolved = spriteAssetRegion(
    project,
    stringProperty(data, 'assetId'),
    stringProperty(data, 'frameId'),
  )
  return new SpriteRenderer({
    texture: resolved.texture,
    source: resolved.source as TextureRegion | undefined,
    opacity: numberProperty(data, 'opacity', 1),
    visible: booleanProperty(data, 'visible', true),
    order: numberProperty(data, 'order', 0),
  })
}

const builtInFactories: EditorComponentFactories = Object.freeze({
  Transform: transformFactory,
  SpriteRenderer: spriteRendererFactory,
})

function instantiateScene(
  scene: SceneDocument,
  project: Project,
  factories: EditorComponentFactories,
) {
  return scene.objects.map((data): RuntimeObjectBinding => {
    const object = new GameObject({ id: data.id, name: data.name })
    const components = data.components.flatMap((componentData) => {
      const factory = factories[componentData.type]
      if (!factory) return []
      const component = object.addComponent(factory({ data: componentData, project }))
      return [{ id: componentData.id, type: componentData.type, component }]
    })
    return Object.freeze({ data, object, components: Object.freeze(components) })
  })
}

function existingId(requested: string | null | undefined, ids: readonly string[]): string | null {
  const candidate = requested === undefined ? (ids[0] ?? null) : requested
  return candidate !== null && ids.includes(candidate) ? candidate : null
}

export function createForgeEditorWorkspace({
  project: projectInput,
  scene: sceneInput,
  selectedObjectId,
  selectedAssetId,
  componentFactories = {},
}: CreateForgeEditorWorkspaceInput): ForgeEditorWorkspace {
  const project = createProject(projectInput)
  const scene = createScene(sceneInput)
  const factories = Object.freeze({ ...builtInFactories, ...componentFactories })
  return Object.freeze({
    project,
    scene,
    selectedObjectId: existingId(
      selectedObjectId,
      scene.objects.map(({ id }) => id),
    ),
    selectedAssetId: existingId(
      selectedAssetId,
      project.assets.map(({ id }) => id),
    ),
    runtimeObjects: Object.freeze(instantiateScene(scene, project, factories)),
    componentFactories: factories,
  })
}

export function getHierarchyRows(workspace: ForgeEditorWorkspace): readonly HierarchyRow[] {
  const children = new Map<string | null, GameObjectData[]>()
  for (const object of workspace.scene.objects) {
    const key = object.parentId ?? null
    const siblings = children.get(key) ?? []
    siblings.push(object)
    children.set(key, siblings)
  }

  const rows: HierarchyRow[] = []
  const visit = (parentId: string | null, depth: number) => {
    for (const object of children.get(parentId) ?? []) {
      rows.push({ id: object.id, name: object.name, depth })
      visit(object.id, depth + 1)
    }
  }
  visit(null, 0)
  return rows
}

export function selectGameObject(
  workspace: ForgeEditorWorkspace,
  id: string | null,
): ForgeEditorWorkspace {
  const selectedObjectId = existingId(
    id,
    workspace.scene.objects.map((object) => object.id),
  )
  return Object.freeze({ ...workspace, selectedObjectId })
}

export function selectAsset(
  workspace: ForgeEditorWorkspace,
  id: AssetId | null,
): ForgeEditorWorkspace {
  const selectedAssetId = existingId(
    id,
    workspace.project.assets.map((asset) => asset.id),
  )
  return Object.freeze({ ...workspace, selectedAssetId })
}

function selectedRuntimeObject(workspace: ForgeEditorWorkspace) {
  return workspace.runtimeObjects.find(({ object }) => object.id === workspace.selectedObjectId)
}

export function getInspectorGroups(workspace: ForgeEditorWorkspace): readonly InspectorGroup[] {
  const selected = selectedRuntimeObject(workspace)
  if (!selected) return []
  return selected.components.map(({ id, type, component }) => ({
    componentId: id,
    type,
    fields: getInspectorFields(component),
  }))
}

class CommandCollector implements RendererBackend {
  readonly commands: SpriteRenderCommand[] = []

  beginFrame() {
    this.commands.length = 0
  }

  drawSprite(command: SpriteRenderCommand) {
    this.commands.push(command)
  }

  endFrame() {}
}

export function collectSceneCommands(
  workspace: ForgeEditorWorkspace,
): readonly SpriteRenderCommand[] {
  const backend = new CommandCollector()
  new Renderer(backend).render(workspace.runtimeObjects.map(({ object }) => object))
  return Object.freeze([...backend.commands])
}

export function setInspectorField(
  workspace: ForgeEditorWorkspace,
  componentId: string,
  key: string,
  value: InspectorFieldValue,
): ForgeEditorWorkspace {
  if (!workspace.selectedObjectId) throw new Error('Select a GameObject before editing Inspector')

  const draft = createForgeEditorWorkspace({
    project: workspace.project,
    scene: workspace.scene,
    selectedObjectId: workspace.selectedObjectId,
    selectedAssetId: workspace.selectedAssetId,
    componentFactories: workspace.componentFactories,
  })
  const selected = selectedRuntimeObject(draft)
  const binding = selected?.components.find(({ id }) => id === componentId)
  if (!selected || !binding) throw new Error(`Inspector component not found: ${componentId}`)
  setInspectorFieldValue(binding.component, key, value)

  const objectData = selected.data
  const components = objectData.components.map((component) =>
    component.id === componentId
      ? { ...component, properties: { ...component.properties, [key]: value } }
      : component,
  )
  const scene = updateGameObject(draft.scene, objectData.id, { components })
  return createForgeEditorWorkspace({
    project: draft.project,
    scene,
    selectedObjectId: draft.selectedObjectId,
    selectedAssetId: draft.selectedAssetId,
    componentFactories: draft.componentFactories,
  })
}
