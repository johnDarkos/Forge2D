import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '@/app/App'
import { SpriteEditor } from '@/widgets/sprite-editor'
import { installBrowser } from '../mvp/browser'

let browser: ReturnType<typeof installBrowser>
beforeEach(() => {
  browser = installBrowser()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test.each([
  { name: 'independent SpriteEditor', Component: SpriteEditor },
  { name: 'standalone App', Component: App },
])('$name supports upload, selection, preview and PNG export', async ({ Component }) => {
  render(<Component />)
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Upload sprite sheet'), browser.file())
  await screen.findByText('player.png')
  expect(screen.getByText('Frames: 32')).toBeInTheDocument()
  const canvas = screen.getByLabelText('Sprite sheet') as HTMLCanvasElement
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
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
  fireEvent.click(canvas, { clientX: 70, clientY: 40 })
  expect(screen.getByText('Selected frames: 1')).toBeInTheDocument()
  const preview = screen.getByLabelText('Frame preview') as HTMLCanvasElement
  expect(browser.context(preview).drawImage).toHaveBeenLastCalledWith(
    expect.any(HTMLImageElement),
    64,
    32,
    32,
    32,
    0,
    0,
    32,
    32,
  )
  await user.click(screen.getByRole('button', { name: 'Export selected' }))
  await waitFor(() =>
    expect(browser.downloads).toEqual([{ name: 'frame_011.png', blob: browser.png }]),
  )
})
