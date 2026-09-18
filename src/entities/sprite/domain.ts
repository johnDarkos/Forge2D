/** Публичный API предметной логики без React и браузерных ресурсов. */
export type {
  SpriteFrameId,
  SpriteFrameGeometry,
  SpriteFrame,
  NamedSpriteFrame,
  SpriteSheetMetadata,
  SupportedImageType,
  FrameSize,
  FrameSizeInput,
  FrameSizeErrors,
  GridOptions,
  GridOptionsInput,
  GridSummary,
  GridValidation,
  GenerateFrames,
  SpriteEditorSource,
  SpriteEditorResult,
} from './model/types'
export { generateFrames } from './lib/generateFrames'
export { validateGrid } from './lib/validateGrid'
export { isSupportedImageType } from './lib/isSupportedImageType'
export { selectionRect } from './lib/selectionRect'
export type { ImagePoint, CropRect } from './lib/selectionRect'
