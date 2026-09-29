import { ForgeEditor } from '@/widgets/forge-editor'
import { demoProject, demoScene } from '../model/demo'

export function ForgeEditorPage() {
  return <ForgeEditor project={demoProject} scene={demoScene} />
}
