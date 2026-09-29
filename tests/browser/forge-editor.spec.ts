import { expect, test } from '@playwright/test'

test('Forge Editor keeps Hierarchy, Scene, Inspector and Assets synchronized', async ({ page }) => {
  await page.goto('/#forge')

  await expect(page.getByRole('heading', { name: 'Hierarchy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Scene' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inspector' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()

  const player = page
    .getByRole('region', { name: 'Hierarchy' })
    .getByRole('button', { name: 'Player', exact: true })
  const scenePlayer = page.getByRole('button', { name: 'Player sprite' })
  await expect(player).toHaveAttribute('aria-current', 'true')
  await expect(scenePlayer).toHaveAttribute('data-x', '96')

  await page.getByRole('spinbutton', { name: 'Transform X' }).fill('140')
  await expect(scenePlayer).toHaveAttribute('data-x', '140')

  const spriteAsset = page
    .getByRole('region', { name: 'Assets' })
    .getByRole('button', { name: 'Player', exact: true })
  await spriteAsset.click()
  await expect(spriteAsset).toHaveAttribute('aria-current', 'true')
})
