import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { ForgeEditor } from '@/widgets/forge-editor'
import { forgeEditorFixture } from './fixtures'

test('synchronizes Hierarchy, Scene, Inspector and Assets around one workspace', async () => {
  const user = userEvent.setup()
  render(<ForgeEditor {...forgeEditorFixture()} />)

  expect(screen.getByRole('heading', { name: 'Hierarchy' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Scene' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Inspector' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Assets' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Player', current: true })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Weapon' }))
  expect(screen.getByRole('spinbutton', { name: 'Transform X' })).toHaveValue(8)
  expect(screen.getByRole('button', { name: 'Weapon sprite', current: true })).toBeInTheDocument()

  const x = screen.getByRole('spinbutton', { name: 'Transform X' })
  await user.clear(x)
  await user.type(x, '42')
  expect(screen.getByRole('button', { name: 'Weapon sprite' })).toHaveAttribute('data-x', '42')

  await user.click(screen.getByRole('button', { name: 'Player idle' }))
  expect(screen.getByRole('button', { name: 'Player idle', current: true })).toBeInTheDocument()
})
