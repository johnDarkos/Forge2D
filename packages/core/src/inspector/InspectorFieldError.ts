export type InspectorFieldErrorCode =
  | 'invalid-field-options'
  | 'unsupported-field-target'
  | 'unsupported-field-type'
  | 'field-not-found'
  | 'readonly-field'
  | 'invalid-field-value'

export class InspectorFieldError extends Error {
  readonly code: InspectorFieldErrorCode

  constructor(code: InspectorFieldErrorCode, message: string) {
    super(message)
    this.name = 'InspectorFieldError'
    this.code = code
  }
}
