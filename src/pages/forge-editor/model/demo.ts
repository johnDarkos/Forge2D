import { createScene } from '@forge2d/core'
import { createProject, createSpriteAsset, createTextureAsset } from '@/entities/project/domain'

const texture = createTextureAsset({
  id: 'texture-demo-player',
  name: 'player.svg',
  uri: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect x="3" y="3" width="26" height="26" rx="7" fill="%2370b7ff"/%3E%3Ccircle cx="12" cy="14" r="2" fill="%230b1018"/%3E%3Ccircle cx="20" cy="14" r="2" fill="%230b1018"/%3E%3Cpath d="M10 22h12" stroke="%230b1018" stroke-width="2"/%3E%3C/svg%3E',
  width: 32,
  height: 32,
})

const sprite = createSpriteAsset(
  {
    id: 'sprite-demo-player',
    name: 'Player',
    textureId: texture.id,
    sprites: [{ id: 'idle', name: 'Idle', rect: { x: 0, y: 0, width: 32, height: 32 } }],
    settings: { mode: 'manual' },
  },
  texture,
)

export const demoProject = createProject({ name: 'Forge2D Demo', assets: [texture, sprite] })

export const demoScene = createScene({
  version: 1,
  id: 'main',
  name: 'Main Scene',
  objects: [
    {
      id: 'player',
      name: 'Player',
      components: [
        {
          id: 'player-transform',
          type: 'Transform',
          properties: { x: 96, y: 72, rotation: 0, scaleX: 2, scaleY: 2 },
        },
        {
          id: 'player-sprite',
          type: 'SpriteRenderer',
          properties: {
            assetId: 'sprite-demo-player',
            frameId: 'idle',
            opacity: 1,
            visible: true,
            order: 0,
          },
        },
      ],
    },
  ],
})
