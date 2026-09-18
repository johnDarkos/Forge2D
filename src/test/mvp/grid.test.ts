import { describe, expect, test } from 'vitest'
import { getGenerateFrames } from './contracts'
import { frame10, lastFrame } from '../fixtures/sheets'

describe('FR-06–09: grid and frame coordinates', () => {
  test('256×128 / 32×32 produces all 32 frames in row-major order', async () => {
    const generate = await getGenerateFrames()
    const frames = generate(256, 128, 32, 32)
    expect(frames).toHaveLength(32)
    expect(frames[0]).toEqual({
      id: 0,
      row: 0,
      column: 0,
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      selected: false,
    })
    expect(frames[10]).toEqual({ ...frame10, selected: false })
    expect(frames[31]).toEqual(lastFrame)
    expect(new Set(frames.map((frame) => frame.id)).size).toBe(32)
    expect(frames.every((frame) => !frame.selected)).toBe(true)
  })

  test('100×100 ignores incomplete strips of 4 pixels', async () => {
    const generate = await getGenerateFrames()
    const frames = generate(100, 100, 32, 32)
    expect(frames).toHaveLength(9)
    expect(frames[8]).toEqual({
      id: 8,
      row: 2,
      column: 2,
      x: 64,
      y: 64,
      width: 32,
      height: 32,
      selected: false,
    })
  })

  test('non-square frames do not swap width and height', async () => {
    const generate = await getGenerateFrames()
    expect(generate(96, 40, 32, 20)).toEqual([
      { id: 0, row: 0, column: 0, x: 0, y: 0, width: 32, height: 20, selected: false },
      { id: 1, row: 0, column: 1, x: 32, y: 0, width: 32, height: 20, selected: false },
      { id: 2, row: 0, column: 2, x: 64, y: 0, width: 32, height: 20, selected: false },
      { id: 3, row: 1, column: 0, x: 0, y: 20, width: 32, height: 20, selected: false },
      { id: 4, row: 1, column: 1, x: 32, y: 20, width: 32, height: 20, selected: false },
      { id: 5, row: 1, column: 2, x: 64, y: 20, width: 32, height: 20, selected: false },
    ])
  })

  test.each([
    [32, 32, 32, 32, 1],
    [16, 16, 32, 32, 0],
    [64, 16, 32, 32, 0],
    [16, 64, 32, 32, 0],
    [4096, 4096, 32, 32, 16384],
  ])('image %i×%i, frame %i×%i gives %i complete frames', async (w, h, fw, fh, count) => {
    expect((await getGenerateFrames())(w, h, fw, fh)).toHaveLength(count)
  })

  test.each([0, -32, 1.5, NaN, Infinity])('rejects invalid frame dimension %s', async (value) => {
    const generate = await getGenerateFrames()
    expect(() => generate(256, 128, value, 32)).toThrow(/.+/)
    expect(() => generate(256, 128, 32, value)).toThrow(/.+/)
  })

  test('regeneration returns fresh unselected objects', async () => {
    const generate = await getGenerateFrames()
    const first = generate(64, 32, 32, 32)
    first[0].selected = true
    const second = generate(64, 32, 32, 32)
    expect(second[0].selected).toBe(false)
    expect(second[0]).not.toBe(first[0])
  })
})
