import type { SceneValidationCode } from './types'

export class SceneValidationError extends Error {
  readonly code: SceneValidationCode
  readonly path: string

  constructor(code: SceneValidationCode, path: string, message: string) {
    super(message)
    this.name = 'SceneValidationError'
    this.code = code
    this.path = path
  }
}
