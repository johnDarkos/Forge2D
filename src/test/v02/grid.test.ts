import { expect, test } from 'vitest'
import { generateGrid, spacedFrames, spacing } from './contracts'

test('offset and gap produce six complete frames including last cell without trailing gap', () => {
  expect(generateGrid(114, 78, 32, 32, spacing)).toEqual(spacedFrames)
})

test('zero offsets and gaps preserve the MVP contract', () => {
  expect(generateGrid(256, 128, 32, 32, { offsetX: 0, offsetY: 0, gapX: 0, gapY: 0 })).toEqual(
    generateGrid(256, 128, 32, 32),
  )
})

test('asymmetric rectangular frames do not swap axes', () => {
  expect(generateGrid(47, 29, 20, 10, { offsetX: 4, offsetY: 5, gapX: 3, gapY: 4 })).toEqual([
    { id: 0, row: 0, column: 0, x: 4, y: 5, width: 20, height: 10, selected: false },
    { id: 1, row: 0, column: 1, x: 27, y: 5, width: 20, height: 10, selected: false },
    { id: 2, row: 1, column: 0, x: 4, y: 19, width: 20, height: 10, selected: false },
    { id: 3, row: 1, column: 1, x: 27, y: 19, width: 20, height: 10, selected: false },
  ])
})

test('partial right and bottom cells are excluded after spacing', () => {
  expect(generateGrid(113, 77, 32, 32, spacing)).toEqual(spacedFrames.slice(0, 2))
})

test.each([
  { offsetX: 100, offsetY: 8 },
  { offsetX: 10, offsetY: 70 },
  { offsetX: 114, offsetY: 8 },
  { offsetX: 150, offsetY: 8 },
])('offset outside available complete cell returns empty grid: %j', (offsets) => {
  expect(generateGrid(114, 78, 32, 32, { ...spacing, ...offsets })).toEqual([])
})

for (const field of ['offsetX', 'offsetY', 'gapX', 'gapY'] as const) {
  test.each([-1, 0.5, NaN, Infinity])(`invalid ${field} %s is rejected`, (value) => {
    expect(() => generateGrid(114, 78, 32, 32, { ...spacing, [field]: value })).toThrow(/.+/)
  })
}

test('a large gap does not suppress the first complete frame', () => {
  expect(generateGrid(42, 40, 32, 32, { ...spacing, gapX: 500, gapY: 500 })).toEqual([
    spacedFrames[0],
  ])
})
