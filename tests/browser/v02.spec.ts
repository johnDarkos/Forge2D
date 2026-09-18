import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { readZip } from '../../src/test/v02/readZip'

test('zoom and pan move the view, preserve selection and reset without changing source pixels', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Upload sprite sheet').setInputFiles(resolve('src/test/fixtures/test.png'))
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
  const sourceX = ((visibleX - moved.x) * 1774) / moved.width
  const sourceY = ((visibleY - moved.y) * 887) / moved.height
  const column = Math.floor(sourceX / 32)
  const row = Math.floor(sourceY / 32)
  expect(column).toBeLessThan(55)
  expect(row).toBeLessThan(27)
  await page.mouse.click(visibleX, visibleY)
  await expect(page.getByText('Selected frames: 1', { exact: true })).toBeVisible()
  await expect(
    page.getByText(`Frame ${row * 55 + column} · 32 × 32 px · (${column * 32}, ${row * 32})`, {
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
  ).toEqual([1774, 887])
})

test('ZIP download contains exact PNG crops, preserves transparency and excludes offset/gap pixels', async ({
  page,
}) => {
  await page.goto('/')
  const sourcePath = resolve('src/test/fixtures/spaced.png')
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
    await canvas.click({ position: { x: (x * box.width) / 114, y: (y * box.height) / 78 } })
  }
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export ZIP', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('spaced_sprites.zip')
  const path = await download.path()
  if (!path) throw new Error('ZIP download missing')
  const entries = readZip(await readFile(path))
  expect([...entries.keys()]).toEqual(['frame_001.png', 'frame_005.png'])
  const source = (await readFile(sourcePath)).toString('base64')
  for (const [name, x, y] of [
    ['frame_001.png', 10, 8],
    ['frame_005.png', 46, 46],
  ] as const) {
    const output = Buffer.from(entries.get(name)!).toString('base64')
    const result = await page.evaluate(
      async ({ source, output, x, y }) => {
        async function decode(base64: string) {
          const image = new Image()
          image.src = `data:image/png;base64,${base64}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.naturalWidth
          canvas.height = image.naturalHeight
          const context = canvas.getContext('2d')!
          context.drawImage(image, 0, 0)
          return { canvas, context }
        }
        const original = await decode(source)
        const png = await decode(output)
        const expected = original.context.getImageData(x, y, 32, 32).data
        const actual = png.context.getImageData(0, 0, 32, 32).data
        return {
          size: [png.canvas.width, png.canvas.height],
          same: expected.every((value, index) => value === actual[index]),
          alpha: actual[3],
        }
      },
      { source, output, x, y },
    )
    expect(result).toEqual({ size: [32, 32], same: true, alpha: 0 })
  }
})
