// @vitest-environment node
import { describe, expect, test } from 'vitest'
import {
  collectSceneCommands,
  createForgeEditorWorkspace,
  getHierarchyRows,
  getInspectorGroups,
  selectAsset,
  selectGameObject,
  setInspectorField,
} from '@/features/edit-forge-scene'
import { forgeEditorFixture } from './fixtures'

describe('Forge Editor workspace', () => {
  test('hydrates one scene model into hierarchy, Inspector, assets and runtime commands', () => {
    const { project, scene } = forgeEditorFixture()

    const workspace = createForgeEditorWorkspace({ project, scene })

    expect(workspace.selectedObjectId).toBe('player')
    expect(workspace.selectedAssetId).toBe('texture-player')
    expect(getHierarchyRows(workspace)).toEqual([
      { id: 'player', name: 'Player', depth: 0 },
      { id: 'weapon', name: 'Weapon', depth: 1 },
    ])
    expect(getInspectorGroups(workspace)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentId: 'player-transform',
          type: 'Transform',
          fields: expect.arrayContaining([
            expect.objectContaining({ key: 'x', value: 12 }),
            expect.objectContaining({ key: 'y', value: 20 }),
          ]),
        }),
        expect.objectContaining({
          componentId: 'player-sprite',
          type: 'SpriteRenderer',
          fields: expect.arrayContaining([
            expect.objectContaining({ key: 'opacity', value: 1 }),
            expect.objectContaining({ key: 'visible', value: true }),
            expect.objectContaining({ key: 'order', value: 0 }),
          ]),
        }),
      ]),
    )
    expect(collectSceneCommands(workspace)).toMatchObject([
      {
        gameObjectId: 'player',
        transform: { x: 12, y: 20 },
        source: { x: 92, y: 54, width: 54, height: 54 },
      },
      {
        gameObjectId: 'weapon',
        transform: { x: 8, y: 4 },
        opacity: 0.75,
      },
    ])
  })

  test('keeps selection in one state and clears references that do not exist', () => {
    const workspace = createForgeEditorWorkspace(forgeEditorFixture())

    const selected = selectGameObject(selectAsset(workspace, 'sprite-player'), 'weapon')

    expect(selected.selectedObjectId).toBe('weapon')
    expect(selected.selectedAssetId).toBe('sprite-player')
    expect(getInspectorGroups(selected)[0]).toEqual(
      expect.objectContaining({
        componentId: 'weapon-transform',
        fields: expect.arrayContaining([expect.objectContaining({ key: 'x', value: 8 })]),
      }),
    )
    expect(selectGameObject(selected, 'missing').selectedObjectId).toBeNull()
    expect(selectAsset(selected, 'missing').selectedAssetId).toBeNull()
  })

  test('writes through Inspector API and rebuilds scene/runtime without mutating previous state', () => {
    const workspace = createForgeEditorWorkspace(forgeEditorFixture())

    const next = setInspectorField(workspace, 'player-transform', 'x', 42)

    expect(workspace.scene.objects[0]?.components[0]?.properties.x).toBe(12)
    expect(next.scene.objects[0]?.components[0]?.properties.x).toBe(42)
    expect(getInspectorGroups(workspace)[0]?.fields[0]?.value).toBe(12)
    expect(getInspectorGroups(next)[0]?.fields[0]?.value).toBe(42)
    expect(collectSceneCommands(next)[0]?.transform.x).toBe(42)
  })
})
