import { zipSync } from 'fflate'
import type { ExportFrameItem } from '../model/types'
import { exportFrame } from './exportFrame'
import { frameFileNames } from './frameFileNames'

function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(new Error('Unable to read PNG for ZIP export'))
    reader.onabort = () => reject(new Error('PNG reading was cancelled'))
    reader.readAsArrayBuffer(blob)
  })
}

/** Создаёт архив, не скачивая его и не изменяя исходный список кадров. */
export async function exportFramesZip(
  image: HTMLImageElement,
  frames: readonly ExportFrameItem[],
): Promise<Blob> {
  if (!frames.length) throw new Error('Select at least one frame for ZIP export')
  const entries: Record<string, Uint8Array> = {}
  if (new Set(frames.map((frame) => frame.id)).size !== frames.length)
    throw new Error('Duplicate frame in ZIP export')
  const sorted = [...frames].sort((a, b) => a.id - b.id)
  const names = frameFileNames(sorted)
  for (const [index, frame] of sorted.entries()) {
    entries[names[index]] = await readBytes(await exportFrame(image, frame))
  }
  // PNG is already compressed. STORE avoids compressing it again on the UI thread.
  return new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' })
}
