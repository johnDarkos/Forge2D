export type UploadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UploadError {
  readonly code: 'unsupported-type' | 'decode-failed'
  readonly message: string
}

/** Обработчики возвращают событие владельцу сессии. */
export interface SpriteUploaderProps {
  readonly status: UploadStatus
  readonly disabled?: boolean
  readonly error: UploadError | null
  readonly onFileSelected: (file: File) => void
  readonly onError: (error: UploadError) => void
}
