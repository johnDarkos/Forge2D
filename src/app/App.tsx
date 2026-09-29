import { EditorPage } from '@/pages/editor'
import { ForgeEditorPage } from '@/pages/forge-editor'

/** Корень приложения: подключение страницы и будущих провайдеров общего уровня. */
export default function App() {
  return window.location.hash === '#forge' ? <ForgeEditorPage /> : <EditorPage />
}
