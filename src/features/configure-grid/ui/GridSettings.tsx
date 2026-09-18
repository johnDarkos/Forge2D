import { useId } from 'react'
import type { GridSettingsProps } from '../model/types'

/** Управляемые поля сохраняют промежуточный ввод; валидация приходит из модели. */
export function GridSettings({
  value,
  spacing,
  onSpacingChange,
  errors,
  summary,
  disabled,
  onFrameWidthChange,
  onFrameHeightChange,
}: GridSettingsProps) {
  const id = useId()
  const messages = Object.values(errors)
  return (
    <>
      <h2>Grid settings</h2>
      <div className="size-fields">
        <label htmlFor={`${id}-width`}>
          Frame width
          <input
            id={`${id}-width`}
            type="number"
            min="1"
            step="1"
            value={value.width}
            disabled={disabled}
            aria-invalid={Boolean(errors.width)}
            aria-describedby={messages.length ? `${id}-error` : undefined}
            onChange={(event) => onFrameWidthChange(event.currentTarget.value)}
          />
        </label>
        <label htmlFor={`${id}-height`}>
          Frame height
          <input
            id={`${id}-height`}
            type="number"
            min="1"
            step="1"
            value={value.height}
            disabled={disabled}
            aria-invalid={Boolean(errors.height)}
            aria-describedby={messages.length ? `${id}-error` : undefined}
            onChange={(event) => onFrameHeightChange(event.currentTarget.value)}
          />
        </label>
        {(['offsetX', 'offsetY', 'gapX', 'gapY'] as const).map((key) => (
          <label key={key} htmlFor={`${id}-${key}`}>
            {key.startsWith('offset') ? 'Offset' : 'Gap'} {key.endsWith('X') ? 'X' : 'Y'}
            <input
              id={`${id}-${key}`}
              type="number"
              min="0"
              step="1"
              value={spacing[key]}
              disabled={disabled}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={messages.length ? `${id}-error` : undefined}
              onChange={(event) => onSpacingChange(key, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>
      {messages.length > 0 && (
        <p id={`${id}-error`} role="alert">
          {messages.join('. ')}
        </p>
      )}
      <div className="grid-summary">
        <span>Columns: {summary?.columns ?? 0}</span>
        <span>Rows: {summary?.rows ?? 0}</span>
        <strong>Frames: {summary?.frameCount ?? 0}</strong>
      </div>
      <p className="muted">Only complete frames are included.</p>
    </>
  )
}
