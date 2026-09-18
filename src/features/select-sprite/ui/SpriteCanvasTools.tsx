import type { SpriteCanvasToolsProps } from '../model/types'

/** Управление холстом отдельно от рисования; один набор кнопок для любого размера экрана. */
export function SpriteCanvasTools({
  sheet,
  frames,
  disabled,
  mode,
  region,
  modeDisabled,
  onModeChange,
  onRegionChange,
  onSelectAll,
  onClearSelection,
  viewport,
  onViewportChange,
  isDrawing,
}: SpriteCanvasToolsProps) {
  const manual = mode === 'manual'
  const viewDisabled = !sheet || isDrawing
  return (
    <>
      <section className="tool-section">
        <h2>Selection</h2>
        <fieldset className="selection-mode" aria-label="Selection mode">
          <button
            type="button"
            aria-pressed={!manual}
            disabled={modeDisabled || isDrawing}
            onClick={() => onModeChange('grid')}
          >
            Grid mode
          </button>
          <button
            type="button"
            aria-pressed={manual}
            disabled={modeDisabled || isDrawing}
            onClick={() => onModeChange('manual')}
          >
            Select region
          </button>
        </fieldset>
        <p className="muted">
          {manual
            ? 'Drag a rectangle around a whole sprite. Escape cancels the drag.'
            : 'Select individual cells or use Select All for the entire grid.'}
        </p>
        <div className="selection-actions">
          {manual ? (
            <button
              type="button"
              disabled={disabled || isDrawing || !region}
              onClick={() => onRegionChange(null)}
            >
              Clear region
            </button>
          ) : (
            <>
              <button type="button" disabled={disabled || !frames.length} onClick={onSelectAll}>
                Select All
              </button>
              <button
                type="button"
                disabled={disabled || !frames.some((frame) => frame.selected)}
                onClick={onClearSelection}
              >
                Clear Selection
              </button>
            </>
          )}
        </div>
      </section>
      <section className="tool-section">
        <div className="tool-section-heading">
          <h2>View</h2>
          <output aria-label="Zoom level">{Math.round(viewport.zoom * 100)}%</output>
        </div>
        <div className="zoom-controls">
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={viewDisabled || viewport.zoom <= 0.25}
            onClick={() =>
              onViewportChange({ ...viewport, zoom: Math.max(0.25, viewport.zoom / 1.25) })
            }
          >
            −
          </button>
          <button
            type="button"
            disabled={viewDisabled}
            onClick={() => onViewportChange({ zoom: 1, x: 0, y: 0 })}
          >
            Reset view
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={viewDisabled || viewport.zoom >= 8}
            onClick={() =>
              onViewportChange({ ...viewport, zoom: Math.min(8, viewport.zoom * 1.25) })
            }
          >
            +
          </button>
        </div>
        <p className="muted">Drag with the middle mouse button to pan.</p>
      </section>
    </>
  )
}
