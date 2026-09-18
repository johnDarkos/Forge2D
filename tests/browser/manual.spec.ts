import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

for (const transformed of [false, true]) {
  test(`manual region exports exact pixels${transformed ? ' after zoom/pan and reverse drag' : ''}`, async ({
    page,
  }) => {
    await page.goto('/')
    const sourcePath = resolve('src/test/fixtures/test.png')
    await page.getByLabel('Upload sprite sheet').setInputFiles(sourcePath)
    await expect(page.getByText('Frames: 1485', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Select region', exact: true }).click()
    await expect(page.getByRole('spinbutton', { name: 'Frame width' })).toHaveCount(0)
    const canvas = page.getByLabel('Sprite sheet', { exact: true })
    if (transformed) {
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
      const viewport = (await page.getByRole('region', { name: 'Sprite viewport' }).boundingBox())!
      await page.mouse.move(viewport.x + 400, viewport.y + 200)
      await page.mouse.down({ button: 'middle' })
      await page.mouse.move(viewport.x + 380, viewport.y + 180, { steps: 5 })
      await page.mouse.up({ button: 'middle' })
      await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
    }
    const box = (await canvas.boundingBox())!
    // Whole first IDLE character, with some transparent padding. Round client coordinates
    // first so the independent expected crop uses the browser's actual pointer precision.
    const points = [
      [204, 52],
      [310, 166],
    ].map(([x, y]) => ({
      x: Math.round(box.x + (x * box.width) / 1774),
      y: Math.round(box.y + (y * box.height) / 887),
    }))
    const [from, to] = transformed ? [points[1], points[0]] : points
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 8 })
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
    await page.mouse.up()
    const x = Math.floor(((Math.min(from.x, to.x) - box.x) * 1774) / box.width)
    const y = Math.floor(((Math.min(from.y, to.y) - box.y) * 887) / box.height)
    const width = Math.ceil(((Math.max(from.x, to.x) - box.x) * 1774) / box.width) - x
    const height = Math.ceil(((Math.max(from.y, to.y) - box.y) * 887) / box.height) - y
    const preview = page.getByLabel('Frame preview')
    await expect(preview).toHaveAttribute('width', String(width))
    await expect(preview).toHaveAttribute('height', String(height))
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('selection.png')
    const path = await download.path()
    if (!path) throw new Error('Manual crop download missing')
    const result = await page.evaluate(
      async ({ source, output, x, y, width, height }) => {
        async function decode(base64: string) {
          const image = new Image()
          image.src = `data:image/png;base64,${base64}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.naturalWidth
          canvas.height = image.naturalHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(image, 0, 0)
          return { canvas, ctx }
        }
        const original = await decode(source)
        const outputImage = await decode(output)
        const expected = original.ctx.getImageData(x, y, width, height).data
        const actual = outputImage.ctx.getImageData(0, 0, width, height).data
        return {
          width: outputImage.canvas.width,
          height: outputImage.canvas.height,
          matches: expected.every((value, index) => value === actual[index]),
          hasVisiblePixels: actual.some((value, index) => index % 4 === 3 && value > 0),
        }
      },
      {
        source: (await readFile(sourcePath)).toString('base64'),
        output: (await readFile(path)).toString('base64'),
        x,
        y,
        width,
        height,
      },
    )
    expect(result).toEqual({ width, height, matches: true, hasVisiblePixels: true })
    await page.screenshot({
      path: `test-results/manual-${transformed ? 'zoomed' : 'normal'}.png`,
      fullPage: true,
    })
  })
}

test('releasing outside image clips crop and Escape preserves previous region', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByLabel('Upload sprite sheet')
    .setInputFiles(resolve('src/test/fixtures/player.png'))
  await expect(page.getByText('Frames: 32', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Select region', exact: true }).click()
  const canvas = page.getByLabel('Sprite sheet', { exact: true })
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 220, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 280, box.y + 150, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByLabel('Frame preview')).toHaveAttribute('width', '36')
  await expect(page.getByLabel('Frame preview')).toHaveAttribute('height', '28')
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  await page.mouse.move(box.x + 60, box.y + 60)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.getByLabel('Frame preview')).toHaveAttribute('width', '36')
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
})
