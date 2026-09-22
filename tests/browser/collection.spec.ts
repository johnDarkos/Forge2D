import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { readZip } from '../../src/test/v02/readZip'
import { browserSheets, comparePngCrop, fixture } from './support'

test('saved characters from test.png export as distinct named PNGs with exact original pixels', async ({
  page,
}) => {
  await page.goto('/')
  const sheet = browserSheets.test
  const sourcePath = fixture(sheet.name)
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
      x: Math.round(box.x + (left * box.width) / sheet.width),
      y: Math.round(box.y + (52 * box.height) / sheet.height),
    }
    const end = {
      x: Math.round(box.x + ((left + 106) * box.width) / sheet.width),
      y: Math.round(box.y + (166 * box.height) / sheet.height),
    }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 5 })
    await page.mouse.up()
    const x = Math.floor(((start.x - box.x) * sheet.width) / box.width)
    const y = Math.floor(((start.y - box.y) * sheet.height) / box.height)
    crops.push({
      x,
      y,
      width: Math.ceil(((end.x - box.x) * sheet.width) / box.width) - x,
      height: Math.ceil(((end.y - box.y) * sheet.height) / box.height) - y,
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
  const source = await readFile(sourcePath)
  for (const [index, bytes] of [...entries.values()].entries()) {
    const crop = crops[index]
    const result = await comparePngCrop(page, source, bytes, crop)
    expect(result).toMatchObject({
      width: crop.width,
      height: crop.height,
      differences: 0,
      hasVisiblePixels: true,
    })
  }
})
