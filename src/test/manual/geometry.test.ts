import { expect, test } from 'vitest'
import { selectionRect } from '@/entities/sprite/domain'

test.each([
  [
    { x: 12, y: 8 },
    { x: 70, y: 90 },
    { x: 12, y: 8, width: 58, height: 82 },
  ],
  [
    { x: 70, y: 90 },
    { x: 12, y: 8 },
    { x: 12, y: 8, width: 58, height: 82 },
  ],
  [
    { x: 12.3, y: 8.7 },
    { x: 70.1, y: 90.2 },
    { x: 12, y: 8, width: 59, height: 83 },
  ],
  [
    { x: 80, y: 80 },
    { x: 200, y: 200 },
    { x: 80, y: 80, width: 20, height: 20 },
  ],
  [
    { x: 12, y: 8 },
    { x: -30, y: -20 },
    { x: 0, y: 0, width: 12, height: 8 },
  ],
  [{ x: 10, y: 10 }, { x: 10, y: 10 }, null],
  [{ x: 10, y: 10 }, { x: 10, y: 30 }, null],
  [{ x: 110, y: 110 }, { x: 150, y: 120 }, null],
] as const)('normalizes drag into bounded pixel crop %#', (start, end, result) => {
  expect(selectionRect(start, end, 100, 100)).toEqual(result)
})
