import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const fixture = (name: string) => resolve('src/test/fixtures', name)

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

// Independent pixel oracle: decode source and exported PNG in the browser, without the app's crop utility.
async function compareCrop(
  page: Page,
  source: Buffer,
  output: Buffer,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return page.evaluate(
    async (data) => {
      async function decode(base64: string) {
        const image = new Image()
        image.src = `data:image/png;base64,${base64}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return { context, width: canvas.width, height: canvas.height }
      }
      const original = await decode(data.source)
      const exported = await decode(data.output)
      const expected = original.context.getImageData(data.x, data.y, data.width, data.height).data
      const actual = exported.context.getImageData(0, 0, data.width, data.height).data
      let differences = 0
      for (let index = 0; index < expected.length; index++)
        if (actual[index] !== expected[index]) differences++
      return {
        width: exported.width,
        height: exported.height,
        differences,
        firstPixel: Array.from(actual.slice(0, 4)),
      }
    },
    { source: source.toString('base64'), output: output.toString('base64'), x, y, width, height },
  )
}

for (const example of [
  {
    name: 'player.png',
    width: 256,
    height: 128,
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
    name: 'test.png',
    width: 1774,
    height: 887,
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
    const previewResult = await compareCrop(
      page,
      source,
      Buffer.from(preview, 'base64'),
      example.x,
      example.y,
      32,
      32,
    )
    expect(previewResult.differences).toBe(0)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export selected' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(
      `frame_${String(example.displayNumber).padStart(3, '0')}.png`,
    )
    const path = await download.path()
    if (!path) throw new Error('PNG download was not saved')
    const result = await compareCrop(
      page,
      source,
      await readFile(path),
      example.x,
      example.y,
      32,
      32,
    )
    expect(result).toMatchObject({ width: 32, height: 32, differences: 0 })
    if (example.name === 'player.png') expect(result.firstPixel[3]).toBe(0)
    expect(errors).toEqual([])
    await page.screenshot({ path: `test-results/${example.name}-editor.png`, fullPage: true })
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
    const result = await compareCrop(
      page,
      source,
      await readFile(path),
      index === 0 ? 0 : 64,
      index === 0 ? 0 : 32,
      32,
      32,
    )
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
