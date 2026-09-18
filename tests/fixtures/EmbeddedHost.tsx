import { useState } from 'react'
import { SpriteEditor } from '@/widgets/sprite-editor'
import type { SpriteEditorResult } from '@/widgets/sprite-editor'

const first =
  new URLSearchParams(location.search).get('src') ??
  new URL('../../src/test/fixtures/player.png', import.meta.url).href
const second = new URL('../../src/test/fixtures/enemy.png', import.meta.url).href

/** Тестовый владелец: передаёт ресурс, принимает метаданные, самостоятельно реагирует на Cancel. */
export function EmbeddedHost() {
  const [replaced, setReplaced] = useState(false)
  const [result, setResult] = useState<SpriteEditorResult | null>(null)
  const [saves, setSaves] = useState(0)
  const [cancels, setCancels] = useState(0)
  return (
    <>
      <div className="panel">
        <button type="button" onClick={() => setReplaced((value) => !value)}>
          Replace external image
        </button>
        <output aria-label="Save count">{saves}</output>
        <output aria-label="Cancel count">{cancels}</output>
        <pre data-testid="saved-result">{JSON.stringify(result)}</pre>
      </div>
      <SpriteEditor
        image={{ src: replaced ? second : first, name: replaced ? 'enemy.png' : 'player.png' }}
        initialData={
          replaced
            ? {
                sprites: [
                  { id: 'enemy-id', name: 'enemy', rect: { x: 0, y: 0, width: 16, height: 16 } },
                ],
                settings: { mode: 'manual' },
              }
            : { settings: { mode: 'grid' } }
        }
        onSave={(value) => {
          setResult(value)
          setSaves((value) => value + 1)
        }}
        onCancel={() => setCancels((value) => value + 1)}
      />
    </>
  )
}
