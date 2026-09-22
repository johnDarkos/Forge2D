import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { exportFrame } from '@/features/export-sprites'
import { frame10 } from '../fixtures/sheets'
import { installBrowser } from './browser'

let browser: ReturnType<typeof installBrowser>
beforeEach(() => {
  browser = installBrowser()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('FR-15–16: exact crop and PNG encoding', () => {
  test('crops frame 10 from (64,32), at native 32×32 resolution', async () => {
    const image = document.createElement('img')
    const blob = await exportFrame(image, frame10)
    expect(blob).toBe(browser.png)
    expect(blob.type).toBe('image/png')
    const entry = [...browser.contexts].find(
      ([, context]) => context.drawImage.mock.calls.length > 0,
    )
    expect(entry).toBeDefined()
    const [canvas, context] = entry!
    expect([canvas.width, canvas.height]).toEqual([32, 32])
    expect(context.drawImage).toHaveBeenCalledExactlyOnceWith(image, 64, 32, 32, 32, 0, 0, 32, 32)
    expect(browser.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })

  test('preserves non-square crop dimensions and source coordinates', async () => {
    const image = document.createElement('img')
    await exportFrame(image, { ...frame10, x: 96, y: 20, width: 48, height: 20 })
    const entry = [...browser.contexts].find(
      ([, context]) => context.drawImage.mock.calls.length > 0,
    )
    expect(entry).toBeDefined()
    expect([entry![0].width, entry![0].height]).toEqual([48, 20])
    expect(entry![1].drawImage).toHaveBeenCalledWith(image, 96, 20, 48, 20, 0, 0, 48, 20)
  })

  test('rejects null toBlob result instead of downloading an empty file', async () => {
    browser.toBlob.mockImplementation((callback) => callback(null))
    await expect(exportFrame(document.createElement('img'), frame10)).rejects.toMatchObject({
      name: 'SpriteExportError',
      code: 'encoding-failed',
      message: 'Unable to encode PNG for export',
    })
    expect(browser.downloads).toHaveLength(0)
  })

  test('rejects unavailable 2D context', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(exportFrame(document.createElement('img'), frame10)).rejects.toMatchObject({
      name: 'SpriteExportError',
      code: 'context-unavailable',
      message: 'Unable to export PNG: Canvas is unavailable',
    })
  })
})
