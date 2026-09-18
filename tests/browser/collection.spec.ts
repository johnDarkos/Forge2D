import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { readZip } from '../../src/test/v02/readZip'

test('saved characters from test.png export as distinct named PNGs with exact original pixels', async ({
  page,
}) => {
  await page.goto('/')
  const sourcePath = resolve('src/test/fixtures/test.png')
  await page.getByLabel('Upload sprite sheet').setInputFiles(sourcePath)
  await expect(page.getByText('Frames: 1485', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Select region', exact: true }).click()
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  const crops: { x: number; y: number; width: number; height: number }[] = []
  // First and second IDLE characters. The third saved crop is deliberately removed.
  for (const [index, left] of [204, 384, 564].entries()) {
    await canvas.scrollIntoViewIfNeeded()
    const box = (await canvas.boundingBox())!
    const start = {
      x: Math.round(box.x + (left * box.width) / 1774),
      y: Math.round(box.y + (52 * box.height) / 887),
    }
    const end = {
      x: Math.round(box.x + ((left + 106) * box.width) / 1774),
      y: Math.round(box.y + (166 * box.height) / 887),
    }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 5 })
    await page.mouse.up()
    const x = Math.floor(((start.x - box.x) * 1774) / box.width)
    const y = Math.floor(((start.y - box.y) * 887) / box.height)
    crops.push({
      x,
      y,
      width: Math.ceil(((end.x - box.x) * 1774) / box.width) - x,
      height: Math.ceil(((end.y - box.y) * 887) / box.height) - y,
    })
    await page.getByRole('button', { name: 'Add frame', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
    await page.getByRole('textbox', { name: `Frame ${index + 1} name`, exact: true }).fill('idle')
    await expect(page.getByLabel(`Saved frame ${index + 1} preview`)).toHaveAttribute(
      'width',
      String(crops[index].width),
    )
  }
  await page.getByRole('button', { name: 'Remove frame 3', exact: true }).click()
  await expect(page.getByText('Saved frames: 2', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export ZIP', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('test_sprites.zip')
  const path = await download.path()
  if (!path) throw new Error('ZIP download missing')
  const entries = readZip(await readFile(path))
  expect([...entries.keys()]).toEqual(['idle.png', 'idle_2.png'])
  const source = (await readFile(sourcePath)).toString('base64')
  for (const [index, bytes] of [...entries.values()].entries()) {
    const crop = crops[index]
    const output = Buffer.from(bytes).toString('base64')
    const result = await page.evaluate(
      async ({ source, output, crop }) => {
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
        const expected = original.context.getImageData(crop.x, crop.y, crop.width, crop.height).data
        const actual = png.context.getImageData(0, 0, crop.width, crop.height).data
        return {
          size: [png.canvas.width, png.canvas.height],
          same: expected.every((value, i) => value === actual[i]),
          visible: actual.some((value, i) => i % 4 === 3 && value > 0),
        }
      },
      { source, output, crop },
    )
    expect(result).toEqual({ size: [crop.width, crop.height], same: true, visible: true })
  }
  await page.screenshot({ path: 'test-results/manual-collection.png', fullPage: true })
})
