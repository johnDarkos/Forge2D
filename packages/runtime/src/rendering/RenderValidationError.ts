export type RenderValidationErrorCode =
  'invalid-texture' | 'invalid-region' | 'invalid-transform' | 'invalid-sprite'

export class RenderValidationError extends Error {
  readonly code: RenderValidationErrorCode

  constructor(code: RenderValidationErrorCode, message: string) {
    super(message)
    this.name = 'RenderValidationError'
    this.code = code
  }
}
