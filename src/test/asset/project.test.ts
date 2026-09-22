// @vitest-environment node
import { expect, expectTypeOf, test } from 'vitest'
import {
  ASSET_SCHEMA_VERSION,
  PROJECT_SCHEMA_VERSION,
  createProject,
  createSpriteAsset,
  createTextureAsset,
  findSpriteAsset,
  findTextureAsset,
  removeProjectAsset,
  upsertProjectAsset,
} from '@/entities/project/domain'
import type { Asset, SpriteAsset, TextureAsset } from '@/entities/project/domain'
import { invalidRects, manualResult, textureInput } from './fixtures'

const spriteInput = {
  id: 'sprite-player',
  name: 'Player',
  textureId: textureInput.id,
  sprites: manualResult.sprites,
  settings: manualResult.settings,
} as const

function readyProject() {
  const texture = createTextureAsset(textureInput)
  const sprite = createSpriteAsset(spriteInput, texture)
  return { texture, sprite, project: createProject({ name: 'Demo', assets: [texture, sprite] }) }
}

test('creates versioned serializable assets and a project without browser globals', () => {
  const { texture, sprite, project } = readyProject()
  expect(texture).toEqual({
    ...textureInput,
    type: 'texture',
    schemaVersion: ASSET_SCHEMA_VERSION,
  })
  expect(sprite).toEqual({
    ...spriteInput,
    sprites: manualResult.sprites,
    type: 'sprite',
    schemaVersion: ASSET_SCHEMA_VERSION,
  })
  expect(project).toEqual({
    name: 'Demo',
    schemaVersion: PROJECT_SCHEMA_VERSION,
    assets: [texture, sprite],
  })
  expect(JSON.parse(JSON.stringify(project))).toEqual(project)
  expect(typeof document).toBe('undefined')
})

test('factories return independent nested data', () => {
  const { texture, sprite, project } = readyProject()
  expect(project.assets[0]).not.toBe(texture)
  expect(project.assets[1]).not.toBe(sprite)
  expect((project.assets[1] as SpriteAsset).sprites).not.toBe(sprite.sprites)
  expect((project.assets[1] as SpriteAsset).sprites[0].rect).not.toBe(sprite.sprites[0].rect)
})

test.each([
  '/assets/player.png',
  './player.png',
  'https://cdn.test/player.png',
  'data:image/png;base64,AA==',
])('accepts persistent texture URI class %s', (uri) =>
  expect(createTextureAsset({ ...textureInput, uri }).uri).toBe(uri),
)

test.each([
  '',
  '  ',
  'blob:https://app.test/session',
  ' blob:https://app.test/session',
  'bl\tob:https://app.test/session',
  'BLOB:https://app.test/session',
  'javascript:alert(1)',
  ' javascript:alert(1)',
  'file:///tmp/player.png',
])('rejects non-persistent or unsafe texture URI %j', (uri) =>
  expect(() => createTextureAsset({ ...textureInput, uri })).toThrow(/uri/i),
)

test('rejects invalid IDs, names and texture dimensions', () => {
  expect(() => createTextureAsset({ ...textureInput, id: '' })).toThrow(/id/i)
  expect(() => createTextureAsset({ ...textureInput, name: '  ' })).toThrow(/name/i)
  expect(() => createTextureAsset({ ...textureInput, width: 0 })).toThrow(/dimension/i)
  expect(() => createProject({ name: '', assets: [] })).toThrow(/name/i)
})

test('project rejects duplicate asset IDs and missing or non-texture references', () => {
  const texture = createTextureAsset(textureInput)
  const sprite = createSpriteAsset(spriteInput, texture)
  expect(() => createProject({ name: 'Demo', assets: [texture, texture] })).toThrow(/unique/i)
  expect(() =>
    createProject({ name: 'Demo', assets: [{ ...sprite, textureId: 'missing' }] }),
  ).toThrow(/texture/i)
  expect(() =>
    createProject({
      name: 'Demo',
      assets: [sprite, { ...sprite, id: 'sprite-other', textureId: sprite.id }],
    }),
  ).toThrow(/texture/i)
})

test.each(invalidRects)('rejects $label in SpriteAsset', ({ rect }) => {
  const texture = createTextureAsset(textureInput)
  expect(() =>
    createSpriteAsset({ ...spriteInput, sprites: [{ ...manualResult.sprites[0], rect }] }, texture),
  ).toThrow(/rect|pixel|bound/i)
})

test('rejects duplicate frame IDs and invalid grid settings', () => {
  const texture = createTextureAsset(textureInput)
  expect(() =>
    createSpriteAsset(
      { ...spriteInput, sprites: [manualResult.sprites[0], manualResult.sprites[0]] },
      texture,
    ),
  ).toThrow(/frame id/i)
  expect(() =>
    createSpriteAsset(
      {
        ...spriteInput,
        settings: {
          mode: 'grid',
          grid: { cellWidth: 32, cellHeight: 32, offsetX: 0, offsetY: 0, gapX: -1, gapY: 0 },
        },
      },
      texture,
    ),
  ).toThrow(/grid/i)
})

test('upsert replaces by stable ID without mutating the previous project', () => {
  const { sprite, project } = readyProject()
  const renamed = { ...sprite, name: 'Renamed' }
  const next = upsertProjectAsset(project, renamed)
  expect(findSpriteAsset(next, sprite.id)?.name).toBe('Renamed')
  expect(findSpriteAsset(project, sprite.id)?.name).toBe('Player')
  expect(next).not.toBe(project)
  expect(next.assets).not.toBe(project.assets)
})

test('upsert appends new assets and typed finders narrow the result', () => {
  const { texture, project } = readyProject()
  const second = createTextureAsset({ ...textureInput, id: 'texture-enemy', name: 'enemy.png' })
  const next = upsertProjectAsset(project, second)
  expect(findTextureAsset(next, second.id)).toEqual(second)
  expect(findTextureAsset(next, 'missing')).toBeUndefined()
  expect(findSpriteAsset(next, texture.id)).toBeUndefined()
  expectTypeOf(findTextureAsset(next, second.id)).toEqualTypeOf<TextureAsset | undefined>()
  expectTypeOf(findSpriteAsset(next, 'sprite-player')).toEqualTypeOf<SpriteAsset | undefined>()
})

test('remove deletes sprites but protects referenced textures', () => {
  const { texture, sprite, project } = readyProject()
  expect(removeProjectAsset(project, sprite.id).assets).toEqual([texture])
  expect(removeProjectAsset(project, 'missing')).toBe(project)
  expect(() => removeProjectAsset(project, texture.id)).toThrow(/referenced/i)
})

test('project operations reject unsupported project and asset schema versions', () => {
  const { sprite, project } = readyProject()
  expect(() => upsertProjectAsset({ ...project, schemaVersion: 2 } as never, sprite)).toThrow(
    /project schema/i,
  )
  expect(() => upsertProjectAsset(project, { ...sprite, schemaVersion: 2 } as never)).toThrow(
    /asset schema/i,
  )
})

test('Asset remains a closed texture/sprite union', () => {
  expectTypeOf<Asset['type']>().toEqualTypeOf<'texture' | 'sprite'>()
})
