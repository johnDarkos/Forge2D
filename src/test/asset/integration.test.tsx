import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AssetHost } from '../../../tests/fixtures/AssetHost'
import { player } from '../fixtures/sheets'
import { installBrowser } from '../mvp/browser'

let browser: ReturnType<typeof installBrowser>
const textureUri = 'https://assets.test/player.png'

beforeEach(() => {
  browser = installBrowser()
  browser.registerImage(textureUri, player)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('save updates the in-memory project and reopening two assets on one texture is isolated', async () => {
  render(<AssetHost textureUri={textureUri} />)
  const user = userEvent.setup()
  await screen.findByText('player.png')
  const name = screen.getByRole('textbox', { name: 'Frame 1 name' })
  expect(name).toHaveValue('idle')
  await user.clear(name)
  await user.type(name, 'idle_updated')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByLabelText('Active asset')).toHaveTextContent('closed')

  const saved = JSON.parse(screen.getByTestId('project-state').textContent!)
  const idle = saved.assets.find(({ id }: { id: string }) => id === 'sprite-idle')
  expect(idle.sprites[0]).toMatchObject({ id: 'idle-frame', name: 'idle_updated' })

  await user.click(screen.getByRole('button', { name: 'Open Run animation' }))
  await screen.findByText('player.png')
  expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toHaveValue('run')
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(screen.getByRole('button', { name: 'Open Idle animation' }))
  await screen.findByText('player.png')
  expect(screen.getByRole('textbox', { name: 'Frame 1 name' })).toHaveValue('idle_updated')
})

test('host exposes the adapter error instead of letting SpriteEditor replace its reason', async () => {
  render(<AssetHost textureUri={textureUri} saveTextureDimensions={{ width: 64, height: 32 }} />)
  await screen.findByText('player.png')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Host save error: Sprite editor source dimensions do not match texture asset',
  )
  expect(screen.getByLabelText('Active asset')).toHaveTextContent('sprite-idle')
})
