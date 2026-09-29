import { collectSceneCommands } from '@/features/edit-forge-scene'
import type { ForgeEditorWorkspace } from '@/features/edit-forge-scene'

interface ScenePanelProps {
  readonly workspace: ForgeEditorWorkspace
  readonly onSelect: (id: string) => void
}

export function ScenePanel({ workspace, onSelect }: ScenePanelProps) {
  const commands = collectSceneCommands(workspace)
  const names = new Map(workspace.scene.objects.map((object) => [object.id, object.name]))

  return (
    <section className="forge-editor__panel forge-editor__scene" aria-labelledby="scene-title">
      <div className="forge-editor__panel-heading">
        <h2 id="scene-title">Scene</h2>
        <span>{commands.length} visible</span>
      </div>
      <div className="forge-editor__viewport" data-testid="forge-scene-viewport">
        <div className="forge-editor__origin" aria-hidden="true" />
        {commands.map((command) => {
          const source = command.source ?? {
            x: 0,
            y: 0,
            width: command.texture.width,
            height: command.texture.height,
          }
          const selected = workspace.selectedObjectId === command.gameObjectId
          return (
            <button
              aria-current={selected}
              aria-label={`${names.get(command.gameObjectId) ?? command.gameObjectId} sprite`}
              className="forge-editor__scene-object"
              data-x={command.transform.x}
              data-y={command.transform.y}
              key={command.gameObjectId}
              onClick={() => onSelect(command.gameObjectId)}
              style={{
                left: command.transform.x,
                top: command.transform.y,
                width: source.width,
                height: source.height,
                opacity: command.opacity,
                transform: `rotate(${command.transform.rotation}rad) scale(${command.transform.scaleX}, ${command.transform.scaleY})`,
              }}
              type="button"
            >
              <img
                alt=""
                draggable={false}
                src={command.texture.uri}
                style={{
                  left: -source.x,
                  top: -source.y,
                  width: command.texture.width,
                  height: command.texture.height,
                }}
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
