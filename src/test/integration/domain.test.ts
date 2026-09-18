// @vitest-environment node
import { expect, expectTypeOf, test } from 'vitest'
import { generateFrames, validateGrid } from '@/entities/sprite/domain'
import type { SpriteEditorResult, SpriteEditorSource } from '@/widgets/sprite-editor'
import type { SpriteFrameGeometry } from '@/entities/sprite/domain'

test('public domain runs without browser globals', () => {
  expect(typeof document).toBe('undefined')
  expect(generateFrames(64, 32, 32, 32)).toHaveLength(2)
  expect(validateGrid({ width: '32', height: '32' }, 64, 32)).toEqual({
    status: 'valid',
    size: { width: 32, height: 32 },
    summary: { columns: 2, rows: 1, frameCount: 2 },
  })
})

test('integration result exposes data without UI selection or browser resources', () => {
  expectTypeOf<SpriteEditorSource>().toEqualTypeOf<{
    readonly fileName: string
    readonly width: number
    readonly height: number
  }>()
  expectTypeOf<SpriteEditorResult['frames'][number]>().toEqualTypeOf<SpriteFrameGeometry>()
  expectTypeOf<keyof SpriteEditorResult>().toEqualTypeOf<'source' | 'frames'>()
  expectTypeOf<keyof SpriteFrameGeometry>().toEqualTypeOf<
    'id' | 'row' | 'column' | 'x' | 'y' | 'width' | 'height'
  >()
})
