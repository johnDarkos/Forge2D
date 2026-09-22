import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { readZip } from '../../src/test/v02/readZip'
import { browserSheets, comparePngCrop, fixture } from './support'

test('zoom and pan move the view, preserve selection and reset without changing source pixels', async ({
  page,
}) => {
  await page.goto('/')
  const sheet = browserSheets.test
  await page.getByLabel('Upload sprite sheet').setInputFiles(fixture(sheet.name))
  await expect(page.getByText('Frames: 1485', { exact: true })).toBeVisible()
  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true })
  await expect(zoomIn).toBeVisible()
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  const before = await canvas.boundingBox()
  expect(before).not.toBeNull()
  await zoomIn.click()
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(before!.width)
  const viewport = page.getByRole('region', { name: 'Sprite viewport', exact: true })
  const region = await viewport.boundingBox()
  const zoomed = await canvas.boundingBox()
  expect(region).not.toBeNull()
  await page.mouse.move(region!.x + region!.width / 2, region!.y + region!.height / 2)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(region!.x + region!.width / 2 - 60, region!.y + region!.height / 2 - 40, {
    steps: 8,
  })
  await page.mouse.up({ button: 'middle' })
  await expect.poll(async () => (await canvas.boundingBox())!.x).toBeLessThan(zoomed!.x - 20)
  await expect(page.getByText('Selected frames: 0', { exact: true })).toBeVisible()
  // Pick a visible source cell using the actual transformed canvas rectangle.
  const moved = (await canvas.boundingBox())!
  const visibleX = region!.x + region!.width / 2
  const visibleY = region!.y + Math.min(100, region!.height / 2)
  const sourceX = ((visibleX - moved.x) * sheet.width) / moved.width
  const sourceY = ((visibleY - moved.y) * sheet.height) / moved.height
  const column = Math.floor(sourceX / 32)
  const row = Math.floor(sourceY / 32)
  expect(column).toBeLessThan(55)
  expect(row).toBeLessThan(27)
  await page.mouse.click(visibleX, visibleY)
  await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
  await expect(
    page.getByText(`Frame ${row * 55 + column + 1} · 32 × 32 px · (${column * 32}, ${row * 32})`, {
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset view', exact: true }).click()
  await expect
    .poll(async () => Math.abs((await canvas.boundingBox())!.width - before!.width))
    .toBeLessThan(1)
  await expect
    .poll(async () => Math.abs((await canvas.boundingBox())!.x - before!.x))
    .toBeLessThan(1)
  await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => [element.width, element.height]),
  ).toEqual([sheet.width, sheet.height])
})

test('ZIP download contains exact PNG crops, preserves transparency and excludes offset/gap pixels', async ({
  page,
}) => {
  await page.goto('/')
  const sheet = browserSheets.spaced
  const sourcePath = fixture(sheet.name)
  await page.getByLabel('Upload sprite sheet').setInputFiles(sourcePath)
  for (const [name, value] of [
    ['Offset X', '10'],
    ['Offset Y', '8'],
    ['Gap X', '4'],
    ['Gap Y', '6'],
  ]) {
    const input = page.getByRole('spinbutton', { name, exact: true })
    await expect(input).toBeVisible()
    await input.fill(value)
  }
  await expect(page.getByText('Frames: 6', { exact: true })).toBeVisible()
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  const box = (await canvas.boundingBox())!
  for (const [x, y] of [
    [50, 50],
    [11, 9],
  ]) {
    await canvas.click({
      position: { x: (x * box.width) / sheet.width, y: (y * box.height) / sheet.height },
    })
  }
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export ZIP', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('spaced_sprites.zip')
  const path = await download.path()
  if (!path) throw new Error('ZIP download missing')
  const entries = readZip(await readFile(path))
  expect([...entries.keys()]).toEqual(['frame_001.png', 'frame_005.png'])
  const source = await readFile(sourcePath)
  for (const [name, x, y] of [
    ['frame_001.png', 10, 8],
    ['frame_005.png', 46, 46],
  ] as const) {
    const result = await comparePngCrop(page, source, entries.get(name)!, {
      x,
      y,
      width: 32,
      height: 32,
    })
    expect(result).toMatchObject({
      width: 32,
      height: 32,
      differences: 0,
      firstPixel: [0, 0, 0, 0],
    })
  }
})
