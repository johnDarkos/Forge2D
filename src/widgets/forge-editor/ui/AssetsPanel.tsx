import type { ForgeEditorWorkspace } from '@/features/edit-forge-scene'

interface AssetsPanelProps {
  readonly workspace: ForgeEditorWorkspace
  readonly onSelect: (id: string) => void
}

export function AssetsPanel({ workspace, onSelect }: AssetsPanelProps) {
  return (
    <section className="forge-editor__panel forge-editor__assets" aria-labelledby="assets-title">
      <div className="forge-editor__panel-heading">
        <h2 id="assets-title">Assets</h2>
        <span>{workspace.project.assets.length} items</span>
      </div>
      <div className="forge-editor__asset-grid">
        {workspace.project.assets.map((asset) => (
          <button
            aria-label={asset.name}
            aria-current={workspace.selectedAssetId === asset.id}
            className="forge-editor__asset"
            key={asset.id}
            onClick={() => onSelect(asset.id)}
            type="button"
          >
            <span className="forge-editor__asset-icon" aria-hidden="true">
              {asset.type === 'texture' ? '▧' : '◇'}
            </span>
            <span>{asset.name}</span>
            <small>{asset.type}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
