import { expect, test } from '@playwright/test'

test('two SpriteAssets on one texture save and reopen from Project state independently', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/asset-host.html')
  await expect(page.getByText('player.png', { exact: true })).toBeVisible()
  const name = page.getByRole('textbox', { name: 'Frame 1 name', exact: true })
  await expect(name).toHaveValue('idle')
  await name.fill('idle_updated')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Active asset')).toHaveText('closed')

  const project = JSON.parse((await page.getByTestId('project-state').textContent())!)
  const idle = project.assets.find(({ id }: { id: string }) => id === 'sprite-idle')
  expect(idle.sprites[0]).toMatchObject({ id: 'idle-frame', name: 'idle_updated' })

  await page.getByRole('button', { name: 'Open Run animation', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Frame 1 name', exact: true })).toHaveValue('run')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Open Idle animation', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Frame 1 name', exact: true })).toHaveValue(
    'idle_updated',
  )
  await expect(page.getByLabel('Active asset')).toHaveText('sprite-idle')
})
