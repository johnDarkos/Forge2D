import { useId } from 'react'
import { isSupportedImageType } from '@/entities/sprite'
import type { SpriteUploaderProps } from '../model/types'

/** Проверяет File и передаёт его владельцу сессии; декодированием управляет редактор. */
export function SpriteUploader({
  status,
  disabled,
  error,
  onFileSelected,
  onError,
}: SpriteUploaderProps) {
  const id = useId()
  return (
    <div className="uploader">
      <label className="upload-label" htmlFor={id}>
        Upload sprite sheet
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!file) return
          if (!isSupportedImageType(file.type)) {
            onError({
              code: 'unsupported-type',
              message: 'Unsupported image. Choose PNG, JPEG or WebP.',
            })
            return
          }
          onFileSelected(file)
        }}
      />
      <span className="muted">PNG, JPEG, WebP · processed on your device</span>
      {status === 'loading' && <output>Loading image…</output>}
      {error && <p role="alert">{error.message}</p>}
    </div>
  )
}
