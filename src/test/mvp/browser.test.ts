import { afterEach, expect, test, vi } from 'vitest'
import { installBrowser } from './browser'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('browser harness: file metadata, asynchronous image load and URL lifecycle', async () => {
  const browser = installBrowser()
  const file = browser.file()
  expect([file.name, file.type, file.size]).toEqual(['player.png', 'image/png', 19])
  const url = URL.createObjectURL(file)
  const image = new Image()
  const loaded = new Promise((resolve) => image.addEventListener('load', resolve))
  image.src = url
  await loaded
  expect([image.naturalWidth, image.naturalHeight]).toEqual([256, 128])
  URL.revokeObjectURL(url)
  expect(browser.urls.size).toBe(0)
})

test('browser harness: broken image raises error', async () => {
  const browser = installBrowser()
  const image = new Image()
  const error = new Promise((resolve) => image.addEventListener('error', resolve))
  image.src = URL.createObjectURL(browser.file(undefined, true))
  await expect(error).resolves.toBeInstanceOf(Event)
})

test('browser harness: canvas contexts are isolated and downloads capture Blob before revocation', async () => {
  const browser = installBrowser()
  const first = document.createElement('canvas')
  const second = document.createElement('canvas')
  expect(first.getContext('2d')).not.toBe(second.getContext('2d'))
  const blob = await new Promise<Blob | null>((resolve) => first.toBlob(resolve, 'image/png'))
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob!)
  anchor.download = 'frame_001.png'
  anchor.click()
  URL.revokeObjectURL(anchor.href)
  expect(browser.downloads).toEqual([{ name: 'frame_001.png', blob: browser.png }])
})
