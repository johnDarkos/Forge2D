export type RuntimeLifecycleErrorCode =
  | 'invalid-object'
  | 'component-not-attached'
  | 'component-already-attached'
  | 'object-destroyed'
  | 'invalid-delta-time'

export class RuntimeLifecycleError extends Error {
  readonly code: RuntimeLifecycleErrorCode

  constructor(code: RuntimeLifecycleErrorCode, message: string) {
    super(message)
    this.name = 'RuntimeLifecycleError'
    this.code = code
  }
}
