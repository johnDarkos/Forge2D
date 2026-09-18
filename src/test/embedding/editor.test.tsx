import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SpriteEditor } from '@/widgets/sprite-editor'
import type { SpriteEditorResult } from '@/widgets/sprite-editor'
import { installBrowser } from '../mvp/browser'

let browser: ReturnType<typeof installBrowser>
beforeEach(() => {
  browser = installBrowser()
  vi.stubGlobal('PointerEvent', MouseEvent)
  Object.defineProperties(HTMLCanvasElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn<() => void>() },
    releasePointerCapture: { configurable: true, value: vi.fn<() => void>() },
    hasPointerCapture: { configurable: true, value: () => true },
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const name of ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'])
    Reflect.deleteProperty(HTMLCanvasElement.prototype, name)
})
const sprites = [
  { id: 'abc', name: 'idle', rect: { x: 0, y: 0, width: 32, height: 32 } },
  { id: 'def', name: 'walk', rect: { x: 32, y: 0, width: 32, height: 32 } },
  { id: 'ghi', name: 'run', rect: { x: 64, y: 0, width: 32, height: 32 } },
]
function external(name = 'player.png') {
  return {
    src: URL.createObjectURL(browser.file({ name, type: 'image/png', width: 256, height: 128 })),
    name,
  }
}
function canvas() {
  const node = screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 256,
    bottom: 128,
    width: 256,
    height: 128,
    toJSON: () => ({}),
  })
  return node
}

test('external image loads automatically; Save returns three initial sprites without downloading', async () => {
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  const image = external()
  const view = render(
    <SpriteEditor
      image={image}
      initialData={{ sprites, settings: { mode: 'manual' } }}
      onSave={onSave}
    />,
  )
  await screen.findByText('player.png')
  expect(screen.getByLabelText('Upload sprite sheet')).toBeDisabled()
  expect(screen.getByText('Saved frames: 3')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Zoom in' }))
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave).toHaveBeenCalledExactlyOnceWith({
    source: { width: 256, height: 128 },
    sprites,
    settings: { mode: 'manual' },
  })
  expect(browser.downloads).toHaveLength(0)
  expect(browser.toBlob).not.toHaveBeenCalled()
  view.unmount()
  expect(browser.revokeObjectURL).not.toHaveBeenCalledWith(image.src)
})

test('initial grid settings hydrate and a fresh same-src prop object does not reset edits', async () => {
  const image = external()
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  const initialData = {
    sprites,
    settings: {
      mode: 'grid' as const,
      grid: { cellWidth: 40, cellHeight: 20, offsetX: 4, offsetY: 2, gapX: 3, gapY: 1 },
    },
  }
  const view = render(<SpriteEditor image={image} initialData={initialData} onSave={onSave} />)
  await screen.findByText('player.png')
  expect(screen.getByRole('spinbutton', { name: 'Frame width' })).toHaveValue(40)
  const user = userEvent.setup()
  await user.clear(screen.getByRole('textbox', { name: 'Frame 1 name' }))
  await user.type(screen.getByRole('textbox', { name: 'Frame 1 name' }), 'player_idle')
  await user.click(screen.getByRole('button', { name: 'Remove frame 2' }))
  view.rerender(
    <SpriteEditor image={{ ...image }} initialData={{ ...initialData }} onSave={onSave} />,
  )
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave.mock.calls[0][0]).toEqual({
    source: { width: 256, height: 128 },
    sprites: [{ ...sprites[0], name: 'player_idle' }, sprites[2]],
    settings: initialData.settings,
  })
  expect(initialData.sprites).toEqual(sprites)
})

test('grid and manual frames coexist in Save with stable IDs and deterministic order', async () => {
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  render(<SpriteEditor image={external()} onSave={onSave} />)
  await screen.findByText('player.png')
  const node = canvas()
  const user = userEvent.setup()
  fireEvent.click(node, { clientX: 70, clientY: 40 })
  fireEvent.click(node, { clientX: 1, clientY: 1 })
  await user.click(screen.getByRole('button', { name: 'Save' }))
  const gridSprites = onSave.mock.calls[0][0].sprites
  expect(gridSprites.map((sprite: { rect: { x: number; y: number } }) => sprite.rect)).toEqual([
    { x: 0, y: 0, width: 32, height: 32 },
    { x: 64, y: 32, width: 32, height: 32 },
  ])
  fireEvent.click(node, { clientX: 70, clientY: 40 })
  fireEvent.click(node, { clientX: 70, clientY: 40 })
  await user.click(screen.getByRole('button', { name: 'Select region' }))
  fireEvent.pointerDown(node, { clientX: 110, clientY: 10, button: 0 })
  fireEvent.pointerMove(node, { clientX: 150, clientY: 60 })
  fireEvent.pointerUp(node, { clientX: 150, clientY: 60, button: 0 })
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Add frame' }))
  await user.click(screen.getByRole('button', { name: 'Save' }))
  const result = onSave.mock.calls[1][0]
  expect(result.sprites.slice(0, 2)).toEqual(gridSprites)
  expect(result.sprites[2].rect).toEqual({ x: 110, y: 10, width: 40, height: 50 })
  expect(new Set(result.sprites.map((sprite: { id: string }) => sprite.id)).size).toBe(3)
})

test('Cancel notifies the parent without downloads or destroying the editor; Save error is recoverable', async () => {
  const onCancel = vi.fn<() => void>()
  const onSave = vi.fn<(result: SpriteEditorResult) => void>().mockImplementationOnce(() => {
    throw new Error('Host refused Save')
  })
  render(<SpriteEditor image={external()} onSave={onSave} onCancel={onCancel} />)
  await screen.findByText('player.png')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/save/i)
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('Sprite sheet')).toBeInTheDocument()
  expect(browser.downloads).toHaveLength(0)
})

test('new external src resets session and hydrates new data; stale loads cannot overwrite it', async () => {
  browser.deferImages()
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  const first = external('first.png')
  const second = external('second.png')
  const view = render(<SpriteEditor image={first} initialData={{ sprites }} onSave={onSave} />)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  view.rerender(
    <SpriteEditor
      image={second}
      initialData={{ sprites: [sprites[2]], settings: { mode: 'manual' } }}
      onSave={onSave}
    />,
  )
  act(() => browser.pendingImages[1]())
  await screen.findByText('second.png')
  act(() => browser.pendingImages[0]())
  expect(screen.queryByText('first.png')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave.mock.calls[0][0].sprites).toEqual([sprites[2]])
  expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%')
  expect(browser.revokeObjectURL).not.toHaveBeenCalled()
})

test('missing or broken image and invalid initial rectangles never enable Save', async () => {
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  const view = render(<SpriteEditor onSave={onSave} />)
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  view.rerender(<SpriteEditor image={{ src: 'data:image/png;base64,broken' }} onSave={onSave} />)
  await screen.findByRole('alert')
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  view.rerender(
    <SpriteEditor
      image={external()}
      initialData={{ sprites: [{ ...sprites[0], rect: { x: 255, y: 0, width: 2, height: 32 } }] }}
      onSave={onSave}
    />,
  )
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/initial|bound|rect/i))
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  expect(onSave).not.toHaveBeenCalled()
})

test('async Save locks editing, isolates returned objects and unlocks after rejection', async () => {
  let rejectSave: (error: Error) => void = () => {
    throw new Error('Save was not started')
  }
  const onSave = vi
    .fn<(result: SpriteEditorResult) => Promise<void>>()
    .mockImplementationOnce((result) => {
      Reflect.set(result.sprites[0].rect, 'x', 200)
      Reflect.set(result.sprites[0], 'name', 'host mutation')
      return new Promise((_resolve, reject) => {
        rejectSave = reject
      })
    })
    .mockResolvedValue(undefined)
  render(
    <SpriteEditor
      image={external()}
      initialData={{ sprites: [sprites[0]], settings: { mode: 'manual' } }}
      onSave={onSave}
      onCancel={vi.fn<() => void>()}
    />,
  )
  await screen.findByText('player.png')
  const user = userEvent.setup()
  const save = screen.getByRole('button', { name: 'Save' })
  await user.click(save)
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Remove frame 1' })).toBeDisabled()
  fireEvent.click(save)
  expect(onSave).toHaveBeenCalledTimes(1)
  await act(async () => {
    rejectSave(new Error('Host unavailable'))
  })
  expect(await screen.findByRole('alert')).toHaveTextContent(/save/i)
  expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toHaveValue('idle')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave.mock.calls[1][0].sprites).toEqual([sprites[0]])
})

test('removing external image returns to standalone upload and initialData hydrates first local source', async () => {
  const onSave = vi.fn<(result: SpriteEditorResult) => void>()
  const view = render(<SpriteEditor image={external()} onSave={onSave} />)
  await screen.findByText('player.png')
  view.rerender(
    <SpriteEditor
      initialData={{ sprites: [sprites[0]], settings: { mode: 'manual' } }}
      onSave={onSave}
    />,
  )
  expect(screen.getByLabelText('Upload sprite sheet')).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Upload sprite sheet'), browser.file())
  await screen.findByText('player.png')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave.mock.calls[0][0].sprites).toEqual([sprites[0]])
  await user.upload(
    screen.getByLabelText('Upload sprite sheet'),
    browser.file({ name: 'another.png', type: 'image/png', width: 64, height: 64 }),
  )
  await screen.findByText('another.png')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(onSave.mock.calls[1][0].sprites).toEqual([])
})
