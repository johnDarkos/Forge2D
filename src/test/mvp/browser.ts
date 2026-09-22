import { vi } from 'vitest'
import { player } from '../fixtures/sheets'

type Sheet = { name: string; type: string; width: number; height: number }

export function installBrowser() {
  const files = new WeakMap<Blob, Sheet & { broken?: boolean }>()
  const urls = new Map<string, Blob>()
  const externalImages = new Map<string, Sheet & { broken?: boolean }>()
  const contexts = new Map<HTMLCanvasElement, ReturnType<typeof makeContext>>()
  const downloads: { name: string; blob: Blob | undefined }[] = []
  let serial = 0
  let deferred = false
  const pendingImages: (() => void)[] = []
  const createObjectURL = vi.fn<(blob: Blob) => string>((blob: Blob) => {
    const url = `blob:test-${++serial}`
    urls.set(url, blob)
    return url
  })
  const revokeObjectURL = vi.fn<(url: string) => void>((url: string) => {
    urls.delete(url)
  })
  const NativeURL = globalThis.URL
  vi.stubGlobal(
    'URL',
    class extends NativeURL {
      static override createObjectURL = createObjectURL
      static override revokeObjectURL = revokeObjectURL
    },
  )

  const NativeImage = globalThis.Image
  vi.stubGlobal(
    'Image',
    class {
      constructor() {
        const image = new NativeImage()
        let source = ''
        Object.defineProperty(image, 'src', {
          get: () => source,
          set: (url: string) => {
            source = url
            const blob = urls.get(url)
            const sheet = (blob && files.get(blob)) || externalImages.get(url)
            const complete = () => {
              if (!sheet || sheet.broken) {
                image.dispatchEvent(new Event('error'))
                return
              }
              Object.defineProperties(image, {
                naturalWidth: { configurable: true, value: sheet.width },
                naturalHeight: { configurable: true, value: sheet.height },
                width: { configurable: true, value: sheet.width },
                height: { configurable: true, value: sheet.height },
                complete: { configurable: true, value: true },
              })
              image.dispatchEvent(new Event('load'))
            }
            if (deferred) pendingImages.push(complete)
            else queueMicrotask(complete)
          },
        })
        return image
      }
    },
  )

  function makeContext(canvas: HTMLCanvasElement) {
    return {
      canvas,
      drawImage: vi.fn<CanvasRenderingContext2D['drawImage']>(),
      clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
      fillRect: vi.fn<CanvasRenderingContext2D['fillRect']>(),
      strokeRect: vi.fn<CanvasRenderingContext2D['strokeRect']>(),
      beginPath: vi.fn<CanvasRenderingContext2D['beginPath']>(),
      closePath: vi.fn<CanvasRenderingContext2D['closePath']>(),
      moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
      lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
      stroke: vi.fn<CanvasRenderingContext2D['stroke']>(),
      rect: vi.fn<CanvasRenderingContext2D['rect']>(),
      fill: vi.fn<CanvasRenderingContext2D['fill']>(),
      save: vi.fn<CanvasRenderingContext2D['save']>(),
      restore: vi.fn<CanvasRenderingContext2D['restore']>(),
      setTransform: vi.fn<CanvasRenderingContext2D['setTransform']>(),
      scale: vi.fn<CanvasRenderingContext2D['scale']>(),
      imageSmoothingEnabled: true,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    }
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    kind: string,
  ) {
    if (kind !== '2d') return null
    let context = contexts.get(this)
    if (!context) {
      context = makeContext(this)
      contexts.set(this, context)
    }
    return context as unknown as CanvasRenderingContext2D
  } as HTMLCanvasElement['getContext'])
  // Stub serialization only. Geometry is checked against drawImage arguments, not fake pixels.
  const png = new Blob(['mock PNG serialization'], { type: 'image/png' })
  const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    queueMicrotask(() => callback(png))
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ name: this.download, blob: urls.get(this.href) })
  })
  const fetch = vi.fn<typeof globalThis.fetch>(() => {
    throw new Error('Images must stay local')
  })
  vi.stubGlobal('fetch', fetch)
  const xhr = vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {
    throw new Error('Images must stay local')
  })

  function file(sheet: Sheet = player, broken = false) {
    const value = new File(['fixture image bytes'], sheet.name, { type: sheet.type })
    files.set(value, { ...sheet, broken })
    return value
  }
  function context(canvas: HTMLCanvasElement) {
    const value = contexts.get(canvas)
    if (!value) throw new Error('Canvas did not request a 2D context')
    return value
  }
  return {
    deferImages: () => {
      deferred = true
    },
    pendingImages,
    file,
    registerImage: (url: string, sheet: Sheet = player, broken = false) => {
      externalImages.set(url, { ...sheet, broken })
    },
    contexts,
    context,
    createObjectURL,
    revokeObjectURL,
    urls,
    downloads,
    toBlob,
    png,
    fetch,
    xhr,
  }
}
