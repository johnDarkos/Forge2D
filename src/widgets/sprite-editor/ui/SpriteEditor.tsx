import type { SpriteEditorProps } from '../model/types'
import { useEditor } from '../model/useEditor'
import { SpriteEditorView } from './SpriteEditorView'

function SpriteEditorSession(props: SpriteEditorProps) {
  const view = useEditor(props)
  return <SpriteEditorView {...view} />
}

/** Новый внешний src создаёт новую сессию; одинаковый src сохраняет пользовательские изменения. */
export function SpriteEditor(props: SpriteEditorProps) {
  return (
    <SpriteEditorSession
      key={props.image ? `external:${props.image.src}` : 'standalone'}
      {...props}
    />
  )
}
