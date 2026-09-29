// @vitest-environment node
import { describe, expect, expectTypeOf, test } from 'vitest'
import { Behaviour, Component, GameObject, RuntimeLifecycleError, Signal } from './index'

class Marker extends Component {}

class EmptyBehaviour extends Behaviour {}

class ThrowingDestroyBehaviour extends Behaviour {
  readonly error: Error

  constructor(message: string) {
    super()
    this.error = new Error(message)
  }

  override onDestroy() {
    throw this.error
  }
}

class RecordingBehaviour extends Behaviour {
  readonly label: string
  readonly log: string[]
  onStart: (() => void) | undefined
  onUpdate: (() => void) | undefined
  onDestroyAction: (() => void) | undefined

  constructor(label: string, log: string[]) {
    super()
    this.label = label
    this.log = log
    this.onStart = undefined
    this.onUpdate = undefined
    this.onDestroyAction = undefined
  }

  override start() {
    this.log.push(`start:${this.label}`)
    this.onStart?.()
  }

  override update(dt: number) {
    this.log.push(`update:${this.label}:${dt}`)
    this.onUpdate?.()
  }

  override onDestroy() {
    this.log.push(`destroy:${this.label}:${this.gameObject.id}`)
    this.onDestroyAction?.()
  }
}

function expectRuntimeError(action: () => unknown, code: RuntimeLifecycleError['code']) {
  let thrown: unknown
  try {
    action()
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(RuntimeLifecycleError)
  expect(thrown).toMatchObject({ code })
}

describe('Signal', () => {
  test('delivers typed values in subscription order', () => {
    const signal = new Signal<number>()
    const values: string[] = []
    signal.on((value) => values.push(`first:${value}`))
    signal.on((value) => values.push(`second:${value}`))

    signal.emit(3)

    expect(values).toEqual(['first:3', 'second:3'])
    expectTypeOf(signal.emit).parameter(0).toEqualTypeOf<number>()
  })

  test('returns an idempotent unsubscribe function and supports explicit off', () => {
    const signal = new Signal<string>()
    const values: string[] = []
    const listener = (value: string) => values.push(value)
    const unsubscribe = signal.on(listener)

    expect(signal.size).toBe(1)
    unsubscribe()
    unsubscribe()
    signal.emit('ignored')
    signal.on(listener)
    expect(signal.off(listener)).toBe(true)
    expect(signal.off(listener)).toBe(false)

    expect(signal.size).toBe(0)
    expect(values).toEqual([])
  })

  test('uses a stable emission snapshot while honoring removals', () => {
    const signal = new Signal<void>()
    const calls: string[] = []
    const late = () => calls.push('late')
    const second = () => calls.push('second')
    signal.on(() => {
      calls.push('first')
      signal.off(second)
      signal.on(late)
    })
    signal.on(second)

    signal.emit()
    signal.emit()

    expect(calls).toEqual(['first', 'first', 'late'])
  })

  test('clear removes every listener', () => {
    const signal = new Signal<void>()
    signal.on(() => undefined)
    signal.on(() => undefined)

    signal.clear()

    expect(signal.size).toBe(0)
  })
})

describe('GameObject components', () => {
  test('attaches components and exposes read-only snapshots', () => {
    const object = new GameObject({ id: 'player', name: 'Player' })
    const component = object.addComponent(new Marker())
    const snapshot = object.components

    expect(component.gameObject).toBe(object)
    expect(component.isAttached).toBe(true)
    expect(object.getComponent(Marker)).toBe(component)
    expect(object.getComponents(Marker)).toEqual([component])
    ;(snapshot as Component[]).length = 0
    expect(object.components).toEqual([component])
  })

  test('rejects invalid objects and attachment to more than one owner', () => {
    expectRuntimeError(() => new GameObject({ id: '', name: 'Player' }), 'invalid-object')
    expectRuntimeError(() => new GameObject({ id: 'player', name: ' ' }), 'invalid-object')

    const first = new GameObject({ id: 'first', name: 'First' })
    const second = new GameObject({ id: 'second', name: 'Second' })
    const component = first.addComponent(new Marker())

    expectRuntimeError(() => first.addComponent(component), 'component-already-attached')
    expectRuntimeError(() => second.addComponent(component), 'component-already-attached')
  })

  test('detaches a removed component and allows a new attachment lifecycle', () => {
    const first = new GameObject({ id: 'first', name: 'First' })
    const second = new GameObject({ id: 'second', name: 'Second' })
    const component = first.addComponent(new Marker())

    expect(first.removeComponent(component)).toBe(true)
    expect(first.removeComponent(component)).toBe(false)
    expect(component.isAttached).toBe(false)
    expectRuntimeError(() => component.gameObject, 'component-not-attached')

    second.addComponent(component)
    expect(component.gameObject).toBe(second)
  })
})

describe('Behaviour lifecycle', () => {
  test('allows behaviours to use the default no-op hooks', () => {
    const object = new GameObject({ id: 'empty', name: 'Empty' })
    const behaviour = object.addComponent(new EmptyBehaviour())

    expect(() => object.update(0)).not.toThrow()
    expect(object.removeComponent(behaviour)).toBe(true)
  })

  test('starts once and updates behaviours in component order', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    object.addComponent(new Marker())
    const movement = object.addComponent(new RecordingBehaviour('movement', log))
    object.addComponent(new RecordingBehaviour('animation', log))

    expect(object.getComponent(RecordingBehaviour)).toBe(movement)

    object.update(0.016)
    object.update(0.02)

    expect(log).toEqual([
      'start:movement',
      'start:animation',
      'update:movement:0.016',
      'update:animation:0.016',
      'update:movement:0.02',
      'update:animation:0.02',
    ])
    expect(object.isStarted).toBe(true)
  })

  test('defers a behaviour added during update until the next update', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const first = object.addComponent(new RecordingBehaviour('first', log))
    const late = new RecordingBehaviour('late', log)
    first.onUpdate = () => {
      first.onUpdate = undefined
      object.addComponent(late)
    }

    object.update(1)
    object.update(2)

    expect(log).toEqual([
      'start:first',
      'update:first:1',
      'start:late',
      'update:first:2',
      'update:late:2',
    ])
  })

  test('removal calls onDestroy once while the owner is still available', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const behaviour = object.addComponent(new RecordingBehaviour('movement', log))
    object.start()

    expect(object.removeComponent(behaviour)).toBe(true)
    expect(object.removeComponent(behaviour)).toBe(false)

    expect(log).toEqual(['start:movement', 'destroy:movement:player'])
    expect(behaviour.isAttached).toBe(false)
  })

  test('skips a behaviour removed earlier in the same update', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const first = object.addComponent(new RecordingBehaviour('first', log))
    const second = object.addComponent(new RecordingBehaviour('second', log))
    first.onUpdate = () => object.removeComponent(second)

    object.update(1)

    expect(log).toEqual(['start:first', 'start:second', 'update:first:1', 'destroy:second:player'])
  })

  test('does not start a behaviour removed by an earlier start hook', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const first = object.addComponent(new RecordingBehaviour('first', log))
    const second = object.addComponent(new RecordingBehaviour('second', log))
    first.onStart = () => object.removeComponent(second)

    object.update(1)

    expect(log).toEqual(['start:first', 'destroy:second:player', 'update:first:1'])
  })

  test('handles reentrant removal and component-list mutation during onDestroy', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const marker = object.addComponent(new Marker())
    const behaviour = object.addComponent(new RecordingBehaviour('cleanup', log))
    behaviour.onDestroyAction = () => {
      expect(object.removeComponent(behaviour)).toBe(false)
      expect(object.removeComponent(marker)).toBe(true)
    }

    expect(object.removeComponent(behaviour)).toBe(true)
    expect(object.components).toEqual([])
    expect(log).toEqual(['destroy:cleanup:player'])
  })

  test('destroy cleans every component once and makes the object terminal', () => {
    const log: string[] = []
    const object = new GameObject({ id: 'player', name: 'Player' })
    const marker = object.addComponent(new Marker())
    const behaviour = object.addComponent(new RecordingBehaviour('movement', log))

    object.destroy()
    object.destroy()

    expect(log).toEqual(['destroy:movement:player'])
    expect(marker.isAttached).toBe(false)
    expect(behaviour.isAttached).toBe(false)
    expect(object.components).toEqual([])
    expect(object.isDestroyed).toBe(true)
    expectRuntimeError(() => object.addComponent(new Marker()), 'object-destroyed')
    expectRuntimeError(() => object.start(), 'object-destroyed')
    expectRuntimeError(() => object.update(1), 'object-destroyed')
  })

  test('removal detaches a behaviour even when onDestroy throws', () => {
    const object = new GameObject({ id: 'player', name: 'Player' })
    const behaviour = object.addComponent(new ThrowingDestroyBehaviour('cleanup failed'))

    expect(() => object.removeComponent(behaviour)).toThrow(behaviour.error)
    expect(behaviour.isAttached).toBe(false)
    expect(object.components).toEqual([])
  })

  test('destroy finishes cleanup before rethrowing one lifecycle error', () => {
    const object = new GameObject({ id: 'player', name: 'Player' })
    const failing = object.addComponent(new ThrowingDestroyBehaviour('cleanup failed'))
    const marker = object.addComponent(new Marker())

    expect(() => object.destroy()).toThrow(failing.error)
    expect(failing.isAttached).toBe(false)
    expect(marker.isAttached).toBe(false)
    expect(object.components).toEqual([])
    expect(object.isDestroyed).toBe(true)
  })

  test('destroy aggregates multiple lifecycle errors after cleanup', () => {
    const object = new GameObject({ id: 'player', name: 'Player' })
    const first = object.addComponent(new ThrowingDestroyBehaviour('first failed'))
    const second = object.addComponent(new ThrowingDestroyBehaviour('second failed'))

    let thrown: unknown
    try {
      object.destroy()
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(AggregateError)
    expect(thrown).toMatchObject({ errors: [first.error, second.error] })
    expect(first.isAttached).toBe(false)
    expect(second.isAttached).toBe(false)
    expect(object.components).toEqual([])
  })

  test.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid delta time %s before starting',
    (dt) => {
      const log: string[] = []
      const object = new GameObject({ id: 'player', name: 'Player' })
      object.addComponent(new RecordingBehaviour('movement', log))

      expectRuntimeError(() => object.update(dt), 'invalid-delta-time')
      expect(log).toEqual([])
      expect(object.isStarted).toBe(false)
    },
  )
})
