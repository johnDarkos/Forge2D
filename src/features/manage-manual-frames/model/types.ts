import type { LoadedSpriteSheet, NamedSpriteFrame, SpriteFrameId } from '@/entities/sprite'

/** Список управляется сессией: feature отправляет только действия пользователя. */
export interface ManualFramesProps {
  readonly sheet: LoadedSpriteSheet | null
  readonly frames: readonly NamedSpriteFrame[]
  readonly canAdd: boolean
  readonly disabled: boolean
  readonly onAdd: () => void
  readonly onRename: (id: SpriteFrameId, name: string) => void
  readonly onRemove: (id: SpriteFrameId) => void
}
