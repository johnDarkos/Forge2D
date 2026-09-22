import { useMemo, useState } from 'react'
import {
  createProject,
  createSpriteAsset,
  createTextureAsset,
  findSpriteAsset,
  findTextureAsset,
  upsertProjectAsset,
} from '@/entities/project/domain'
import type { Project, TextureAsset } from '@/entities/project/domain'
import {
  spriteAssetToEditorInput,
  spriteEditorResultToSpriteAsset,
} from '@/features/manage-sprite-asset'
import { SpriteEditor } from '@/widgets/sprite-editor'
import type { SpriteEditorResult } from '@/widgets/sprite-editor'

const defaultTextureUri = new URL('../../src/test/fixtures/player.png', import.meta.url).href

function initialProject(uri: string): Project {
  const texture = createTextureAsset({
    id: 'texture-player',
    name: 'player.png',
    uri,
    width: 256,
    height: 128,
  })
  const idle = createSpriteAsset(
    {
      id: 'sprite-idle',
      name: 'Idle animation',
      textureId: texture.id,
      sprites: [{ id: 'idle-frame', name: 'idle', rect: { x: 0, y: 0, width: 32, height: 32 } }],
      settings: { mode: 'manual' },
    },
    texture,
  )
  const run = createSpriteAsset(
    {
      id: 'sprite-run',
      name: 'Run animation',
      textureId: texture.id,
      sprites: [{ id: 'run-frame', name: 'run', rect: { x: 64, y: 32, width: 32, height: 32 } }],
      settings: { mode: 'manual' },
    },
    texture,
  )
  return createProject({ name: 'Asset host', assets: [texture, idle, run] })
}

export interface AssetHostProps {
  readonly textureUri?: string
  readonly saveTextureDimensions?: { readonly width: number; readonly height: number }
}

/** Test-only Forge2D owner. It is intentionally outside the production bundle. */
export function AssetHost({
  textureUri = defaultTextureUri,
  saveTextureDimensions,
}: AssetHostProps) {
  const [project, setProject] = useState(() => initialProject(textureUri))
  const [activeAssetId, setActiveAssetId] = useState<string | null>('sprite-idle')
  const [hostError, setHostError] = useState<string | null>(null)
  const texture = findTextureAsset(project, 'texture-player')!
  const asset = activeAssetId ? findSpriteAsset(project, activeAssetId) : undefined
  const editorInput = useMemo(
    () => (asset ? spriteAssetToEditorInput({ asset, texture }) : null),
    [asset, texture],
  )

  function save(result: SpriteEditorResult) {
    if (!asset) return
    try {
      const saveTexture: TextureAsset = saveTextureDimensions
        ? { ...texture, ...saveTextureDimensions }
        : texture
      const nextAsset = spriteEditorResultToSpriteAsset({
        id: asset.id,
        name: asset.name,
        texture: saveTexture,
        result,
      })
      setProject((current) => upsertProjectAsset(current, nextAsset))
      setHostError(null)
      setActiveAssetId(null)
    } catch (error) {
      setHostError(error instanceof Error ? error.message : 'Unknown host save error')
    }
  }

  return (
    <>
      <section aria-label="Asset host">
        <button type="button" onClick={() => setActiveAssetId('sprite-idle')}>
          Open Idle animation
        </button>
        <button type="button" onClick={() => setActiveAssetId('sprite-run')}>
          Open Run animation
        </button>
        <output aria-label="Active asset">{activeAssetId ?? 'closed'}</output>
        {hostError ? <p role="alert">Host save error: {hostError}</p> : null}
        <pre data-testid="project-state">{JSON.stringify(project)}</pre>
      </section>
      {asset && editorInput ? (
        <SpriteEditor
          key={asset.id}
          {...editorInput}
          onSave={save}
          onCancel={() => setActiveAssetId(null)}
        />
      ) : null}
    </>
  )
}
