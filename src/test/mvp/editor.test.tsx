import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { player, replacement, uneven } from '../fixtures/sheets'
import { installBrowser } from './browser'
import { getApp } from './contracts'

let browser: ReturnType<typeof installBrowser>
beforeEach(() => {
  browser = installBrowser()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function open() {
  const App = await getApp()
  const view = render(<App />)
  const user = userEvent.setup()
  return { ...view, user }
}
function uploadInput() {
  return screen.getByLabelText(/upload (image|sprite sheet)/i) as HTMLInputElement
}
function sheetCanvas() {
  return screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
}
function previewCanvas() {
  return screen.getByLabelText('Frame preview') as HTMLCanvasElement
}
function selected(count: number) {
  expect(
    screen.getByText(new RegExp(`Selected(?: frames)?:\\s*${count}$`, 'i')),
  ).toBeInTheDocument()
}
async function settings(user: ReturnType<typeof userEvent.setup>, width = '32', height = '32') {
  const w = screen.getByRole('spinbutton', { name: /frame width/i })
  const h = screen.getByRole('spinbutton', { name: /frame height/i })
  await user.clear(w)
  if (width) await user.type(w, width)
  await user.clear(h)
  if (height) await user.type(h, height)
  await user.tab()
}
async function loaded(sheet = player) {
  const view = await open()
  await view.user.upload(uploadInput(), browser.file(sheet))
  await screen.findByText(new RegExp(sheet.name.replace('.', '\\.')))
  await settings(view.user)
  return view
}
function clickAt(x: number, y: number, scale = 1) {
  const canvas = sheetCanvas()
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 50,
    left: 100,
    top: 50,
    right: 100 + canvas.width * scale,
    bottom: 50 + canvas.height * scale,
    width: canvas.width * scale,
    height: canvas.height * scale,
    toJSON: () => ({}),
  })
  fireEvent.click(canvas, { clientX: 100 + x * scale, clientY: 50 + y * scale })
}

describe('MVP user acceptance: FR-01–18', () => {
  test('empty state has image file input and export is disabled', async () => {
    await open()
    expect(screen.getByRole('heading', { name: 'Sprite Cutter' })).toBeInTheDocument()
    expect(screen.getByText(/no image loaded/i)).toBeInTheDocument()
    expect(uploadInput().type).toBe('file')
    expect(uploadInput().accept).toMatch(/image\//)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
  })

  test.each(['image/png', 'image/jpeg', 'image/webp'])(
    'loads %s locally and draws image with native dimensions',
    async (type) => {
      const view = await open()
      const file = browser.file({ ...player, type })
      await view.user.upload(uploadInput(), file)
      await screen.findByText(/player\.png/)
      expect(screen.getByText(/256\s*[×x]\s*128/)).toBeInTheDocument()
      expect(browser.createObjectURL).toHaveBeenCalledWith(file)
      const canvas = sheetCanvas()
      expect([canvas.width, canvas.height]).toEqual([256, 128])
      expect(browser.context(canvas).drawImage).toHaveBeenCalled()
      expect(browser.context(canvas).drawImage.mock.calls[0][0]).toBeInstanceOf(HTMLImageElement)
      expect(browser.fetch).not.toHaveBeenCalled()
      expect(browser.xhr).not.toHaveBeenCalled()
    },
  )

  test('rejects unsupported file even if accept filter is bypassed', async () => {
    await open()
    fireEvent.change(uploadInput(), {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported|png|jpeg|webp|image/i)
    expect(browser.createObjectURL).not.toHaveBeenCalled()
  })

  test('cancelled file dialog keeps empty state', async () => {
    await open()
    fireEvent.change(uploadInput(), { target: { files: [] } })
    expect(screen.getByText(/no image loaded/i)).toBeInTheDocument()
    expect(browser.createObjectURL).not.toHaveBeenCalled()
  })

  test('decode failure shows a friendly error and releases object URL', async () => {
    const { user } = await open()
    await user.upload(uploadInput(), browser.file(player, true))
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load image/i)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
    await waitFor(() => expect(browser.urls.size).toBe(0))
  })

  test('32×32 settings show 8 columns, 4 rows, 32 frames and grid lines', async () => {
    await loaded()
    expect(screen.getByText(/columns:\s*8/i)).toBeInTheDocument()
    expect(screen.getByText(/rows:\s*4/i)).toBeInTheDocument()
    expect(screen.getByText(/^(?:total )?frames:\s*32$/i)).toBeInTheDocument()
    const context = browser.context(sheetCanvas())
    // Both line-based and per-cell rectangle-based rendering satisfy the contract.
    const segments = context.lineTo.mock.calls
    const rectangles = [...context.strokeRect.mock.calls, ...context.rect.mock.calls]
    expect(
      segments.some(([x]) => x === 32) || rectangles.some(([x, , w]) => x === 32 && w === 32),
    ).toBe(true)
    expect(
      segments.some(([, y]) => y === 32) || rectangles.some(([, y, , h]) => y === 32 && h === 32),
    ).toBe(true)
  })

  test('click column 2, row 1 highlights and previews source rectangle (64,32,32,32)', async () => {
    await loaded()
    clickAt(70, 40)
    selected(1)
    const context = browser.context(sheetCanvas())
    const rectangles = [
      ...context.fillRect.mock.calls,
      ...context.strokeRect.mock.calls,
      ...context.rect.mock.calls,
    ]
    expect(rectangles).toContainEqual([64, 32, 32, 32])
    const preview = browser.context(previewCanvas())
    expect(preview.drawImage).toHaveBeenLastCalledWith(
      expect.any(HTMLImageElement),
      64,
      32,
      32,
      32,
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    )
  })

  test('repeated click toggles off and disables export', async () => {
    await loaded()
    clickAt(70, 40)
    clickAt(70, 40)
    selected(0)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
  })

  test('selection supports several independent frames', async () => {
    await loaded()
    clickAt(1, 1)
    clickAt(33, 1)
    clickAt(65, 33)
    selected(3)
    clickAt(33, 1)
    selected(2)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeEnabled()
  })

  test('CSS-scaled canvas maps pointer back to image coordinates', async () => {
    await loaded()
    clickAt(70, 40, 0.5)
    selected(1)
    expect(browser.context(previewCanvas()).drawImage).toHaveBeenLastCalledWith(
      expect.any(HTMLImageElement),
      64,
      32,
      32,
      32,
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    )
  })

  test('exact cell boundary selects next column', async () => {
    await loaded()
    clickAt(32, 0)
    expect(browser.context(previewCanvas()).drawImage).toHaveBeenLastCalledWith(
      expect.any(HTMLImageElement),
      32,
      0,
      32,
      32,
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    )
  })

  test('ignores leftover strips and right/bottom outside edges', async () => {
    await loaded(uneven)
    clickAt(98, 20)
    clickAt(20, 98)
    clickAt(100, 20)
    clickAt(-1, 20)
    selected(0)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
  })

  test.each(['', '0', '-32', '1.5'])(
    'invalid width %j shows validation and prevents export',
    async (width) => {
      const { user } = await loaded()
      clickAt(1, 1)
      await settings(user, width)
      expect(screen.getByRole('alert')).toHaveTextContent(/frame|size|width/i)
      expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
    },
  )

  test.each(['', '0', '-32', '1.5'])(
    'invalid height %j shows validation and prevents export',
    async (height) => {
      const { user } = await loaded()
      await settings(user, '32', height)
      expect(screen.getByRole('alert')).toHaveTextContent(/frame|size|height/i)
      expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
    },
  )

  test('frame larger than image shows error and recovers after correction', async () => {
    const { user } = await loaded()
    await settings(user, '512')
    expect(screen.getByRole('alert')).toHaveTextContent(/larger|size/i)
    await settings(user)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    clickAt(1, 1)
    selected(1)
  })

  test('changing grid clears selection and stale preview', async () => {
    const { user } = await loaded()
    clickAt(70, 40)
    await settings(user, '64', '64')
    selected(0)
    expect(screen.getByRole('button', { name: /export selected/i })).toBeDisabled()
    const preview = screen.queryByLabelText('Frame preview') as HTMLCanvasElement | null
    expect(preview === null || browser.context(preview).clearRect.mock.calls.length > 0).toBe(true)
  })

  test('exports only selected frames as separate named PNG blobs and releases URLs', async () => {
    const { user } = await loaded()
    clickAt(1, 1)
    clickAt(33, 1)
    clickAt(65, 33)
    clickAt(33, 1)
    await user.click(screen.getByRole('button', { name: /export selected/i }))
    await waitFor(() => expect(browser.downloads).toHaveLength(2))
    expect(browser.downloads.map((download) => download.name)).toEqual([
      'frame_001.png',
      'frame_011.png',
    ])
    expect(browser.downloads.every((download) => download.blob?.type === 'image/png')).toBe(true)
    const crops = [...browser.contexts.values()].flatMap((context) => context.drawImage.mock.calls)
    expect(crops).toContainEqual([expect.any(HTMLImageElement), 0, 0, 32, 32, 0, 0, 32, 32])
    expect(crops).toContainEqual([expect.any(HTMLImageElement), 64, 32, 32, 32, 0, 0, 32, 32])
    const exportedUrls = browser.createObjectURL.mock.results.filter(
      (_, index) => !(browser.createObjectURL.mock.calls[index][0] instanceof File),
    )
    await waitFor(() => {
      expect(exportedUrls).toHaveLength(2)
      for (const result of exportedUrls)
        expect(browser.revokeObjectURL).toHaveBeenCalledWith(result.value)
    })
    expect(browser.fetch).not.toHaveBeenCalled()
    expect(browser.xhr).not.toHaveBeenCalled()
  })

  test('export failure is visible without initiating a broken download', async () => {
    const { user } = await loaded()
    clickAt(1, 1)
    browser.toBlob.mockImplementation((callback) => callback(null))
    await user.click(screen.getByRole('button', { name: /export selected/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/export|png|encode|save/i)
    expect(browser.downloads).toHaveLength(0)
  })

  test('new upload replaces metadata and grid, clears selection, releases old URL on replacement/unmount', async () => {
    const { user, unmount } = await loaded()
    clickAt(70, 40)
    const oldUrl = browser.createObjectURL.mock.results[0].value
    await user.upload(uploadInput(), browser.file(replacement))
    await screen.findByText(/enemy\.png/)
    expect(screen.queryByText(/player\.png/)).not.toBeInTheDocument()
    expect(screen.getByText(/64\s*[×x]\s*32/)).toBeInTheDocument()
    selected(0)
    expect(screen.getByText(/^(?:total )?frames:\s*2$/i)).toBeInTheDocument()
    expect(browser.revokeObjectURL).toHaveBeenCalledWith(oldUrl)
    const preview = screen.queryByLabelText('Frame preview') as HTMLCanvasElement | null
    expect(preview === null || browser.context(preview).clearRect.mock.calls.length > 0).toBe(true)
    unmount()
    await waitFor(() => expect(browser.urls.size).toBe(0))
  })
})

test('late image load cannot overwrite a newer upload', async () => {
  const { user } = await open()
  browser.deferImages()
  await user.upload(uploadInput(), browser.file(player))
  await user.upload(uploadInput(), browser.file(replacement))
  expect(browser.pendingImages).toHaveLength(2)
  act(() => browser.pendingImages[1]())
  await screen.findByText(/enemy\.png/)
  act(() => browser.pendingImages[0]())
  expect(screen.queryByText(/player\.png/)).not.toBeInTheDocument()
  expect(screen.getByText(/64\s*[×x]\s*32/)).toBeInTheDocument()
  expect(browser.urls.size).toBe(1)
})

test('unmount cancels pending image load and releases its URL', async () => {
  const { user, unmount } = await open()
  browser.deferImages()
  await user.upload(uploadInput(), browser.file())
  unmount()
  act(() => browser.pendingImages[0]())
  expect(browser.urls.size).toBe(0)
  expect(browser.revokeObjectURL).toHaveBeenCalledTimes(1)
})

test('deselecting the active frame clears preview while retaining other selected frames', async () => {
  await loaded()
  clickAt(1, 1)
  clickAt(70, 40)
  clickAt(70, 40)
  selected(1)
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
})

test('export locks input and selection until PNG encoding completes', async () => {
  const { user } = await loaded()
  clickAt(1, 1)
  let finish: BlobCallback | undefined
  browser.toBlob.mockImplementation((callback) => {
    finish = callback
  })
  await user.click(screen.getByRole('button', { name: /export selected/i }))
  expect(uploadInput()).toBeDisabled()
  expect(screen.getByRole('spinbutton', { name: /frame width/i })).toBeDisabled()
  expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled()
  clickAt(70, 40)
  selected(1)
  await act(async () => {
    finish!(browser.png)
  })
  await waitFor(() => expect(uploadInput()).toBeEnabled())
  expect(browser.downloads).toHaveLength(1)
})
