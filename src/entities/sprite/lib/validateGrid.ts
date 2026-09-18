import { gridSummary, zeroGridOptions } from './gridGeometry'
import type {
  FrameSizeErrors,
  FrameSizeInput,
  GridOptionsInput,
  GridValidation,
} from '../model/types'

export function validateGrid(
  input: FrameSizeInput,
  imageWidth: number,
  imageHeight: number,
  spacing?: GridOptionsInput,
): GridValidation {
  const width = Number(input.width)
  const height = Number(input.height)
  const errors: { -readonly [Key in keyof FrameSizeErrors]: FrameSizeErrors[Key] } = {}
  if (!input.width.trim() || !Number.isSafeInteger(width) || width <= 0) {
    errors.width = 'Frame width must be a positive integer greater than 0'
  }
  if (!input.height.trim() || !Number.isSafeInteger(height) || height <= 0) {
    errors.height = 'Frame height must be a positive integer greater than 0'
  }
  const options = { ...zeroGridOptions }
  if (spacing) {
    for (const key of ['offsetX', 'offsetY', 'gapX', 'gapY'] as const) {
      const value = Number(spacing[key])
      if (!spacing[key].trim() || !Number.isSafeInteger(value) || value < 0) {
        errors[key] =
          `${key.startsWith('offset') ? 'Offset' : 'Gap'} ${key.endsWith('X') ? 'X' : 'Y'} must be a non-negative integer`
      }
      options[key] = value
    }
  }
  if (Object.keys(errors).length) return { status: 'invalid', errors }
  const summary = gridSummary(imageWidth, imageHeight, width, height, options)
  if (!summary.frameCount) {
    return {
      status: 'invalid',
      errors: { grid: 'Frame size is larger than image or available area after offsets' },
    }
  }
  return { status: 'valid', size: { width, height }, summary }
}
