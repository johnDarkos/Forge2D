import type { SupportedImageType } from '../model/types'

export function isSupportedImageType(type: string): type is SupportedImageType {
  return type === 'image/png' || type === 'image/jpeg' || type === 'image/webp'
}
