import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { browserSheets, comparePngCrop, fixture } from './support'

async function configure(page: Page, width: string, height: string) {
  await page.getByRole('spinbutton', { name: 'Frame width' }).fill(width)
  await page.getByRole('spinbutton', { name: 'Frame height' }).fill(height)
}
async function clickSource(page: Page, x: number, y: number) {
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
  }))
  const rect = await canvas.boundingBox()
  if (!rect) throw new Error('Canvas is not visible')
  await canvas.click({
    position: { x: (x * rect.width) / size.width, y: (y * rect.height) / size.height },
  })
}

for (const example of [
  {
    ...browserSheets.player,
    frameWidth: 32,
    frameHeight: 32,
    columns: 8,
    rows: 4,
    count: 32,
    displayNumber: 11,
    x: 64,
    y: 32,
  },
  // test.png has no declared cell size: 32×32 is an explicit test grid, not automatic detection.
  {
    ...browserSheets.test,
    frameWidth: 32,
    frameHeight: 32,
    columns: 55,
    rows: 27,
    count: 1485,
    displayNumber: 118,
    x: 224,
    y: 64,
  },
]) {
  test(`real PNG upload, preview and exact pixel export: ${example.name}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await page.getByLabel('Upload sprite sheet').setInputFiles(fixture(example.name))
    await expect(
      page.getByText(`${example.width} × ${example.height} px`, { exact: true }),
    ).toBeVisible()
    await configure(page, String(example.frameWidth), String(example.frameHeight))
    await expect(page.getByText(`Frames: ${example.count}`, { exact: true })).toBeVisible()
    await expect(page.getByText(`Columns: ${example.columns}`, { exact: true })).toBeVisible()
    await expect(page.getByText(`Rows: ${example.rows}`, { exact: true })).toBeVisible()
    await clickSource(page, example.x + 3, example.y + 3)
    await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
    const preview = await page
      .getByLabel('Frame preview')
      .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL('image/png').split(',')[1])
    const source = await readFile(fixture(example.name))
    const previewResult = await comparePngCrop(page, source, Buffer.from(preview, 'base64'), {
      x: example.x,
      y: example.y,
      width: 32,
      height: 32,
    })
    expect(previewResult.differences).toBe(0)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export selected' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(
      `frame_${String(example.displayNumber).padStart(3, '0')}.png`,
    )
    const path = await download.path()
    if (!path) throw new Error('PNG download was not saved')
    const result = await comparePngCrop(page, source, await readFile(path), {
      x: example.x,
      y: example.y,
      width: 32,
      height: 32,
    })
    expect(result).toMatchObject({ width: 32, height: 32, differences: 0 })
    if (example.name === 'player.png') expect(result.firstPixel[3]).toBe(0)
    expect(errors).toEqual([])
  })
}

test('multiple PNG downloads, keyboard selection and replacement at 1024px', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/')
  await page.getByLabel('Upload sprite sheet').setInputFiles(fixture('player.png'))
  await expect(page.getByText('Frames: 32', { exact: true })).toBeVisible()
  await clickSource(page, 65, 33)
  await clickSource(page, 1, 1)
  const downloads: import('@playwright/test').Download[] = []
  page.on('download', (download) => downloads.push(download))
  await page.getByRole('button', { name: 'Export selected' }).click()
  await expect.poll(() => downloads.length).toBe(2)
  expect(downloads.map((download) => download.suggestedFilename())).toEqual([
    'frame_001.png',
    'frame_011.png',
  ])
  const source = await readFile(fixture('player.png'))
  for (const [index, download] of downloads.entries()) {
    const path = await download.path()
    if (!path) throw new Error('Download missing')
    const result = await comparePngCrop(page, source, await readFile(path), {
      x: index === 0 ? 0 : 64,
      y: index === 0 ? 0 : 32,
      width: 32,
      height: 32,
    })
    expect(result.differences).toBe(0)
  }
  await page.getByLabel('Sprite sheet', { exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
  await page.getByLabel('Upload sprite sheet').setInputFiles(fixture('enemy.png'))
  await expect(page.getByText('Frames: 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Selected frames: 0', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Frame preview')).toHaveCount(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})

test('real JPEG/WebP decoding and 4096×4096 sheet', async ({ page }) => {
  await page.goto('/')
  for (const type of ['image/jpeg', 'image/webp', 'image/png']) {
    const size = type === 'image/png' ? 4096 : 64
    const base64 = await page.evaluate(
      ({ type, size }) => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')!
        context.fillStyle = '#3478ab'
        context.fillRect(0, 0, size, size)
        return canvas.toDataURL(type).split(',')[1]
      },
      { type, size },
    )
    await page.getByLabel('Upload sprite sheet').setInputFiles({
      name: `generated.${type.split('/')[1]}`,
      mimeType: type,
      buffer: Buffer.from(base64, 'base64'),
    })
    await expect(page.getByText(`${size} × ${size} px`, { exact: true })).toBeVisible()
    await expect(
      page.getByText(`Frames: ${size === 4096 ? 16384 : 4}`, { exact: true }),
    ).toBeVisible()
    await clickSource(page, 16, 16)
    await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
  }
})
