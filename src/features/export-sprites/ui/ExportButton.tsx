import { useEffect, useRef, useState } from 'react'
import { exportFrame, SpriteExportError } from '../lib/exportFrame'
import { exportFramesZip } from '../lib/exportFramesZip'
import { downloadBlob } from '../lib/downloadBlob'
import type { ExportButtonProps, ExportState } from '../model/types'

/** Фиксирует выбранные кадры на старте и владеет состоянием выполнения экспорта. */
export function ExportButton({
  sheet,
  frames,
  savedFrames = [],
  region = null,
  disabled,
  regionExport = false,
  onExportingChange,
}: ExportButtonProps) {
  const [state, setState] = useState<ExportState>({ status: 'idle' })
  const running = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const exportSelected = async (format: 'png' | 'zip') => {
    if (regionExport && format === 'png') {
      if (!sheet || !region || disabled || running.current) return
      running.current = true
      setState({ status: 'exporting' })
      onExportingChange(true)
      try {
        const blob = await exportFrame(sheet.image, region)
        if (mounted.current) await downloadBlob(blob, 'selection.png')
        if (mounted.current) setState({ status: 'idle' })
      } catch (error) {
        if (mounted.current)
          setState({
            status: 'error',
            error: {
              code: error instanceof SpriteExportError ? error.code : 'download-failed',
              message:
                error instanceof SpriteExportError
                  ? error.message
                  : 'Unable to export PNG. Please try again.',
            },
          })
      } finally {
        running.current = false
        if (mounted.current) onExportingChange(false)
      }
      return
    }
    const selection = regionExport ? savedFrames : frames
    if (!sheet || !selection.length || disabled || running.current) return
    running.current = true
    setState({ status: 'exporting' })
    onExportingChange(true)
    const snapshot = [...selection].sort(
      (a, b) => a.displayNumber - b.displayNumber || a.id.localeCompare(b.id),
    )
    try {
      if (format === 'zip') {
        const blob = await exportFramesZip(sheet.image, snapshot)
        if (mounted.current) {
          const base =
            sheet.metadata.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'sprites'
          await downloadBlob(blob, `${base}_sprites.zip`)
        }
      } else {
        for (const frame of snapshot) {
          const blob = await exportFrame(sheet.image, frame)
          if (!mounted.current) break
          await downloadBlob(blob, `frame_${String(frame.displayNumber).padStart(3, '0')}.png`)
        }
      }
      if (mounted.current) setState({ status: 'idle' })
    } catch (error) {
      if (mounted.current)
        setState({
          status: 'error',
          error: {
            code: error instanceof SpriteExportError ? error.code : 'download-failed',
            message:
              error instanceof SpriteExportError
                ? error.message
                : 'Unable to export PNG. Please try again.',
          },
        })
    } finally {
      running.current = false
      if (mounted.current) onExportingChange(false)
    }
  }
  return (
    <div className="export-action">
      <button
        type="button"
        disabled={
          disabled ||
          !sheet ||
          !(regionExport ? region : frames.length) ||
          state.status === 'exporting'
        }
        onClick={() => {
          void exportSelected('png')
        }}
      >
        {state.status === 'exporting'
          ? 'Exporting…'
          : regionExport
            ? 'Download PNG'
            : 'Export selected'}
      </button>
      <button
        type="button"
        disabled={
          disabled ||
          !sheet ||
          !(regionExport ? savedFrames : frames).length ||
          state.status === 'exporting'
        }
        onClick={() => {
          void exportSelected('zip')
        }}
      >
        Export ZIP
      </button>
      {state.status === 'error' && <p role="alert">{state.error.message}</p>}
    </div>
  )
}
