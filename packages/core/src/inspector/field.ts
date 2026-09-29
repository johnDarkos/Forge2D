import { Component } from '../runtime'
import { InspectorFieldError } from './InspectorFieldError'

export type InspectorFieldType = 'number' | 'string' | 'boolean'
export type InspectorFieldValue = number | string | boolean

export interface InspectorFieldOptions {
  readonly label?: string
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly readonly?: boolean
}

export interface InspectorField {
  readonly key: string
  readonly label: string
  readonly type: InspectorFieldType
  readonly value: InspectorFieldValue
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly readonly: boolean
}

interface RegisteredField {
  readonly key: string
  readonly label: string
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly readonly: boolean
}

const fieldsByPrototype = new WeakMap<object, Map<string, RegisteredField>>()

function fail(code: InspectorFieldError['code'], message: string): never {
  throw new InspectorFieldError(code, message)
}

function optionalFiniteNumber(value: unknown, name: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail('invalid-field-options', `${name} must be a finite number`)
  return value
}

function normalizeOptions(key: string, options: InspectorFieldOptions): RegisteredField {
  if (options.label !== undefined && (typeof options.label !== 'string' || !options.label.trim()))
    fail('invalid-field-options', 'Field label must be a non-empty string')
  if (options.readonly !== undefined && typeof options.readonly !== 'boolean')
    fail('invalid-field-options', 'readonly must be a boolean')

  const min = optionalFiniteNumber(options.min, 'min')
  const max = optionalFiniteNumber(options.max, 'max')
  const step = optionalFiniteNumber(options.step, 'step')
  if (step !== undefined && step <= 0)
    fail('invalid-field-options', 'step must be greater than zero')
  if (min !== undefined && max !== undefined && min > max)
    fail('invalid-field-options', 'min must be less than or equal to max')

  return Object.freeze({
    key,
    label: options.label?.trim() || humanize(key),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(step === undefined ? {} : { step }),
    readonly: options.readonly ?? false,
  })
}

function humanize(key: string) {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : key
}

/** Регистрирует публичное поле Component для будущего Inspector. */
export function field(options: InspectorFieldOptions = {}) {
  return (target: Component, propertyKey: string | symbol) => {
    if (!(target instanceof Component) || typeof propertyKey !== 'string')
      fail('unsupported-field-target', '@field supports public instance fields of Component')

    let fields = fieldsByPrototype.get(target)
    if (!fields) {
      fields = new Map()
      fieldsByPrototype.set(target, fields)
    }
    fields.set(propertyKey, normalizeOptions(propertyKey, options))
  }
}

function registeredFields(component: Component) {
  const prototypes: object[] = []
  let prototype: object | null = Object.getPrototypeOf(component)
  while (prototype && prototype !== Component.prototype) {
    prototypes.unshift(prototype)
    prototype = Object.getPrototypeOf(prototype) as object | null
  }

  const fields = new Map<string, RegisteredField>()
  for (const current of prototypes) {
    for (const [key, metadata] of fieldsByPrototype.get(current) ?? []) fields.set(key, metadata)
  }
  return fields
}

function fieldType(value: unknown, key: string): InspectorFieldType {
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      fail('invalid-field-value', `Inspector field ${key} must contain a finite number`)
    return 'number'
  }
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  return fail(
    'unsupported-field-type',
    `Inspector field ${key} supports only number, string or boolean values`,
  )
}

function readValue(component: Component, key: string) {
  return (component as unknown as Record<string, unknown>)[key]
}

function assertConstraintsMatchType(metadata: RegisteredField, type: InspectorFieldType) {
  if (type === 'number') return
  if (metadata.min !== undefined || metadata.max !== undefined || metadata.step !== undefined)
    fail('invalid-field-options', `Numeric constraints require a number field: ${metadata.key}`)
}

/**
 * Проверяет значение, которое приходит из Inspector. Диапазон применяется только здесь:
 * игровой код вправе вывести поле за min/max, и снимок обязан показать такое значение.
 */
function assertIncomingValue(metadata: RegisteredField, type: InspectorFieldType, value: unknown) {
  if (fieldType(value, metadata.key) !== type)
    fail('invalid-field-value', `Inspector field ${metadata.key} must remain a ${type}`)
  if (type !== 'number') return

  const number = value as number
  if (metadata.min !== undefined && number < metadata.min)
    fail('invalid-field-value', `Inspector field ${metadata.key} is below min ${metadata.min}`)
  if (metadata.max !== undefined && number > metadata.max)
    fail('invalid-field-value', `Inspector field ${metadata.key} is above max ${metadata.max}`)
}

export function getInspectorFields(component: Component): readonly InspectorField[] {
  const result = [...registeredFields(component).values()].map((metadata) => {
    const value = readValue(component, metadata.key)
    const type = fieldType(value, metadata.key)
    assertConstraintsMatchType(metadata, type)
    return Object.freeze({ ...metadata, type, value: value as InspectorFieldValue })
  })
  return Object.freeze(result)
}

export function setInspectorFieldValue(component: Component, key: string, value: unknown) {
  const metadata = registeredFields(component).get(key)
  if (!metadata) fail('field-not-found', `Inspector field not found: ${key}`)
  if (metadata.readonly) fail('readonly-field', `Inspector field is readonly: ${key}`)

  const currentType = fieldType(readValue(component, key), key)
  assertConstraintsMatchType(metadata, currentType)
  assertIncomingValue(metadata, currentType, value)
  ;(component as unknown as Record<string, unknown>)[key] = value
}
