import type { SceneDocument } from '@forge2d/core'
import type { Project } from '@/entities/project/domain'
import type { EditorComponentFactories, ForgeEditorWorkspace } from '@/features/edit-forge-scene'

export interface ForgeEditorProps {
  readonly project: Project
  readonly scene: SceneDocument
  readonly componentFactories?: EditorComponentFactories
  readonly onWorkspaceChange?: (workspace: ForgeEditorWorkspace) => void
}
