import { useId, useState } from 'react'
import { SpritePreview } from '@/entities/sprite'
import { GridSettings } from '@/features/configure-grid'
import { ExportButton } from '@/features/export-sprites'
import { SpriteCanvasTools } from '@/features/select-sprite'
import { SpriteUploader } from '@/features/upload-sprite-sheet'
import type { SpriteEditorViewProps } from '../model/types'

/** Единая панель: инструменты прокручиваются, экспорт всегда доступен снизу. */
export function EditorSidebar({
  canvas,
  uploader,
  settings,
  preview,
  manualFrames,
  exportButton,
  actions,
}: SpriteEditorViewProps) {
  const manual = canvas.mode === 'manual'
  const [collapsed, setCollapsed] = useState(false)
  const contentId = useId()
  return (
    <aside
      className={`tools-sidebar${collapsed ? ' tools-collapsed' : ''}`}
      aria-label="Editor tools"
    >
      <div className="tools-heading">
        <h2>Tools</h2>
        <span className="tool-badge">{manual ? 'Region' : 'Grid'}</span>
        <button
          className="tools-toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? 'Show tools' : 'Hide tools'}
        </button>
      </div>
      <div className="tools-content" id={contentId}>
        <section className="tool-section">
          <h2>Image</h2>
          <SpriteUploader {...uploader} />
        </section>
        <SpriteCanvasTools {...canvas} />
        {!manual && (
          <section className="tool-section">
            <GridSettings {...settings} />
          </section>
        )}
        <section className="tool-section">
          <SpritePreview {...preview} />
          {manual && (
            <button
              className="add-frame-action"
              type="button"
              disabled={manualFrames.disabled || !manualFrames.canAdd}
              onClick={manualFrames.onAdd}
            >
              Add frame
            </button>
          )}
          {manual && (
            <p className="muted">Add this region to the collection, then draw the next sprite.</p>
          )}
        </section>
      </div>
      <div className="tool-export">
        {(actions.showSave || actions.showCancel) && (
          <div className="session-actions">
            <h2>Editing session</h2>
            <div className="session-action-buttons">
              {actions.showSave && (
                <button type="button" disabled={actions.saveDisabled} onClick={actions.onSave}>
                  {actions.saving ? 'Saving…' : 'Save'}
                </button>
              )}
              {actions.showCancel && (
                <button type="button" disabled={actions.cancelDisabled} onClick={actions.onCancel}>
                  Cancel
                </button>
              )}
            </div>
            {actions.showSave && actions.hint && <p className="muted">{actions.hint}</p>}
            {actions.error && <p role="alert">{actions.error}</p>}
          </div>
        )}
        <h2>Export</h2>
        <p className="selection-status">
          {manual
            ? canvas.region
              ? `Selected region: ${canvas.region.width} × ${canvas.region.height} px`
              : 'No region selected'
            : `Selected frames: ${exportButton.frames.length}`}
        </p>
        {manual && (
          <p className="muted">PNG: current region · ZIP: {manualFrames.frames.length} saved</p>
        )}
        <ExportButton key={canvas.sheet?.url ?? 'empty'} {...exportButton} />
      </div>
    </aside>
  )
}
