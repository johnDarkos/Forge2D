import { ManualFrames } from '@/features/manage-manual-frames'
import { SpriteCanvas } from '@/features/select-sprite'
import type { SpriteEditorViewProps } from '../model/types'
import { EditorSidebar } from './EditorSidebar'
import './SpriteEditor.css'

/** Компоновка без дублирования состояния дочерних features. */
export function SpriteEditorView(props: SpriteEditorViewProps) {
  const sheet = props.canvas.sheet
  return (
    <main className="sprite-editor">
      <header className="editor-heading">
        <div>
          <p className="eyebrow">LOCAL SPRITE TOOL</p>
          <h1>Sprite Cutter</h1>
        </div>
        <p className="muted">Select. Cut. Create.</p>
      </header>
      <div className="editor-layout">
        <EditorSidebar {...props} />
        <div className="workspace-stack">
          <section className="panel workspace">
            <div className="sheet-info">
              {sheet ? (
                <>
                  <strong>{sheet.metadata.name}</strong>
                  <span>
                    {sheet.metadata.width} × {sheet.metadata.height} px
                  </span>
                </>
              ) : (
                <p>No image loaded</p>
              )}
            </div>
            <SpriteCanvas key={sheet?.url ?? 'empty'} {...props.canvas} />
          </section>
          {(props.canvas.mode === 'manual' || props.manualFrames.frames.length > 0) && (
            <ManualFrames {...props.manualFrames} />
          )}
        </div>
      </div>
    </main>
  )
}
