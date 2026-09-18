import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installBrowser } from '../mvp/browser'
import { getExportZip, spacedFrames } from './contracts'
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
  const exportZip = getExportZip()
  browser.toBlob.mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
    const [, x, y] = browser.context(this).drawImage.mock.calls[0]
    callback(new Blob([`PNG bytes for crop ${x},${y}`], { type: 'image/png' }))
  })
  const input = [spacedFrames[4], spacedFrames[0]]
  const zip = await exportZip(document.createElement('img'), input)
  expect(zip.type).toBe('application/zip')
  const entries = readZip(await blobBytes(zip))
  expect([...entries.keys()]).toEqual(['frame_001.png', 'frame_005.png'])
  expect(new TextDecoder().decode(entries.get('frame_001.png'))).toBe('PNG bytes for crop 10,8')
  expect(new TextDecoder().decode(entries.get('frame_005.png'))).toBe('PNG bytes for crop 46,46')
  expect(input.map((frame) => frame.id)).toEqual([4, 0])
  expect(browser.downloads).toHaveLength(0)
  expect(browser.createObjectURL).not.toHaveBeenCalled()
})

test('empty selection rejects without encoding or downloads', async () => {
  const exportZip = getExportZip()
  await expect(exportZip(document.createElement('img'), [])).rejects.toThrow(/select|empty|frame/i)
  expect(browser.toBlob).not.toHaveBeenCalled()
})

test('PNG encoding failure rejects the entire archive', async () => {
  const exportZip = getExportZip()
  browser.toBlob
    .mockImplementationOnce((callback) => callback(browser.png))
    .mockImplementationOnce((callback) => callback(null))
  await expect(
    exportZip(document.createElement('img'), [spacedFrames[0], spacedFrames[4]]),
  ).rejects.toThrow(/encode|png|export/i)
  expect(browser.downloads).toHaveLength(0)
})

test('missing Canvas context rejects instead of producing an empty archive', async () => {
  const exportZip = getExportZip()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  await expect(exportZip(document.createElement('img'), [spacedFrames[0]])).rejects.toThrow(
    /canvas|context/i,
  )
  expect(browser.toBlob).not.toHaveBeenCalled()
})
