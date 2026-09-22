import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

export const fixture = (name: string) => resolve('src/test/fixtures', name)

export const browserSheets = {
  player: { name: 'player.png', width: 256, height: 128 },
  test: { name: 'test.png', width: 1774, height: 887 },
  spaced: { name: 'spaced.png', width: 114, height: 78 },
} as const

/**
 * Independent pixel oracle. It decodes both PNGs in Chromium and compares the
 * exported bitmap with the requested source rectangle, without using app code.
 */
export async function comparePngCrop(
  page: Page,
  source: Uint8Array,
  output: Uint8Array,
  crop: PixelCrop,
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
      const expected = original.context.getImageData(
        data.crop.x,
        data.crop.y,
        data.crop.width,
        data.crop.height,
      ).data
      const actual = exported.context.getImageData(0, 0, data.crop.width, data.crop.height).data
      let differences = 0
      for (let index = 0; index < expected.length; index++)
        if (actual[index] !== expected[index]) differences++

      return {
        width: exported.width,
        height: exported.height,
        differences,
        firstPixel: Array.from(actual.slice(0, 4)),
        hasVisiblePixels: actual.some((value, index) => index % 4 === 3 && value > 0),
      }
    },
    {
      source: Buffer.from(source).toString('base64'),
      output: Buffer.from(output).toString('base64'),
      crop,
    },
  )
}
