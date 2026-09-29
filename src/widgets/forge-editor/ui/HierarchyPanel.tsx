import { getHierarchyRows } from '@/features/edit-forge-scene'
import type { ForgeEditorWorkspace } from '@/features/edit-forge-scene'

interface HierarchyPanelProps {
  readonly workspace: ForgeEditorWorkspace
  readonly onSelect: (id: string) => void
}

export function HierarchyPanel({ workspace, onSelect }: HierarchyPanelProps) {
  return (
    <section
      className="forge-editor__panel forge-editor__hierarchy"
      aria-labelledby="hierarchy-title"
    >
      <h2 id="hierarchy-title">Hierarchy</h2>
      <p className="forge-editor__panel-meta">{workspace.scene.name}</p>
      <div className="forge-editor__list">
        {getHierarchyRows(workspace).map((object) => (
          <button
            className="forge-editor__list-item"
            aria-current={workspace.selectedObjectId === object.id}
            key={object.id}
            onClick={() => onSelect(object.id)}
            style={{ paddingInlineStart: `${12 + object.depth * 18}px` }}
            type="button"
          >
            <span aria-hidden="true">{object.depth ? '↳' : '◆'}</span>
            {object.name}
          </button>
        ))}
      </div>
    </section>
  )
}
