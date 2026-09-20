import { SpriteThumbnail } from '@/entities/sprite'
import type { ManualFramesProps } from '../model/types'

/** Накопление, переименование и удаление вырезок одного исходного изображения. */
export function ManualFrames({ sheet, frames, disabled, onRename, onRemove }: ManualFramesProps) {
  return (
    <section className="panel" aria-label="Saved frames">
      <div className="collection-heading">
        <h2>Saved frames: {frames.length}</h2>
      </div>
      <p className="muted">
        Use Add frame in the tools panel to save a region. Loading another image clears this list.
      </p>
      {frames.length === 0 ? (
        <p className="muted">No saved frames yet.</p>
      ) : (
        <ol className="frame-list">
          {sheet &&
            frames.map((frame) => (
              <li key={frame.id} className="frame-card">
                <div className="frame-thumbnail">
                  <SpriteThumbnail
                    sheet={sheet}
                    frame={frame}
                    label={`Saved frame ${frame.displayNumber} preview`}
                  />
                </div>
                <label>
                  Frame {frame.displayNumber} name
                  <input
                    type="text"
                    value={frame.name}
                    maxLength={80}
                    disabled={disabled}
                    onChange={(event) => onRename(frame.id, event.target.value)}
                  />
                </label>
                <span className="muted">
                  {frame.width} × {frame.height} px · ({frame.x}, {frame.y})
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove frame ${frame.displayNumber}`}
                  onClick={() => onRemove(frame.id)}
                >
                  Remove
                </button>
              </li>
            ))}
        </ol>
      )}
    </section>
  )
}
