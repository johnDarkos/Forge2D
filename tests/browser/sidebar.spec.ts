import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

for (const width of [1280, 390]) {
  test(`tools remain accessible without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const tools = page.getByRole('complementary', { name: 'Editor tools' })
    await tools
      .getByLabel('Upload sprite sheet')
      .setInputFiles(resolve('src/test/fixtures/test.png'))
    await expect(tools.getByText('Frames: 1485', { exact: true })).toBeVisible()
    await tools.getByRole('button', { name: 'Zoom in', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(tools.getByLabel('Zoom level')).toHaveText('125%')
    await tools.getByRole('button', { name: 'Select region', exact: true }).click()
    await expect(tools.getByLabel('Zoom level')).toHaveText('125%')
    await expect(tools.getByRole('spinbutton', { name: 'Frame width', exact: true })).toHaveCount(0)
    await tools.getByRole('button', { name: 'Reset view', exact: true }).click()
    await expect(tools.getByLabel('Zoom level')).toHaveText('100%')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const sidebarBox = (await tools.boundingBox())!
    const canvasBox = (await page.getByLabel('Sprite sheet', { exact: true }).boundingBox())!
    if (width > 800) {
      expect(sidebarBox.x + sidebarBox.width).toBeLessThan(canvasBox.x)
      await tools.getByRole('button', { name: 'Add frame', exact: true }).scrollIntoViewIfNeeded()
      await expect(tools.getByRole('button', { name: 'Export ZIP', exact: true })).toBeInViewport()
    } else {
      expect(sidebarBox.y + sidebarBox.height).toBeLessThan(canvasBox.y)
      await tools.getByRole('button', { name: 'Add frame', exact: true }).scrollIntoViewIfNeeded()
      await expect(tools.getByRole('button', { name: 'Add frame', exact: true })).toBeInViewport()
      await tools.getByRole('button', { name: 'Hide tools', exact: true }).click()
      await expect(tools.getByRole('button', { name: 'Add frame', exact: true })).toBeHidden()
      await expect(tools.getByRole('button', { name: 'Export ZIP', exact: true })).toBeVisible()
      await tools.getByRole('button', { name: 'Show tools', exact: true }).click()
      await expect(tools.getByLabel('Zoom level')).toHaveText('100%')
      await expect(
        tools.getByRole('button', { name: 'Select region', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
      // Collapsing on mobile must not hide controls when returning to desktop.
      await tools.getByRole('button', { name: 'Hide tools', exact: true }).click()
      await page.setViewportSize({ width: 1280, height: 900 })
      await expect(tools.getByRole('button', { name: 'Select region', exact: true })).toBeVisible()
      await page.setViewportSize({ width, height: 900 })
    }
  })
}
