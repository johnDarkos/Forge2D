/** Публичный API предметной логики без React и браузерных ресурсов. */
export type {
  SpriteFrameId,
  SpriteFrameGeometry,
  GridFrame,
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
} from './model/types'
export { generateFrames } from './lib/generateFrames'
export { validateGrid } from './lib/validateGrid'
export { isSupportedImageType } from './lib/isSupportedImageType'
export { selectionRect } from './lib/selectionRect'
export type { ImagePoint, CropRect } from './lib/selectionRect'

export type {
  SpriteRect,
  SpriteFrame,
  SpriteSource,
  SpriteEditorMode,
  SpriteGridSettings,
  SpriteEditorSettings,
  SpriteEditorResult,
  SpriteEditorDomainState,
  SpriteEditorImage,
  SpriteEditorInitialData,
} from './model/editor-types'
export {
  createSpriteEditorResult,
  gridFrameToSprite,
  manualFrameToSprite,
  renameSprite,
  removeSprite,
} from './lib/editorResult'
