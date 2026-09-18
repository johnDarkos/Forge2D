import type {
  FrameSizeErrors,
  FrameSizeInput,
  GridOptionsInput,
  GridSummary,
} from '@/entities/sprite'

export interface GridSettingsProps {
  readonly value: FrameSizeInput
  readonly spacing: GridOptionsInput
  readonly onSpacingChange: (key: keyof GridOptionsInput, value: string) => void
  readonly errors: FrameSizeErrors
  readonly summary: GridSummary | null
  readonly disabled?: boolean
  readonly onFrameWidthChange: (value: string) => void
  readonly onFrameHeightChange: (value: string) => void
}
