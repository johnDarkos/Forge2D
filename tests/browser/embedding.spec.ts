import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

test('embedded host receives mixed sprites, renamed metadata and Cancel without downloads', async ({
  page,
}) => {
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  await page.goto('/tests/fixtures/embedded.html')
  await expect(page.getByText('player.png', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Upload sprite sheet')).toBeDisabled()
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  await canvas.click({ position: { x: 70, y: 40 } })
  await canvas.click({ position: { x: 1, y: 1 } })
  await page.getByRole('button', { name: 'Select region', exact: true }).click()
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 110, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 150, box.y + 60, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Add frame', exact: true }).click()
  await page.getByRole('textbox', { name: 'Frame 3 name', exact: true }).fill('player_idle')
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Save count')).toHaveText('1')
  const result = JSON.parse((await page.getByTestId('saved-result').textContent())!)
  expect(result).toEqual({
    source: { width: 256, height: 128 },
    sprites: [
      { id: 'grid-0-0-32-32', name: 'frame_001', rect: { x: 0, y: 0, width: 32, height: 32 } },
      { id: 'grid-64-32-32-32', name: 'frame_011', rect: { x: 64, y: 32, width: 32, height: 32 } },
      { id: 'sprite-3', name: 'player_idle', rect: { x: 110, y: 10, width: 40, height: 50 } },
    ],
    settings: { mode: 'manual' },
  })
  // Host rerenders after Save with fresh prop objects; current edits must remain intact.
  await expect(page.getByRole('textbox', { name: 'Frame 3 name', exact: true })).toHaveValue(
    'player_idle',
  )
  await page.getByRole('button', { name: 'Remove frame 1', exact: true }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Save count')).toHaveText('2')
  const reduced = JSON.parse((await page.getByTestId('saved-result').textContent())!)
  expect(reduced.sprites).toEqual(result.sprites.slice(1))
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByLabel('Cancel count')).toHaveText('1')
  await expect(canvas).toBeVisible()
  expect(downloads).toEqual([])
})

test('changing external src hydrates the next source and resets session state', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/embedded.html')
  await expect(page.getByText('player.png', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Replace external image', exact: true }).click()
  await expect(page.getByText('enemy.png', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Zoom level')).toHaveText('100%')
  await expect(page.getByText('Saved frames: 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Save count')).toHaveText('1')
  expect(JSON.parse((await page.getByTestId('saved-result').textContent())!)).toEqual({
    source: { width: 64, height: 32 },
    sprites: [{ id: 'enemy-id', name: 'enemy', rect: { x: 0, y: 0, width: 16, height: 16 } }],
    settings: { mode: 'manual' },
  })
})

for (const scheme of ['data', 'https']) {
  test(`external ${scheme} image supports metadata Save and actual PNG export`, async ({
    page,
  }) => {
    const file = await readFile(resolve('src/test/fixtures/player.png'))
    const src =
      scheme === 'data'
        ? `data:image/png;base64,${file.toString('base64')}`
        : 'https://sprites.example.test/player.png'
    if (scheme === 'https')
      await page.route(src, (route) =>
        route.fulfill({
          body: file,
          contentType: 'image/png',
          headers: { 'access-control-allow-origin': '*' },
        }),
      )
    await page.goto(`/tests/fixtures/embedded.html?src=${encodeURIComponent(src)}`)
    await expect(page.getByText('player.png', { exact: true })).toBeVisible()
    await page.getByLabel('Sprite sheet', { exact: true }).click({ position: { x: 70, y: 40 } })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByLabel('Save count')).toHaveText('1')
    const result = JSON.parse((await page.getByTestId('saved-result').textContent())!)
    expect(result.sprites[0].rect).toEqual({ x: 64, y: 32, width: 32, height: 32 })
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export selected', exact: true }).click()
    const download = await pending
    expect(download.suggestedFilename()).toBe('frame_011.png')
    expect(await download.failure()).toBeNull()
  })
}
