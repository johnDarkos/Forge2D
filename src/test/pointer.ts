import { vi } from 'vitest'

/**
 * jsdom не реализует PointerEvent и захват указателя. Подмена на MouseEvent теряет
 * pointerId: обработчики получают undefined, и проверки принадлежности жеста
 * сравнивают undefined с undefined. Класс сохраняет поля указателя, а захват
 * учитывается по-настоящему, поэтому release/has действительно что-то значат.
 */
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string
  readonly isPrimary: boolean

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.pointerType = init.pointerType ?? 'mouse'
    this.isPrimary = init.isPrimary ?? true
  }
}

const captures = new WeakMap<Element, Set<number>>()
const methods = ['setPointerCapture', 'releasePointerCapture', 'hasPointerCapture'] as const

/** Возвращает доступ к захваченным указателям: тест может проверить освобождение. */
export function installPointerEvents() {
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  const implementations = {
    setPointerCapture(this: Element, pointerId: number) {
      const ids = captures.get(this) ?? new Set<number>()
      ids.add(pointerId)
      captures.set(this, ids)
    },
    releasePointerCapture(this: Element, pointerId: number) {
      captures.get(this)?.delete(pointerId)
    },
    hasPointerCapture(this: Element, pointerId: number) {
      return captures.get(this)?.has(pointerId) ?? false
    },
  }
  for (const name of methods)
    Object.defineProperty(Element.prototype, name, {
      configurable: true,
      writable: true,
      value: implementations[name],
    })
  return {
    capturedPointers: (element: Element) => [...(captures.get(element) ?? [])],
  }
}

export function uninstallPointerEvents() {
  for (const name of methods) Reflect.deleteProperty(Element.prototype, name)
}
