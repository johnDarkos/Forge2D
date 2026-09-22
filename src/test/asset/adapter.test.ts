// @vitest-environment node
import { expect, expectTypeOf, test } from 'vitest'
import { createSpriteAsset, createTextureAsset } from '@/entities/project/domain'
import type {
  AssetSpriteFrame,
  AssetSpriteGridSettings,
  SpriteAsset,
} from '@/entities/project/domain'
import type {
  SpriteEditorImage,
  SpriteEditorInitialData,
  SpriteFrame,
  SpriteGridSettings,
} from '@/entities/sprite/domain'
import {
  spriteAssetToEditorInput,
  spriteEditorResultToSpriteAsset,
} from '@/features/manage-sprite-asset'
import type { SpriteEditorAssetInput } from '@/features/manage-sprite-asset'
import { gridResult, invalidRects, manualResult, textureInput } from './fixtures'

const texture = () => createTextureAsset(textureInput)

test('maps SpriteEditorResult to a versioned SpriteAsset with a texture reference', () => {
  const result = spriteEditorResultToSpriteAsset({
    id: 'sprite-player',
    name: 'Player',
    texture: texture(),
    result: gridResult,
  })
  expect(result).toEqual({
    id: 'sprite-player',
    type: 'sprite',
    name: 'Player',
    schemaVersion: 1,
    textureId: textureInput.id,
    sprites: gridResult.sprites,
    settings: gridResult.settings,
  })
  expect(result.sprites).not.toBe(gridResult.sprites)
  expect(result.sprites[0].rect).not.toBe(gridResult.sprites[0].rect)
  expect(result.settings.mode).toBe('grid')
  if (result.settings.mode !== 'grid') throw new Error('Expected grid settings')
  expect(result.settings.grid).not.toBe(gridResult.settings.grid)
})

test('maps SpriteAsset and TextureAsset to exact SpriteEditor inputs', () => {
  const source = texture()
  const asset = spriteEditorResultToSpriteAsset({
    id: 'sprite-player',
    name: 'Player',
    texture: source,
    result: manualResult,
  })
  const input = spriteAssetToEditorInput({ asset, texture: source })
  expect(input).toEqual({
    image: { src: textureInput.uri, name: textureInput.name },
    initialData: { sprites: manualResult.sprites, settings: { mode: 'manual' } },
  })
  expect(input.initialData.sprites).not.toBe(asset.sprites)
  expect(input.initialData.sprites?.[0].rect).not.toBe(asset.sprites[0].rect)
  expect('grid' in input.initialData.settings!).toBe(false)
})

test('round-trip preserves IDs, names, geometry and settings', () => {
  const source = texture()
  const first = spriteEditorResultToSpriteAsset({
    id: 'sprite-player',
    name: 'Player',
    texture: source,
    result: gridResult,
  })
  const reopened = spriteAssetToEditorInput({ asset: first, texture: source })
  const second = spriteEditorResultToSpriteAsset({
    id: first.id,
    name: first.name,
    texture: source,
    result: { source: gridResult.source, ...reopened.initialData } as typeof gridResult,
  })
  expect(second).toEqual(first)
  expect(second.sprites.map(({ id }) => id)).toEqual(['idle-1', 'run-1'])
})

test('asset and editor structures remain type-level compatible at the adapter boundary', () => {
  expectTypeOf<AssetSpriteFrame>().toEqualTypeOf<SpriteFrame>()
  expectTypeOf<AssetSpriteGridSettings>().toEqualTypeOf<SpriteGridSettings>()
  expectTypeOf<
    ReturnType<typeof spriteAssetToEditorInput>
  >().toEqualTypeOf<SpriteEditorAssetInput>()
  expectTypeOf<SpriteEditorAssetInput['image']>().toEqualTypeOf<SpriteEditorImage>()
  expectTypeOf<SpriteEditorAssetInput['initialData']>().toEqualTypeOf<SpriteEditorInitialData>()
})

test('rejects editor results whose source dimensions differ from the texture', () => {
  expect(() =>
    spriteEditorResultToSpriteAsset({
      id: 'sprite-player',
      name: 'Player',
      texture: texture(),
      result: { ...manualResult, source: { width: 512, height: 256 } },
    }),
  ).toThrow('Sprite editor source dimensions do not match texture asset')
})

test('rejects malformed editor results with a domain error', () => {
  const { source: _source, ...withoutSource } = manualResult
  expect(() =>
    spriteEditorResultToSpriteAsset({
      id: 'sprite-player',
      name: 'Player',
      texture: texture(),
      result: withoutSource as typeof manualResult,
    }),
  ).toThrow('Invalid source dimensions')
})

test.each(invalidRects)('both boundaries reject $label', ({ rect }) => {
  const source = texture()
  expect(() =>
    spriteEditorResultToSpriteAsset({
      id: 'sprite-player',
      name: 'Player',
      texture: source,
      result: {
        ...manualResult,
        sprites: [{ ...manualResult.sprites[0], rect }],
      },
    }),
  ).toThrow(/rect|pixel|bound/i)
  expect(() =>
    createSpriteAsset(
      {
        id: 'sprite-player',
        name: 'Player',
        textureId: source.id,
        sprites: [{ ...manualResult.sprites[0], rect }],
        settings: manualResult.settings,
      },
      source,
    ),
  ).toThrow(/rect|pixel|bound/i)
})

test('rejects mismatched texture reference and unsupported asset schema', () => {
  const source = texture()
  const asset = createSpriteAsset(
    {
      id: 'sprite-player',
      name: 'Player',
      textureId: source.id,
      sprites: manualResult.sprites,
      settings: manualResult.settings,
    },
    source,
  )
  expect(() =>
    spriteAssetToEditorInput({ asset: { ...asset, textureId: 'other' }, texture: source }),
  ).toThrow(/texture/i)
  expect(() =>
    spriteAssetToEditorInput({
      asset: { ...asset, schemaVersion: 2 } as unknown as SpriteAsset,
      texture: source,
    }),
  ).toThrow(/schema/i)
  expect(() =>
    spriteAssetToEditorInput({
      asset,
      texture: { ...source, schemaVersion: 2 } as unknown as typeof source,
    }),
  ).toThrow(/schema/i)
})
