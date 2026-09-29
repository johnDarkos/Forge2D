import { useState } from 'react'
import type { InspectorFieldValue } from '@forge2d/core'
import {
  createForgeEditorWorkspace,
  selectAsset,
  selectGameObject,
  setInspectorField,
} from '@/features/edit-forge-scene'
import type { ForgeEditorWorkspace } from '@/features/edit-forge-scene'
import type { ForgeEditorProps } from '../model/types'
import { AssetsPanel } from './AssetsPanel'
import { HierarchyPanel } from './HierarchyPanel'
import { InspectorPanel } from './InspectorPanel'
import { ScenePanel } from './ScenePanel'
import './ForgeEditor.css'

export function ForgeEditor({
  project,
  scene,
  componentFactories,
  onWorkspaceChange,
}: ForgeEditorProps) {
  const [workspace, setWorkspace] = useState(() =>
    createForgeEditorWorkspace({
      project,
      scene,
      ...(componentFactories ? { componentFactories } : {}),
    }),
  )
  const [error, setError] = useState<string | null>(null)

  const commit = (next: ForgeEditorWorkspace) => {
    setWorkspace(next)
    setError(null)
    onWorkspaceChange?.(next)
  }
  const selectObject = (id: string) => commit(selectGameObject(workspace, id))
  const changeField = (componentId: string, key: string, value: InspectorFieldValue) => {
    try {
      commit(setInspectorField(workspace, componentId, key, value))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Inspector update failed')
    }
  }

  return (
    <main className="forge-editor">
      <header className="forge-editor__toolbar">
        <div>
          <strong>Forge2D</strong>
          <span>{workspace.project.name}</span>
        </div>
        <span className="forge-editor__status">Edit mode · {workspace.scene.name}</span>
      </header>
      <div className="forge-editor__workspace">
        <HierarchyPanel onSelect={selectObject} workspace={workspace} />
        <ScenePanel onSelect={selectObject} workspace={workspace} />
        <InspectorPanel error={error} onChange={changeField} workspace={workspace} />
        <AssetsPanel onSelect={(id) => commit(selectAsset(workspace, id))} workspace={workspace} />
      </div>
    </main>
  )
}
