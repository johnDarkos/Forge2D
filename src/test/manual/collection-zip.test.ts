import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { exportFramesZip } from '@/features/export-sprites'
import { installBrowser } from '../mvp/browser'
import { blobBytes, readZip } from '../v02/readZip'

beforeEach(() => {
  installBrowser()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('ZIP preserves every named frame despite duplicate, unsafe, empty and reserved names', async () => {
  const names = ['idle', 'idle', 'IDLE', '../walk\\left.png', '   ', 'CON', 'idle_2', 'бег']
  const frames = names.map((name, id) => ({
    id,
    name,
    row: 0,
    column: 0,
    x: id * 10,
    y: 0,
    width: 10,
    height: 20,
  }))
  const zip = await exportFramesZip(document.createElement('img'), frames)
  const entries = readZip(await blobBytes(zip))
  expect([...entries.keys()]).toEqual([
    'idle.png',
    'idle_2.png',
    'IDLE_3.png',
    '_walk_left.png',
    'frame_005.png',
    '_CON.png',
    'idle_2_2.png',
    'бег.png',
  ])
  expect(frames.map((frame) => frame.name)).toEqual(names)
})
