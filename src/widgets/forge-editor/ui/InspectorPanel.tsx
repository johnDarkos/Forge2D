import type { ChangeEvent } from 'react'
import type { InspectorFieldValue } from '@forge2d/core'
import { getInspectorGroups } from '@/features/edit-forge-scene'
import type { ForgeEditorWorkspace, InspectorGroup } from '@/features/edit-forge-scene'

interface InspectorPanelProps {
  readonly workspace: ForgeEditorWorkspace
  readonly error: string | null
  readonly onChange: (componentId: string, key: string, value: InspectorFieldValue) => void
}

function InspectorComponent({
  group,
  onChange,
}: {
  readonly group: InspectorGroup
  readonly onChange: InspectorPanelProps['onChange']
}) {
  return (
    <fieldset className="forge-editor__component">
      <legend>{group.type}</legend>
      {group.fields.map((field) => {
        const label = `${group.type} ${field.label}`
        if (field.type === 'boolean')
          return (
            <label className="forge-editor__field forge-editor__field--boolean" key={field.key}>
              <span>{field.label}</span>
              <input
                aria-label={label}
                checked={field.value as boolean}
                disabled={field.readonly}
                onChange={(event) => onChange(group.componentId, field.key, event.target.checked)}
                type="checkbox"
              />
            </label>
          )

        const change = (event: ChangeEvent<HTMLInputElement>) => {
          const value = field.type === 'number' ? Number(event.target.value) : event.target.value
          onChange(group.componentId, field.key, value)
        }
        return (
          <label className="forge-editor__field" key={field.key}>
            <span>{field.label}</span>
            <input
              aria-label={label}
              disabled={field.readonly}
              max={field.max}
              min={field.min}
              onChange={change}
              step={field.step}
              type={field.type === 'number' ? 'number' : 'text'}
              value={field.value as number | string}
            />
          </label>
        )
      })}
    </fieldset>
  )
}

export function InspectorPanel({ workspace, error, onChange }: InspectorPanelProps) {
  const selected = workspace.scene.objects.find(({ id }) => id === workspace.selectedObjectId)
  const groups = getInspectorGroups(workspace)
  return (
    <section
      className="forge-editor__panel forge-editor__inspector"
      aria-labelledby="inspector-title"
    >
      <h2 id="inspector-title">Inspector</h2>
      <p className="forge-editor__panel-meta">{selected?.name ?? 'No selection'}</p>
      {groups.map((group) => (
        <InspectorComponent group={group} key={group.componentId} onChange={onChange} />
      ))}
      {selected && groups.length === 0 ? (
        <p className="forge-editor__empty">No editable components</p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  )
}
