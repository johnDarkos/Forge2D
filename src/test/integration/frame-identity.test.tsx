import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  createSpriteEditorResult,
  generateFrames,
  manualFrameToSprite,
  removeSprite,
  renameSprite,
} from '@/entities/sprite/domain'
import { ExportButton, exportFramesZip } from '@/features/export-sprites'
import { installBrowser } from '../mvp/browser'
import { blobBytes, readZip } from '../v02/readZip'

let browser: ReturnType<typeof installBrowser>

beforeEach(() => {
  browser = installBrowser()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('grid frames use stable string IDs and keep display order as presentation data', () => {
  const [first, second] = generateFrames(64, 32, 32, 32)

  expect(first).toMatchObject({ id: 'grid-0-0-32-32', displayNumber: 1 })
  expect(second).toMatchObject({ id: 'grid-32-0-32-32', displayNumber: 2 })
  expect({ ...second, displayNumber: 20 }.id).toBe(second.id)
  expect(new Set([first.id, second.id]).size).toBe(2)
})

test('rename and removal use the stable string ID', () => {
  const sprites = [
    manualFrameToSprite({ x: 0, y: 0, width: 16, height: 16 }, 'manual-alpha', 'idle'),
    manualFrameToSprite({ x: 16, y: 0, width: 16, height: 16 }, 'manual-beta', 'walk'),
  ]

  const renamed = renameSprite(sprites, 'manual-alpha', 'idle_renamed')
  expect(renamed[0].id).toBe('manual-alpha')
  expect(removeSprite(renamed, 'manual-alpha').map((sprite) => sprite.id)).toEqual(['manual-beta'])
  expect(
    createSpriteEditorResult({
      source: { width: 32, height: 16 },
      sprites: renamed,
      settings: { mode: 'manual' },
    }).sprites.map((sprite) => sprite.id),
  ).toEqual(['manual-alpha', 'manual-beta'])
})

test('ZIP selection is identified by string ID and sorted by display number', async () => {
  browser.toBlob.mockImplementation((callback) => callback(browser.png))
  const frames = [
    {
      id: 'manual-beta',
      displayNumber: 2,
      row: 0,
      column: 0,
      x: 16,
      y: 0,
      width: 16,
      height: 16,
    },
    {
      id: 'manual-alpha',
      displayNumber: 1,
      row: 0,
      column: 0,
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    },
  ]

  const archive = await exportFramesZip(document.createElement('img'), frames)
  expect([...readZip(await blobBytes(archive)).keys()]).toEqual(['frame_001.png', 'frame_002.png'])
  expect(frames.map((frame) => frame.id)).toEqual(['manual-beta', 'manual-alpha'])
})

test('current manual region exports without receiving a frame ID', async () => {
  const sheet = {
    file: null,
    url: 'blob:sheet',
    image: document.createElement('img'),
    metadata: {
      name: 'sheet.png',
      type: 'image/png' as const,
      size: 1,
      width: 32,
      height: 32,
    },
  }
  const region = { x: 2, y: 3, width: 10, height: 12 }
  const user = userEvent.setup()

  render(
    <ExportButton
      sheet={sheet}
      frames={[]}
      region={region}
      regionExport
      onExportingChange={vi.fn<(exporting: boolean) => void>()}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Download PNG' }))

  expect(Array.from(browser.contexts.values()).at(-1)?.drawImage).toHaveBeenCalledWith(
    sheet.image,
    2,
    3,
    10,
    12,
    0,
    0,
    10,
    12,
  )
  expect(browser.downloads[0]?.name).toBe('selection.png')
  expect(region).not.toHaveProperty('id')
})
