import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SpriteEditor } from '@/widgets/sprite-editor'
import { installBrowser } from '../mvp/browser'
import { spacedSheet, spacing } from './contracts'

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
  render(<SpriteEditor />)
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Upload sprite sheet'), browser.file(spacedSheet))
  await screen.findByText('spaced.png')
  return user
}
async function setField(user: ReturnType<typeof userEvent.setup>, name: string, value: string) {
  const input = screen.getByRole('spinbutton', { name })
  await user.clear(input)
  if (value) await user.type(input, value)
}
async function configure() {
  const user = await open()
  for (const [name, value] of [
    ['Offset X', spacing.offsetX],
    ['Offset Y', spacing.offsetY],
    ['Gap X', spacing.gapX],
    ['Gap Y', spacing.gapY],
  ] as const) {
    await setField(user, name, String(value))
  }
  return user
}
function click(x: number, y: number) {
  const canvas = screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 114,
    bottom: 78,
    width: 114,
    height: 78,
    toJSON: () => ({}),
  })
  fireEvent.click(canvas, { clientX: x, clientY: y })
}

test('offset/gap settings affect counters, preview and original PNG crop', async () => {
  const user = await configure()
  expect(screen.getByText('Columns: 3')).toBeInTheDocument()
  expect(screen.getByText('Rows: 2')).toBeInTheDocument()
  expect(screen.getByText('Frames: 6')).toBeInTheDocument()
  click(50, 50)
  expect(screen.getByText('Selected frames: 1')).toBeInTheDocument()
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  expect(browser.context(preview).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    46,
    46,
    32,
    32,
    0,
    0,
    32,
    32,
  )
  await user.click(screen.getByRole('button', { name: 'Export selected' }))
  await waitFor(() =>
    expect(browser.downloads).toEqual([{ name: 'frame_005.png', blob: browser.png }]),
  )
})

test('clicks in margins, gaps and outside the sheet never select a frame', async () => {
  await configure()
  for (const [x, y] of [
    [9, 10],
    [12, 7],
    [42, 10],
    [45, 10],
    [12, 40],
    [12, 45],
    [114, 50],
    [-1, 20],
  ])
    click(x, y)
  expect(screen.getByText('Selected frames: 0')).toBeInTheDocument()
  click(46, 46)
  expect(screen.getByText('Selected frames: 1')).toBeInTheDocument()
})

test('Select All selects complete frames once; Clear Selection removes preview', async () => {
  const user = await configure()
  click(11, 9)
  await user.click(screen.getByRole('button', { name: 'Select All' }))
  expect(screen.getByText('Selected frames: 6')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Select All' }))
  expect(screen.getByText('Selected frames: 6')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear Selection' }))
  expect(screen.getByText('Selected frames: 0')).toBeInTheDocument()
  expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Export selected' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
})

for (const name of ['Offset X', 'Offset Y', 'Gap X', 'Gap Y']) {
  test(`changing ${name} resets stale selection and preview`, async () => {
    const user = await configure()
    click(50, 50)
    await setField(user, name, '12')
    expect(screen.getByText('Selected frames: 0')).toBeInTheDocument()
    expect(screen.queryByLabelText('Frame preview')).not.toBeInTheDocument()
  })
  test.each(['', '-1', '1.5'])(
    `invalid ${name} %j blocks export and bulk selection`,
    async (value) => {
      const user = await configure()
      await setField(user, name, value)
      expect(screen.getByRole('alert')).toHaveTextContent(/offset|gap|integer|required/i)
      expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
    },
  )
}

test('bulk controls and ZIP export are disabled without an image', () => {
  render(<SpriteEditor />)
  expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Clear Selection' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
})

test('zoom controls preserve source geometry and selected IDs', async () => {
  const user = await open()
  click(33, 33)
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  const canvas = screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
  await user.click(screen.getByRole('button', { name: 'Zoom in' }))
  await user.click(screen.getByRole('button', { name: 'Zoom out' }))
  await user.click(screen.getByRole('button', { name: 'Reset view' }))
  expect(screen.getByText('Selected frames: 1')).toBeInTheDocument()
  expect([canvas.width, canvas.height]).toEqual([114, 78])
  expect(browser.context(preview).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    32,
    32,
    32,
    32,
    0,
    0,
    32,
    32,
  )
})

test('ZIP export downloads one archive and releases its URL', async () => {
  const user = await configure()
  click(11, 9)
  click(50, 50)
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  await waitFor(() => expect(browser.downloads).toHaveLength(1))
  expect(browser.downloads[0].name).toBe('spaced_sprites.zip')
  expect(browser.downloads[0].blob?.type).toBe('application/zip')
  const created = browser.createObjectURL.mock.calls.findIndex(
    ([blob]) => blob.type === 'application/zip',
  )
  expect(created).toBeGreaterThanOrEqual(0)
  await waitFor(() =>
    expect(browser.revokeObjectURL).toHaveBeenCalledWith(
      browser.createObjectURL.mock.results[created].value,
    ),
  )
})

test('ZIP error shows an alert and never downloads a partial archive', async () => {
  const user = await configure()
  click(11, 9)
  browser.toBlob.mockImplementation((callback) => callback(null))
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/zip|png|export|encode/i)
  expect(browser.downloads).toHaveLength(0)
  expect(screen.getByLabelText('Upload sprite sheet')).toBeEnabled()
})

test('offset leaving no complete frame shows an error and recovers after correction', async () => {
  const user = await configure()
  await setField(user, 'Offset X', '110')
  expect(screen.getByRole('alert')).toHaveTextContent(/frame|offset|size/i)
  expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled()
  await setField(user, 'Offset X', '10')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByText('Frames: 6')).toBeInTheDocument()
})

test('ZIP encoding locks grid, source and bulk selection, then restores controls', async () => {
  const user = await configure()
  click(11, 9)
  let finish: BlobCallback | undefined
  browser.toBlob.mockImplementation((callback) => {
    finish = callback
  })
  await user.click(screen.getByRole('button', { name: 'Export ZIP' }))
  expect(screen.getByLabelText('Upload sprite sheet')).toBeDisabled()
  for (const name of ['Offset X', 'Offset Y', 'Gap X', 'Gap Y']) {
    expect(screen.getByRole('spinbutton', { name })).toBeDisabled()
  }
  expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Clear Selection' })).toBeDisabled()
  click(50, 50)
  expect(screen.getByText('Selected frames: 1')).toBeInTheDocument()
  await act(async () => {
    finish!(browser.png)
  })
  await waitFor(() => expect(screen.getByLabelText('Upload sprite sheet')).toBeEnabled())
  expect(browser.downloads).toHaveLength(1)
})
