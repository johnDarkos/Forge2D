import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { exportFramesZip } from '@/features/export-sprites'
import { installBrowser } from '../mvp/browser'
import { spacedFrames } from './fixtures'
import { blobBytes, readZip } from './readZip'

let browser: ReturnType<typeof installBrowser>
beforeEach(() => {
  browser = installBrowser()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('ZIP contains only requested frames, original IDs, sorted names and exact encoded bytes', async () => {
  browser.toBlob.mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
    const [, x, y] = browser.context(this).drawImage.mock.calls[0]
    callback(new Blob([`PNG bytes for crop ${x},${y}`], { type: 'image/png' }))
  })
  const input = [spacedFrames[4], spacedFrames[0]]
  const zip = await exportFramesZip(document.createElement('img'), input)
  expect(zip.type).toBe('application/zip')
  const entries = readZip(await blobBytes(zip))
  expect([...entries.keys()]).toEqual(['frame_001.png', 'frame_005.png'])
  expect(new TextDecoder().decode(entries.get('frame_001.png'))).toBe('PNG bytes for crop 10,8')
  expect(new TextDecoder().decode(entries.get('frame_005.png'))).toBe('PNG bytes for crop 46,46')
  expect(input.map((frame) => frame.id)).toEqual(['grid-46-46-32-32', 'grid-10-8-32-32'])
  expect(browser.downloads).toHaveLength(0)
  expect(browser.createObjectURL).not.toHaveBeenCalled()
})

test('empty selection rejects without encoding or downloads', async () => {
  await expect(exportFramesZip(document.createElement('img'), [])).rejects.toThrow(
    /select|empty|frame/i,
  )
  expect(browser.toBlob).not.toHaveBeenCalled()
})

test('PNG encoding failure rejects the entire archive', async () => {
  browser.toBlob
    .mockImplementationOnce((callback) => callback(browser.png))
    .mockImplementationOnce((callback) => callback(null))
  await expect(
    exportFramesZip(document.createElement('img'), [spacedFrames[0], spacedFrames[4]]),
  ).rejects.toThrow(/encode|png|export/i)
  expect(browser.downloads).toHaveLength(0)
})

test('missing Canvas context rejects instead of producing an empty archive', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  await expect(exportFramesZip(document.createElement('img'), [spacedFrames[0]])).rejects.toThrow(
    /canvas|context/i,
  )
  expect(browser.toBlob).not.toHaveBeenCalled()
})
