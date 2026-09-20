import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SpriteEditor } from '@/widgets/sprite-editor'
import { installBrowser } from '../mvp/browser'
import { installPointerEvents, uninstallPointerEvents } from '../pointer'
import { blobBytes, readZip } from '../v02/readZip'

let browser: ReturnType<typeof installBrowser>
let pointers: ReturnType<typeof installPointerEvents>
beforeEach(() => {
  browser = installBrowser()
  pointers = installPointerEvents()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  uninstallPointerEvents()
})
async function open() {
  render(<SpriteEditor />)
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Upload sprite sheet'), browser.file())
  await screen.findByText('player.png')
  await user.click(screen.getByRole('button', { name: 'Select region' }))
  const canvas = screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 50,
    left: 100,
    top: 50,
    width: 128,
    height: 64,
    right: 228,
    bottom: 114,
    toJSON: () => ({}),
  })
  return { user, canvas }
}
function drag(canvas: HTMLCanvasElement, from = [112, 58], to = [160, 90]) {
  fireEvent.pointerDown(canvas, { clientX: from[0], clientY: from[1], button: 0, pointerId: 1 })
  fireEvent.pointerMove(canvas, { clientX: to[0], clientY: to[1], pointerId: 1 })
  fireEvent.pointerUp(canvas, { clientX: to[0], clientY: to[1], button: 0, pointerId: 1 })
}

test('manual drag uses original pixels, hides grid settings and exports one complete PNG', async () => {
  const { user, canvas } = await open()
  expect(screen.queryByRole('spinbutton', { name: 'Frame width' })).not.toBeInTheDocument()
  drag(canvas)
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  expect(browser.context(preview).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    24,
    16,
    96,
    64,
    0,
    0,
    96,
    64,
  )
  await user.click(screen.getByRole('button', { name: 'Download PNG' }))
  await waitFor(() =>
    expect(browser.downloads).toEqual([{ name: 'selection.png', blob: browser.png }]),
  )
})

test('single click cannot create a crop; drawing disables export', async () => {
  const { canvas } = await open()
  drag(canvas, [112, 58], [112, 58])
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  drag(canvas)
  fireEvent.pointerDown(canvas, { clientX: 120, clientY: 65, button: 0, pointerId: 1 })
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  fireEvent.keyDown(canvas, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
})

test('a second pointer, the right button and starts outside the image never hijack the gesture', async () => {
  const { canvas } = await open()
  fireEvent.pointerDown(canvas, { clientX: 230, clientY: 58, button: 0, pointerId: 1 })
  fireEvent.pointerUp(canvas, { clientX: 230, clientY: 58, button: 0, pointerId: 1 })
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  fireEvent.pointerDown(canvas, { clientX: 112, clientY: 58, button: 2, pointerId: 1 })
  fireEvent.pointerMove(canvas, { clientX: 160, clientY: 90, pointerId: 1 })
  fireEvent.pointerUp(canvas, { clientX: 160, clientY: 90, button: 2, pointerId: 1 })
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  // Жест принадлежит первому указателю: второй не меняет рамку и не завершает её.
  fireEvent.pointerDown(canvas, { clientX: 112, clientY: 58, button: 0, pointerId: 1 })
  fireEvent.pointerMove(canvas, { clientX: 160, clientY: 90, pointerId: 1 })
  expect(pointers.capturedPointers(canvas)).toEqual([1])
  fireEvent.pointerDown(canvas, { clientX: 200, clientY: 100, button: 0, pointerId: 2 })
  fireEvent.pointerMove(canvas, { clientX: 220, clientY: 110, pointerId: 2 })
  fireEvent.pointerUp(canvas, { clientX: 220, clientY: 110, button: 0, pointerId: 2 })
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  fireEvent.pointerUp(canvas, { clientX: 160, clientY: 90, button: 0, pointerId: 1 })
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  expect([preview.width, preview.height]).toEqual([96, 64])
  expect(pointers.capturedPointers(canvas)).toEqual([])
})

test('Escape and pointer cancellation keep the previous crop', async () => {
  const { canvas } = await open()
  drag(canvas)
  fireEvent.pointerDown(canvas, { clientX: 120, clientY: 65, button: 0, pointerId: 1 })
  fireEvent.pointerMove(canvas, { clientX: 180, clientY: 100, pointerId: 1 })
  fireEvent.pointerCancel(canvas, { pointerId: 1 })
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  expect([preview.width, preview.height]).toEqual([96, 64])
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
})

test('clear, mode switch and new upload remove stale manual selections', async () => {
  const { user, canvas } = await open()
  drag(canvas)
  await user.click(screen.getByRole('button', { name: 'Clear region' }))
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  drag(canvas)
  await user.click(screen.getByRole('button', { name: 'Grid mode' }))
  expect(screen.getByText('Selected frames: 0')).toBeInTheDocument()
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Select region' }))
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  drag(canvas)
  await user.upload(
    screen.getByLabelText('Upload sprite sheet'),
    browser.file({ name: 'new.png', type: 'image/png', width: 64, height: 64 }),
  )
  await screen.findByText('new.png')
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
})

test('manual selection remains usable when previous grid settings were invalid', async () => {
  const { user, canvas } = await open()
  await user.click(screen.getByRole('button', { name: 'Grid mode' }))
  await user.clear(screen.getByRole('spinbutton', { name: 'Frame width' }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Select region' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  drag(canvas)
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
})

test('manual PNG encoding failure is visible and keeps the crop for retry', async () => {
  const { user, canvas } = await open()
  drag(canvas)
  browser.toBlob.mockImplementation((callback) => callback(null))
  await user.click(screen.getByRole('button', { name: 'Download PNG' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to encode PNG for export')
  expect(browser.downloads).toHaveLength(0)
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
})

test('saved crops keep their pixels, names and order while a new region is drawn', async () => {
  const { user, canvas } = await open()
  expect(screen.getByRole('button', { name: 'Add frame' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
  drag(canvas)
  await user.click(screen.getByRole('button', { name: 'Add frame' }))
  expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  await user.clear(screen.getByRole('textbox', { name: 'Frame 1 name' }))
  await user.type(screen.getByRole('textbox', { name: 'Frame 1 name' }), 'idle')
  drag(canvas, [164, 66], [196, 106])
  await user.click(screen.getByRole('button', { name: 'Add frame' }))
  expect(screen.getByText('Saved frames: 2')).toBeInTheDocument()
  const first = screen.getByLabelText('Saved frame 1 preview') as HTMLCanvasElement
  const second = screen.getByLabelText('Saved frame 2 preview') as HTMLCanvasElement
  expect(browser.context(first).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    24,
    16,
    96,
    64,
    0,
    0,
    96,
    64,
  )
  expect(browser.context(second).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    128,
    32,
    64,
    80,
    0,
    0,
    64,
    80,
  )
  drag(canvas, [104, 54], [108, 58]) // An unadded draft must not enter the ZIP.
  browser.toBlob.mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
    const [, x, y, width, height] = browser.context(this).drawImage.mock.calls[0]
    callback(new Blob([`${x},${y},${width},${height}`], { type: 'image/png' }))
  })
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  await waitFor(() => expect(browser.downloads).toHaveLength(1))
  expect(browser.downloads[0].name).toBe('player_sprites.zip')
  const downloadedBlob = browser.downloads[0].blob
  if (!downloadedBlob) throw new Error('ZIP download has no Blob')
  const entries = readZip(await blobBytes(downloadedBlob))
  expect([...entries.keys()]).toEqual(['idle.png', 'frame_002.png'])
  expect([...entries.values()].map((bytes) => new TextDecoder().decode(bytes))).toEqual([
    '24,16,96,64',
    '128,32,64,80',
  ])
})

test('deleting does not reuse IDs, mode switches keep saved frames, a new source clears them', async () => {
  const { user, canvas } = await open()
  for (let index = 0; index < 2; index++) {
    drag(canvas)
    await user.click(screen.getByRole('button', { name: 'Add frame' }))
  }
  await user.click(screen.getByRole('button', { name: 'Remove frame 1' }))
  expect(screen.queryByRole('textbox', { name: 'Frame 1 name' })).not.toBeInTheDocument()
  drag(canvas)
  await user.click(screen.getByRole('button', { name: 'Add frame' }))
  expect(screen.getByRole('textbox', { name: 'Frame 3 name' })).toHaveValue('frame_003')
  await user.click(screen.getByRole('button', { name: 'Grid mode' }))
  await user.click(screen.getByRole('button', { name: 'Select region' }))
  expect(screen.getByText('Saved frames: 2')).toBeInTheDocument()
  await user.upload(
    screen.getByLabelText('Upload sprite sheet'),
    browser.file({ name: 'new.png', type: 'image/png', width: 64, height: 64 }),
  )
  await screen.findByText('new.png')
  expect(screen.getByText('Saved frames: 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
})

test('drawing prevents adding unfinished crops; export locks collection changes until encoding completes', async () => {
  const { user, canvas } = await open()
  drag(canvas)
  fireEvent.pointerDown(canvas, { clientX: 120, clientY: 65, button: 0, pointerId: 1 })
  expect(screen.getByRole('button', { name: 'Add frame' })).toBeDisabled()
  fireEvent.keyDown(canvas, { key: 'Escape' })
  await user.click(screen.getByRole('button', { name: 'Add frame' }))
  let finish: BlobCallback | undefined
  browser.toBlob.mockImplementation((callback) => {
    finish = callback
  })
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Remove frame 1' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Grid mode' })).toBeDisabled()
  expect(screen.getByLabelText('Upload sprite sheet')).toBeDisabled()
  finish!(browser.png)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toBeEnabled())
  expect(browser.downloads).toHaveLength(1)
})

test('failed saved-frame ZIP preserves the list for retry and removing the last frame disables ZIP', async () => {
  const { user, canvas } = await open()
  for (let index = 0; index < 2; index++) {
    drag(canvas)
    await user.click(screen.getByRole('button', { name: 'Add frame' }))
  }
  browser.toBlob
    .mockImplementationOnce((callback) => callback(browser.png))
    .mockImplementationOnce((callback) => callback(null))
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to encode PNG for export')
  expect(browser.downloads).toHaveLength(0)
  expect(screen.getByText('Saved frames: 2')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  await waitFor(() => expect(browser.downloads).toHaveLength(1))
  for (const id of [1, 2])
    await user.click(screen.getByRole('button', { name: `Remove frame ${id}` }))
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
})
