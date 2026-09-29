// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { Component } from '../runtime'
import { InspectorFieldError, field, getInspectorFields, setInspectorFieldValue } from './index'

class PlayerSettings extends Component {
  @field({ label: 'Movement speed', min: 0, max: 500, step: 10 })
  speed = 220

  @field()
  displayName = 'Player'

  @field()
  aggressive = true

  hidden = 'not exposed'

  @field({ readonly: true })
  currentHealth = 100
}

function expectFieldError(action: () => unknown, code: InspectorFieldError['code']) {
  let thrown: unknown
  try {
    action()
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeInstanceOf(InspectorFieldError)
  expect(thrown).toMatchObject({ code })
}

describe('@field Inspector metadata', () => {
  test('derives an ordered Inspector model from decorated runtime values', () => {
    const settings = new PlayerSettings()

    expect(getInspectorFields(settings)).toEqual([
      {
        key: 'speed',
        label: 'Movement speed',
        type: 'number',
        value: 220,
        min: 0,
        max: 500,
        step: 10,
        readonly: false,
      },
      {
        key: 'displayName',
        label: 'Display Name',
        type: 'string',
        value: 'Player',
        readonly: false,
      },
      {
        key: 'aggressive',
        label: 'Aggressive',
        type: 'boolean',
        value: true,
        readonly: false,
      },
      {
        key: 'currentHealth',
        label: 'Current Health',
        type: 'number',
        value: 100,
        readonly: true,
      },
    ])
  })

  test('updates decorated fields while preserving normal class properties', () => {
    const settings = new PlayerSettings()

    setInspectorFieldValue(settings, 'speed', 350)
    setInspectorFieldValue(settings, 'displayName', 'Runner')
    setInspectorFieldValue(settings, 'aggressive', false)

    expect(settings.speed).toBe(350)
    expect(settings.displayName).toBe('Runner')
    expect(settings.aggressive).toBe(false)
    expect(settings.hidden).toBe('not exposed')
    expect(getInspectorFields(settings).map(({ value }) => value)).toEqual([
      350,
      'Runner',
      false,
      100,
    ])
  })

  test('validates readonly, field existence, value type and numeric constraints', () => {
    const settings = new PlayerSettings()

    expectFieldError(() => setInspectorFieldValue(settings, 'currentHealth', 90), 'readonly-field')
    expectFieldError(() => setInspectorFieldValue(settings, 'hidden', 'changed'), 'field-not-found')
    expectFieldError(() => setInspectorFieldValue(settings, 'speed', 'fast'), 'invalid-field-value')
    expectFieldError(
      () => setInspectorFieldValue(settings, 'speed', Number.NaN),
      'invalid-field-value',
    )
    expectFieldError(() => setInspectorFieldValue(settings, 'speed', -1), 'invalid-field-value')
    expectFieldError(() => setInspectorFieldValue(settings, 'speed', 501), 'invalid-field-value')

    expect(settings).toMatchObject({ speed: 220, currentHealth: 100, hidden: 'not exposed' })
  })

  test('keeps values per instance and returns detached frozen Inspector snapshots', () => {
    const first = new PlayerSettings()
    const second = new PlayerSettings()
    setInspectorFieldValue(first, 'speed', 300)
    const fields = getInspectorFields(first)

    expect(getInspectorFields(second)[0]?.value).toBe(220)
    expect(Object.isFrozen(fields)).toBe(true)
    expect(fields.every(Object.isFrozen)).toBe(true)
    expect(() => {
      ;(fields[0] as { label: string }).label = 'X'
    }).toThrow(/read only/i)
    expect(getInspectorFields(first)[0]?.label).toBe('Movement speed')
  })

  test('inherits fields and lets a decorated override replace metadata without changing order', () => {
    class Actor extends Component {
      @field()
      title = 'Actor'

      @field({ min: 0 })
      speed = 10
    }

    class Player extends Actor {
      @field({ label: 'Run speed', min: 1, max: 100 })
      override speed = 20

      @field()
      active = true
    }

    expect(getInspectorFields(new Player())).toEqual([
      {
        key: 'title',
        label: 'Title',
        type: 'string',
        value: 'Actor',
        readonly: false,
      },
      {
        key: 'speed',
        label: 'Run speed',
        type: 'number',
        value: 20,
        min: 1,
        max: 100,
        readonly: false,
      },
      {
        key: 'active',
        label: 'Active',
        type: 'boolean',
        value: true,
        readonly: false,
      },
    ])
  })

  test.each([
    ['empty label', { label: ' ' }],
    ['non-finite min', { min: Number.NaN }],
    ['non-finite max', { max: Number.POSITIVE_INFINITY }],
    ['non-positive step', { step: 0 }],
    ['inverted range', { min: 10, max: 1 }],
  ] as const)('rejects invalid decorator options: %s', (_label, options) => {
    expectFieldError(() => {
      class InvalidOptions extends Component {
        @field(options)
        value = 1
      }
      return InvalidOptions
    }, 'invalid-field-options')
  })

  test('rejects invalid readonly options and unsupported decorator targets', () => {
    expectFieldError(
      () => field({ readonly: 'yes' } as never)(PlayerSettings.prototype, 'invalidReadonly'),
      'invalid-field-options',
    )
    expectFieldError(
      () => field()(PlayerSettings.prototype, Symbol('hidden')),
      'unsupported-field-target',
    )
    expectFieldError(
      () => field()(PlayerSettings as unknown as Component, 'staticValue'),
      'unsupported-field-target',
    )
  })

  test('rejects numeric constraints on non-number fields', () => {
    class InvalidTextOptions extends Component {
      @field({ min: 0 })
      title = 'Player'
    }

    expectFieldError(() => getInspectorFields(new InvalidTextOptions()), 'invalid-field-options')
  })

  test('rejects values that the MVP Inspector cannot represent', () => {
    expectFieldError(() => {
      class Unsupported extends Component {
        @field()
        value = { nested: true }
      }
      return getInspectorFields(new Unsupported())
    }, 'unsupported-field-type')
  })
})
