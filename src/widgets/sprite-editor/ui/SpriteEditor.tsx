import type { SpriteEditorProps } from '../model/types'
import { useEditor } from '../model/useEditor'
import { SpriteEditorView } from './SpriteEditorView'

/** Владелец сессии; передаёт представлению данные и обработчики из модели. */
export function SpriteEditor({ initialFrameSize }: SpriteEditorProps) {
  const props = useEditor(initialFrameSize)
  return <SpriteEditorView {...props} />
}
