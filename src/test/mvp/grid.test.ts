import { describe, expect, test } from 'vitest'
import { generateFrames } from '@/entities/sprite'
import { frame10, lastFrame } from '../fixtures/sheets'

describe('FR-06–09: grid and frame coordinates', () => {
  test('256×128 / 32×32 produces all 32 frames in row-major order', async () => {
    const frames = generateFrames(256, 128, 32, 32)
    expect(frames).toHaveLength(32)
    expect(frames[0]).toEqual({
      id: 'grid-0-0-32-32',
      displayNumber: 1,
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
    const frames = generateFrames(100, 100, 32, 32)
    expect(frames).toHaveLength(9)
    expect(frames[8]).toEqual({
      id: 'grid-64-64-32-32',
      displayNumber: 9,
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
    expect(generateFrames(96, 40, 32, 20)).toEqual([
      {
        id: 'grid-0-0-32-20',
        displayNumber: 1,
        row: 0,
        column: 0,
        x: 0,
        y: 0,
        width: 32,
        height: 20,
        selected: false,
      },
      {
        id: 'grid-32-0-32-20',
        displayNumber: 2,
        row: 0,
        column: 1,
        x: 32,
        y: 0,
        width: 32,
        height: 20,
        selected: false,
      },
      {
        id: 'grid-64-0-32-20',
        displayNumber: 3,
        row: 0,
        column: 2,
        x: 64,
        y: 0,
        width: 32,
        height: 20,
        selected: false,
      },
      {
        id: 'grid-0-20-32-20',
        displayNumber: 4,
        row: 1,
        column: 0,
        x: 0,
        y: 20,
        width: 32,
        height: 20,
        selected: false,
      },
      {
        id: 'grid-32-20-32-20',
        displayNumber: 5,
        row: 1,
        column: 1,
        x: 32,
        y: 20,
        width: 32,
        height: 20,
        selected: false,
      },
      {
        id: 'grid-64-20-32-20',
        displayNumber: 6,
        row: 1,
        column: 2,
        x: 64,
        y: 20,
        width: 32,
        height: 20,
        selected: false,
      },
    ])
  })

  test.each([
    [32, 32, 32, 32, 1],
    [16, 16, 32, 32, 0],
    [64, 16, 32, 32, 0],
    [16, 64, 32, 32, 0],
    [4096, 4096, 32, 32, 16384],
  ])('image %i×%i, frame %i×%i gives %i complete frames', async (w, h, fw, fh, count) => {
    expect(generateFrames(w, h, fw, fh)).toHaveLength(count)
  })

  test.each([0, -32, 1.5, NaN, Infinity])('rejects invalid frame dimension %s', async (value) => {
    const message = 'Image and frame dimensions must be positive integers'
    for (const run of [
      () => generateFrames(256, 128, value, 32),
      () => generateFrames(256, 128, 32, value),
    ]) {
      expect(run).toThrow(RangeError)
      expect(run).toThrow(message)
    }
  })

  test('regeneration returns fresh unselected objects', async () => {
    const first = generateFrames(64, 32, 32, 32)
    first[0].selected = true
    const second = generateFrames(64, 32, 32, 32)
    expect(second[0].selected).toBe(false)
    expect(second[0]).not.toBe(first[0])
  })
})
