import { createScene } from '@forge2d/core'
import { createProject, createSpriteAsset, createTextureAsset } from '@/entities/project/domain'

export function forgeEditorFixture() {
  const texture = createTextureAsset({
    id: 'texture-player',
    name: 'player.png',
    uri: '/src/test/fixtures/test.png',
    width: 983,
    height: 517,
  })
  const sprite = createSpriteAsset(
    {
      id: 'sprite-player',
      name: 'Player idle',
      textureId: texture.id,
      sprites: [
        {
          id: 'idle-1',
          name: 'Idle 1',
          rect: { x: 92, y: 54, width: 54, height: 54 },
        },
      ],
      settings: { mode: 'manual' },
    },
    texture,
  )
  const project = createProject({ name: 'Demo game', assets: [texture, sprite] })
  const scene = createScene({
    version: 1,
    id: 'main',
    name: 'Main',
    objects: [
      {
        id: 'player',
        name: 'Player',
        components: [
          {
            id: 'player-transform',
            type: 'Transform',
            properties: { x: 12, y: 20, rotation: 0, scaleX: 1, scaleY: 1 },
          },
          {
            id: 'player-sprite',
            type: 'SpriteRenderer',
            properties: {
              assetId: 'sprite-player',
              frameId: 'idle-1',
              opacity: 1,
              visible: true,
              order: 0,
            },
          },
        ],
      },
      {
        id: 'weapon',
        name: 'Weapon',
        parentId: 'player',
        components: [
          {
            id: 'weapon-transform',
            type: 'Transform',
            properties: { x: 8, y: 4, rotation: 0.25, scaleX: 1, scaleY: 1 },
          },
          {
            id: 'weapon-sprite',
            type: 'SpriteRenderer',
            properties: {
              assetId: 'sprite-player',
              frameId: 'idle-1',
              opacity: 0.75,
              visible: true,
              order: 1,
            },
          },
        ],
      },
    ],
  })

  return { project, scene, texture, sprite }
}
